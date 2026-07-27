import { useState, useEffect } from "react";
import { PHASES, WEEKS } from "./plan-data.js";

// Four 25-mile laps. Start 6:00am Sat; sub-24 means finishing by 6:00am Sun.
// Deliberately a positive split — banking time early on a flat course is how
// sub-24 survives the night laps.
const RACE_SEGMENTS = [
  { miles: "Lap 1 · 0–25", pace: "12:48/mi", cumTime: "5:20", clock: "finish ~11:20am", strategy: "Daylight, fresh legs, warmest part of the day. Feels absurdly easy — keep it there. Bank time now without burning matches.", type: "easy" },
  { miles: "Lap 2 · 25–50", pace: "13:48/mi", cumTime: "11:05", clock: "finish ~5:05pm", strategy: "Settle into cruising gear. Pacer may join from here on. Pick up headlamp + reflective vest at the mile-50 drop bag before sunset (6:27pm).", type: "easy" },
  { miles: "Lap 3 · 50–75", pace: "15:00/mi", cumTime: "17:20", clock: "finish ~11:20pm", strategy: "Full darkness. Hot soup and coffee are on at the manned stations. Run flats, hike nothing steep because there isn't any. Keep eating.", type: "moderate" },
  { miles: "Lap 4 · 75–100", pace: "15:36/mi", cumTime: "23:50", clock: "finish ~5:50am", strategy: "The hard one — deep night into pre-dawn. 98.7% moon helps. Shrink your world to the next aid station. Sunrise is 7:39am, so you finish before it.", type: "hard" },
];

const AID_STATIONS = [
  { mile: "0 / 25", name: "Start–Finish", crew: true, drop: true, note: "Crew access. Drop bag. Full reset point between laps." },
  { mile: "6.5", name: "Children of the Corn", crew: false, drop: true, note: "No crew, no pacer pickup. Closes 7:30am Sun." },
  { mile: "13", name: "Wathena", crew: true, drop: true, note: "Crew access. Hwy-36 crossing, manned. Closes 9:00am Sun." },
  { mile: "19", name: "Roseport Landing", crew: true, drop: true, note: "Crew access. Closes 10:30am Sun." },
];

const CUTOFFS = [
  { what: "Lap 3 complete (mile 75)", when: "4:00am Sun", note: "Hard cutoff — pulled from course if missed. Your plan reaches it ~11:20pm, a 4.5hr buffer." },
  { what: "Finish (mile 100)", when: "12:00pm Sun", note: "30 hours total. Your finish goal has ~6hr of margin; sub-24 has ~6hr more." },
];

const typeColors = {
  long: "#F59E0B", b2b: "#EF4444", mid: "#3B82F6",
  easy: "#10B981", gym: "#8B5CF6", rest: "#374151",
};
const typeLabels = {
  long: "LONG RUN", b2b: "B2B", mid: "MID",
  easy: "EASY", gym: "GYM/REHAB", rest: "REST",
};
const segColors = { easy: "#10B981", moderate: "#F59E0B", hard: "#EF4444", finish: "#A78BFA" };

function calendarUrls() {
  // The .ics feed lives next to index.html (copied from /public at build time).
  const base = window.location.href.replace(/index\.html$/, "").replace(/[^/]*$/, "");
  const httpsUrl = base + "smyfs-100-plan.ics";
  // webcal:// tells iOS/macOS to open the URL as a calendar subscription.
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");
  return { httpsUrl, webcalUrl };
}

function SubscribeBanner() {
  const [copied, setCopied] = useState(false);
  const { httpsUrl, webcalUrl } = calendarUrls();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can fail on http or older browsers — show the URL instead.
      window.prompt("Copy this calendar URL:", httpsUrl);
    }
  };

  return (
    <div style={{
      marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
    }}>
      <a href={webcalUrl} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "#F59E0B", color: "#000", textDecoration: "none",
        fontSize: 10, letterSpacing: 1.5, fontWeight: 700,
        padding: "8px 14px", borderRadius: 5, fontFamily: "inherit",
      }}>
        📅 SUBSCRIBE ON iPHONE
      </a>
      <button onClick={copy} style={{
        background: "none", border: "1px solid #334155", color: "#94A3B8",
        fontSize: 10, letterSpacing: 1.5, padding: "8px 14px",
        borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
      }}>
        {copied ? "✓ COPIED" : "COPY CALENDAR URL"}
      </button>
      <span style={{ fontSize: 9, color: "#475569", fontFamily: "system-ui" }}>
        Works with Apple Calendar, Google Calendar & Outlook — every workout as an all-day event
      </span>
    </div>
  );
}

const STATUS_STYLE = {
  done:      { color: "#10B981", icon: "✓",  label: "Done" },
  partial:   { color: "#F59E0B", icon: "◐",  label: "Partial" },
  missed:    { color: "#EF4444", icon: "✕",  label: "Missed" },
  rest:      { color: "#475569", icon: "–",  label: "Rest" },
  untracked: { color: "#64748B", icon: "?",  label: "Not tracked" },
  upcoming:  { color: "#334155", icon: "·",  label: "Upcoming" },
};

function ComplianceTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openWeek, setOpenWeek] = useState(null);

  useEffect(() => {
    // Fetched at runtime so a fresh sync shows up without rebuilding the bundle.
    const base = window.location.href.replace(/index\.html$/, "").replace(/[^/]*$/, "");
    let cancelled = false;
    fetch(base + "compliance.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`No compliance data yet (${r.status})`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{
        background: "#0D1626", border: "1px solid #1E293B",
        borderRadius: 8, padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 13, color: "#94A3B8", fontFamily: "system-ui", marginBottom: 8 }}>
          No sync data yet
        </div>
        <div style={{ fontSize: 11, color: "#475569", fontFamily: "system-ui", lineHeight: 1.7 }}>
          Once the Strava sync workflow runs, completed runs will appear here alongside
          the plan. See the README for setup.
        </div>
      </div>
    );
  }

  if (!data) {
    return <div style={{ fontSize: 11, color: "#475569", fontFamily: "system-ui" }}>Loading…</div>;
  }

  const t = data.totals;
  const pct = t.compliancePct;
  const pctColor = pct == null ? "#64748B" : pct >= 90 ? "#10B981" : pct >= 75 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      {/* Headline numbers */}
      <div style={{
        background: "#0D1626", border: "1px solid #1E293B",
        borderRadius: 8, padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 4 }}>
          PLAN COMPLIANCE · {t.weeksElapsed} WEEKS ELAPSED
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: pctColor, fontFamily: "system-ui" }}>
            {pct == null ? "–" : pct + "%"}
          </div>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            {t.actualToDate} of {t.plannedToDate} planned miles
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap" }}>
          {[
            ["DONE", t.daysDone, "#10B981"],
            ["PARTIAL", t.daysPartial, "#F59E0B"],
            ["MISSED", t.daysMissed, "#EF4444"],
            ["RUNS LOGGED", t.runsCompleted, "#3B82F6"],
            ["WEEKS LEFT", t.weeksRemaining, "#A78BFA"],
          ].map(([k, v, c]) => (
            <div key={k}>
              <div style={{ fontSize: 9, color: "#64748B", letterSpacing: 2 }}>{k}</div>
              <div style={{ fontSize: 16, color: c, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 9, color: "#334155", fontFamily: "system-ui", marginTop: 14 }}>
          Synced {new Date(data.generatedAt).toLocaleString()} from{" "}
          {data.source === "mock" ? "sample data" : "Strava"}
        </div>
      </div>

      {/* Planned vs actual, per week */}
      <div style={{
        background: "#0D1626", border: "1px solid #1E293B",
        borderRadius: 8, padding: "20px 16px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 16 }}>
          PLANNED VS ACTUAL
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90 }}>
          {data.weeks.map((w) => {
            const max = Math.max(...data.weeks.map((x) => Math.max(x.plannedMiles, x.actualMiles)));
            return (
              <div key={w.n} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 1, alignItems: "flex-end", width: "100%", height: 80 }}>
                  <div title={`Planned ${w.plannedMiles}mi`} style={{
                    flex: 1, height: (w.plannedMiles / max) * 78,
                    background: "#334155", borderRadius: "2px 2px 0 0",
                  }} />
                  <div title={`Actual ${w.actualMiles}mi`} style={{
                    flex: 1, height: (w.actualMiles / max) * 78,
                    background: w.started ? "#10B981" : "transparent",
                    borderRadius: "2px 2px 0 0",
                  }} />
                </div>
                <div style={{ fontSize: 7, color: "#475569", marginTop: 4 }}>{w.n}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
          <span style={{ fontSize: 9, color: "#64748B" }}>▪ Planned</span>
          <span style={{ fontSize: 9, color: "#10B981" }}>▪ Actual</span>
        </div>
      </div>

      {/* Week detail */}
      <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 12 }}>
        WEEK DETAIL
      </div>
      {data.weeks.filter((w) => w.started).reverse().map((w) => {
        const c = w.compliance;
        const col = c == null ? "#64748B" : c >= 90 ? "#10B981" : c >= 75 ? "#F59E0B" : "#EF4444";
        const open = openWeek === w.n;
        return (
          <div key={w.n} style={{
            background: "#0D1626", border: "1px solid #1E293B",
            borderLeft: `3px solid ${col}`, borderRadius: 6, marginBottom: 8, overflow: "hidden",
          }}>
            <div onClick={() => setOpenWeek(open ? null : w.n)} style={{
              padding: "12px 14px", cursor: "pointer", display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", fontFamily: "system-ui" }}>
                  Week {w.n}
                </span>
                <span style={{ fontSize: 10, color: "#475569", marginLeft: 10 }}>{w.dates}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 10, color: "#64748B" }}>
                  {w.actualMiles} / {w.plannedMiles} mi
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: col }}>
                  {c == null ? "–" : c + "%"}
                </span>
              </div>
            </div>

            {open && (
              <div style={{ padding: "0 14px 14px" }}>
                {w.days.map((d) => {
                  const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.upcoming;
                  return (
                    <div key={d.date} style={{
                      display: "flex", gap: 10, alignItems: "flex-start",
                      padding: "8px 10px", background: "#080D18",
                      border: "1px solid #1E293B", borderRadius: 4, marginBottom: 5,
                    }}>
                      <span style={{ color: s.color, fontSize: 12, width: 14 }}>{s.icon}</span>
                      <div style={{ width: 30, fontSize: 9, color: "#64748B" }}>{d.day}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "system-ui" }}>
                          {d.desc}
                        </div>
                        {d.actualMiles > 0 && (
                          <div style={{ fontSize: 9, color: s.color, marginTop: 3 }}>
                            {d.actualMiles} mi{d.pace ? ` · ${d.pace}` : ""}
                            {d.targetMiles > 0 && ` · target ${d.targetMiles} mi`}
                          </div>
                        )}
                        {d.activities?.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            {d.activities.map((a, i) => (
                              <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{
                                fontSize: 9, color: "#3B82F6", textDecoration: "none",
                                fontFamily: "system-ui", display: "block",
                              }}>
                                ↗ {a.name}{a.avgHr ? ` · ${a.avgHr} bpm` : ""}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        marginTop: 14, background: "#0A0F1E", border: "1px solid #1E293B",
        borderRadius: 6, padding: 14,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#64748B", marginBottom: 8 }}>
          HOW TO READ THIS
        </div>
        <div style={{ fontSize: 10, color: "#64748B", fontFamily: "system-ui", lineHeight: 1.7 }}>
          Weekly total is the number that matters — a run shifted from Tuesday to Wednesday
          still counts toward the week. A day is <span style={{ color: "#10B981" }}>done</span> at
          85% of target, <span style={{ color: "#F59E0B" }}>partial</span> above 50%. Gym days show
          as <span style={{ color: "#64748B" }}>not tracked</span> unless a strength activity reaches
          Strava, since lifting is logged in Hevy. Chasing 100% every week is not the goal;
          consistency across a phase is.
        </div>
      </div>
    </div>
  );
}

export default function TrainingPlan() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWeek, setSelectedWeek] = useState(null);

  const phaseForWeek = (n) => PHASES.find(p => p.weeks.includes(n));
  const maxMiles = Math.max(...WEEKS.map(w => w.miles));

  return (
    <div style={{
      background: "#080D18", minHeight: "100vh",
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      color: "#E2E8F0", padding: 0,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0D1626 0%, #1A0A00 100%)",
        borderBottom: "1px solid #1E293B", padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#F59E0B", marginBottom: 6, textTransform: "uppercase" }}>
            Show Me Your Free State 100 · Rosecrans Airport, St. Joseph MO · Oct 24, 2026
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: "system-ui, sans-serif", letterSpacing: -0.5, color: "#F8FAFC" }}>
            100 Mile Training Plan
          </h1>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 4, fontFamily: "system-ui" }}>
            15 weeks · Mon Jul 13 – Sat Oct 24, 2026 · weeks run Mon–Sun to match Strava
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              ["GOAL", "FINISH + SUB-24HR"],
              ["WEEKS OUT", "15"],
              ["CURRENT BASE", "~28 mi/wk"],
              ["PEAK WEEK", "62 mi"],
              ["LONGEST RUN", "30 mi"],
              ["VO₂MAX", "45 ml/kg/min"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, color: "#64748B", letterSpacing: 2 }}>{k}</div>
                <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <SubscribeBanner />
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #1E293B", background: "#0A0F1E" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 0, flexWrap: "wrap" }}>
          {[
            ["overview", "OVERVIEW"],
            ["schedule", "WEEK BY WEEK"],
            ["race", "RACE STRATEGY"],
            ["rehab", "KNEE / SHIN"],
            ["intel", "TRAINING INTEL"],
            ["compliance", "COMPLIANCE"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{
                background: "none", border: "none",
                borderBottom: activeTab === id ? "2px solid #F59E0B" : "2px solid transparent",
                color: activeTab === id ? "#F59E0B" : "#64748B",
                padding: "12px 14px", fontSize: 10, letterSpacing: 1.5,
                cursor: "pointer", fontFamily: "inherit",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>

        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {PHASES.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                  <span style={{ fontSize: 10, letterSpacing: 2, color: p.color }}>{p.label}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#0D1626", border: "1px solid #1E293B", borderRadius: 8, padding: "20px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 16 }}>WEEKLY MILEAGE · 15-WEEK BLOCK</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
                {WEEKS.map(w => {
                  const ph = phaseForWeek(w.n);
                  const h = (w.miles / maxMiles) * 90;
                  return (
                    <div key={w.n} onClick={() => { setSelectedWeek(w.n); setActiveTab("schedule"); }}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                      <div style={{
                        width: "100%", height: h, background: ph.color,
                        opacity: w.phase === "race" ? 1 : 0.75,
                        borderRadius: "3px 3px 0 0", position: "relative",
                      }}>
                        {w.n === 10 && (
                          <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 8, color: "#F59E0B" }}>●</div>
                        )}
                      </div>
                      <div style={{ fontSize: 7, color: "#475569", marginTop: 4 }}>W{w.n}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 8, color: "#475569" }}>JUL 13</span>
                <span style={{ fontSize: 8, color: "#475569" }}>OCT 24</span>
              </div>
            </div>

            {PHASES.map(p => {
              const phWeeks = WEEKS.filter(w => w.phase === p.id);
              const avgMiles = Math.round(phWeeks.reduce((s, w) => s + w.miles, 0) / phWeeks.length);
              return (
                <div key={p.id} style={{
                  background: p.bg, border: `1px solid ${p.color}30`,
                  borderLeft: `3px solid ${p.color}`, borderRadius: 6,
                  padding: "14px 16px", marginBottom: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 9, letterSpacing: 3, color: p.color }}>{p.label}</span>
                      <span style={{ fontSize: 9, color: "#475569", marginLeft: 12 }}>
                        {phWeeks[0]?.dates?.split("–")[0].trim()} – {phWeeks[phWeeks.length - 1]?.dates?.split("–")[1]?.trim()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: p.color }}>{p.id !== "race" ? `~${avgMiles} mi/wk avg` : "100 miles"}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.6, fontFamily: "system-ui, sans-serif" }}>
                    {p.id === "reintro" && "Weeks 1–2 hold near your current ~28mi/wk while the left knee and shin settle. All easy, rehab stays daily. We only ramp once two clean weeks confirm the tissue is ready — this gate protects the whole block."}
                    {p.id === "build" && "Progressive mileage with the first back-to-back weekend in Week 6. Gentle, flat, short tempo introduced to address your threshold gap without provoking the knee. Cutback in Week 5. Race nutrition practiced every long run."}
                    {p.id === "peak" && "Highest stress of the plan. Week 10 is the peak: a 30-mile night long run (capped from 32 to protect the shin). B2B weekends up to 40 miles. Cutback in Week 8, plus a midpoint knee/shin gut-check that can adjust the goal if needed."}
                    {p.id === "taper" && "3-week taper. Mileage drops sharply, intensity holds. Expect to feel flat — that's normal. Time for drop bags, crew briefing, gear checks, and banking sleep."}
                    {p.id === "race" && "Packet pickup Friday at Tubes Bike Shop (3–8pm), drop bags sorted, then a 6:00am start Saturday. Four 25-mile laps. Sub-24 means finishing by 6:00am Sunday — realistic on your current engine if the knee/shin stay quiet."}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "schedule" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {WEEKS.map(w => {
                const ph = phaseForWeek(w.n);
                return (
                  <button key={w.n} onClick={() => setSelectedWeek(selectedWeek === w.n ? null : w.n)}
                    style={{
                      background: selectedWeek === w.n ? ph.color : "#0D1626",
                      border: `1px solid ${ph.color}60`,
                      color: selectedWeek === w.n ? "#000" : ph.color,
                      borderRadius: 4, padding: "5px 10px", fontSize: 10,
                      cursor: "pointer", fontFamily: "inherit", letterSpacing: 1,
                    }}>
                    W{w.n}
                  </button>
                );
              })}
            </div>

            {(selectedWeek ? WEEKS.filter(w => w.n === selectedWeek) : WEEKS).map(w => {
              const ph = phaseForWeek(w.n);
              return (
                <div key={w.n} style={{
                  background: "#0D1626", border: `1px solid ${ph.color}40`,
                  borderLeft: `3px solid ${ph.color}`, borderRadius: 8,
                  marginBottom: 12, overflow: "hidden",
                }}>
                  <div style={{
                    padding: "12px 16px", cursor: "pointer", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                    background: selectedWeek === w.n ? "#111827" : "transparent",
                  }}
                    onClick={() => setSelectedWeek(selectedWeek === w.n ? null : w.n)}>
                    <div>
                      <span style={{ fontSize: 9, letterSpacing: 2, color: ph.color }}>{ph.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", marginLeft: 10, fontFamily: "system-ui" }}>
                        Week {w.n} · {w.dates}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: ph.color }}>{w.miles} mi</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>LONG: {w.longRun}</div>
                    </div>
                  </div>

                  {selectedWeek === w.n && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "system-ui", marginBottom: 12, lineHeight: 1.6 }}>
                        {w.focus}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {w.workouts.map((wo, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "8px 10px", background: "#080D18",
                            borderRadius: 4, border: "1px solid #1E293B",
                          }}>
                            <div style={{ width: 28, fontSize: 9, color: "#64748B", letterSpacing: 1 }}>{wo.day}</div>
                            <div style={{
                              fontSize: 7, letterSpacing: 1, padding: "2px 6px", borderRadius: 3,
                              background: typeColors[wo.type] + "20", color: typeColors[wo.type],
                              minWidth: 60, textAlign: "center",
                            }}>
                              {typeLabels[wo.type]}
                            </div>
                            <div style={{ fontSize: 11, color: "#CBD5E1", fontFamily: "system-ui", flex: 1 }}>{wo.desc}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 10, padding: "10px 12px", background: "#1C2333",
                        borderRadius: 4, fontSize: 10, color: "#93C5FD",
                        fontFamily: "system-ui", lineHeight: 1.6, borderLeft: "2px solid #3B82F6",
                      }}>
                        💡 {w.note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "race" && (
          <div>
            <div style={{ background: "#0D1626", border: "1px solid #1E293B", borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 4 }}>TARGET FINISH · 6:00AM START SAT</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#F59E0B", fontFamily: "system-ui" }}>23:50</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>~5:50am Sunday · 14:18/mi average · four 25-mile laps</div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "system-ui", marginTop: 8, lineHeight: 1.6 }}>
                Official cutoff is 12:00pm Sunday (30 hours), so a finish has wide margin.
                Sub-24 is the stretch target, not the requirement.
              </div>
            </div>

            <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 12 }}>LAP SPLITS · POSITIVE SPLIT BY DESIGN</div>
            {RACE_SEGMENTS.map((seg, i) => (
              <div key={i} style={{
                background: "#0D1626", border: `1px solid ${segColors[seg.type]}30`,
                borderLeft: `3px solid ${segColors[seg.type]}`, borderRadius: 6,
                padding: "14px 16px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: segColors[seg.type] }}>{seg.miles}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "#F8FAFC" }}>{seg.pace}</div>
                    <div style={{ fontSize: 9, color: "#64748B" }}>ELAPSED {seg.cumTime} · {seg.clock}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.6 }}>{seg.strategy}</div>
              </div>
            ))}

            <div style={{ marginTop: 20, background: "#0D1626", border: "1px solid #1E293B", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 14 }}>SUB-24 VIABILITY FROM YOUR DATA</div>
              {[
                ["Jun 28 long run", "13.6mi @ ~14:00/mi", "You deliberately slowed — exactly the race skill", "#10B981"],
                ["Jul 9 PA Trail", "9mi @ 10:29/mi", "Engine is intact even while managing the knee", "#10B981"],
                ["Goal pace needed", "14:24/mi avg", "~24s/mi slower than your relaxed long-run pace", "#10B981"],
                ["VO₂max (Apple Watch)", "45 ml/kg/min", "Sufficient for sub-24 on flat terrain", "#10B981"],
                ["Resting HR", "~60 bpm", "Healthy aerobic base, no red flags", "#10B981"],
                ["Left knee / shin", "Recovering", "The one real variable — plan is built around it", "#F59E0B"],
              ].map(([metric, val, note, c]) => (
                <div key={metric} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, marginTop: 3, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "system-ui" }}>{metric}</span>
                      <span style={{ fontSize: 10, color: c }}>{val}</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#475569", fontFamily: "system-ui", marginTop: 2 }}>{note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, background: "#1A0A00", border: "1px solid #F59E0B30", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", marginBottom: 6 }}>CREW ACCESS — ONLY THREE POINTS</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7, marginBottom: 12 }}>
                Crews may meet you <strong>only</strong> at Start–Finish, Wathena (mile 13), and
                Roseport Landing (mile 19). No support anywhere else on course — no stashing food,
                drink, or clothing. Crew vehicles on <em>any</em> unpaved portion of the course means
                immediate disqualification, no exceptions. Brief every crew member on this before
                race day; you are held accountable for their conduct.
              </div>
              {[
                ["Lap 1", "6:00am start", "Wathena 13 · Roseport 19 · Finish lap at 25 (~11:20am)"],
                ["Lap 2", "~11:20am", "Wathena 38 · Roseport 44 · Lap done at 50 (~5:05pm) — grab lights here"],
                ["Lap 3", "~5:05pm", "Wathena 63 · Roseport 69 · Lap done at 75 (~11:20pm) — hot food on"],
                ["Lap 4", "~11:20pm", "Wathena 88 · Roseport 94 · Finish 100 (~5:50am)"],
              ].map(([lap, t, pts]) => (
                <div key={lap} style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#F59E0B" }}>{lap}</span>
                  <span style={{ fontSize: 10, color: "#475569", marginLeft: 8 }}>{t}</span>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 2 }}>{pts}</div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 6, lineHeight: 1.6 }}>
                That's 12 crew contacts across the race — far more than most 100s. Your crew can
                drive between Wathena and Roseport on paved roads and see you roughly every 6 miles
                of running. Give them a ±30min window early and ±2hr by lap 4.
              </div>

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", margin: "18px 0 10px" }}>PACER RULES (READ CAREFULLY)</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7 }}>
                • <strong>One pacer at a time</strong> — you may rotate people and pass the bib, but only one on course with you.<br />
                • Allowed <strong>only after you complete lap 1</strong> (mile 25).<br />
                • May join at any manned aid station <em>except</em> Children of the Corn (mile 6.5).<br />
                • Pacer bibs come from packet pickup Friday at Tubes, in exchange for a bag of pet food.<br />
                • <strong>No muling</strong> — pacers cannot carry your supplies or give physical assistance.<br />
                • Pacer rule violations get <em>you</em> disqualified. Brief them properly.<br />
                • Practical plan: fresh pacer at 50, another at 75. That covers the whole night.
              </div>

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", margin: "18px 0 10px" }}>CREW ROLES</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7, marginBottom: 10 }}>
                With more than one person, assign roles before race day. Crews get slower, not
                faster, when everyone tries to help at once — one person owns each job, one person
                is in charge.
              </div>
              {[
                ["Crew chief", "Owns the plan and the clock. Tracks your lap splits against the 4:00am mile-75 cutoff. The only person who overrules the plan."],
                ["Nutrition", "Next bottle mixed and food ready before you arrive. Tracks what you've actually eaten — by lap 3 you won't remember."],
                ["Gear", "Shoes, socks, lights, batteries, layers. Owns the sunset handoff at ~mile 50 and the four drop bags."],
                ["Pacer(s)", "One at a time, post-lap-1. Rotate at 50 and 75 so each gets fresh legs into the night."],
                ["Driver / logistics", "Gets the crew to Wathena and Roseport early, on paved roads only. Never the same person as the crew chief."],
              ].map(([role, note]) => (
                <div key={role} style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#F8FAFC", fontWeight: 600, fontFamily: "system-ui" }}>{role}</span>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 2, lineHeight: 1.6 }}>{note}</div>
                </div>
              ))}

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#EF4444", margin: "18px 0 10px" }}>MANDATORY GEAR — DQ IF MISSING</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.8 }}>
                • <strong>Personal hydration at all times</strong> — handheld, belt, vest, or bladder. Unmanned stations have no cups.<br />
                • <strong>Headlamp</strong> any time before sunrise or after sunset (sunset 6:27pm, sunrise 7:39am Sun).<br />
                • <strong>Reflective belt or vest, ANSI Class-1, 155+ sq in</strong>, required after sunset. The handbook is explicit that failure to comply means disqualification.<br />
                • Bib visible on front of torso or thigh at all times.<br />
                • 50/100-mile runners must <strong>check in with a race official at every manned aid station after lap 1</strong>.
              </div>

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", margin: "18px 0 10px" }}>DROP BAG PLAN (4 MAX, TSA CARRY-ON SIZE)</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7 }}>
                Label each with last name, bib number, and station in large block letters. Drop at
                Tubes Friday night, or at Start–Finish by 5:00am Saturday.
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.8, marginTop: 8 }}>
                • <strong>Start–Finish</strong> — the big one. Hit it 4× (miles 0/25/50/75). Lights, vest, dry shoes, spare socks, warm layer, backup nutrition.<br />
                • <strong>Wathena (13)</strong> — hit 4× at miles 13/38/63/88. Socks, lube, nutrition top-up.<br />
                • <strong>Roseport (19)</strong> — hit 4× at miles 19/44/69/94. Same idea, lighter.<br />
                • <strong>Children of the Corn (6.5)</strong> — no crew here, so this bag matters more. Hit at 6.5/31.5/56.5/81.5.
              </div>

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#EF4444", margin: "18px 0 10px" }}>CUTOFFS</div>
              {CUTOFFS.map((c) => (
                <div key={c.what} style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#F8FAFC", fontFamily: "system-ui", fontWeight: 600 }}>{c.what}</span>
                  <span style={{ fontSize: 11, color: "#EF4444", marginLeft: 10 }}>{c.when}</span>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 2, lineHeight: 1.6 }}>{c.note}</div>
                </div>
              ))}

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", margin: "18px 0 10px" }}>AID STATIONS PER LAP</div>
              {AID_STATIONS.map((a) => (
                <div key={a.name} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#F59E0B" }}>Mile {a.mile}</span>
                  <span style={{ fontSize: 11, color: "#F8FAFC", marginLeft: 8, fontFamily: "system-ui" }}>{a.name}</span>
                  {a.crew && <span style={{ fontSize: 8, color: "#10B981", marginLeft: 8, letterSpacing: 1 }}>CREW OK</span>}
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 2 }}>{a.note}</div>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 8, lineHeight: 1.6 }}>
                Unmanned water/snack stops sit roughly halfway between each manned station. Manned
                stations turn on hot coffee, soup, and hot food from late afternoon onward — plan to
                use them from lap 3.
              </div>

              <div style={{ fontSize: 9, letterSpacing: 3, color: "#F59E0B", margin: "18px 0 10px" }}>BRIEF THE WHOLE CREW ON</div>
              <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.8 }}>
                • The three legal crew points, and that vehicles on unpaved roads = your DQ.<br />
                • Your lap splits with a ±30min window early, ±2hr by lap 4.<br />
                • What "bad" looks like for you, and that a low point on lap 4 is normal, not an emergency.<br />
                • Signs that are <em>not</em> normal: confusion, no urine output, chest pain, uncontrolled vomiting. Agree in advance the crew chief has that call.<br />
                • Rotate their rest. A crew awake 24 hours makes bad decisions too.<br />
                • Lap-based course means you pass the start-finish 4×, so a car there is a warm base for off-duty crew.
              </div>
            </div>
          </div>
        )}

        {activeTab === "rehab" && (
          <div>
            <div style={{ background: "#052E16", border: "1px solid #10B98130", borderLeft: "3px solid #10B981", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#10B981", marginBottom: 8, fontFamily: "system-ui" }}>
                You're already doing this right
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7 }}>
                Your recent logs show a deliberate shift toward tendon- and shin-friendly work: isometric knee holds (Leg Extension - Knee Hold, 20lb / 30s), ankle band mobility, weighted calf stretches, backward treadmill walking, and a recovery bike. That's a well-constructed self-rehab for left-sided patellofemoral and shin irritation. This plan keeps that protocol as a permanent fixture, not a temporary fix.
              </div>
            </div>

            <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 12 }}>KEEP DOING (2–4×/WEEK)</div>
            {[
              ["Isometric knee holds", "Your Leg Extension - Knee Hold (light load, 30s holds). Isometrics calm patellar tendon pain and build tolerance without aggravating. Progress load slowly, only pain-free.", "#8B5CF6"],
              ["Ankle band mobility", "Restores dorsiflexion — limited ankle motion is a common driver of both shin stress and knee load. Keep it daily; it's low-cost insurance.", "#3B82F6"],
              ["Weighted calf stretch + single-leg calf press", "A strong, mobile calf offloads the shin (tibialis) and absorbs landing forces. Your single-leg incline calf press at 20 reps is ideal high-rep tendon work.", "#10B981"],
              ["Backward treadmill walking", "Loads the VMO and tibialis anterior with minimal joint stress — excellent for both patellofemoral pain and shin splints. Keep 5 min, 2–3×/week.", "#F59E0B"],
              ["Hip abduction / adduction", "Weak hips let the knee collapse inward under fatigue — the exact failure mode at mile 80. Your machine work here is directly protective.", "#EF4444"],
            ].map(([title, body, c]) => (
              <div key={title} style={{
                background: "#0D1626", border: `1px solid ${c}30`, borderLeft: `3px solid ${c}`,
                borderRadius: 6, padding: "12px 14px", marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c, marginBottom: 4, fontFamily: "system-ui" }}>{title}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.6 }}>{body}</div>
              </div>
            ))}

            <div style={{ marginTop: 16, background: "#1A0000", border: "1px solid #EF444440", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#EF4444", marginBottom: 12 }}>STOP-LIGHT RULES (RESPECT THESE)</div>
              {[
                ["🟢 GREEN", "Mild ache that warms up and fades within a mile, gone by next morning. Proceed as planned."],
                ["🟡 YELLOW", "Ache that lingers after runs or is stiff the next morning. Hold mileage flat, add a rehab day, drop tempo. Don't advance to the next week's volume."],
                ["🔴 RED", "Sharp/localized pain, pain that changes your gait, or shin pain to the touch over a small spot. Stop running. Rest 3–5 days, rehab only. Shin point-tenderness can signal a stress reaction — see a sports doc before resuming."],
              ].map(([light, rule]) => (
                <div key={light} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#F8FAFC", fontFamily: "system-ui", fontWeight: 600 }}>{light}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "system-ui", marginTop: 3, lineHeight: 1.6 }}>{rule}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, background: "#0D1626", border: "1px solid #1E293B", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 12 }}>RUNNING TWEAKS THAT PROTECT THE KNEE/SHIN</div>
              {[
                ["Cadence", "Your runs sit around 76–80 spm at cadence — good. Keeping quick, light steps reduces impact per stride. On tired long runs, don't let it drop below ~72."],
                ["Surface", "Favor soft surfaces (trail, dirt, the levee grass) for easy and tired-legs runs. Your Dirt Church and trail runs are ideal. Save pavement for shorter efforts."],
                ["Downhills", "Steep descents are the biggest patellofemoral and shin aggravator. The course is genuinely flat — 138ft of gain per 25-mile lap — so flat training routes are both knee-friendly and race-specific."],
                ["Run/walk early", "Building a run/walk rhythm into training (not just the race) reduces cumulative knee load and is exactly how you'll run the 100 anyway."],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1E293B" }}>
                  <div style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "system-ui", fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: 10, color: "#64748B", fontFamily: "system-ui", marginTop: 3, lineHeight: 1.6 }}>{v}</div>
                </div>
              ))}
              <div style={{ fontSize: 9, color: "#475569", fontFamily: "system-ui", marginTop: 6, fontStyle: "italic" }}>
                Not medical advice — if the shin develops a specific tender spot or pain worsens, get it assessed before pushing on.
              </div>
            </div>
          </div>
        )}

        {activeTab === "intel" && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 14 }}>ANALYSIS FROM YOUR RECENT STRAVA + HEALTH DATA</div>
            {[
              {
                title: "Smart Injury Management — Keep It Up",
                color: "#10B981",
                body: "Since late June you've kept running through the knee/shin issue rather than shutting down, while adding real rehab (isometric knee holds, ankle mobility, backward walking, calf work). That's the right call — total rest deconditions you, and modified running maintains fitness. The whole plan is gated on this: we only ramp when two clean weeks confirm the tissue is ready.",
              },
              {
                title: "The Engine Is Still There",
                color: "#3B82F6",
                body: "Even while managing the injury, you ran 13.6mi on June 28 (deliberately slowing when you felt good — perfect 100-mile instinct) and 9mi on the PA Trail July 9 at 10:29/mi with Patrick S. Your relaxed long-run pace is 1.5–2 min/mi faster than the 14:24/mi you need for sub-24. Fitness isn't the limiter; staying healthy is.",
              },
              {
                title: "Current Volume: ~28 mi/wk",
                color: "#F59E0B",
                body: "Your last two weeks ran ~27–28 running miles each, down slightly from spring as you protect the leg. That's the honest starting point, so the plan reintros from there rather than assuming your April/May peak. The ramp to a 62-mile peak over 10 weeks respects a safe ~10%/week progression with three cutback weeks built in.",
              },
              {
                title: "Night Running: A Real Advantage",
                color: "#A78BFA",
                body: "Your Strava is full of night runs and you've nailed midnight long efforts. SMYFS runs into the dark, so this is a genuine edge. The Week 10 peak long run is scheduled as a 9–10pm 30-miler specifically to rehearse racing through the night with your crew running mobile aid.",
              },
              {
                title: "Strength: Reduce Volume, Keep Frequency",
                color: "#8B5CF6",
                body: "You're in the gym nearly daily. During peak weeks (7–11), keep the frequency but cut volume ~30% and prioritize the rehab and single-leg work over heavy loading — especially the Monday after B2B weekends when your legs need recovery, not stimulus. Never drop dead hangs; they help on technical descents and with poles.",
              },
              {
                title: "Flat Course = Your Weekends Are Harder",
                color: "#EF4444",
                body: "The handbook confirms it: 138 feet of gain per 25-mile lap, roughly 550ft over 100 miles. Ten miles per lap is quiet pavement, the rest is maintained gravel and crushed-limestone levee path, plus one dirt mile through a cornfield that turns muddy if it rains. Your B2B weekends generate more cumulative fatigue than this terrain will. Flat training protects the knee AND is race-specific.",
              },
              {
                title: "Shoe Rotation: Pick the Race Pair Early",
                color: "#10B981",
                body: "The handbook says road or trail shoes both work. Given ~10 paved miles per lap and the rest gravel/limestone, a cushioned road or light hybrid shoe beats an aggressive trail shoe. Pick the pair with 100–200mi on it and log a taper long run in it. Stage a second dry pair in your mile-50 drop bag — four laps means four chances for wet feet, especially if the cornfield mile is muddy.",
              },
            ].map(item => (
              <div key={item.title} style={{
                background: "#0D1626", border: `1px solid ${item.color}30`,
                borderLeft: `3px solid ${item.color}`, borderRadius: 6,
                padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.color, marginBottom: 6, fontFamily: "system-ui" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "system-ui", lineHeight: 1.7 }}>{item.body}</div>
              </div>
            ))}

            <div style={{ marginTop: 8, background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: "#64748B", marginBottom: 12 }}>METRICS TO TRACK WEEKLY</div>
              {[
                ["Knee / shin status", "The #1 metric. Log a green/yellow/red each day. Yellow = hold; red = stop. Everything else is secondary to this."],
                ["COROS 7-day Training Load", "Stay 250–450 in build, 350–500 in peak. Flag if >600 — you've spiked there before."],
                ["Oura HRV (morning)", "Baseline it now. 10%+ drop = ease off. 15%+ = rest day."],
                ["Resting HR", "Your avg is ~60 bpm. Three days at 64+ = back off."],
                ["Long-run avg pace", "Hold 12:45–14:00/mi for Z2. Faster means you're not recovering between hard days."],
                ["Calories on long runs", "Log intake. Target 200–250 cal/hr and fix any gut issues in training, not on race day."],
              ].map(([metric, note]) => (
                <div key={metric} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #1E293B" }}>
                  <div style={{ fontSize: 10, color: "#CBD5E1", fontFamily: "system-ui" }}>{metric}</div>
                  <div style={{ fontSize: 10, color: "#64748B", fontFamily: "system-ui", marginTop: 3 }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "compliance" && <ComplianceTab />}
      </div>

      <div style={{ textAlign: "center", padding: 20, fontSize: 9, color: "#1E293B", letterSpacing: 2 }}>
        SMYFS 100 · OCT 24 2026 · WATHENA KS · 15 WEEKS FROM JUL 11 · BUILT FROM STRAVA + APPLE HEALTH
      </div>
    </div>
  );
}
