# 28 - Posture Print: trace only the user, clean and level, and keep the real slouch

## Problems seen on a real test
1. The saved outline on "Your Zen is set" did not look like the user. It was tilted and lumpy, the head was pushed right, and one shoulder was missing. The user sat in a tall black office chair in front of a patterned wall hanging, and the mask likely merged with the chair or background.
2. The checklist said "Slouch: using default" even though the user slumped and tapped "That's enough - use this". Their real slouch was not saved.

Relevant code: `src/features/print/contourSample.ts`, `src/lib/vision/segment.ts` (selfie segmenter), `src/lib/posture/silhouette.ts` (buildSilhouette), `src/features/print/GlowUpStep.tsx`, `src/calibration/catchMeter.ts`, plus the slouch step and the code that saves the Print. Read them first and fix them in place. Don't rewrite from scratch.

## Fix the outline
1. **Use the right mask**: confirm which output of the selfie segmenter is the PERSON channel, and use a confidence of at least 0.6. Average the mask over about 8 to 12 frames taken while the user holds their best posture (not one frame) before tracing.
2. **Keep only the user**: keep only the connected region that contains the nose and both shoulder landmarks. Drop everything else.
3. **Cut away the chair**:
   - Remove mask pixels more than about 0.35 shoulder-widths beyond the outer shoulder points.
   - Above the shoulders, remove pixels outside a head ellipse built from the face box (1.25x wide, 1.4x tall, top padded for hair).
4. **Clip the bottom** in a straight horizontal line about 0.6 shoulder-widths below the shoulder line.
5. **Level and smooth**:
   - Rotate the outline so the shoulder line is level only when the measured tilt is under 4 degrees. A real lean bigger than that stays as it is.
   - Smooth with a light Chaikin or moving-average pass, then simplify to about 120 to 180 points. Keep the hair and ear shape, with no spikes.
6. **Center it**: center the outline in the preview card based on its shoulder midpoint, at a consistent scale.
7. **Sanity check**: if the outline's width is more than 2.2x the shoulder width, or its head top is off-center by more than 0.3 shoulder-widths, discard that trace and fall back to a landmark-based outline. Set "Outline accuracy" to "Good", not "Great", in that case.

## Fix the slouch
- Find why the slouch sample is marked skipped when the user taps "That's enough - use this" (or when the meter has moved). Save the captured slouch landmarks into the Print, and show "Slouch: learned" with a check.
- Show "Slouch: using default" only when the user taps Skip, or the 15 s fallback fires with the meter below 25%.

## Tests
- Add unit tests for: keeping the largest connected region with the anchors, cutting at the chair width, the level rotation limit, the sanity fallback, and slouch saved vs. skipped.
- `npm run test` and `npm run build` pass.

## Rules
Emerald #059669, amber #F59E0B, mint #ECFDF5. US English. No medical claims. Never save photos or video: store only the outline points and landmarks.

Reply with a short list of what changed.
