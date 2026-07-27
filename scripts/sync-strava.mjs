// Fetches recent Strava activities, matches them against the training plan,
// and writes public/compliance.json for the site's Compliance tab.
//
// Runs in GitHub Actions on a schedule (see .github/workflows/sync-strava.yml).
// Never run this in the browser: it needs client secrets.
//
//   Required env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN
//   Optional env: PRIVACY_MODE=minimal   (omit activity names/links from output)
//
//   node scripts/sync-strava.mjs           # live
//   node scripts/sync-strava.mjs --mock    # offline, synthetic data (for testing)

import { writeFileSync, mkdirSync } from "node:fs";
import { WEEKS, PLAN_START } from "../src/plan-data.js";
import { buildPlanDays, isoDate } from "./plan-utils.mjs";

const MOCK = process.argv.includes("--mock");
const PRIVACY_MINIMAL = process.env.PRIVACY_MODE === "minimal";

const METERS_PER_MILE = 1609.344;

// Strava sport_type values we count toward running volume.
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
// ...and toward strength/rehab days.
const STRENGTH_TYPES = new Set(["WeightTraining", "Workout", "Crossfit", "Yoga"]);

// A day counts as complete at 85% of target, partial at 50%.
const DONE_THRESHOLD = 0.85;
const PARTIAL_THRESHOLD = 0.5;

// ---------------------------------------------------------------- Strava API

async function getAccessToken() {
  const client_id = process.env.STRAVA_CLIENT_ID;
  const client_secret = process.env.STRAVA_CLIENT_SECRET;
  const refresh_token = process.env.STRAVA_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      "Missing Strava credentials. Set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET " +
      "and STRAVA_REFRESH_TOKEN (see README)."
    );
  }

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id, client_secret, refresh_token, grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  // Strava can rotate the refresh token. If it changes, the stored secret is
  // now stale and future runs will fail until it's updated.
  if (data.refresh_token && data.refresh_token !== refresh_token) {
    console.warn(
      "\n⚠️  Strava returned a NEW refresh token. Update the " +
      "STRAVA_REFRESH_TOKEN repo secret with:\n   " + data.refresh_token + "\n"
    );
  }

  return data.access_token;
}

