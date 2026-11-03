# Fix: Step 5 Glow-up reveal (match design/posture-print/5-glow-up.jpg), plus Catch Me cleanup

Open design/posture-print/5-glow-up.jpg and compare it with src/features/print/GlowUpStep.tsx, glowStats.ts and PrintFlow.tsx. Do prompts/09b-fix-lock-and-catch.md first if it isn't done yet. Keep everything on-device.

## Catch Me extras (on top of the lock-and-catch fix)
1. False catches: the old rule (head drop 0.03 below the reset, for 20 samples total, not in a row) fires during normal sitting. The slouch must be CONTINUOUS for 1.5 s. Reset the counter whenever the user goes back to normal.
2. The "Caught it!" badge covers the user's face. Put it in the upper-right corner of the video instead, or under the video on small screens.
3. Only the slouch frames from the caught window go into the print. Never use frames from after the user starts sitting back up.

## Glow-up
1. FAKE FIGURES: both figures are the same hard-coded drawing, so there's no visible difference. Draw the REAL outlines from her landmarks: a smoothed head-and-shoulders silhouette from the median zen frames (emerald, solid) and from the median slouch frames (amber, dashed).
   - Build each outline from the landmarks only: head ellipse from the face box, neck, both shoulders, upper torso. No camera pixels, and no facial details.
   - Show them side by side like the mockup, both drawn to the same scale, so the slouch one is visibly lower or more hunched. Add an "Overlay" toggle that stacks them.
   - Animate the slouch outline rising into the Zen outline over 1.2 s, with no animation under reduced motion.
2. FAKE CONFIDENCE: glowConfidence passes made-up inputs. Stillness equals the good-frame ratio, visibility is 1 when any frame is good, and the lock only stores good frames, so the ratio is always 1. Compute confidence with the real calibration code (src/calibration/confidence.ts), using the actual lock stats:
   - good frames out of ALL frames seen during the lock (pass the total count from LockStep)
   - real stillness (nose motion)
   - real mean landmark visibility
   - lighting from the measured face luminance
   - framing from the setup check result
3. STATS:
   - Never show "0.0 in". Only show a stat when the difference is at least 0.3 in. Choose the two biggest real differences among "Head about X in higher", "About X in farther from the screen" (from the lean-in ratio and iris scale), and "Shoulders about X in more open".
   - If Catch Me gave up, hide the comparison and show the emerald outline alone, with "We'll learn your slouch as you work."
   - Round to 0.1 in, and always say "about".
4. CELEBRATION: add emerald and amber confetti for 1.5 s (none under reduced motion), plus a "Posture Print saved" emerald check.
5. COPY:
   - Change "Estimates from your camera. Nothing saved or sent." to "Estimates from your camera. Your Posture Print stays on this device. No video is saved or sent." (The print IS saved locally, so the old wording isn't true.)
   - Replace SitGlow with DeskZen in the footer and anywhere on this screen.
6. SHARE: the share image currently draws two rectangles and downloads sitglow-glow-up.png. Draw the same real outlines as the screen at 1080x1350, using the DeskZen logo (public/brand/deskzen-icon.svg), the "Find your Zen" tagline, the stats, and brand colors. Name it deskzen-glow-up.png. Use navigator.share with the file when it's available, and download otherwise.
7. CLEANUP: remove every leftover debug fetch to http://127.0.0.1:7679 (the "#region agent log" blocks) in PrintFlow.tsx and anywhere else in src.

## Tests
- Confidence is below 75 when only 30 of 150 lock frames were good.
- Stats hide any difference under 0.3 in.
- When Catch Me gives up, no comparison is shown.
- The outline builder never reads image pixels.

When done, tell me in plain English what changed and how to check it: do a full run, slouch clearly in Catch Me, and confirm the two outlines look different and the stats aren't 0.0.
