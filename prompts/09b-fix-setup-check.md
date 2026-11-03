# Fix: Step 1 Setup check (match design/posture-print/1-setup-check.jpg)

Open design/posture-print/1-setup-check.jpg and compare it with the current Step 1 screen (src/features/print/SetupStep.tsx, src/calibration/setupCheck.ts, src/features/print/SoftOutline.tsx). Fix these problems. Keep everything on-device.

1. CHECKS ARE TOO EASY. A user whose shoulders were cut off at both edges of the frame, sitting too close, got 100.
   - Framing (setupCheck.ts framingOk) checks only the nose. It must also require:
     - both shoulder landmarks visible (visibility >= 0.6) and inside the frame, with x between 0.06 and 0.94 of video width
     - shoulder width between 0.30 and 0.60 of video width (wider means too close, narrower means too far)
     - the top of the head (the highest face landmark, minus about 20% of face height) below 4% of frame height, so the head isn't cropped
     - nose x between 0.35 and 0.65
   - Distance: in addition to the iris estimate, fail when shoulder width is over 0.60 of frame width. If the iris estimate is missing (glasses or glare), use shoulder width alone. Never pass by default.
   - Light: if luminance is undefined, it currently PASSES. Make it compute luminance every 500 ms from a 64x48 downscaled canvas of the face box (on-device only, never saved), and fail when it's missing. Also fail when the face is much brighter than the background (washed out) or much darker (backlit), with messages "Your face looks washed out. Turn down the light in front of you." and "There's bright light behind you. Face the window instead."
   - Level: it checks only eye tilt. Also use face pitch from the Face Landmarker facial transformation matrix (outputFacialTransformationMatrixes: true). Fail when |pitch| > 15 deg ("Raise your laptop so the camera is at eye level").
   - Put all of these numbers in src/calibration/config.ts.
2. SCORE: don't give 25 points per chip. Score each chip 0 to 25 by how close it is to ideal (for example, shoulder width 0.40 to 0.50 = full points, fading to 0 at the limits), so 100 is rare and means a really good setup. Smooth the score over about 1 s so it doesn't flicker. "Keep going" appears only when all four chips pass. "Good enough, keep going" appears after 20 s.
3. COACHING PILL: always show the single biggest problem, with a clear direction. Order: Framing, Distance, Light, Level. Examples: "Move back a little so both shoulders fit", "Scoot to the center", "Tilt the screen back a bit". When everything passes, show an emerald pill: "Looking great. Hold that."
4. OUTLINE: replace the small dashed circle on the face with a soft dotted head-and-shoulders silhouette like the mockup. Draw it as a FIXED target guide centered in the frame (the ideal position, sized for shoulder width of about 0.45 of the frame). It turns emerald when Framing and Distance pass, and amber otherwise. Its shape and position should not depend on the face landmarks.
5. CHIPS: failed chips are amber with no check mark. Passed chips are emerald with a check. Add a small icon to each chip.
6. BRAND: the header still shows the old SitGlow name and logo. Replace them everywhere with DeskZen: "Desk" in #111827, "Zen" in #059669, and the icon public/brand/deskzen-icon.svg. Also change "SitGlow is a wellness tool, not a medical device." to "DeskZen is a wellness tool, not a medical device." Search the whole src folder for "SitGlow" and replace every user-facing instance. Keep storage keys as they are.
7. Add unit tests in setupCheck.test.ts:
   - shoulders cut off fails Framing
   - shoulder width 0.75 fails Distance
   - undefined luminance fails Light
   - pitch 25 deg fails Level
   - an ideal setup scores 90 or more

When done, tell me in plain English what changed and how to check it: sit too close and confirm it says to move back, then sit at arm's length, centered, and confirm it reaches about 90 to 100.
