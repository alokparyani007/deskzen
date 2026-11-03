# Fix: the Setup outline must fit the user (calibrate to their body and camera)

A user sitting normally (centered, upright, facing the camera) scored 63:
- Position 10/20, Shoulders 4/20, Upright 7/15
- coaching: "Sit up so your shoulders meet the outline"

The outline is a fixed size and position, but people's head size, neck length, shoulder width and camera height all differ. His real shoulders sit lower than the outline's fixed shoulder line no matter how tall he sits, so he can never pass. Setup is judging his BODY SHAPE against a template.

Principle: Step 1 checks the CAMERA SETUP (in frame, distance, angle, facing, light). Coaching good POSTURE is Step 3's job (Lock v2), which uses the user's own body. So:

## 1. The outline fits the user
- During the first 1.5 s, measure the user: face width (Face Landmarker), head center, shoulder points and shoulder span.
- Scale and position the guide silhouette to THEM:
  - Scale = the user's face width / the guide's head width (about 0.16 of the frame width; read it from the SVG path in config).
  - The head is centered on the user's head center.
  - The shoulder curves move to the user's own shoulder y and span. Do this with a CSS transform on the head group and the shoulder group, or by regenerating the path with two control-point offsets. Keep the same style.
- After that, the outline follows them smoothly (an EMA of about 400 ms) and stays put while they're still, so it always looks like "your outline".
- Its color shows the score (amber, sky, emerald).
- Show the fixed "ideal zone" as a faint dashed rounded box in the middle of the frame (x 0.30 to 0.70, y 0.15 to 0.60 for the head) instead of forcing an exact head spot.

## 2. New scoring (total 100, all numbers in config.ts)
Remove the Shoulders and Upright parts from Setup. Posture is coached in Step 3.
| Part (chip) | Max | Full when | Zero at |
|---|---|---|---|
| In frame | 25 | the head center is inside the ideal zone, AND both shoulders are visible with visibility of 0.6 or more, AND the top of the head is at least 0.04 below the frame top | the head at the frame edge, or a shoulder missing |
| Distance | 20 | face width 0.11 to 0.20 of the frame width, OR iris distance 20 to 30 in | 0.06 / 0.30 |
| Camera angle | 20 | head pitch of 12 deg or less (the camera is near eye level, not looking up the nose or down on the head) | 30 deg |
| Facing | 15 | yaw of 12 deg or less | 35 deg |
| Head level | 10 | eye roll of 5 deg or less | 18 deg |
| Light | 10 | as now | as now |
No rounding up. Keep the 1.25x hysteresis.

## 3. Coaching (text and voice as now)
Coach only camera and framing things:
- "Move a little to your left/right"
- "Move back so your shoulders show"
- "Come a little closer" / "Scoot back a little"
- "Raise your laptop about 2 inches" / "Tilt your screen back a bit"
- "Turn your face toward the screen"
- "Straighten your head"
- the light tips
Never "Sit up so your shoulders meet the outline", and no posture tips here.

## 4. Pill and button
Keep the current rules: "Perfect setup!" only at 100, "Great setup!" plus Continue at 90 or more after 5 s, and "Good enough, keep going" after 15 s at 75 or more, or 25 s otherwise.

## 5. Tests
- Users with a long neck or wide shoulders who are centered and facing forward all score 95 or more.
- Shoulders out of frame lose In frame points, with the tip "Move back so your shoulders show".
- Head turned 30 deg scores under 90.
- Camera looking up from below (pitch 25 deg) gives the tip "Raise your laptop".
- The outline scale follows face width.

When done, tell me in plain English how to check it:
- sit normally facing the screen and it should reach 90 to 100 with the outline fitting you
- turn your head or move out of frame and it should drop and coach you back
