# Step 2 Body reset, v2: friendlier, easy to navigate, and proves you're loose

Match these mockups closely (layout, buttons, wording, colors):
- design/posture-print/2-body-reset-v2-move.jpg is a move screen.
- design/posture-print/2-body-reset-v2-result.jpg is the looseness result screen.
The mockups show a sample woman. In the app, it's the user's live camera.

The purpose of this step is to get the user relaxed and naturally upright right before Lock learns their best posture, so the Posture Print isn't learned from a stiff or slumped body.

Rewrite src/features/print/ResetStep.tsx, ResetChecklist.tsx and src/calibration/bodyReset.ts as described below. Keep the BodyGuides shoulder glow, moveIcons and the voice helper (speakCaption/stopSpeech) where they fit. Put all numbers in calibrationConfig.bodyReset.

## 1. Flow: one friendly screen at a time (about 30 to 40 s total)
1. **Quick looseness read (3 s):** "Let's see how tense you are. Just sit normally." Measure the Before looseness (section 3).
2. **Move 1 of 4, Shoulder roll:** "Roll your shoulders up, back, and let them drop." Detect 2 rolls (rise, then drop back to or below the start).
3. **Move 2 of 4, Neck side stretch:** "Tip your ear toward your shoulder. Now the other side." Detect a head roll of 12 deg or more to each side, and show Left ✓ and Right ✓ pills.
4. **Move 3 of 4, Chin glide:** "Glide your chin straight back, like making a double chin." Use the existing chin tuck detection.
5. **Move 4 of 4, Breathe and drop:** "Breathe in... and slowly out. Let your shoulders melt down." 4 s in and 6 s out, with the breathing circle.
6. **Looseness result (section 3).**

Remove the "Scoot your hips back" move. The webcam can't see hips.

## 2. Easy navigation
- Left side: a large rounded 16:9 live camera with the soft emerald shoulder glow. Right side: one big white card with a large line-art demo of the move (about 120 px, gently looping, static under reduced motion), a big title, and a short caption. Stack them on mobile.
- Progress: 4 labeled dots, with the current one amber and done ones emerald ("Move 2 of 4").
- Bottom bar, always visible, with large buttons (at least 44 px):
  - "← Back" (outline)
  - "Skip this move" (text link, center)
  - "Next →" (solid emerald, enabled from the start, pulses once the move is detected)
- When a move is detected: show "Nice! ✓" with a soft emerald pop, and auto-advance after 1.2 s.
- If not detected after 12 s: show "No worries, that's fine. Tap Next.", with no auto-advance and no failure words.
- Keyboard support: Enter for Next, Backspace for Back.
- Every caption is shown in text (aria-live) and spoken when voice is on. Keep the Voice on/off toggle in the header.
- The tone is warm and short. No medical claims.
- The header must say "Step 2 of 5 · Body reset". Get the count from the flow's step list (Setup, Body reset, Lock, Catch Me, Glow-up), not hardcoded.
- Fix the broken check mark: it renders as "�o" because of a bad encoding. Use an SVG check icon everywhere instead of the text glyph.

## 3. Looseness check: really see if the body is loose
Compute a Looseness score of 0 to 100 from landmarks, averaged over about 2 s of sitting still:
- **Shoulder drop (50 pts):** shoulderGap = the vertical distance from the ear midpoint (or the eye midpoint if ears are missing) down to the shoulder midpoint, divided by the shoulder width. Tense, raised shoulders make this gap smaller.
  - Compare it to the user's OWN Before reading: full points if it grew by 6% or more, scaled from 0% to 6%.
  - If Before was already at or above config typicalLooseGap, it counts as loose.
- **Level shoulders (20 pts):** a tilt of 4 deg or less.
- **Head stacked (15 pts):** the face-size-to-shoulder-width ratio is no more than 8% bigger than Before (a bigger face means the head pushed forward).
- **Settled (15 pts):** low jitter of the shoulders and nose over the 2 s.

Result card (see the mockup):
- A "Looseness meter" bar from amber to emerald, with Before and After markers and their numbers.
- Check rows: "Shoulders dropped about X in" (inches from the iris scale; hide this row if under 0.2 in or no iris), "Shoulders level", "Head stacked over shoulders". Each row shows an emerald check when it passes and an amber dot when it doesn't.
- Small caption: "Measured on this device. No video saved."
- 80 or more: headline "You're loose and ready! ✨" plus an emerald "Continue to Lock" button.
- Under 80: name the single biggest reason in plain words and offer ONE quick retry of just that move, e.g. "Your shoulders are still a little up. Let's do one more roll." or "Your head drifted forward. One more chin glide."
  - After the retry, show the result again with "Continue to Lock", never blocking.
- Save Before, After and the After shoulderGap in the reset log for later (don't change Lock now).

## 4. Tests
- A shoulder gap growing 7% with level, still shoulders scores 80 or more.
- Shrugged shoulders (the gap shrank) score under 80, with the reason "shoulders up".
- The neck stretch detects both sides.
- The header shows "Step 2 of 5".
- Back returns to the previous move and Skip marks it skipped.

When done, tell me in plain English how to test it:
- shrug your shoulders up on the result screen and it should say they're still up
- relax and it should say "You're loose and ready!"
