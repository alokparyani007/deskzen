# SitGlow Product Spec

Browser-based, on-device webcam posture and desk-health PWA for US consumers and teams.
**Tagline:** Sit better. Feel brighter.

Mockup paths are relative to `design/`. "Earlier set" mockups (`screens/earlier-set/`) still show the old name *Desk Habits*; use them for layout only and apply SitGlow branding (see `design/README.md`).

Global acceptance criteria (apply to every screen):
- Uses brand tokens from `docs/brand.md` (no hard-coded hex in components), Inter font.
- Keyboard accessible, visible focus, WCAG AA contrast, screen-reader labels; score and nudge changes announced via `aria-live="polite"`.
- Responsive: desktop (≥1024px) sidebar layout like `screens/desktop-dashboard.jpg`; mobile bottom tab bar like `screens/phone-home.jpg`.
- US English, imperial units, no medical claims.
- No camera-derived data in any network request (verify in DevTools Network tab).

---

## Phase 1: MVP

### 1.1 App shell and navigation
**Mockups:** `screens/desktop-dashboard.jpg`, `screens/phone-home.jpg`
- Sidebar (desktop): logo, Home, Live view, Progress, Reminders, Settings; footer badge "On-device only - Your data stays private".
- Bottom tab bar (mobile): Home, Progress, Reminders, Settings.
- **AC:** Routes render without reload; active tab highlighted in emerald; installable as PWA (manifest, icons, service worker); works offline after first load (except camera models if not cached yet).

### 1.2 Welcome and onboarding
**Mockups:** `screens/earlier-set/01-setup.jpg`, `landing/hero.jpg` (tone)
- 3 short steps: (1) what SitGlow does, (2) privacy promise, (3) camera permission.
- **AC:** Camera is requested only after the user taps "Turn on camera"; denial shows a friendly help screen with browser-specific instructions and a "Try again" button; user can skip to break reminders without camera.

### 1.3 Privacy screen
**Mockups:** footer badge in `screens/desktop-dashboard.jpg`, "Live · on-device · no video saved" in `screens/live-slouch-vs-good-posture.jpg`
- Plain-language explanation: video is processed in your browser; nothing is recorded or uploaded; what numbers are stored locally; "Delete all my data" button; "SitGlow is a wellness tool, not a medical device."
- **AC:** Reachable from onboarding, Settings, and the camera-on indicator. "Delete all my data" clears IndexedDB + localStorage after confirmation and returns to onboarding.

