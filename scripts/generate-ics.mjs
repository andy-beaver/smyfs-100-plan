// Generates public/smyfs-100-plan.ics from src/plan-data.js.
// Runs automatically before every build (see package.json "prebuild").
// Each workout becomes an all-day event; long runs and the race get alarms.

import { writeFileSync, mkdirSync } from "node:fs";
import { WEEKS, PLAN_START } from "../src/plan-data.js";

const DAY_OFFSET = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const TYPE_EMOJI = {
  long: "🏃", b2b: "🔁", mid: "🏃", easy: "🟢", gym: "🏋️", rest: "😴",
};

function fmtDate(d) {
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

// ICS text fields: escape per RFC 5545 and fold long lines at 75 octets.
function esc(text) {
  return String(text)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}
function fold(line) {
  const out = [];
  let s = line;
  while (s.length > 73) {
    out.push(s.slice(0, 73));
    s = " " + s.slice(73);
  }
  out.push(s);
  return out.join("\r\n");
}

const [y, m, d] = PLAN_START.split("-").map(Number);
const planStart = new Date(Date.UTC(y, m - 1, d));

const now = new Date();
const dtstamp =
  now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

const lines = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//SMYFS 100 Plan//Training Calendar//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
  fold("X-WR-CALNAME:SMYFS 100 Training"),
  fold("X-WR-CALDESC:15-week training plan for the Show Me Your Free State 100 Mile Ultramarathon (Wathena KS, Oct 24 2026)"),
  "REFRESH-INTERVAL;VALUE=DURATION:P1D",
  "X-PUBLISHED-TTL:P1D",
];

for (const week of WEEKS) {
  const weekStart = new Date(planStart);
  weekStart.setUTCDate(weekStart.getUTCDate() + (week.n - 1) * 7);

  for (const wo of week.workouts) {
    const evDate = new Date(weekStart);
    evDate.setUTCDate(evDate.getUTCDate() + DAY_OFFSET[wo.day]);
    const next = new Date(evDate);
    next.setUTCDate(next.getUTCDate() + 1);

    const isRace = wo.desc.includes("RACE DAY");
    const emoji = isRace ? "🏁" : (TYPE_EMOJI[wo.type] ?? "🏃");
    // Keep titles short for calendar views: "🏃 W10: 30mi — start 9-10pm..."
    const shortDesc = wo.desc.length > 60 ? wo.desc.slice(0, 57) + "..." : wo.desc;
    const summary = `${emoji} W${week.n}: ${shortDesc}`;

    const description =
      `Week ${week.n} (${week.dates}) — ${week.miles}mi total, long: ${week.longRun}\\n\\n` +
      `Today: ${esc(wo.desc)}\\n\\n` +
      `Week focus: ${esc(week.focus)}\\n\\n` +
      `Note: ${esc(week.note)}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:smyfs100-w${week.n}-${wo.day.toLowerCase()}@smyfs-plan`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${fmtDate(evDate)}`);
    lines.push(`DTEND;VALUE=DATE:${fmtDate(next)}`);
    lines.push(fold(`SUMMARY:${esc(summary)}`));
    lines.push(fold(`DESCRIPTION:${description}`));
    lines.push("TRANSP:TRANSPARENT");

    // Evening-before reminder for long runs, B2Bs, and race day
    if (wo.type === "long" || wo.type === "b2b" || isRace) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(fold(`DESCRIPTION:Tomorrow: ${esc(summary)} — prep gear & nutrition tonight`));
      lines.push("TRIGGER:-PT12H");
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }
}

lines.push("END:VCALENDAR");

mkdirSync("public", { recursive: true });
writeFileSync("public/smyfs-100-plan.ics", lines.join("\r\n") + "\r\n");
console.log(`Wrote public/smyfs-100-plan.ics (${WEEKS.reduce((n, w) => n + w.workouts.length, 0)} events)`);
