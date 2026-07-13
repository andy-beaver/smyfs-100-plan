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