### 1.4 Calibration: "Let's find your best posture"
**Mockups:** `screens/calibration-find-your-best-posture.jpg`, `screens/earlier-set/02-calibration.jpg`
- Live mirrored preview with silhouette guide; checklist tips (feet flat, shoulders relaxed, screen at eye level, about an arm's length away).
- "I'm ready" → 3-second hold countdown with progress ring (amber glow); then "Saved! This is your best posture."
- Optional: "About how far are you from the screen?" (20 / 25 / 30 in) to refine distance estimate.
- **AC:** Baseline saved only if ≥70% good frames and low jitter (see `posture-engine.md` §8); otherwise "Let's try that again" with the reason (moved, too dark, can't see shoulders). Baseline stored locally; recalibrate from Settings.

### 1.5 Live view and posture score
**Mockups:** `screens/live-slouch-vs-good-posture.jpg`, `screens/earlier-set/03-live-view.jpg`, "Posture now" + "Today" cards in `screens/desktop-dashboard.jpg`
- Mirrored webcam preview with optional landmark overlay; score ring 0-100 (green good / amber okay / soft coral low); callouts for active issues ("Leaning in 4 in", "Head dropped", "Shoulders rounded") or positives ("Eye level with screen", "Shoulders relaxed", "24 in from screen").
- **AC:** Score updates smoothly (EMA, no flicker > ±5 at rest); shows "Can't see you clearly" when quality is low; shows "Paused - are you away?" when absent; camera-on indicator and Pause button always visible.

### 1.6 Gentle nudges
**Mockups:** `screens/live-nudge-floating-widget.jpg`
- Card: specific, kind instruction ("Lean back a little - you're 5 in closer than your best"), buttons **Fixed it** and **Snooze 15 min**; success toast "Perfect! Posture back to 90".
- **AC:** Fires only per nudge rules in `posture-engine.md` §6 (sustained 30 s, 5 min cooldown, max 6/hour); responses feed adaptive strictness (§7); never shown during Focus mode quiet periods unless the user allows it.

### 1.7 Break reminders
**Mockups:** banner "You've been sitting 45 minutes" in `screens/desktop-dashboard.jpg`, `screens/stretch-break.jpg`, `screens/earlier-set/05-focus-reminders.jpg`
- Default: every 45 min of presence (configurable 20-90). Optional water reminder.
- **AC:** Timer counts only while the user is present (or wall-clock if camera off); "Take a break" opens a stretch break; "Later" snoozes 10 min; breaks counted on Home ("Breaks: 5 today").

### 1.8 Home (Today)
**Mockups:** `screens/desktop-dashboard.jpg`, `screens/phone-home.jpg`, `screens/earlier-set/04-today-phone.jpg`, `screens/earlier-set/10-today-desktop.jpg`
- Greeting ("Good morning, {name}"), today's score ring, tiles: Sitting well (time), Breaks, Water; "Start break" CTA; webcam preview card; weekly bar chart (Phase 2 data).
- **AC:** All values come from local data; empty states are friendly ("Your first score appears after 5 minutes of tracking").

### 1.9 Settings
- Name, reminder intervals, nudge strictness slider (Gentle ↔ Strict), sounds, notifications opt-in, recalibrate, landmark overlay toggle, privacy + delete data.
- **AC:** Settings persist in localStorage and apply immediately.

---

## Phase 2

### 2.1 Guided stretch library
**Mockups:** `screens/earlier-set/06-stretch-library.jpg`, `screens/stretch-break.jpg`, `screens/earlier-set/07-stretch-break.jpg`
- Categories: Neck, Shoulders, Back, Wrists, Eyes, Legs. Each stretch: photo/illustration, 3-5 steps, duration, gentle timer with next/prev.
- **AC:** At least 12 stretches defined in a typed data file; a break routine is 1-3 min; completion counts as a break; copy avoids medical claims ("may help you feel looser").

### 2.2 Focus mode
**Mockups:** `screens/earlier-set/05-focus-reminders.jpg`
- 25/50/90-min focus sessions; posture still tracked; nudges batched to the end or shown as silent widget glow only.
- **AC:** Focus timer visible; breaks suggested at the end; can end early.

### 2.3 Neck check
**Mockups:** `screens/earlier-set/09-neck-check.jpg`
- 30-second guided check: look up, down, left, right, and level; shows how your head position compares with baseline over the day.
- **AC:** Wording is "check-in", not diagnosis; results stored as numbers only.

### 2.4 Screen-distance alerts
**Mockups:** "24 in from screen" callout in `screens/live-slouch-vs-good-posture.jpg`
- Estimates distance with iris size (`posture-engine.md` §3, signal 5). Alert when < 18 in for 60 s (starting value).
- **AC:** Distance shown in inches, rounded to whole inches; can be disabled.

### 2.5 Progress dashboard, streaks, weekly trends
**Mockups:** `screens/earlier-set/08-progress.jpg`, "This week" chart in `screens/desktop-dashboard.jpg`
- Daily average score, time sitting well, breaks taken, 7-day bar chart, 30-day trend, current streak and best streak (a day counts if average ≥ 70 and ≥ 30 tracked minutes, starting rule).
- **AC:** Data aggregated per minute into IndexedDB (no raw frames); charts accessible (table fallback); day boundary uses local time.

### 2.6 Desktop notifications
- Uses Notification API after explicit opt-in; only when tab is hidden.
- **AC:** Clicking a notification focuses the app; no notification spam (same rules as nudges).

### 2.7 Floating picture-in-picture mini widget
**Mockups:** `screens/live-nudge-floating-widget.jpg`
- Small always-on-top window (Document Picture-in-Picture API where supported; fallback to video PiP with drawn score) showing the score and a "sit back to glow" hint over other apps.
- **AC:** Toggle from Live view; works when switching to other apps in Chrome/Edge; graceful message in unsupported browsers.

---

## Phase 3
### 3.1 Phone companion view
**Mockups:** `screens/phone-home.jpg`, `screens/earlier-set/04-today-phone.jpg`
- Mobile-optimized Today view showing the day's summary. Initially same-device only; cross-device sync is a future opt-in that never includes camera data. TODO.
### 3.2 Team challenges
- Opt-in group challenges (e.g., "5 breaks a day this week"), sharing only aggregate counts.
### 3.3 Streak rewards
- Badges for streaks (3, 7, 30 days) with amber glow animation (respects reduced motion).

---

## Phase 4: SitGlow for Teams
**Mockups:** `screens/earlier-set/12-team-overview.jpg`, `screens/earlier-set/11-workstation-assessment.jpg` (layout reference only; call it a **desk setup check**)
### 4.1 Anonymous team wellbeing dashboard
- Anonymous team wellbeing dashboard to support workplace ergonomics programs. Aggregates only (minimum group size 5), no individual scores visible to managers.
### 4.2 Admin console
- Invite members, manage seats, configure defaults.
### 4.3 Ergonomics program reports
- Exportable monthly summaries (participation, average break rate, desk setup check completion).
### 4.4 SSO
- SAML/OIDC (Okta, Microsoft Entra ID, Google Workspace).
- **AC (all of Phase 4):** No video or per-frame data ever leaves devices; only opt-in daily aggregates.

---

## Marketing site
See `docs/landing-page.md`. **Mockups:** `landing/hero.jpg` (current), `landing/landing-full-page-OLD.jpg` (layout only; contains outdated UK wording and an old photo, do not copy its text).
