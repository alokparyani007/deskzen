# 30 — Set my Zen + Live view: step-by-step build guide (follow exactly)

This replaces the visual parts of prompts 22–28. Prompt 29 (master spec) still holds for tokens and structure; where they differ, THIS file wins.

## 0. How to work (read first)
1. Open EVERY image in `design/zen-live-spec/` before writing code. Each step below names its mockup. Match layout, copy, colors and hierarchy. Do not invent extra panels or text.
2. Read the current code first: `src/features/calibration/*` (PrintFlow, SetupStep, LockStep, lockCoach.ts), `src/features/live/*` (LiveViewPage, useLiveWire.ts, frame.ts, guide.ts, InstructionBar).
3. Work one step at a time, in the order below. After each step, run the app at `http://localhost:5173` in Chrome (not Cursor's preview), test it with a real webcam, then move on.
4. Test at 1920×1080 and 1366×768. Next/primary buttons must ALWAYS be visible without scrolling.
5. Keep existing fixes. Do NOT revert these (they fix real bugs the founder hit):
   - `SetupStep.tsx`: Frame check auto-advance waits `2_500` ms of good framing (not 1 s).
   - `LockStep.tsx`: `freshResetAfter()` (only trusts the Loosen-up baseline if saved within 10 min) + `baselineFrom()` (builds a baseline from the first 15 measured poses when none exists). `onNext`: if a pose is pending, lock it; otherwise capture best and skip forward. Next must never be dead.
   - `lockCoach.ts`: `level()` only fails when BOTH pitch and roll are null; checks are null-safe.
6. Never save photos or video. Only landmarks/outline points go to localStorage.
7. US English. No medical claims. Every coaching line is shown as text AND spoken (when Voice on).

## Design tokens
- Emerald `#059669` (good, primary buttons, saved outline). Amber `#F59E0B` (drift, current body line, warnings). Mint `#ECFDF5` (light surfaces).
- Dark stage `#0B1F17`. Frosted overlay `rgba(15,23,42,0.72)` + `backdrop-blur-md`, white text, min 16px helper / 24–28px title.
- Never put white text on the raw video without the frosted backing.
- The camera is the hero: Set my Zen video uses `h-[calc(100dvh-180px)]`, 4:3 or 16:9 HD (request 1280×720 min), `object-cover`, mirrored, rounded-2xl.
- Overlays never cover the face. Instruction docks sit BELOW the shoulders or below the video.

---

# PART A — Set my Zen (`/set-my-zen?pose=sit`)

Full-screen dark stage, no sidebar. Top bar: logo left, step pill center ("Step 1 of 4 · Frame check"), "HD camera" + close (X) right. Big video in the middle. Bottom dock (frosted, full width) with title, helper, Back and Next. Layout is `h-dvh flex flex-col`; the dock is a flex child, never absolutely positioned off-screen.

### Z1 — Frame check  · mockup `Z1-frame-check.jpg`
- Guide: a dashed emerald head-and-shoulders silhouette, centered horizontally in the video, head at ~22% from top, shoulders at ~55%.
- Live checklist chips in the dock: "Face centered", "Both shoulders in view", "Good light", "Upright, facing the screen". Each is gray until met, then emerald check.
- Title: "Let's frame you". Helper changes to the ONE most important missing thing (e.g. "Scoot back a little so I can see both shoulders").
- When all 4 are met for 2.5 s continuously → the silhouette turns solid emerald, voice says "Perfect, you're framed", auto-advance. Next is also enabled once all 4 are met.
- Acceptance: does not advance in under 2.5 s; does not advance with one shoulder cut off.

### Z2 — Loosen up  · mockup `Z2-loosen-up.jpg`
- 4 short moves, ~4 s each: shoulder roll, neck side stretch (left/right), chin tuck, tall sit. Pill shows "Move 2 of 4".
- Show the move name as the title and a one-line how-to. A small progress ring counts down each move.
- When done, save the relaxed baseline to `sitglow.resetMoves` with `savedAt`. Then advance.
- Back and Next always visible; Next skips the remaining moves (baseline still gets built later by `baselineFrom()`).

### Z3 — Find your best  · mockup `Z3-find-your-best.jpg`
- **The bug the founder hit:** this screen sat at "0% match" forever with the same message and Next did nothing. Cause: no/stale Loosen-up baseline. Keep the LockStep fix (section 0.5). Also:
  - The match % must start moving within 2 s of the user being visible. If after 3 s there's still no baseline, build it from live poses — never show 0% while a person is clearly in frame.
  - If landmarks are missing, show "I can't see you clearly — sit facing the screen", not 0%.
- Visual: the user's real traced outline (body-segmentation mask, see prompt 28 rules) glows emerald as they get closer to upright. Top pill "92% match".
- Coaching: ONE tip at a time from lockCoach (e.g. "Sit tall, like a string is lifting your head"), text + voice, change at most every 3 s.
- At ≥90% held for 3 s → a lock ring fills around the outline, title "Hold it there", then "Got it! That's your Zen." and auto-advance.
- Next: locks the current best pose if one is pending; otherwise captures best so far and moves on. NEVER dead.
- Acceptance: with a person upright in frame, % rises above 0 within 2 s; Next always does something.

### Z4 — Learn your slouch  · mockup `Z4-learn-your-slouch.jpg`
- Title: "Now slouch on purpose". Helper: "Let your shoulders round and head drift forward, like a long day."
- Show the saved emerald Zen outline faded, with the current body in amber.
- Capture 3 s of slouch frames. Save as the slouch sample ONLY (never as the Zen default). Verify the stored Zen print is the upright one.
- Then: "Great, sit back up" → wait until match ≥85% → advance.

### Z5 — Zen is set  · mockup `Z5-zen-is-set.jpg`
- Dark end screen: the saved Posture Print (the clean traced outline, not a generic figure) on the left, a checklist on the right ("Your Zen outline is saved", "I know your slouch", "Live view will guide you back"), primary button "Start Live view", secondary "Redo".
- Voice: "Your Zen is set. I'll help you get back to it."

---

# PART B — Live view (`/live`)

App layout with sidebar. Big video (~75% width, height `calc(100dvh-160px)`), slim right rail (Body check + streak + "Set my Zen"), controls row under the video: pause, Voice on toggle, Sitting / Standing / Auto, Guide me back.

**The bug the founder hit:** Live view shows "Step into view" while he is clearly in frame, Body check stays gray, Guide me back is disabled, Voice shows off — nothing guides him. Investigate and fix BEFORE styling:
1. Open `/live?debug=1` and print in the debug strip: landmarks count, `faceCount`, nose visibility, the visibility threshold (`postureConfig.coachShoulderVisibility`), video width/height, `poseMode`, and whether a Print was found for that mode.
2. Likely causes to check in `frame.ts frameStatus`: (a) video size read as 0 before metadata loads — wait for `loadedmetadata`; (b) `faceCount` comes from a face detector that is not running on /live — use pose landmarks for presence instead; (c) nose visibility threshold too strict — presence should need visibility ≥0.5, not the shoulder coach threshold; (d) the Print is saved under `sit` but looked up under `auto`/`stand` — when Auto, fall back to whichever Print exists.
3. Voice must default ON (persist the user's choice). Guide me back is enabled whenever a person and a Print exist.
4. Acceptance: sitting normally in frame, "Step into view" disappears within 1 s and Body check rows show green/amber.

### L1 — On track  · mockup `L1-on-track.jpg`
- Emerald Zen outline drawn on the user, anchored to shoulders/nose so it moves with them. Pill "94% match" (emerald dot).
- Dock text: "Nice! That's your Zen." All Body check rows green. No voice spam — speak only on state changes.

### L2 — Drifting  · mockup `L2-drifting.jpg`
- When match < 80% for 3 s: current body line in amber, Zen outline in emerald, one curved arrow showing the direction to move.
- Dock: ONE tip with icon (e.g. "Ease your head back — ears over shoulders"), spoken once. The matching Body check row turns amber.

### L3 — Guide me back  · mockup `L3-guide-me-back.jpg`
- Pressing Guide me back starts a 1–3 step sequence built from what is off, worst first (head, shoulders, sitting tall, distance).
- Dock shows "Step 2 of 3" with 3 dots, big title ("Drop your shoulders"), helper, and arrows on the body. Each step advances automatically when that check passes for 1.5 s; voice reads each step.
- Button changes to "Stop guide". Finishes with L1 + "You're back in your Zen" and increments "You bounced back N times today".

### L4 — Framing problem  · mockup `L4-framing-pill.jpg`
- If a shoulder is cut off or the user is off-center: ONLY a small frosted pill at the top ("Move a little left" with arrow). Do NOT show a big "Step into view" card covering the person.
- The Zen outline shows faded/dashed where they should sit. Under the video: "I'll coach you once I can see both shoulders." Body check rows gray with "Waiting for both shoulders".
- "Step into view" text is used ONLY when no person is detected for 2 s.

### L5 — No Print yet  · mockup `L5-no-print.jpg`
- If no Posture Print exists for any mode: dim video, centered frosted card below the face: "Set your Zen first" / "It takes 15 seconds so I know your best posture." / button "Set my Zen" → `/set-my-zen?pose=sit`.
- Note: in this state Guide me back must be DISABLED (the mockup shows it green by mistake).

### L6 — Focus mode  · mockup `L6-focus-mode.jpg`
- The expand icon on the video opens full-screen focus: dark stage, logo, match pill, Voice/HD pills, close X, huge video, dock below video with the current tip + "Exit focus" + "Guide me back". Esc exits.

---

## Final acceptance checklist (test all with a real webcam)
- [ ] Set my Zen: Frame check holds 2.5 s before advancing; Next/Back always visible at 1366×768.
- [ ] Find your best: % moves off 0 within 2 s; Next always works; lock ring then auto-advance.
- [ ] The saved Print is the upright pose, traced from the real body, smooth, no chair blobs.
- [ ] Slouch is never saved as the Zen.
- [ ] Live view: sitting in frame never shows "Step into view"; Body check updates live.
- [ ] Drifting shows amber line + arrow + one spoken tip; Guide me back runs 1–3 steps and ends back in Zen.
- [ ] Framing issues show only the small pill; no card over the face.
- [ ] No Print → "Set your Zen first" card; Guide me back disabled.
- [ ] Voice defaults on; every tip is shown and spoken.
- [ ] No images or video are stored anywhere.
