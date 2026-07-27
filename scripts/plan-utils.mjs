// Helpers shared by the Strava sync script.
// Parses target mileage out of the plan's human-written workout descriptions
// and maps plan weeks/days onto real calendar dates.

import { WEEKS, PLAN_START } from "../src/plan-data.js";

// Weeks run Monday -> Sunday, matching Strava's weekly boundaries.
export const DAY_OFFSET = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/**
 * Pull the target distance out of a workout description.
 *
 * The tricky cases this has to survive:
 *   "20mi at goal race effort (~14:00/mi)"  -> 20   (not 14, from the pace)
 *   "6mi easy + 4x1mi strides"              -> 6    (not 1, from the strides)
 *   "Gym + 2mi shakeout"                    -> 2    (gym day that still has miles)
 *   "SMYFS 100 Mile — RACE DAY"             -> 100  (different wording)
 *   "Rehab: knee-hold isometrics..."        -> 0    (no running)
 *
 * Strategy: take the FIRST "<number>mi" occurrence, ignoring any that are part
 * of a pace expression (preceded by "/" or ":" as in "14:00/mi").
 */
export function parseTargetMiles(desc, type) {
  if (/RACE DAY/i.test(desc)) return 100;

  // A rest day contributes no mileage even if its text mentions a distance
  // (e.g. "Rest — save your legs for tomorrow night's long run").
  if (type === "rest") return 0;

  const re = /(\d+(?:\.\d+)?)\s*mi\b/gi;
  let m;
  while ((m = re.exec(desc)) !== null) {
    const charBefore = desc[m.index - 1];
    // Skip pace fragments like "14:00/mi" where the digits belong to a pace.
    if (charBefore === "/" || charBefore === ":") continue;
    // Skip forward/backward references to other days' workouts.
    const context = desc.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    if (/tomorrow|yesterday|next week|last week/.test(context)) continue;
    return parseFloat(m[1]);
  }
  return 0;
}

/** True if this workout is primarily a strength/rehab session. */
export function isStrengthDay(workout) {
  return workout.type === "gym";
}

/** UTC date for a given plan week number + day label. */
export function dateForWorkout(weekNumber, dayLabel) {
  const [y, mo, d] = PLAN_START.split("-").map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCDate(date.getUTCDate() + (weekNumber - 1) * 7 + DAY_OFFSET[dayLabel]);
  return date;
}

/** "2026-07-12" */
export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Flatten the plan into dated day entries, so the sync script can match
 * Strava activities against a simple date-keyed list.
 */
export function buildPlanDays() {
  const days = [];
  for (const week of WEEKS) {
    for (const wo of week.workouts) {
      const date = dateForWorkout(week.n, wo.day);
      days.push({
        date: isoDate(date),
        week: week.n,
        day: wo.day,
        type: wo.type,
        desc: wo.desc,
        targetMiles: parseTargetMiles(wo.desc, wo.type),
        isStrength: isStrengthDay(wo),
      });
    }
  }
  return days;
}

/**
 * Verify each week's stated total equals the sum of its daily targets.
 * Returns a list of mismatches (empty when the plan is internally consistent).
 * Called by the ICS and sync scripts so drift surfaces in CI instead of silently.
 */
export function checkPlanTotals() {
  const days = buildPlanDays();
  const problems = [];
  for (const week of WEEKS) {
    const sum = days
      .filter((d) => d.week === week.n)
      .reduce((s, d) => s + d.targetMiles, 0);
    if (Math.abs(sum - week.miles) > 0.01) {
      problems.push(
        `Week ${week.n}: stated ${week.miles}mi but daily targets sum to ${sum}mi`
      );
    }
  }
  return problems;
}
