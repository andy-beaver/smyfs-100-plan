# SMYFS 100 · Training Plan

An interactive 15-week training plan for the **Show Me Your Free State 100 Mile Ultramarathon** (Wathena, KS · Oct 24, 2026). Built with Vite + React and deployed to GitHub Pages.

Tabs: Overview · Week by Week · Race Strategy · Knee/Shin · Training Intel.

---

## Publish to GitHub Pages (one-time setup)

### 1. Create the repo and push

```bash
# from inside this folder
git init
git add .
git commit -m "Initial commit: SMYFS 100 training plan"
git branch -M main

# create an empty repo on github.com first (no README), then:
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Turn on Pages

In your repo on GitHub: **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.

That's it. The included workflow (`.github/workflows/deploy.yml`) builds the site and deploys it on every push to `main`. Watch progress under the **Actions** tab.

### 3. Visit your site

Once the workflow finishes (~1 min), your plan is live at:

```
https://<your-username>.github.io/<your-repo>/
```

The site URL also appears in the Actions run summary under the `deploy` job.

---

## Run locally

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build into ./dist
npm run preview  # preview the production build
```

Requires Node 18+ (the deploy workflow uses Node 20).

---

## Editing the plan

All plan content lives at the top of **`src/App.jsx`** in plain data arrays:

- `WEEKS` — every week's mileage, long run, daily workouts, and coaching note.
- `PHASES` — phase names, which weeks belong to each, and colors.
- `RACE_SEGMENTS` — the pacing plan and cumulative times.

Change the numbers or text, commit, and push — the site redeploys automatically. No build tooling knowledge needed to update workouts.

### Common tweaks

| Want to... | Edit |
| --- | --- |
| Change a week's mileage or workouts | the matching object in `WEEKS` |
| Adjust the target finish time | the `23:54` value in the Race Strategy section of `App.jsx` |
| Recolor a phase | the `color` / `bg` in `PHASES` |
| Update the knee/shin rehab notes | the `rehab` tab block in `App.jsx` |

---

## Notes

- `vite.config.js` sets `base: "./"` so the site works on a project Pages URL without hardcoding the repo name — rename the repo freely.
- No external UI libraries; everything is inline-styled React, so there are no extra dependencies to break.
- This plan is informational and not medical advice. Respect the stop-light rules on the Knee/Shin tab.

---

## 📅 Calendar subscription (.ics feed)

The site publishes a subscribable calendar at `/smyfs-100-plan.ics` containing all 105 workouts as all-day events, with evening-before reminders on long runs, back-to-backs, and race day.

**How it works:** `scripts/generate-ics.mjs` reads the plan from `src/plan-data.js` and writes `public/smyfs-100-plan.ics`. This runs automatically before every build (`prebuild`), and Vite copies everything in `public/` to the site root. Edit the plan, push, and subscribers' calendars update automatically (feeds refresh roughly daily, depending on the calendar app).

**Subscribing on iPhone:** visitors just tap the **Subscribe on iPhone** button on the site — it opens a `webcal://` link that iOS hands straight to the Calendar app. Or manually: Settings → Apps → Calendar → Calendar Accounts → Add Account → Other → Add Subscribed Calendar, then paste the calendar URL.

**Google Calendar:** Settings → Add calendar → From URL → paste the `.ics` URL.

**Note:** subscribers can't edit events (it's read-only by design), and unsubscribing removes everything cleanly — no calendar clutter.

---

## 📊 Strava compliance sync

The site can show planned vs. actual training in a **Compliance** tab: weekly mileage
adherence, per-day done/partial/missed marks, and links to the matching Strava activities.

`scripts/sync-strava.mjs` pulls your activities, matches them against the plan, and writes
`public/compliance.json`. It runs inside the deploy workflow — on every push and nightly at
09:00 UTC — so the published site refreshes itself without you doing anything.

### One-time setup

**1. Create a Strava API application**

Go to <https://www.strava.com/settings/api> and create an app. Any name works. Set
**Authorization Callback Domain** to `localhost`. Note your **Client ID** and **Client Secret**.

**2. Authorize your own account and get a refresh token**

Open this URL in a browser, substituting your client ID:

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=activity:read_all
```

Click Authorize. The browser lands on a `localhost` page that fails to load — that's expected.
Copy the `code=...` value out of the address bar, then exchange it for tokens:

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=THE_CODE_FROM_THE_URL \
  -d grant_type=authorization_code
```

The response contains a `refresh_token`. That's the long-lived credential you need.

**3. Add repository secrets**

In your repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
| --- | --- |
| `STRAVA_CLIENT_ID` | from step 1 |
| `STRAVA_CLIENT_SECRET` | from step 1 |
| `STRAVA_REFRESH_TOKEN` | from step 2 |

Then trigger a run: **Actions → Build and deploy to GitHub Pages → Run workflow**.

### Privacy

`compliance.json` is generated at build time and is **git-ignored**, so your activity data is
never committed to the repo's history — it only exists on the deployed site.

Bear in mind the deployed site is public. By default the Compliance tab lists activity names
and links. To publish only aggregate numbers, add a repository *variable* (not secret) named
`PRIVACY_MODE` set to `minimal` — activity names, links, and heart-rate data are then omitted.

### How matching works

- **Plan weeks run Monday->Sunday**, matching Strava's weekly boundaries, so weekly totals
  here line up exactly with what Strava reports.
- Activities are matched to plan days by **local calendar date**.
- A day is **done** at ≥85% of its target distance, **partial** at ≥50%, **missed** below that.
- **Weekly totals are the metric that matters** — a run shifted from Tuesday to Wednesday
  still counts toward the week, which is how ultra training actually goes.
- Gym days show **not tracked** rather than "missed" unless a strength activity reaches Strava,
  since lifting is logged in Hevy.
- Target distances are parsed from the workout text (`"20mi at goal race effort (~14:00/mi)"` →
  20 miles, correctly ignoring the pace). See `scripts/plan-utils.mjs`.

> **Note on weekly totals:** each week's stated mileage is slightly higher than the sum of its
> itemised day targets (warm-ups and gym-day shakeouts aren't all written out). Week-level
> compliance uses the stated total, so a "100%" week means you hit the real planned volume.

### Testing without credentials

```bash
node scripts/sync-strava.mjs --mock
npm run dev
```

This writes a `compliance.json` built from synthetic activities so you can see the tab populated
before wiring up Strava.

### Token expiry

Strava occasionally rotates refresh tokens. If that happens the sync step logs a warning with the
new token — update the `STRAVA_REFRESH_TOKEN` secret and re-run. The sync step is marked
`continue-on-error`, so a failure here never blocks the site from deploying.
