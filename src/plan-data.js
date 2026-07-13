// Single source of truth for the training plan.
// Used by the app (src/App.jsx) and the ICS generator (scripts/generate-ics.mjs).

// Week 1 begins on this Sunday. All workout dates derive from it.
export const PLAN_START = "2026-07-12"; // Sun Jul 12 2026

export const PHASES = [
  { id: "reintro", label: "REINTRO", weeks: [1, 2], color: "#10B981", bg: "#052E16" },
  { id: "build", label: "BUILD", weeks: [3, 4, 5, 6], color: "#3B82F6", bg: "#0C1A2E" },
  { id: "peak", label: "PEAK", weeks: [7, 8, 9, 10, 11], color: "#F59E0B", bg: "#1C0F00" },
  { id: "taper", label: "TAPER", weeks: [12, 13, 14], color: "#A78BFA", bg: "#0F0B1E" },
  { id: "race", label: "RACE", weeks: [15], color: "#EF4444", bg: "#1A0000" },
];

export const WEEKS = [
  {
    n: 1, dates: "Jul 12 – Jul 18", phase: "reintro", miles: 32, longRun: "12mi easy",
    focus: "Reintro at current volume. Confirm the knee/shin are settling before any ramp. Keep the rehab you're already doing.",
    workouts: [
      { day: "Sun", type: "long", desc: "12mi easy (Z2, run/walk if any shin niggle)" },
      { day: "Mon", type: "gym", desc: "Rehab: knee-hold isometrics + ankle band + calf stretch" },
      { day: "Tue", type: "easy", desc: "5mi easy — stop if sharp knee pain" },
      { day: "Wed", type: "gym", desc: "Gym upper + backward treadmill walk 5 min" },
      { day: "Thu", type: "mid", desc: "6mi easy on soft surface if possible" },
      { day: "Fri", type: "gym", desc: "Gym + hip abduction/adduction" },
      { day: "Sat", type: "rest", desc: "Walk + full mobility session" },
    ],
    note: "You're at ~28mi/wk right now while managing the knee. Week 1 barely nudges that. The rule this week: if the shin or knee talks back the next morning, repeat this week before moving on."
  },
  {
    n: 2, dates: "Jul 19 – Jul 25", phase: "reintro", miles: 38, longRun: "15mi easy",
    focus: "Small step up. Long run stays gentle. Rehab stays daily. Prove the tissue can take slightly more.",
    workouts: [
      { day: "Sun", type: "long", desc: "15mi easy — keep your 'slow even when I feel good' discipline" },
      { day: "Mon", type: "gym", desc: "Rehab block + single-leg calf press" },
      { day: "Tue", type: "easy", desc: "6mi easy" },
      { day: "Wed", type: "gym", desc: "Gym upper + backward walk" },
      { day: "Thu", type: "mid", desc: "7mi easy" },
      { day: "Fri", type: "gym", desc: "Gym legs (light) + ankle band mobility" },
      { day: "Sat", type: "easy", desc: "4mi recovery run" },
    ],
    note: "Your June 28 long run (13.6mi at ~14:00/mi, deliberately slowed) is exactly the effort to hold here. Patience now is what makes the peak weeks possible."
  },
  {
    n: 3, dates: "Jul 26 – Aug 1", phase: "build", miles: 44, longRun: "16mi",
    focus: "Build begins — but only if week 2 felt clean. Introduce very gentle tempo. Keep rehab 3x/week minimum.",
    workouts: [
      { day: "Sat", type: "long", desc: "16mi easy — practice race nutrition every 45 min" },
      { day: "Sun", type: "easy", desc: "5mi easy shakeout" },
      { day: "Mon", type: "gym", desc: "Rehab + legs (keep isometric knee holds)" },
      { day: "Tue", type: "mid", desc: "8mi with 3x8 min gentle tempo (back off if knee flares)" },
      { day: "Wed", type: "gym", desc: "Gym upper + backward walk" },
      { day: "Thu", type: "easy", desc: "6mi easy" },
      { day: "Fri", type: "gym", desc: "Gym + mobility" },
    ],
    note: "Tempo is your identified gap, but with a cranky knee we keep it SHORT and on flat, soft ground. 3x8 min comfortably hard is plenty. Downhill running is the shin/knee aggravator — avoid steep descents on tempo days."
  },
  {
    n: 4, dates: "Aug 2 – Aug 8", phase: "build", miles: 48, longRun: "18mi",
    focus: "Push mileage. First 18-miler of the block. Nutrition rehearsal mandatory.",
    workouts: [
      { day: "Sat", type: "long", desc: "18mi — dial in gels/real food, aim 200–250 cal/hr" },
      { day: "Sun", type: "easy", desc: "5mi easy B2B taste" },
      { day: "Mon", type: "gym", desc: "Rehab + legs" },
      { day: "Tue", type: "mid", desc: "9mi with 3x10 min tempo" },
      { day: "Wed", type: "gym", desc: "Gym upper" },
      { day: "Thu", type: "easy", desc: "6mi easy" },
      { day: "Fri", type: "gym", desc: "Gym + 2mi shakeout" },
    ],
    note: "Check morning resting HR this week — your baseline is ~60 bpm. Three straight days at 64+ means back off regardless of how the legs feel."
  },
  {
    n: 5, dates: "Aug 9 – Aug 15", phase: "build", miles: 38, longRun: "14mi",
    focus: "⬇ First real cutback. Down ~20%. This is where the knee/shin bank recovery. Do NOT skip it.",
    workouts: [
      { day: "Sat", type: "long", desc: "14mi easy Z2" },
      { day: "Sun", type: "rest", desc: "Walk + hydro bed" },
      { day: "Mon", type: "gym", desc: "Rehab + legs (full routine returns)" },
      { day: "Tue", type: "easy", desc: "6mi easy" },
      { day: "Wed", type: "gym", desc: "Gym upper" },
      { day: "Thu", type: "mid", desc: "7mi easy" },
      { day: "Fri", type: "gym", desc: "Gym + stretch" },
    ],
    note: "Your COROS load spikes high (you hit 236 TL on June 28 alone). Cutback weeks are the counterweight. Check Oura HRV — if it's up vs the last few weeks, you're absorbing the load well."
  },
  {
    n: 6, dates: "Aug 16 – Aug 22", phase: "build", miles: 52, longRun: "B2B: 20+12",
    focus: "First back-to-back weekend. This teaches your legs to run tired — the core skill for 100mi.",
    workouts: [
      { day: "Sat", type: "long", desc: "20mi at goal race effort (~14:00/mi)" },
      { day: "Sun", type: "b2b", desc: "12mi easy on tired legs — the point is fatigue" },
      { day: "Mon", type: "gym", desc: "Rehab + mobility only (legs are cooked)" },
      { day: "Tue", type: "easy", desc: "5mi very easy" },
      { day: "Wed", type: "gym", desc: "Gym upper" },
      { day: "Thu", type: "mid", desc: "8mi easy" },
      { day: "Fri", type: "rest", desc: "Rest or walk" },
    ],
    note: "32mi across the weekend. Watch the shin closely on Sunday's tired-legs run — that's when form breaks down and shin stress builds. Shorten Sunday if needed; don't force it."
  },
  {
    n: 7, dates: "Aug 23 – Aug 29", phase: "peak", miles: 56, longRun: "B2B: 22+16",
    focus: "Peak phase opens. Bigger B2B. Fuel and gear dialed. Gym reduces volume, keeps frequency.",
    workouts: [
      { day: "Sat", type: "long", desc: "22mi steady race effort" },
      { day: "Sun", type: "b2b", desc: "16mi tired — eat and drink the whole way" },
      { day: "Mon", type: "gym", desc: "Rehab + mobility" },
      { day: "Tue", type: "easy", desc: "6mi very easy" },
      { day: "Wed", type: "gym", desc: "Gym light" },
      { day: "Thu", type: "mid", desc: "8mi easy" },
      { day: "Fri", type: "rest", desc: "Rest" },
    ],
    note: "38mi weekend. If SMYFS runs another training event in this window, swap it in as your Saturday long run — course-specific miles beat anything else."
  },
  {
    n: 8, dates: "Aug 30 – Sep 5", phase: "peak", miles: 44, longRun: "18mi",
    focus: "⬇ Cutback inside the peak. Recover hard so weeks 9–10 land. Reassess knee/shin honestly.",
    workouts: [
      { day: "Sat", type: "long", desc: "18mi easy — no race pace" },
      { day: "Sun", type: "rest", desc: "Walk + hydro bed" },
      { day: "Mon", type: "gym", desc: "Rehab + full legs" },
      { day: "Tue", type: "easy", desc: "5mi easy" },
      { day: "Wed", type: "gym", desc: "Gym" },
      { day: "Thu", type: "mid", desc: "7mi easy" },
      { day: "Fri", type: "gym", desc: "Gym + stretch" },
    ],
    note: "Midpoint gut check: if the knee/shin is still flaring at this point, we shift the goal to a confident finish and drop the 30-miler in week 10 to 26. A healthy finish beats a hurt sub-24 attempt."
  },
  {
    n: 9, dates: "Sep 6 – Sep 12", phase: "peak", miles: 60, longRun: "B2B: 22+18",
    focus: "Biggest B2B weekend of the plan. 40mi. This is the key fitness block for the 100.",
    workouts: [
      { day: "Sat", type: "long", desc: "22mi, last 4mi at race pace (13:45/mi)" },
      { day: "Sun", type: "b2b", desc: "18mi — full race nutrition + gear rehearsal" },
      { day: "Mon", type: "gym", desc: "Rehab + mobility only" },
      { day: "Tue", type: "easy", desc: "5mi easy" },
      { day: "Wed", type: "gym", desc: "Gym light" },
      { day: "Thu", type: "mid", desc: "8mi easy" },
      { day: "Fri", type: "rest", desc: "Rest" },
    ],
    note: "Wathena is flat river/levee terrain, so this weekend's cumulative fatigue is harder than the race's hills will be. If you finish this feeling okay, sub-24 is on the table."
  },
  {
    n: 10, dates: "Sep 13 – Sep 19", phase: "peak", miles: 62, longRun: "30mi (night)",
    focus: "🔴 PEAK WEEK. 30-mile single long run at night. Your longest training effort and full dress rehearsal.",
    workouts: [
      { day: "Sat", type: "long", desc: "30mi — start 9–10pm, Sara on mobile aid, full race kit" },
      { day: "Sun", type: "easy", desc: "4mi very easy shakeout" },
      { day: "Mon", type: "gym", desc: "Rehab + mobility" },
      { day: "Tue", type: "easy", desc: "5mi easy" },
      { day: "Wed", type: "gym", desc: "Gym light" },
      { day: "Thu", type: "mid", desc: "9mi moderate" },
      { day: "Fri", type: "gym", desc: "Gym + 2mi easy" },
    ],
    note: "Capped at 30mi (not 32) to protect the knee/shin. Night start matters — SMYFS runs into the dark and you already run strong at night. Test headlamp, layers, and your exact race-day food here."
  },
  {
    n: 11, dates: "Sep 20 – Sep 26", phase: "peak", miles: 48, longRun: "B2B: 18+14",
    focus: "Final quality block before taper. Lower than peak, still race-specific. Then we back off.",
    workouts: [
      { day: "Sat", type: "long", desc: "18mi at easy/moderate effort" },
      { day: "Sun", type: "b2b", desc: "14mi easy B2B" },
      { day: "Mon", type: "gym", desc: "Rehab + legs" },
      { day: "Tue", type: "easy", desc: "5mi easy" },
      { day: "Wed", type: "gym", desc: "Gym" },
      { day: "Thu", type: "mid", desc: "8mi with 2x10 min tempo" },
      { day: "Fri", type: "gym", desc: "Gym + stretch" },
    ],
    note: "Last chance to log meaningful fatigue. After this, the work is done — everything from here is about arriving fresh and healthy."
  },
  {
    n: 12, dates: "Sep 27 – Oct 3", phase: "taper", miles: 40, longRun: "16mi",
    focus: "⬇ Taper begins. Mileage drops ~35%, intensity stays. Legs will feel flat — that's glycogen loading.",
    workouts: [
      { day: "Sat", type: "long", desc: "16mi easy — may feel sluggish, that's normal" },
      { day: "Sun", type: "rest", desc: "Rest or short walk" },
      { day: "Mon", type: "gym", desc: "Rehab + moderate legs (not heavy)" },
      { day: "Tue", type: "easy", desc: "6mi easy + 4x1mi strides" },
      { day: "Wed", type: "gym", desc: "Gym" },
      { day: "Thu", type: "mid", desc: "7mi moderate" },
      { day: "Fri", type: "gym", desc: "Gym light" },
    ],
    note: "Taper madness hits here — you'll feel out of shape and want to add miles. Don't. Your fitness is banked. Start prepping drop bags and your aid-station plan with Sara."
  },
  {
    n: 13, dates: "Oct 4 – Oct 10", phase: "taper", miles: 28, longRun: "12mi",
    focus: "Sharpen. Easy miles, stay fresh, lock in gear. Rehab continues but gym goes light.",
    workouts: [
      { day: "Sat", type: "long", desc: "12mi easy — last moderately long run" },
      { day: "Sun", type: "rest", desc: "Rest" },
      { day: "Mon", type: "gym", desc: "Rehab + body-weight/mobility only" },
      { day: "Tue", type: "easy", desc: "5mi easy + strides" },
      { day: "Wed", type: "gym", desc: "Gym stretching focus" },
      { day: "Thu", type: "easy", desc: "4mi easy" },
      { day: "Fri", type: "rest", desc: "Rest" },
    ],
    note: "Final gear check: confirm race shoes have 100–200mi on them (broken in, not worn out), headlamps charged, poles if using, nutrition stocked. Nothing new on race day."
  },
  {
    n: 14, dates: "Oct 11 – Oct 17", phase: "taper", miles: 18, longRun: "8mi",
    focus: "Rest is the training now. Legs should feel springy by Thursday. Bank sleep all week.",
    workouts: [
      { day: "Sat", type: "long", desc: "8mi very easy — enjoy it" },
      { day: "Sun", type: "rest", desc: "Rest" },
      { day: "Mon", type: "gym", desc: "Rehab + mobility only" },
      { day: "Tue", type: "easy", desc: "4mi easy" },
      { day: "Wed", type: "easy", desc: "3mi easy + 4x100m strides" },
      { day: "Thu", type: "rest", desc: "Rest" },
      { day: "Fri", type: "rest", desc: "Rest — travel prep" },
    ],
    note: "Sleep bank: 8–9hrs every night this week. Pre-loaded sleep matters far more than the night before the race, when nerves make sleep hard anyway."
  },
  {
    n: 15, dates: "Oct 18 – Oct 24", phase: "race", miles: 105, longRun: "100mi RACE",
    focus: "🏁 RACE WEEK. Easy shakeouts, rest, eat, drive to Wathena, and run 100 miles Saturday.",
    workouts: [
      { day: "Sun", type: "easy", desc: "3mi very easy shakeout" },
      { day: "Mon", type: "rest", desc: "Rest — keep doing knee/shin mobility" },
      { day: "Tue", type: "easy", desc: "2mi easy walk/jog" },
      { day: "Wed", type: "rest", desc: "Rest — pack bags, finalize crew plan with Sara" },
      { day: "Thu", type: "rest", desc: "Drive to Wathena. Check in. Eat well. Sleep early." },
      { day: "Fri", type: "rest", desc: "Rest. Nap midday. Lay out gear. Eat. Sleep early." },
      { day: "Sat", type: "long", desc: "🔴 SMYFS 100 Mile — RACE DAY (Oct 24)" },
    ],
    note: "Confirm the exact start time with the RD and set Friday's sleep accordingly. Keep your ankle band + calf mobility going even race week — it's kept you healthy this whole block."
  },
];
