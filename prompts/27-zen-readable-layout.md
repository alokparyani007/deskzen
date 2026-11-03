# 27 - Set my Zen: easy to read, nothing cut off, body fully visible

## Problems seen on a real test (bright white wall behind the user)
1. **Hard to read**: white text and white buttons sit on a bright camera feed and vanish. This covers the step labels (Frame check, Loosen up, Find your best, Learn your slouch), the Move 1-4 dots, "Voice on", "HD camera", the "Left / Right" buttons and the card text.
2. **Next button off screen**: on a 1080p window the "Tap Next" button sits below the visible area, so the user is stuck.
3. **Shoulders cut off / covered**: the video is cropped so the shoulders sit at the bottom edge, and the instruction card covers the chest and shoulders, the exact area we measure.
4. **Guide misplaced**: on Frame check the blue dashed body guide is drawn off to the upper right, not centered on the user.
5. **Mixed message**: the "Great setup!" title appears with the helper "Let me see your whole upper body."

Files: `src/features/print/ImmersiveStage.tsx`, `PrintFlow.tsx`, `SetupStep.tsx`, `ResetStep.tsx`, `ResetChecklist.tsx`, `HdCameraPill.tsx`, plus the guide overlay used on Frame check.

## Fixes
1. **Readable on any background**
   - Every overlay (top progress bar, move dots, pills, Left/Right, instruction card) sits on a dark frosted surface: `bg-slate-900/70 backdrop-blur-md`, rounded-full for pills and rounded-2xl for cards, with a 1px `white/15` border.
   - Text is white with at least 4.5:1 contrast on that surface. Completed and active steps use emerald #059669 (active: emerald fill with a white label). Upcoming steps use `white/70` on the dark surface, never pale gray on video.
   - Add a soft dark gradient at the top and bottom 20% of the video (`from-black/50 to-transparent`) so overlays always have contrast.
   - Card title 24px semibold, helper 16px. Move dots 12px, with labels 13px semibold.
2. **Layout that always fits**
   - The stage is a full-viewport flex column (`h-dvh`): top bar, then the video (flex-1, `min-h-0`), then a bottom dock. Nothing uses fixed heights that overflow.
   - The bottom dock is BELOW the video, not on top of it. It holds the instruction card and the primary buttons (Next / Skip / Back) in one row, always visible. Test at 1366x768, 1536x864 and 1920x1080 with Chrome's normal toolbar, at 100% zoom.
   - The primary button is solid emerald with white text and an amber focus ring.
3. **See the whole upper body**
   - Use `object-contain` (or a crop that keeps the head top and both shoulders plus about 15% below them in view). Center the crop on the detected shoulder midpoint, smoothed.
   - Nothing may overlap the area from the top of the head to 20% below the shoulders.
4. **Guide in the right place**: draw the Frame check body guide centered on the video's displayed rect (account for contain/cover scaling and mirroring), with its shoulders lined up with the target shoulder line. Turn the dashed guide emerald when the user lines up.
5. **One clear message**: pick the title and helper from the same state. When framing is good, say "Great setup!" with "Hold still for a second." When the shoulders aren't visible, say "Show your shoulders" with "Lean back a little or tilt the screen down."

## Rules
Emerald #059669, amber #F59E0B, mint #ECFDF5. US English. No medical claims. Never save photos or video. Respect prefers-reduced-motion.

## Check before you finish
- `npm run test` and `npm run build` pass.
- Open http://localhost:5173/set-my-zen?pose=sit at 1920x1080 and 1366x768. Every label is readable over a white wall, Next is visible at every step without scrolling, and both shoulders are visible and not covered.
- Reply with a short list of what changed.
