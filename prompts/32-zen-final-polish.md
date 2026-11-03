# 32 – Set my Zen + Live view: match the final mockups

Mockups: `design/zen-final/` (03 to 08; 00-overview.jpg shows them all). Drag them into this chat.

## Do NOT change
- **The current Get ready / Line up screen (Step 1) and the photo countdown.** Alok likes them as they are. Leave the layout, copy, side panel, chips and countdown untouched (ignore mockups 01 and 02).
- **The outline tracing** in `src/features/zen2/snapshotOutline.ts` and `zenConfig.ts`. It was just fixed: full head, neck, shoulders and upper arms, true aspect ratio, chair rejection, pose-point fallback. Its tests must keep passing. Don't rewrite it, and don't go back to the neck-strip rule in prompt 31 section 2.6. That rule is superseded.
- **Privacy:** the snapshot stays in memory only and is never saved.

## Step 2 – Your outline (mockup 03)
- Mostly done already. Check that it matches: a crisp, glowing emerald line hugging hair, ears, neck, shoulders and upper arms; faint dimming outside the outline; faint mint inside; shoulder dots joined by a dashed "Shoulders level" line; a small chin dot.
- No line through the face.
- The bottom bar reads "That's your outline / This is how you sit at your best. Look right?" with Retake and Looks good.

## Step 3 – Fit and hold (mockup 04)
- A solid emerald outline over the live video, in the same box and scale as Step 2.
- A progress ring that fills over 3 s around "Hold 3 s".
- A small "Fit 94%" pill in the camera's top-right corner, live value.
- The top bar pills (Voice on, HD camera, Pause, X) stay.
- Caption: "Great, hold right there".

## Step 4 – Zen is set (mockup 05)
- Already rebuilt. Check: a black stage, the glowing outline at true proportions in the same spot, a faint mint fill, open at the bottom, the caption "Your Posture Print · Sitting" (or Standing).
- Pill: "Step 4 of 4 · Zen is set".
- Retake (secondary) and Start Live view (primary).
- Add the small line "Picture deleted. Only your outline is kept."

## Live view (mockups 06, 07 and 08) – styling still to do
The outline alignment is already correct (`LiveViewV2.tsx`, `useLiveV2.ts`). Change only the styling:
1. **Fit indicator:** replace the center-top fit pill with a small match ring in the camera's top-left corner showing the %. It's emerald when on track and amber when drifting.
2. **Status pill, top-right:** "On track · 12 min", counting time on track, or "Drifting · 4 s" in amber, counting drift seconds.
3. **Drift (07):**
   - The saved outline stays fixed.
   - Body areas outside the outline get a soft amber tint, not just an amber edge.
   - An **amber** arrow (currently emerald) points from the drifted part back toward the outline.
4. **Shoulder tilt (08):**
   - Show the two shoulder dots and a dashed line between them; they turn amber when the tilt is more than 5° beyond the saved tilt.
   - Tip, for example: "Relax your right shoulder down" (use the correct side, accounting for the mirrored video).
   - The outline stays fixed and doesn't tilt with the body.
5. **Coaching tip:** move it from the dock to a small bottom pill with a speaker icon, below the shoulders, never covering the face. On track it reads "Nice, you're in your Zen". It's still spoken by voice after 3 s of drift, one tip at a time.
6. The camera fills about 85% of the screen. Nothing covers the face or shoulders.

## Done when
- `npx tsc --noEmit` and `npx vitest run` pass.
- Alok redoes Set my Zen at `/set-my-zen?pose=sit` and gets Steps 2 to 4 like mockups 03 to 05.
- In `/live`, on track looks like 06, slouching looks like 07, and a raised shoulder looks like 08.
- Get ready is unchanged.
