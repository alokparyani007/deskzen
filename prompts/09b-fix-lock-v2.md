# Step 3 Lock, v2: gently GUIDE the user into good posture, then lock it in

Match the mockup design/posture-print/3-lock-v2-coach.jpg (layout, wording, colors). The woman in it is a sample; the app shows the user's live camera.

Problem: today Lock just asks the user to hold still. It assumes they're already sitting well, so it can lock in a slouch, and then the whole Posture Print is wrong. Lock must first coach the user into good posture in an easy, friendly way, and only then lock it in.

This replaces the "Step 3: Lock it in" section of prompts/09b-fix-lock-and-catch.md. Still follow that file's Step 4 (Catch Me) section.

## 1. Screen
- Header: "Step 3 of 5 · Find your best posture" (the count comes from the flow's step list), with the Voice on/off toggle.
- Left: a large rounded 16:9 live camera (mirrored). Over it:
  - a thin dotted emerald "ear over shoulder" line (from the ear down to the shoulder, on the side the camera sees best)
  - a soft shoulder line glow
  - a small animated arrow showing which way to move for the current tip (static under reduced motion)
  - above the video, one big rounded coaching pill, e.g. "Glide your chin back a little"
- Right: a white "Posture checklist" card with 4 rows (icon, label, then an emerald check, or an amber dot plus "almost"):
  1. Sitting tall
  2. Shoulders relaxed and level
  3. Ears over shoulders
  4. Screen at eye level
  Below it, a large progress ring with "3 of 4" in the center and the caption "When all 4 are green, hold for 5 seconds to lock it in."
- Bottom bar: "← Back" (outline) and a "Skip coaching" text link. Buttons are at least 44 px.
- No face circle.

## 2. The 4 checks (forgiving but honest; every number goes in config.ts)
Compare against healthy-sitting targets, adjusted to the user's own body using the Setup reading and the Body reset "After" reading saved in the reset log:
1. **Sitting tall:** the shoulder midpoint y is not lower than the Body reset After value by more than 4% of the shoulder width, and the torso isn't leaning back or to the side (the nose is within 0.05 in x of the shoulder midpoint; the face-to-shoulder ratio is within 12% of After).
2. **Shoulders relaxed and level:** shoulderGap (ear-to-shoulder distance divided by the shoulder width) is at least 95% of the Body reset After value (not shrugged), and the shoulder tilt is 4 deg or less.
3. **Ears over shoulders:** forward-head angle within config (use the same feature as src/calibration/features.ts), and the face isn't more than 8% bigger than the After value (bigger means the head pushed forward).
4. **Screen at eye level:** head pitch of 10 deg or less (not looking down), and eye roll of 5 deg or less.
Smooth over about 0.5 s, with small hysteresis (1.2x tolerance) so the checks don't flicker. A missing landmark means "not yet", never a pass.

## 3. Friendly coaching (text and voice)
- Show only ONE tip at a time, for the first failing check in the order above, as the pill plus the arrow. Speak it when voice is on: speak only when the tip changes, at most once every 4 s, and never repeat a line within 8 s.
- Warm wording, never "wrong" or "bad":
  - Sitting tall: "Sit up tall, like a string is lifting your head" / "Ease away from the backrest a little" / "Center yourself, you're leaning a bit"
  - Shoulders: "Let your shoulders drop and relax" / "Level your shoulders"
  - Ears: "Glide your chin back a little"
  - Eye level: "Look straight ahead, not down" / "Raise your screen a bit if you can"
- When a check turns green: a little emerald pop on that row, and occasionally an encouraging line such as "Nice, that's it."
- When all 4 are green: the pill says "Perfect! Now just hold it..." and the ring fills over 5 s (amber to emerald) while the user stays in good posture.
  - If a check drops, the fill PAUSES (it never resets) and the tip returns.
  - Require at least 45 good frames, and never save from fewer.
- On lock: an emerald pulse, "Locked in! This is your best posture." (spoken), then save the print (src/calibration) and continue to Catch Me.

## 4. Never stuck
- After 30 s, if 3 of 4 checks are green: show "That's great, lock it in" (emerald), which starts the 5 s hold with the 3 checks.
- After 45 s: show "Keep going" and lock with the best 5 s window seen so far. Mark the print as "coached: partial".
- "Skip coaching" goes straight to the plain 5 s hold.
- Back returns to Body reset.

## 5. Tests
- A synthetic upright, relaxed pose passes all 4 checks and locks after 5 s.
- A forward head fails "Ears over shoulders" with the tip "Glide your chin back a little".
- Shrugged shoulders fail check 2.
- Looking down fails check 4.
- A check dropping pauses the fill but doesn't reset it.
- No print is saved with fewer than 45 good frames.

When done, tell me in plain English how to test it:
- slouch and push your head forward, and it should guide you step by step
- follow the tips until all 4 are green, and it should lock in with "Locked in!"
