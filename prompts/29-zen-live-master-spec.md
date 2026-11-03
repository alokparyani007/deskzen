# 29 - MASTER SPEC: Set my Zen + Live view (match the mockups)

This is the single source of truth for DeskZen's two signature features. It REPLACES the direction in prompts 22 to 28 wherever they conflict. Earlier prompts were only partly applied, and the result does not match the design. Your job is to make the running app look and behave like the mockups below.

## 0. How to work (read first)
1. **Open and look at every mockup image** in `design/live-recal/` listed below, before writing code. These are the visual target. Match layout, hierarchy, colors, spacing and copy closely. (Mockup people are stock models, so ignore faces and backgrounds.)
2. Read the existing code before changing it: `src/features/print/*` (ImmersiveStage, PrintFlow, SetupStep, ResetStep, ResetChecklist, CatchStep, SlouchMeter, GlowUpStep, contourSample, outlineFit, zenSet), `src/lib/posture/silhouette.ts`, `src/lib/vision/segment.ts`, `src/features/live/*` (LiveViewPage, LiveOverlay, LiveSidePanel, InstructionBar, InstructionCard, MatchRing, coach.ts, frame.ts, guide.ts, outline.ts, useLiveWire.ts), `src/features/camera/CameraStage.tsx`, `src/features/home/*`. Reuse the good logic. Replace the layouts.
3. Work in this order, and run `npm run test` and `npm run build` after each part:
   - Part A: the shared Stage
   - Part B: Set my Zen steps
   - Part C: Your Zen is set
   - Part D: Live view
   - Part E: Home preview
4. After each part, open the page at http://localhost:5173 in a 1920x1080 window AND a 1366x768 window and compare it to the mockup. Fix any differences before moving on.
5. When done, reply with what changed per part and anything you could not match.

## 1. Mockups (visual target)
| Screen | File |
|---|---|
| Set my Zen, step 1 Frame check | `design/live-recal/16-zen-frame-check.jpg` |
| Set my Zen, step 4 Learn your slouch | `design/live-recal/17-zen-slouch.jpg` |
| Your Zen is set (use this layout, but on the dark stage) | `design/live-recal/11-zen-is-set.jpg` |
| Live view | `design/live-recal/15-live-big.jpg` |
| Live view, Guide me back story (behavior reference) | `design/live-recal/12-live-coach-story.jpg` |

## 2. Design tokens
- Emerald `#059669` (primary, good, done). Emerald glow `#34D399` for outlines on dark backgrounds.
- Amber `#F59E0B` (drift, current slouch line, warnings). Mint `#ECFDF5` (light surfaces in the normal app).
- Stage background `#0B1F17`. Frosted panel `rgba(15,23,42,0.72)` + `backdrop-blur-md` + 1px `rgba(255,255,255,0.12)` border.
- Text on dark: white `#FFFFFF` (titles), `rgba(255,255,255,0.78)` (helpers). Never put light gray text directly on video.
- Radius: video 24px, panels 20px, pills full. Shadows: soft `0 20px 60px rgba(0,0,0,0.35)`.
- Type: title 24px/600, helper 16px/400, pill 14px/500, button 18px/600. Minimum contrast 4.5:1 everywhere.
- Motion: 200 to 300ms ease-out. Respect `prefers-reduced-motion` (no pulses or particles).

## Part A - Shared immersive Stage (Set my Zen AND Live view Focus mode)
Layout is a full-viewport flex column, `h-dvh`, with no page scroll at 1366x768 or larger:
1. **Top bar** (64px):
   - Left: DeskZen logo.
   - Center: the step progress. Four segments labeled Frame check / Loosen up / Find your best / Learn your slouch. Done segments are emerald with a check, the active one is emerald outlined, upcoming ones are white/70 on a frosted pill.
   - Right: frosted pills "Voice on/off" (toggle) and "HD camera" (green dot when 720p+), then a round X close button.
2. **Video area** (flex-1, `min-h-0`, centered, max 16:9, rounded-24):
   - Video uses `object-cover`, cropped to keep the top of the head and both shoulders plus 20% below them in frame. Center on the smoothed shoulder midpoint.
   - Overlays are drawn in the same coordinate space as the displayed video. Account for cover scaling and mirroring, and write one helper `videoToScreen()` that every overlay uses.
