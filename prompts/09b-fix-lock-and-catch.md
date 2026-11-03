# Fix: Step 3 Lock it in + Step 4 Catch Me (match design/posture-print/3-lock.jpg and 4-catch-me.jpg)

Open both mockups and compare them with src/features/print/LockStep.tsx and src/features/print/CatchStep.tsx. Fix everything below. Keep everything on-device. If the step 1 and step 2 fixes (prompts/09b-fix-setup-check.md, prompts/09b-fix-body-reset.md) aren't done yet, do them first.

## Step 3: Lock it in
1. The ring is fixed in the middle of the video. Make it like the mockup:
   - a TARGET RING centered on the head position captured at the end of the body reset
   - a small glowing emerald ORB that follows the smoothed head center (EMA about 200 ms)
   - mirror the x coordinate, like the video
2. The fill only advances when the orb is inside the ring AND the user is still. Wobble or leaving the ring PAUSES the fill (it never resets it) and shows the hint "Back to center" or "Hold still".
3. The fill color is a gradient from amber to emerald as it progresses (the amber start, emerald finish shown in the mockup). The countdown number sits on the ring, not floating in the middle of the face.
4. Today it force-finishes after 10 s even with almost no good frames, which saves a bad print and breaks Catch Me. Instead:
   - require at least 45 good frames, extending up to 10 s
   - if it still has fewer, show ONE specific fix based on what failed most (lighting, "Move so both shoulders are in view", "Hold still for 5 seconds") with a "Try again" button
   - never save a print from too few frames
5. On success: a soft emerald pulse, "Locked in!", then continue. Save the print (via the src/calibration code) BEFORE Catch Me starts, so Catch Me can compare against it.
6. Remove the circle on the face (no SoftOutline here).

## Step 4: Catch Me (the signature moment, so it must feel magic)
1. Detection only looks at head drop with a fixed 0.03 margin, and does nothing if resetDrop is null. Real slouches differ, so use ALL the internal features from src/calibration/features.ts (head drop, lean-in ratio, shrug or rounding, forward-head angle) against the just-saved print.
   - Compute a slouch amount = the weighted, normalized distance from the print, divided by each feature's spread.
   - It's "slouching" when the slouch amount is at least 3 (in config.ts) for 1.5 s (smoothed).
   - If the print is missing, show "Let's lock in first" and go back to step 3. Never sit there silently.
2. LIVE SLOUCH METER: add a horizontal meter under the video, labeled "Slouch-o-meter", filling from emerald to amber as the user slouches, so they know it's working before it's caught. Show three hint chips under it: "Drop your head", "Round your shoulders", "Lean toward the screen".
3. CAUGHT: when it's detected:
   - turn the body glow amber and pop a big amber "Caught it! ✨" badge with a quick scale-up animation (no animation with reduced motion)
   - play a soft chime (optional, respects mute)
   - speak "Caught it" if voice is on
   - record about 3 s of slouch frames
4. BACK TO RESET: no button needed. Show "Now back to your reset" and auto-detect the return: when the slouch amount is under 1 for 1 s, the glow turns emerald, "Perfect", then continue to the Glow-up. Keep an emerald "Continue" button (#059669, never blue) as a fallback after 6 s.
5. GIVE-UP: if no slouch is seen within 8 s, show "Totally fine, we'll learn it as you work" with an emerald "Keep going" button and use the default thresholds.
6. Save the slouch frames into the print's two-point thresholds (src/calibration/thresholds.ts) and record catch_me_detected true or false.
7. Replace the face circle with the shoulder and neck glow from the step 2 fix. Replace SitGlow with DeskZen in the header and footer if that's not already done.

## Tests
- Lock never saves with fewer than 45 good frames.
- Catch Me detects a synthetic lean-in slouch with no head drop.
- Catch Me does NOT trigger when the user sits still.
- The auto-return to reset works.

When done, tell me in plain English what changed and how to check it:
- in Lock, move your head out of the ring and confirm the fill pauses
- in Catch Me, lean toward the screen and confirm the meter fills and "Caught it!" pops
- sit back up and confirm it continues on its own
