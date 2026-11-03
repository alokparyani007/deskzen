# Prompt 03: Calibration flow

Copy everything below the line into Cursor's Agent chat.

---

Next step for SitGlow: calibration. Read `docs/product-spec.md` section 1.4 and `docs/posture-engine.md` sections 1, 3, 5 and 8 (the `Baseline` interface and `computeBaseline` rules). Match `design/screens/calibration-find-your-best-posture.jpg` (and `design/screens/earlier-set/02-calibration.jpg` for layout; ignore its old "Desk Habits" name).

Build:
1. `src/lib/posture/types.ts` with the interfaces from posture-engine.md §8, and `src/lib/posture/config.ts` holding all starting thresholds/weights from §4 and §6 (clearly commented as "starting values to tune").
2. `src/lib/posture/signals.ts` with pure helpers (IPD, iris diameter, head-drop norm, shrug norm, round norm, shoulder/eye angles, screen-distance estimate with the iris 11.7 mm method and FOV-based focal length).
3. `src/lib/posture/baseline.ts` → `computeBaseline(samples)` using medians, rejecting if < 70% good frames or too much jitter, returning a reason when rejected.
4. The **Calibration screen** (`/calibrate`): heading "Let's find your best posture", mirrored preview with a silhouette guide, tips checklist (feet flat, shoulders relaxed, screen at eye level, about an arm's length away), "I'm ready" button → 3-second countdown with an amber glow progress ring → "Saved! This is your best posture." Optional step: "About how far are you from the screen?" (20 / 25 / 30 in) to refine focal length.
5. Save the baseline to IndexedDB (numbers only). Route new users here after onboarding; add "Recalibrate" in Settings.
6. Unit tests for `computeBaseline` and the signal helpers with synthetic landmarks.

**How to verify**
- After onboarding you land on "Let's find your best posture".
- Sit tall, click "I'm ready", hold still → the ring fills over 3 seconds and you see "Saved!".
- Try again while moving around → it politely asks you to try again and says why.
- Refresh the page → you are not asked to calibrate again (baseline is remembered). Settings → Recalibrate works.
- `npm test` passes, including the new baseline tests.