async function fetchActivities(accessToken, afterEpoch) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const url =
      `https://www.strava.com/api/v3/athlete/activities` +
      `?after=${afterEpoch}&per_page=200&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 429) {
      throw new Error("Strava rate limit hit. Try again later.");
    }
    if (!res.ok) {
      throw new Error(`Strava activities fetch failed (${res.status}): ${await res.text()}`);
    }

    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 200) break; // last page
  }
  return all;
}

// Offline sample data so the pipeline can be tested without credentials.
function mockActivities() {
  const out = [];
  const [y, m, d] = PLAN_START.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  // Simulate ~2.5 weeks of training with realistic imperfection.
  // Offsets are days from PLAN_START (a Monday), so 0=Mon ... 6=Sun.
  const script = [
    [0, "WeightTraining", 0, "Rehab + knee holds"],      // W1 Mon
    [1, "Run", 5.1, "Easy shakeout"],                     // W1 Tue
    [2, "WeightTraining", 0, "Upper + backward walk"],    // W1 Wed
    [3, "Run", 4.2, "Cut short - shin tight"],            // W1 Thu (target 6)
    [4, "WeightTraining", 0, "Gym"],                      // W1 Fri
    [6, "Run", 12.2, "Sunday Long Run"],                  // W1 Sun
    [7, "WeightTraining", 0, "Rehab"],                    // W2 Mon
    [8, "Run", 6.0, "Easy"],                              // W2 Tue
    [10, "Run", 7.1, "Evening miles"],                    // W2 Thu
    [12, "Run", 4.0, "Recovery jog"],                     // W2 Sat
    [13, "Run", 15.4, "Long run"],                        // W2 Sun
    [19, "Run", 16.1, "Nutrition practice"],              // W3 Sat
  ];
  for (const [offset, type, miles, name] of script) {
    const dt = new Date(start);
    dt.setUTCDate(dt.getUTCDate() + offset);
    out.push({
      id: 1000 + offset,
      name,
      sport_type: type,
      distance: miles * METERS_PER_MILE,
      moving_time: miles > 0 ? Math.round(miles * 13.5 * 60) : 2700,
      total_elevation_gain: 20,
      start_date_local: dt.toISOString().replace("Z", ""),
      average_heartrate: miles > 0 ? 141 : undefined,
    });
  }
  return out;
}

// ------------------------------------------------------------ matching logic

function paceFrom(miles, seconds) {
  if (!miles || !seconds) return null;
  const secPerMile = seconds / miles;
  const mm = Math.floor(secPerMile / 60);
  const ss = Math.round(secPerMile % 60);
  return `${mm}:${String(ss).padStart(2, "0")}/mi`;
}

function statusFor(planDay, actualMiles, hadStrength, isPast) {
  if (!isPast) return "upcoming";

  if (planDay.type === "rest") return "rest";

  if (planDay.isStrength) {
    // Gym work is often logged in Hevy rather than Strava, so absence here
    // is "unknown", not "missed" — we don't want false red marks.
    if (hadStrength || actualMiles > 0) return "done";
    return "untracked";
  }

  if (planDay.targetMiles === 0) return actualMiles > 0 ? "done" : "untracked";

  const ratio = actualMiles / planDay.targetMiles;
  if (ratio >= DONE_THRESHOLD) return "done";
  if (ratio >= PARTIAL_THRESHOLD) return "partial";
  if (actualMiles > 0) return "partial";
  return "missed";
}

function build(activities) {
  const today = isoDate(new Date());

  // Bucket activities by local calendar date.
  const byDate = new Map();
  for (const a of activities) {
    const date = a.start_date_local.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(a);
  }

  const planDays = buildPlanDays();
  const dayIndex = new Map(planDays.map((d) => [d.date, d]));

  // Assemble per-day results.
  const results = new Map();
  for (const pd of planDays) {
    const acts = byDate.get(pd.date) ?? [];
    const runs = acts.filter((a) => RUN_TYPES.has(a.sport_type));
    const strength = acts.filter((a) => STRENGTH_TYPES.has(a.sport_type));

    const actualMiles = runs.reduce((s, a) => s + a.distance / METERS_PER_MILE, 0);
    const movingSeconds = runs.reduce((s, a) => s + (a.moving_time ?? 0), 0);
    const isPast = pd.date < today;

    results.set(pd.date, {
      ...pd,
      actualMiles: Math.round(actualMiles * 10) / 10,
      pace: paceFrom(actualMiles, movingSeconds),
      status: statusFor(pd, actualMiles, strength.length > 0, isPast),
      activities: PRIVACY_MINIMAL
        ? []
        : acts.map((a) => ({
            name: a.name,
            sportType: a.sport_type,
            miles: Math.round((a.distance / METERS_PER_MILE) * 10) / 10,
            pace: paceFrom(a.distance / METERS_PER_MILE, a.moving_time),
            avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
            url: `https://www.strava.com/activities/${a.id}`,
          })),
    });
  }

  // Roll up by week.
  const weeks = WEEKS.map((w) => {
    const days = w.workouts.map((wo) => {
      const date = planDays.find((d) => d.week === w.n && d.day === wo.day).date;
      return results.get(date);
    });

    const actualMiles = days.reduce((s, d) => s + d.actualMiles, 0);
    const isPast = days.every((d) => d.date < today);
    const started = days.some((d) => d.date < today);

    return {
      n: w.n,
      dates: w.dates,
      phase: w.phase,
      // The plan's stated weekly total is authoritative. Day descriptions
      // don't itemize every mile (warmups, gym-day shakeouts), so the sum of
      // day targets runs a few miles lower — expected, not a bug.
      plannedMiles: w.miles,
      actualMiles: Math.round(actualMiles * 10) / 10,
      compliance: w.miles ? Math.round((actualMiles / w.miles) * 100) : null,
      complete: isPast,
      started,
      days,
    };
  });

  // Season-to-date totals, counting only weeks that have fully elapsed.
  const elapsed = weeks.filter((w) => w.complete);
  const plannedToDate = elapsed.reduce((s, w) => s + w.plannedMiles, 0);
  const actualToDate = elapsed.reduce((s, w) => s + w.actualMiles, 0);

  const allDays = [...results.values()];
  const pastDays = allDays.filter((d) => d.date < today);

  return {
    generatedAt: new Date().toISOString(),
    source: MOCK ? "mock" : "strava",
    privacyMode: PRIVACY_MINIMAL ? "minimal" : "full",
    today,
    totals: {
      plannedToDate: Math.round(plannedToDate * 10) / 10,
      actualToDate: Math.round(actualToDate * 10) / 10,
      compliancePct: plannedToDate
        ? Math.round((actualToDate / plannedToDate) * 100)
        : null,
      weeksElapsed: elapsed.length,
      weeksRemaining: weeks.length - elapsed.length,
      runsCompleted: pastDays.filter((d) => d.actualMiles > 0).length,
      daysDone: pastDays.filter((d) => d.status === "done").length,
      daysPartial: pastDays.filter((d) => d.status === "partial").length,
      daysMissed: pastDays.filter((d) => d.status === "missed").length,
    },
    weeks,
  };
}

// ------------------------------------------------------------------ main

async function main() {
  let activities;

  if (MOCK) {
    console.log("Running in --mock mode (no network, synthetic activities).");
    activities = mockActivities();
  } else {
    const token = await getAccessToken();
    // Only fetch from a week before the plan started; nothing earlier matters.
    const [y, m, d] = PLAN_START.split("-").map(Number);
    const after = Math.floor(Date.UTC(y, m - 1, d - 7) / 1000);
    activities = await fetchActivities(token, after);
    console.log(`Fetched ${activities.length} activities since ${PLAN_START} (-7d).`);
  }

  const report = build(activities);

  mkdirSync("public", { recursive: true });
  writeFileSync("public/compliance.json", JSON.stringify(report, null, 2) + "\n");

  const t = report.totals;
  console.log(
    `Wrote public/compliance.json — ${t.weeksElapsed} weeks elapsed, ` +
    `${t.actualToDate}/${t.plannedToDate} mi (${t.compliancePct ?? "–"}%), ` +
    `${t.daysDone} done / ${t.daysPartial} partial / ${t.daysMissed} missed.`
  );
}

main().catch((err) => {
  console.error("\n❌ Strava sync failed:", err.message);
  process.exit(1);
});
