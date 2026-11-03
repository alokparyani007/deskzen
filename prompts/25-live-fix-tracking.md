# 25 - Live view: fix tracking + easy "Guide me back" coaching

Mockup: design/live-recal/14-live-fixed.jpg (use our real DeskZen logo).
Run this NOW (it can run before 23/24). It fixes what the user sees today.

## The bug (seen on the user's screen)
User is clearly in frame, yet Live view shows "Step into view", no match ring, and every Body check row is "-".
Cause in code:
- `frameMissing()` in src/features/live/coach.ts returns true unless face + nose + BOTH shoulders are found with good visibility. Any miss = 'out-of-frame', and then `percent`, drift, Body check and voice all switch off.
- `CameraStage frame="guide"` forces `aspect-video` + object-cover on a 640x480 (4:3) feed, so the bottom (shoulders) is cropped off-screen and the user sits low in the frame.
- The InstructionCard is placed over the middle of the video, covering the face.
- The outline (locked pose) isn't anchored to the live body, so it floats as a big oval.

## 1. Find out what is actually missing (do this first)
- Add a dev-only debug strip on Live view when the URL has `?debug=1`: visionStatus, landmarks null?, faceCount, faceAmbiguous, nose visibility, left/right shoulder visibility, videoWidth x videoHeight, pose fps. Use it to confirm the cause, fix it, and mention what you found in the report.
- Confirm the landmark loop keeps running on the Live route (no paused video after navigating; keep prompt 16's resume watchdog).

## 2. Forgiving, graded framing (never a dead end)
Replace the single boolean with `frameStatus(landmarks)` returning one of:
- `ok`
- `no-person` -> "Step into view"
- `no-shoulders` (face found, a shoulder missing or visibility < 0.3) -> "Move back a little so we can see your shoulders" (or "Tilt your screen down a bit" if the face is in the top 25% of the frame... use whichever fits: face low in frame -> "Tilt your screen up a bit").
- `multiple` -> "Just you in the frame, please"
- `dark` (from the lighting check if it exists) -> "Add a little light in front of you"
Rules:
- If one shoulder is missing but the other plus face are found, estimate the missing shoulder by mirroring across the face center (use the saved shoulder width ratio) and continue as `ok` with a small "estimated" flag. Coaching keeps working.
- Lower the shoulder visibility needed for coaching to 0.3 (keep higher thresholds for Set my Zen).
- Only show a framing message after it has persisted 1.5s (no flicker).

## 3. Show the whole body: 4:3 frame
- Live view uses a new `frame="live"`: aspect 4:3 with object-cover (matches the camera), video column at least 68% of the width on desktop. Shoulders and upper chest must be visible. All overlays use the same `toScreen()` cover math.

## 4. Outline that sits ON the user
- Anchor the saved outline to the live body each frame: translate so the saved shoulder midpoint goes to the live shoulder midpoint's horizontal position and the saved desk/shoulder line height, and scale by live shoulder width / saved shoulder width (EMA 0.2 smoothing). That way the outline is the right size and only the posture difference shows (head higher/back, shoulders lower), instead of a floating oval.
- Thin (2.5px) solid emerald with soft glow. No dashes. No labels on the video.
- If there's no usable silhouette, draw a smooth head+neck+shoulders path from the locked pose (not a circle).

## 5. Direction cues on the video (nothing over the face)
- Animated chevrons (2 stacked, gently bouncing, amber) placed just outside the head, pointing the way to move: up, back (shown as up+toward the outline), left, right, down for shoulders-up (placed over the shoulders). Hide when match >= 90.
- Match ring top-left, posture pill top-right, privacy pill bottom-left. That's all on the video.

## 6. Instruction bar UNDER the video (replaces the card on the video)
- Full-width card under the video: round icon (amber when fixing, emerald when good), big bold tip (22px), small helper, a "Voice on/off" toggle, step dots, and a "Guide me back" button.
- Tips come from `tipFor()` (keep the 4s hold). When good: emerald "Nice! That's your Zen" + "Hold it - tall for 0:42".
- Framing messages from section 2 show here too (not "Step into view" when the person is visible).

## 7. "Guide me back" - the easy reset (the main new feature)
A 3-step guided reset, each step confirmed by the camera, spoken by voice, about 15-20 seconds total:
1. "Sit back in your chair" (or "Stand tall" when standing) -> confirm when lean/slouch is within the Print range for 1s.
2. "Drop and relax your shoulders" -> confirm shoulders-up and tilt within range for 1s.
3. "Lift your chin, ears over shoulders" -> confirm head-forward/head-down within range for 1s.
- Each step: big text in the bar, matching chevrons on video, a 1s fill ring when held, a soft chime, then next.
- If a step is already fine, auto-skip it with a quick check mark.
- End: outline glows, "You're back in your Zen", voice "You're back in your Zen", counts a bounce-back.
- It starts automatically (once) when the user has been off their Zen (match < 70) for 30s, and anytime from the button. Add a setting "Auto guide me back" (default on).
- Voice: speak each step once; no other voice tips while the guide runs. Respect the Voice toggle.

## 8. Voice tips outside the guide
- First tip after 3s of drift, then the existing 20s/60s cooldowns. When Live view opens with voice on, say once: "I'll keep an eye on you. Match the green outline."

## 9. Body check panel
- Uses the same frameStatus: rows only show "-" when the person is truly not detected. "estimated" rows show a small "est." tag.

## 10. Tests and check
- Unit tests: frameStatus cases (no person, one shoulder missing -> estimated ok, low visibility, multiple faces), outline anchoring math (scale/translate), Guide me back step machine (confirm, auto-skip, finish), voice gating while guiding.
- Manual: sit normally -> ring + tips appear (no "Step into view"); slouch -> chevrons + "Sit back..." spoken; press Guide me back -> 3 steps -> "You're back in your Zen".
- `npm run build` and `npm test` pass. Report the cause you confirmed with ?debug=1 and the files changed.
