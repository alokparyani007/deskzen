# DeskZen Requirements: Posture Print Calibration + Desk Sense

**Owner:** Alok | **Status:** Ready to build | **Feature flag:** `posturePrintV2`
**Full technical spec (numbers, formulas):** `prompts/09-posture-print.md`. When this file and that file differ, that file wins on numbers.

## 1. Why
Calibration is DeskZen's winning feature. Competitors' reviews complain that setup is confusing, alerts feel random, and the app stops working when the camera or desk moves. Posture Print fixes all three: a friendly one-minute setup, a "Catch Me" step that proves the app works, and automatic re-tuning.

## 2. Ground rules (apply to every requirement)
- R0.1 Everything runs on the device. No video or images are ever uploaded, saved, or logged.
- R0.2 Keep the existing posture engine, scoring, smoothing, 30-second rule, cooldowns and storage. Add to them; don't rewrite them.
- R0.3 Don't rename existing storage keys. Add a `version` field and a migration. Existing users keep working, as a low-confidence print.
- R0.4 The old calibration stays available behind the `posturePrintV2` flag.
- R0.5 Brand: "DeskZen" everywhere, emerald #059669 = good/done, amber #F59E0B = attention, sky blue = info, on white. US English, friendly Gen Z tone, outlines and illustrations show women.
- R0.6 No medical claims ("may help you feel better", never "fixes back pain"). No GDPR or DSE wording.
- R0.7 Accessibility: captions always on, keyboard works everywhere, aria-live for step changes, respects reduced motion.
- R0.8 Every tunable number lives in `src/calibration/config.ts`.

## 3. User stories and acceptance criteria

### US1. Privacy first
As a new user, I want to know my camera stays private before I turn it on.
- [ ] A card shows "DeskZen learns your good posture in about a minute. Your camera stays on this device. No video is saved or sent." and a "Turn on camera" button, before the browser prompt.
- [ ] If camera permission is denied, plain steps to re-enable it and a "Try again" button appear.

### US2. Setup Check (up to 20 s)
As a user, I want help setting up my camera so calibration works the first time.
- [ ] Live mirror with a soft outline and four chips: Framing, Light, Level, Distance. Each turns emerald when passed.
- [ ] Only ONE coaching tip shows at a time, for the biggest problem.
- [ ] A Setup Score from 0 to 100 shows.
- [ ] After 20 s, "Good enough, keep going" lets anyone continue.

### US3. Body Reset (about 20 s)
As a user, I want to be guided into my best posture, not just told "sit up straight".
- [ ] Four captioned steps with a small animated outline of a woman: hips back, shoulder roll, chin back, breathe.
- [ ] The shoulder roll is detected and ticks live.
- [ ] Optional voice uses on-device browser speech. Captions always show.
- [ ] A "Skip movements" option is available.

### US4. Lock (5 s)
- [ ] An emerald orb follows the head and a target ring surrounds the reset position.
- [ ] When she holds still inside the ring, it fills from amber to emerald over 5 s.
- [ ] Wobbling PAUSES the fill and never resets it.
- [ ] If there aren't enough good frames, it extends up to 10 s, then fails with ONE specific fix (for example "Your face is in shadow. Face a window or lamp.").

### US5. Catch Me (about 10 s), the signature moment
As a user, I want proof DeskZen can actually see my slouch.
- [ ] Prompt: "Now show me your usual 3 pm slouch."
- [ ] The outline turns amber and says "Caught it", then "Back to your reset" and it returns to emerald.
- [ ] Her slouch sets her personal alert thresholds.
- [ ] If no slouch is seen after 6 s: "Totally fine, we'll learn it as you work", and default thresholds are used.

### US6. Glow-up reveal
- [ ] An overlay of the slouch outline vs. the reset outline, as outlines ONLY (no face or background).
- [ ] Stats are written as estimates, for example "Head about 1.8 in higher", in inches.
- [ ] Buttons: "Start my first session" and "Share my glow-up". The share PNG is drawn from outlines, never camera pixels.
- [ ] "Taller" stats are hidden when movements were skipped.

