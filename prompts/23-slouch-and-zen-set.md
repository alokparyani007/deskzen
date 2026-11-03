# 23 - Redesign "Show us your slouch" (slouch meter) and "Your Zen is set"

Mockups (match closely, but use our real DeskZen logo, not the one in the image):
- design/live-recal/10-slouch-meter.jpg
- design/live-recal/11-zen-is-set.jpg

Run after 19, 20, 22 and before 21 (the rename).

## What these screens are for (put this purpose in the copy)
- Slouch step: the user slouches on purpose for a few seconds so DeskZen learns THEIR slouch and puts the nudge point between their best posture and their slouch. Users must understand why they're asked to slouch.
- Zen is set: the confirmation. Shows the saved Posture Print, what was learned, and sends them to Live view.

## A. Slouch step (CatchStep)
1. Header: "Step 4 of 4" + dots. Title "Show us your slouch". Subtitle "Slump like you do at 3pm. This helps us nudge you at the right moment."
2. Video (large, rounded) with TWO outlines via the shared `toScreen()` helper:
   - solid emerald = best posture just saved (Posture Print)
   - dashed amber = live current outline (silhouette, or a landmark-built head+shoulders path if silhouette unavailable)
   - soft amber fill between them is optional.
   The video must never freeze (keep prompt 16's play/resume watchdog).
3. Vertical "Slouch meter" to the right of the video (on mobile: horizontal under the video):
   - track gradient emerald (top, "Your best") -> amber (bottom, "Slouch").
   - fill = live slouch amount 0..1 vs best, smoothed (EMA 0.25), animated.
   - a marker dot that pulses once the target amount is reached.
4. Status line under the meter, one at a time:
   - not slouching enough: "Slump a bit more" (voice says it once)
   - reached: "Got it - hold 3 more seconds" with a circular countdown 3,2,1
   - done: "Slouch learned ✓", then auto-continue after 1s
   - out of frame: "Step back into view"
   - after 15s without reaching it: show "That's enough - use this" button (accept the current max)
5. Footer always visible: Back (left), dots (center), Skip (right). If skipped, use default thresholds and note "Slouch: default" on the finish screen.
6. Save only numbers (no images/video).

## B. "Your Zen is set" (GlowUpStep / Ready)
1. Title "Your Zen is set" (large, emerald), subtitle "Your posture baseline is ready. We'll help you stay balanced." Small "Nice work!" pill with a subtle one-time sparkle (no confetti flood; respect reduced-motion).
2. Left card "Your Posture Print": the user's REAL front-facing traced outline from prompt 19 (head/hair, neck, shoulders, upper arms), emerald stroke with soft glow on mint, cut at the desk line, viewBox fit to the outline's bounds, mirrored to match the camera, a green check badge. NEVER show a generic or side figure or a stick figure. If the outline is invalid, build one from landmarks; if that fails too, show "We couldn't trace your outline - Redo" instead of a fake shape.
3. Right column checklist:
   - "Best posture saved" ✓
   - "Slouch learned - we'll nudge you early" ✓ (or "Slouch: using default" if skipped)
   - "Mode: Sitting" or "Standing" with an icon
   - small "Outline accuracy: Great / Good / Fair" (from the existing quality score)
4. Buttons: big emerald "Start Live view" (goes to Live view), text button "Redo" (restarts at step 1).
5. Footnote: "Moved your desk or chair? Set your Zen again anytime."
6. Voice: "Your Zen is set. Let's keep it." once.

## C. Checks
- Unit tests: meter mapping (0..1 clamp), 3s hold, 15s fallback, skip -> defaults.
- Manually: run the full flow; the slouch meter moves smoothly as you slump, the countdown works, the finish screen shows YOUR outline, and Start Live view opens Live view with that outline.
- `npm run build` and `npm test` pass. Report files changed.