3. **Bottom dock** (separate frosted bar BELOW the video, never on top of the body):
   - Left: a round icon, the title (24px) and the helper (16px).
   - Right: secondary buttons (Back / Skip, outlined white) and ONE primary solid emerald button (Next / That's my slouch / Start Live view).
   - Always visible without scrolling.
4. Keyboard: Enter = primary, Esc = close, Backspace = Back.

## Part B - Set my Zen steps (about 15 to 25 s total, honest scoring)
Voice speaks each step title once (if Voice on). Text and voice always say the same thing.

**B1 Frame check** (mockup 16)
- A dashed emerald head-and-shoulders guide is centered in the video at the target size (shoulders about 45% of video width). It turns solid emerald when the user lines up.
- Exactly one message, picked from a single state:
  - Not visible: "Step into view" / "Sit where the camera can see your head and shoulders."
  - Shoulders cut off: "Show your shoulders" / "Lean back a little or tilt your screen down."
  - Off-center: "Move a little left" or "right".
  - Too close or too far: "Move back a bit" / "Move a little closer".
  - Too dark: "Add some light" / "Face a window or turn on a lamp."
  - Good: "Great setup!" / "Hold still for a second." After 1 s good, it auto-advances, or the user clicks Next.
- Never show "Great setup!" with a contradictory helper.

**B2 Loosen up** (4 moves: shoulder rolls, neck side stretch, chin glide, one easy breath)
- Show small step dots "Move 1 of 4" inside the top bar area, readable (white on frosted).
- Each move: an icon, title, and one-line caption in the dock. Next is always visible, and moves auto-advance when detected. After 8 s without detection, the helper says "No worries, that's fine. Tap Next." and Next pulses once.

**B3 Find your best**
- Coach one tip at a time toward upright: tall spine, shoulders level and relaxed, head over shoulders, facing screen.
- Show a match % pill at the top center. It locks only when the match is at least 90% and held for 3 s (a ring fills in the dock icon). It should be honest: it only reaches 100 when truly upright, centered and level.
- On lock: a soft emerald flash, the voice says "Locked in. That's your Zen.", and the trace is captured (see the Outline quality rules below).

**B4 Learn your slouch** (mockup 17)
- The solid emerald outline (just-captured best) stays on the video. A dashed amber outline follows the live body.
- A frosted vertical **Slouch meter** sits on the right edge inside the video, emerald "Your best" at top to amber "Slouch" at bottom, with a white marker. Under it: "Got it - hold 2 more seconds" and a circular countdown.
- Dock: "Slump a bit more" / "Slump like you do at 3pm. This helps us nudge you at the right moment." Buttons are Skip and the primary "That's my slouch".
- Capture when the meter is past 40% and held 2 s, OR when the user clicks "That's my slouch" (use the current frame). Only Skip or a 15 s timeout below 25% uses the default.
- **Bug to fix:** the checklist currently says "Slouch: using default" even after the user slumped and clicked the button. It must save the real slouch and show "Slouch learned - we'll nudge you early".

**Outline quality rules (the Posture Print must be the user's real outline)**
- Average the selfie-segmenter PERSON mask over 8 to 12 frames during the lock hold, with a threshold of 0.6.
- Keep only the connected region containing the nose and both shoulders.
- Remove pixels more than 0.35 shoulder-widths outside the shoulders (chair). Above the shoulders, keep only a head ellipse from the face box (1.25x wide, 1.4x tall, padded for hair).
- Cut flat about 0.6 shoulder-widths below the shoulder line.
- Level it if the tilt is under 4 degrees, smooth it, and simplify to 120 to 180 points.
- Sanity check: if the width is over 2.2x the shoulder width or the head is off-center by more than 0.3 shoulder-widths, fall back to a landmark outline and show accuracy "Good".
- Store only points and landmarks. Never save photos or video.

## Part C - Your Zen is set (mockup 11 layout, on the dark stage)
- Big emerald title "Your Zen is set", with the subline "Your posture baseline is ready. We'll help you stay balanced." and a small "Nice work!" chip.
- Left card: "Your Posture Print", the user's real outline filled with an emerald gradient and a soft glow, centered and level, with a check badge underneath.
- Right card: a checklist of "Best posture saved", "Slouch learned - we'll nudge you early" (or "using default" only if skipped), and "Mode: Sitting/Standing", then "Outline accuracy: Great/Good". The primary button is "Start Live view", with Redo as a text link.
- Footer: "Moved your desk or chair? Set your Zen again anytime." and "DeskZen is a wellness tool, not a medical device."

## Part D - Live view (mockup 15)
**Layout (normal app shell, white sidebar):**
- The video panel takes about 75% of the content width and height `calc(100dvh - 180px)` (at least 520px). It's dark-framed and rounded-24.
- Slim right rail (max 280px):
  - a Body check card with 4 rows (Head over shoulders, Sitting tall, Shoulders level, Screen distance), each with a green check or an amber dot, live
  - "You bounced back N times today"
  - an outlined "Set my Zen" button
  - Pop out mini mirror
- Below 1280px the rail becomes chips under the video.
- On the video:
  - Top center: a frosted "NN% match" pill with a colored dot (emerald at 80% or more, amber 60 to 79%, red-amber below 60).
  - Top right: an "HD" pill and a Focus (expand) button, which opens the Part A Stage full screen.
  - Bottom inside the video, below the shoulders: a frosted instruction dock with a direction arrow icon, a title (22px) and a helper (15px), plus step dots during Guide me back.
- Controls row under the video: a Pause icon button, a Voice on toggle (default ON), a Sitting / Standing / Auto segmented control, and a primary emerald "Guide me back" button.

**Outline behavior:**
- The Posture Print outline is placed ON the user's body. Anchor it by shoulder midpoint and shoulder width from the live landmarks, smoothed (alpha 0.2), so it moves with them and sits on their shoulders.
- Solid emerald 3px with a glow = target. The live shoulders and head line is shown in amber only when the match is below 80%.
- When the head is off target, draw a curved emerald arrow from the live head to the target head.
- At 90% or more held 2 s: a green pulse, a "Nice! That's your Zen" toast, and a soft chime if Voice is on.

**Framing (honest and small):**
- Use `frameStatus` + `stepFrame` (1.5 s hold). Tracking counts as OK when the face plus at least one shoulder is visible (estimate the missing one, visibility 0.3 or more).
- Problems show only as a small frosted pill at the top center ("Show both shoulders", "Move a little left", "Add some light"). NEVER a big card over the face. The current "Step into view" card covering the user while they are in view is a bug.

**Coaching (one tip at a time, text + voice):**
- Pick the biggest drift and show exactly one concrete move in the dock: "Sit back about 2 inches", "Lift your chin a little", "Drop your shoulders", "Level your shoulders", "Move back from the screen". Hold each tip for at least 4 s.
- Voice says the tip once, with a 20 s cooldown per tip and 60 s for repeats. On "Live view" start with a Print: "I'll keep an eye on you. Match the green outline."
- No Print yet: the video shows a frosted card "Set your Zen first. It takes 15 seconds so I know your best posture." with a primary "Set my Zen" button.

**Guide me back:**
- 3 steps (sit tall, then shoulders, then chin). Each step is shown in the dock with dots 1-2-3 and spoken. Advance only when that step is confirmed, then say "You're back in your Zen".
- Auto-start once per session when the match stays under 70% for 30 s (setting "Guide me back automatically", default on).

**Debug:** `?debug=1` shows a thin mono strip under the video with frame status, resolution, fps, match %, drift, guide step.

## Part E - Home
The Home camera card uses the same Live view look in a smaller size: a dark-framed live video with the outline and match pill, "Start Live view" (primary) and "Set my Zen" (outlined). When the camera is off, show the user's Posture Print outline on the dark card with "Turn on camera".

## Rules
US English. No medical claims. Women and men in any imagery. Never save photos or video, and everything stays on device. Do not change routes or storage keys.

## Acceptance checklist (verify each, then report)
- [ ] Set my Zen fits at 1366x768 and 1920x1080 with no scrolling, and the primary button is always visible.
- [ ] Every label is readable over a bright white wall.
- [ ] Frame check guide is centered on the user, with one consistent message.
- [ ] Clicking "That's my slouch" saves the real slouch, and the end screen says "Slouch learned".
- [ ] The Posture Print looks like the user's real head, hair and shoulders: level, no chair, no background.
- [ ] Live view camera is at least 75% of the content width, with the outline sitting on the user's shoulders and moving with them.
- [ ] No big card ever covers the face or shoulders. Framing uses the small pill only.
- [ ] One tip at a time, shown and spoken. Guide me back walks through 3 steps.
- [ ] `npm run test` and `npm run build` pass.
