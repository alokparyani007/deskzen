# Fix: Setup check gives 100 when the user is clearly not set up

A user leaning back in the chair, with their head turned about 30 degrees to the side, leaning to one side, and their shoulders well below the outline got "Perfect setup! 100", with every chip at 25/25. The checks are much too forgiving:
- `roundUpAt` rounds partial points up to full.
- The "held" hysteresis is far too wide (positionHold 0.12, scaleHold 0.7 to 1.375, pitchHold 22.5, rollHold 12, distanceHold 14 to 36 in).
- Position only checks the head center.
- Nothing checks facing the camera, where the shoulders sit, or leaning.

Goal: it should be strict enough that 100 really means sitting upright, facing the screen, and lined up with the outline. Still friendly: one or two small moves should get a normal person to 100 in about 10 to 15 s. This is the middle ground between the strict and the too-easy versions.

## 1. Remove the free points
- Delete `roundUpAt`. Points are the honest graded value, rounded to the nearest whole number.
- Hysteresis only stops flicker. A part that's full stays full only within 1.25x its full tolerance, not the loose limits. Replace all the *Hold values with that rule.

## 2. Six parts, scored against the outline (the total is still 0 to 100)
Show six chips. Each part is worth points out of its own maximum, and the maximums add up to 100. Put every number in config.ts.

| Part (chip) | Max points | Full points when | Zero at |
|---|---|---|---|
| Position: head inside the head shape of the outline | 20 | head center within 0.05 (x) and 0.05 (y) of (0.50, 0.33), AND the face box (from the Face Landmarker) mostly (85% or more) inside the guide's head ellipse | offset 0.20 |
| Shoulders: on the outline's shoulder line | 20 | shoulder midpoint y within 0.06 of 0.65, AND the shoulder line tilt is 5 deg or less | 0.20 / 15 deg |
| Upright: not leaning back, forward, or sideways | 15 | the nose is above the shoulder midpoint in x within 0.05 (no side lean), AND the face size vs shoulder span ratio is within 15% of the typical upright ratio in config (leaning back makes the face small relative to the shoulders and the shoulders drop) | 0.18 / 40% |
| Facing: looking at the screen | 15 | head yaw of 12 deg or less (from the Face Landmarker transform matrix, or nose-to-eye-corner asymmetry) | 35 deg |
| Distance | 15 | scale (shoulder span / 0.42) from 0.85 to 1.18, OR iris distance from 20 to 30 in | 0.55 / 1.7 |
| Level: camera and head | 10 | pitch of 10 deg or less and eye roll of 5 deg or less | 30 / 18 deg |
| Light | 5 | as now | as now |

A missing landmark means 0 points for that part, never full.

## 3. Coaching (text and voice, as now)
Always coach the part that's losing the most points, with clear wording:
- Facing: "Turn your face toward the screen"
- Upright: "Sit up tall, away from the backrest" / "You're leaning to your left, center yourself"
- Shoulders: "Sit up so your shoulders meet the outline" / "Level your shoulders"
- Keep the existing position, distance, level and light lines.

## 4. Pill and button
- Show "Perfect setup!" only at 100. Show "Great setup!" at 90 to 99.
- The Continue button shows at 90 or more after the 5 s minimum.
- "Good enough, keep going" appears after 15 s at 75 or more, and after 25 s otherwise.
- The guide outline is emerald only at 95 or more.

## 5. Tests (update or replace the old ones)
- Centered, upright, facing forward, level and well-lit scores 100.
- Head turned 30 deg scores under 90 and coaches "Turn your face toward the screen".
- Leaning back (shoulders at y 0.80, face ratio 35% smaller) scores under 85 and coaches sitting up.
- Side lean (nose 0.10 off the shoulder midpoint) loses the Upright points.
- A small natural offset (head at 0.53, 0.36, yaw 6 deg) still scores 95 or more.
- No roundUpAt anywhere.

When done, tell me in plain English how to check it: lean back and turn your head and it must NOT say 100; then sit up straight, face the screen, and line up with the outline and it should reach 100.
