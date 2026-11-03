# Fix: Setup check outline + coach to 100 (text and voice)

The Step 1 setup check still has no clear outline. src/features/print/SoftOutline.tsx draws one path with preserveAspectRatio="none", so it stretches into two loose ovals that don't line up with the user. The camera box is also much wider than 16:9, which crops the camera frame, so the outline and the checks don't describe the same picture. Users also want the screen to COACH them all the way to 100, in text and voice.

## 1. Use the provided outline exactly
- Use public/media/guides/posture-guide.svg as-is. Don't redraw it.
  - It's a 1280x720 (16:9) head-and-shoulders silhouette with a dimmed area outside the person (even-odd fill), a dotted emerald outline, and a faint eye-level line.
  - Turn it into a React component (src/features/print/PostureGuide.tsx) by copying the two paths and the line from the SVG, so the outline color can change. Keep viewBox="0 0 1280 720" and preserveAspectRatio="xMidYMid slice".
- Ideal targets, in the same 1280x720 space (put them in config.ts as fractions):
  - head center (0.50, 0.33)
  - eye line y = 0.33
  - shoulder points (0.29, 0.65) and (0.71, 0.65), a shoulder span of 0.42 of the width
- In SetupStep, the calibration camera box must be exactly 16:9 (aspect-video, object-cover, mirrored), with the guide on top of it at the same size. Map landmarks into the same 0..1 frame space the guide uses. If the camera stream isn't 16:9, account for the object-cover crop, so a landmark on the outline on screen is also "on the outline" in the math.
- Remove the old SoftOutline ovals from this step.

## 2. Score against the outline (0 to 100, smoothed about 1 s)
IMPORTANT: setup must feel EASY. Most people should reach 100 in under 10 seconds with one or two small moves. This is a "you're in the frame" check, not a precision test. The precise learning happens later, in Lock. Be generous.

Use four parts of 25 points each, graded (full points inside the generous zone, fading to 0 at the loose limit):
- Position: head center offset from (0.50, 0.33). Full points when |dx| <= 0.08 and |dy| <= 0.08. Zero at 0.30.
- Distance: scale = shoulder span / 0.42. Full points from 0.80 to 1.25. Zero at 0.5 or 1.8. If the iris-based distance is available, full points from 18 to 32 in.
- Level: full points when |pitch| <= 15 deg and |roll| <= 8 deg. Zero at 35 deg and 20 deg. Never ask anyone to buy anything or rebuild their desk.
- Light: full points unless the face is clearly too dark to track or strongly backlit.
Use hysteresis: once a part is full, it stays full unless it drifts well outside the zone (1.5x the tolerance), so the score doesn't flicker 98, 100, 97.
Put every number in config.ts.

## 3. Coach to 100: one instruction at a time, as text and voice
- Always show the ONE fix worth the most points, as a large pill above the video, plus a small animated arrow on the video pointing the way to move (reduced motion: a static arrow).
- Speak the same line with speechSynthesis:
  - prefer voice.localService, rate about 1.0
  - speak only when the instruction changes, at most once every 3 s, and never repeat the same line within 8 s
  - add a Voice on/off toggle in this step's header, defaulting to the user's voice setting
  - the text is always shown
- Use directions from the USER's point of view (the video is mirrored, so "your left" must be correct), with amounts when possible:
  - Position: "Move a little to your left" / "...to your right", "Sit up a bit taller" / "Lower your chin slightly", "Move down a little so your head fits the outline"
  - Distance: "Scoot back about 3 inches" / "Come closer about 2 inches" (inches from the iris scale, rounded to whole inches; without the iris, just "a little")
  - Level: "Tilt your screen back a bit", "Raise your laptop about 2 inches so the camera is at eye level", "Straighten your head"
  - Light: "Add a little light in front of you", "There's bright light behind you. Face the window instead."
- Coach only on things that matter. If a part is already 20/25 or more, don't nag about it; just round it up to full. Keep a calm, friendly tone, never "wrong" or "error".
- Show live progress text under the score: "Almost there: 92". When everything is 100 for 1 s, show "Perfect setup!" with an emerald pulse and a short confetti burst (none under reduced motion), speak "Perfect. That's a 100.", and auto-advance after 1.5 s.
- Make it easy to move on:
  - At 85 or more held for 2 s, auto-advance too, with "Great setup!" (no need to chase the last points).
  - Show "Good enough, keep going" after 8 s at 70 or more, and after 15 s otherwise. Never block.
- Only show "Looking great. Hold that." at 95 or more.

## 4. Outline color shows how close you are
- Amber under 70, sky blue from 70 to 94, emerald at 95 and above. Animate color changes over 300 ms.
- Chips: show each part's own points ("Position 25/25", "Distance 18/25"), amber until full, emerald with a check when full.

## 5. Tests
- Head at (0.50, 0.33) with a span of 0.42, level, good light scores 100.
- A slightly off setup (head at 0.56, 0.38, span 0.48, pitch 12 deg) still scores 100.
- Too close (span 0.62) says "Scoot back" and the score is under 90.
- A mirrored left/right offset gives the correct "your left" or "your right" text.
- The same instruction is not spoken twice within 8 s.

When done, tell me in plain English how to check it:
- sit off-center and too close, and confirm the voice and text tell you which way to move
- follow the tips until you reach 100 and see "Perfect setup!"
- it should take about 10 seconds, not a struggle