### US7. Standing Posture Print (about 65 s)
As a standing-desk user, I want my own standing calibration.
- [ ] Starts when the user picks "Sit and stand" or "Stand only", or when Desk Sense first sees standing with no standing print.
- [ ] Steps: "Raise your desk. I'll wait." (detects it: "Desk up!"), standing setup check (elbows visible, screen-height warning, elbows about 90 to 120 degrees, light), standing body reset (5 steps), a 25% larger lock ring, and Catch Me (leaning on one hip or poking the head forward).
- [ ] Saved separately as the standing print.

### US8. Confidence
- [ ] Every calibration gets a 0 to 100 confidence. 75 or more saves. 55 to 74 saves and shows one tip. Below 55 asks for a retry with a specific fix.

### US9. Daily Zen Check
As a returning user, I want DeskZen to stay accurate without redoing setup.
- [ ] In the first 20 s of the first session each day, it silently compares her to her print.
- [ ] If it matches: toast "Zen Check done. Same setup as yesterday."
- [ ] If not: "One breath to tune today's print?" (8 s) updates today's print within safe limits.

### US10. Learns safely over time
- [ ] It only learns from verified good moments: holding good posture 20 s or more, correcting after a nudge and holding 10 s, or the "That's my good posture" button with a 3 s hold.
- [ ] It must NEVER learn a slouch as good, with hard limits on drift.
- [ ] A small "Print tuned" note shows when it changes.
- [ ] Settings has "Reset to my original print".

### US11. Camera moved? Auto re-anchor
As a user, I don't want to recalibrate every time I bump my laptop.
- [ ] If only the camera moved (her body shape is unchanged), DeskZen silently re-anchors and keeps working.
- [ ] If it's unclear, nudges pause and it asks "Looks like your camera moved. 10-second re-check?"
- [ ] A new camera or resolution asks "New desk? Give it a name." and creates a desk profile. Prints are stored per desk and per mode.

### US12. Desk Sense: automatic sit/stand switching
As a sit-stand user, I want DeskZen to know when I stand up or sit down.
- [ ] Detects the transition: a big head move, leaving the frame, or the background sliding (desk rising with the camera).
- [ ] After 3 s of stillness, it compares her body shape to BOTH prints.
- [ ] It switches when one print clearly wins for 15 s, or for 60 s with no transition.
- [ ] The first 3 switches ask "Standing now?" Yes/No. After that it shows "Standing mode on" with Undo.
- [ ] A manual toggle and a keyboard shortcut stay available.
- [ ] Nudges pause during transitions.
- [ ] The old "face height in frame" rule is removed as the main signal, because it fails when the camera rises with the desk.

### US13. "Too strict? Let's tune it"
- [ ] Triggers after 3 dismissed nudges in 60 minutes, or a tap on "I wasn't slouching".
- [ ] Three answers: reading up close (loosens lean-in 15%), looking at another screen (ignores that direction), too picky (loosens all 15%).
- [ ] Total loosening is capped at +50%.

### US14. Works for real people (edge cases)
- [ ] Glasses, backlight, a low laptop camera (stand tip), a side camera, a second monitor, hair or headphones over the ears, hoodies or dark chairs, wheelchair users, more than one person in view, slow laptops (lower fps), and reduced motion (progress bar instead of the orb).

## 4. Analytics (local-first, no images)
Events: calibration_started, step_completed, calibration_completed, catch_me_detected, nudge_shown, nudge_dismissed_fast, not_slouching_tapped, auto_reanchor, recheck_prompted, recheck_completed, mode_switch.

## 5. Quality
- [ ] Unit tests: trimmed mean and MAD, the confidence score, Catch Me thresholds and clamping, never learning a slouch, camera-move vs. posture-change detection, Desk Sense switching delay, and the storage migration.
- [ ] Debug overlay at `?debug=1` showing live numbers. It never records.
- [ ] `npm run build` and the tests pass after every phase.

## 6. Build phases (one Cursor chat each)
1. **Phase 1, the brain:** `prompts/09a-brain.md` (data model, migration, math, confidence, config, flag, tests)
2. **Phase 2, the sitting flow:** `prompts/09b-sitting-flow.md` (US1 to US6, US8)
3. **Phase 3, standing and smart features:** `prompts/09c-standing-desk-sense.md` (US7, US9 to US14, analytics, debug overlay)

## 7. Definition of done
All checkboxes above pass in the 10-minute manual test: sitting first run, standing first run, Catch Me, moving the laptop lid (silent re-anchor), switching sit and stand, the daily Zen Check, and the flag off returning the old flow.
