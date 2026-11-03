# 26 - Finish Live view: wire up the parts that were built but never connected

## Why
Prompt 25 created the right building blocks, but `src/features/live/LiveViewPage.tsx` still uses the OLD logic. These are built and tested but not imported anywhere in Live view:
- `frame.ts` (frameStatus, framingCopy, stepFrame, shoulderWidthRatio)
- `guide.ts` (Guide me back: startGuide, stepGuide, guideReady, guideLine, moveCue, shouldAutoGuide, GUIDE_DONE)
- `InstructionBar.tsx`
- `outline.ts` anchoring (anchorOutline, applyAnchor, smoothAnchor, placeOnShoulders, curveArrow, arrowHead)
- `coach.ts` LIVE_HELLO and gateCoachVoice

Live view still uses `frameMissing()` (needs face, nose AND both shoulders), `frame="guide"`, and has a confusing extra "Start" button next to "Turn on camera". Result: "Step into view" dead ends, an outline that doesn't sit on the body, and no clear guidance.

Do NOT rebuild these helpers. Read them first, then connect them. Keep their tests passing.

## Do this in LiveViewPage.tsx (and LiveOverlay / LiveSidePanel as needed)

1. **Framing**: replace `frameMissing(landmarks)` with `frameStatus(landmarks, { dark, shoulderRatio: shoulderWidthRatio(print?.lockedPose) })` held through `stepFrame` (memory in a ref). Coaching and the score run whenever status is `ok`, including when one shoulder is estimated. For any other status show `framingCopy(status, landmarks)` in the InstructionBar, never a blank Body check.

2. **Camera view**: use `frame="live"` (4:3, object-cover), large: at least 65% of the row on desktop, full width on mobile, rounded-3xl, soft shadow. Request HD through the existing `hdConstraints` path and show a small "HD" pill when `isHdResolution` is true.

3. **Outline on the body**: in LiveOverlay, place the saved outline with `placeOnShoulders` / `anchorOutline` + `smoothAnchor` (shoulder midpoint and shoulder width), so it moves with the user and sits on their shoulders. One solid emerald line (3px, soft glow), amber when drifting. When the head is off target and `showGuideArrow` is true, draw `curveArrow` + `arrowHead` from the live head to the outline head.

4. **One instruction, below the video**: render `InstructionBar` directly under the camera (not covering the face). It shows ONE tip at a time: title (big, 20px semibold) and one helper line, plus a direction chevron from `moveCue`. Remove the in-video InstructionCard when the bar is showing. When matched for 4 s: "Nice! That's your Zen" in emerald.

5. **Guide me back**: add a "Guide me back" button in the side panel. It runs `startGuide` / `stepGuide` with `guideReady(amounts)` from `readDrifts`: 3 steps (sit tall, shoulders, chin), each shown in the InstructionBar with step dots 1-2-3 and spoken once, moving to the next step only when that step is confirmed. Finish with GUIDE_DONE spoken. Auto-start using `shouldAutoGuide` when match stays below 70% for 30 s, once per session, behind a setting "Guide me back automatically" (default on) in Settings.

6. **Voice**: voice tips default ON for new users. Say LIVE_HELLO once when the camera goes live and a Print exists. Route all speech through `gateCoachVoice` / `nextVoice` (cooldowns as already defined). Never speak during framing problems except one "Step back into view" after 5 s.

7. **No Posture Print yet**: if there is no Print for the current posture, do not show an empty coach. Show a friendly card over the camera area: "Set your Zen first. It takes 15 seconds so I know your best posture." with a primary button to `/set-my-zen?pose=sit` (or `stand`).

8. **Buttons**: remove the separate "Start" button. One primary camera action only: "Turn on camera" when off, a small "Pause" icon button when on. Keep Voice tips toggle and Sitting / Standing / Auto chips in one tidy row under the InstructionBar.

9. **Debug strip**: when the URL has `?debug=1`, show a thin mono strip under the video: frame status, camera resolution, fps, match %, current drift, guide step. Hidden otherwise.

## Rules
- Brand: emerald #059669, amber #F59E0B, mint #ECFDF5. US English. No medical claims.
- Never save photos or video. Everything stays on device.
- Respect prefers-reduced-motion.

## Check before you finish
- `npm run test` and `npm run build` pass.
- Open http://localhost:5173/live with `?debug=1`: with the camera on and a Print saved, frame status reads `ok`, the outline sits on the shoulders, a tip appears under the video, voice speaks, and "Guide me back" walks through 3 steps.
- Without a Print, the "Set your Zen first" card shows.
- Reply with a short list of what changed.

## UPDATE after a real test (these take priority over items 2, 4 and 8 above)
Screenshot findings at 1920x1080:
- The camera was only about 420px tall, with lots of empty white space below.
- A big white "Step into view" card covered the user's face and shoulders even though he was clearly in view (the old frameMissing bug).
- The outline floated off his body.

A. **Big, immersive Live view**
   - The camera fills the page: height `calc(100dvh - 160px)` (at least 520px), width up to the content area, 16:9 / object-cover centered on the shoulder midpoint, with a dark rounded-3xl frame like Set my Zen.
   - Move Body check, bounce-backs, Pop out mini mirror and Set my Zen into a slim right rail (max 280px). Below 1280px wide, collapse the rail into a row of small chips under the video.
   - Add a "Focus" button (an expand icon, top right of the video) that opens Live view full screen with the same ImmersiveStage look as Set my Zen. Press Esc to exit.
B. **Small, honest framing messages**
   - Never use a big card for framing. Framing problems show as a small pill at the top center of the video (dark frosted `bg-slate-900/70`, white 14px text, icon), e.g. "Move a little left" or "Show both shoulders".
   - Show it only after `stepFrame` has held the status for 1.5 s.
   - Nothing may cover the area from the top of the head to 20% below the shoulders.
C. **Instruction bar**: the one-tip InstructionBar sits in a dark frosted dock at the bottom edge of the video (inside the frame, below the shoulders) or directly under the video. Title 22px, helper 15px, a direction arrow, and step dots during Guide me back. It is readable on bright walls.
D. **Easy to get back into posture**: when the match is below 80%, the live outline glows amber and a soft emerald "target" outline (the Print) is shown. A curved arrow points the way, and the tip says exactly one move ("Sit back about 2 inches", "Lift your chin a little"). At 90% or above for 2 s: a green pulse, a "Nice! That's your Zen" toast, and a short chime if sound is on.
E. **Controls**: one row under the video, with a Pause icon button, Voice (on by default), Sitting / Standing / Auto, and Guide me back as the primary emerald button.
