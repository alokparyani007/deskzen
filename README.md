# SitGlow

**Sit better. Feel brighter.**

SitGlow is a browser-based desk-health app that uses your webcam, entirely on your device, to gently nudge your posture, remind you to move, and track your progress. It installs as a PWA and works on any modern desktop browser.

> SitGlow is a wellness tool. It is not a medical device and does not diagnose, treat, or cure any condition.

---

## Features

**Phase 1: MVP**
- Camera permission and friendly onboarding
- Calibration: "Let's find your best posture" (hold still 3 seconds, save your baseline)
- Live posture score (0-100), compared with *your own* best posture
- Gentle nudges ("Lean back a little", with Fixed it / Snooze options)
- Break reminders
- Privacy screen that explains exactly what happens with your camera

**Phase 2**
- Guided stretch library
- Focus mode (fewer interruptions, batched reminders)
- Neck check
- Screen-distance alerts
- Progress dashboard: daily score, streaks, weekly trends
- Desktop notifications
- Floating picture-in-picture mini camera widget

**Phase 3**
- Phone companion view
- Team challenges
- Streak rewards

**Phase 4: SitGlow for Teams**
- Anonymous team wellbeing dashboard to support workplace ergonomics programs
- Admin console
- Ergonomics program reports
- SSO

## Privacy

- **Your camera never leaves your device.** All pose and face tracking runs in your browser.
- **No video or images are stored or uploaded. Ever.**
- Only small numbers (scores, streaks, settings) are saved, locally in your browser (IndexedDB / localStorage).
- You can pause the camera or delete all your data at any time.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript (strict)
- [Tailwind CSS](https://tailwindcss.com/) with the SitGlow brand theme
- PWA (installable, works offline after first load) via `vite-plugin-pwa`
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js): Pose Landmarker + Face Landmarker (with iris), running in the browser
- Local storage only: IndexedDB (history) + localStorage (settings)

## Getting started

New to code? Read **[START-HERE.md](START-HERE.md)** first.

Once the app has been scaffolded (prompt 01):

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually http://localhost:5173) and allow camera access.

## Project layout

```
.cursor/rules/sitglow.mdc   Project rules Cursor's Agent always follows
docs/                       Product spec, posture engine, brand, landing copy
design/                     Mockups, logo concepts, marketing assets (see design/README.md)
prompts/                    Step-by-step prompts to paste into Cursor's Agent
```

## Roadmap

- [ ] 01 Scaffold: Vite + React + TS + Tailwind + PWA, brand theme, app shell
- [ ] 02 Camera + MediaPipe with live landmark overlay
- [ ] 03 Calibration flow
- [ ] 04 Posture engine + live score
- [ ] 05 Nudges, break reminders, notifications, floating mini widget
- [ ] 06 Stretch library + focus mode
- [ ] 07 Progress dashboard + streaks
- [ ] 08 Landing page + waitlist form
- [ ] Phase 2 extras: neck check, screen-distance alerts
- [ ] Phase 3: phone companion, team challenges, streak rewards
- [ ] Phase 4: Teams dashboard, admin console, reports, SSO

---

All rights reserved © 2026 SitGlow
