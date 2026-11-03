# 21 - Rename "Re-calibrate" to "Set my Zen"

Goal: everywhere the user sees or hears "Re-calibrate" / "Recalibrate" / "Calibrate" / "Calibration", use the friendlier name **Set my Zen**. The saved result is still called the **Posture Print**.

## 1. Find every occurrence
Search the whole repo (case-insensitive) for: `re-calibrate`, `recalibrate`, `calibrate`, `calibration`, `calibrating`.
Include .tsx/.ts/.json/.md, i18n/copy files, voice/speech lines, aria-labels, titles, toasts, notifications, PWA manifest shortcuts, landing page and onboarding.

## 2. Copy rules (user-facing text only)
- Button / primary action: **Set my Zen**
- Flow screen title: **Set my Zen** with subtitle "About 45 seconds. We'll learn your best posture and save your Posture Print."
- First-time empty state (no Print yet): "Set my Zen to save your Posture Print"
- Repeat (Print exists): button still reads **Set my Zen**; small helper text "Moved your desk or chair? Set your Zen again."
- Step labels stay: Frame check, Loosen up, Find your best, Learn your slouch, Ready.
- Ready screen: "Your Zen is set" (instead of anything like "Calibration complete").
- Voice lines: "Let's set your Zen" at start, "Your Zen is set" at the end.
- Settings row: "Set my Zen" with the subtitle "Update your Posture Print".
- Sitting/standing: "Set my Zen - sitting" / "Set my Zen - standing" where a mode is shown.
- Progress or history notes: "Zen set on Oct 26" style wording.
- Never say "calibrate" or "calibration" in the UI or voice.

## 3. Do NOT break code
- Leave internal identifiers, file names, routes, storage keys and analytics event names as they are (e.g. `PrintFlow`, `/recalibrate` route, saved data keys), so saved Posture Prints and tests keep working.
- If a route is user-visible in the URL bar, add `/set-my-zen` as an alias that renders the same flow; keep the old route working.

## 4. Earlier prompts
If prompts 19 or 20 add new copy containing "Re-calibrate", apply the same rename to it. This prompt is meant to run after 19 and 20 so it catches everything.

## 5. Check
- Re-run the search: zero user-facing matches for calibrate/calibration remain (code identifiers are fine).
- `npm run build` and `npm test` pass.
- Click through Home, Live view, the Set my Zen flow, Settings and the landing page and confirm the new wording.
- Report the list of files changed.
