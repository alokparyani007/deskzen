# Fix: Step 2 Body reset (match design/posture-print/2-body-reset.jpg)

Open design/posture-print/2-body-reset.jpg and compare it with the current screen (src/features/print/ResetStep.tsx, src/features/print/SoftOutline.tsx, src/calibration/setupCheck.ts shoulderRollSeen). Fix these problems. Keep everything on-device. If prompts/09b-fix-setup-check.md hasn't been done yet, do it first.

1. FAKE "DONE". Today every move is marked Done after a 5-second timer, whether or not the user moved. "Done" must mean DeskZen actually SAW the move.
   - Each move waits for detection, up to a timeout (in config.ts: 10 s for movement steps, 8 s for the breath).
   - When it's detected: show a green check, "Got it!" for 1 s, then advance automatically.
   - On timeout: show a gray "No worries" (never "Done") and advance. Store which moves were detected, for analytics.
   - "Skip movements" still skips the whole step.
2. DETECTION. Use smoothed landmarks (EMA over about 300 ms) sampled at about 10 fps. Normalize everything by shoulder width, never raw pixels.
   - Hips back: the torso gets taller and settles back. Shoulder midpoint rises at least 3% of shoulder width, OR face width / shoulder width drops at least 3%, then holds still for 1 s.
   - Shoulder roll: shoulders rise at least 6% of shoulder width, then drop back to within 3% of the start, within 4 s. (The current version uses a 4-pixel jump between raw samples, which is unreliable.)
   - Chin back: face width / shoulder width drops at least 2% while the shoulders stay still, and the nose doesn't drop more than 3% (a tuck, not a nod). Hold for 1 s.
   - Breath: no detection needed. Show a 6-second guided breathing circle that grows for 3 s ("Breathe in") and shrinks for 3 s ("and slowly out"). Mark it done when the animation finishes.
   - Put all of these numbers in config.ts, and add unit tests for each detector with synthetic landmark sequences, including one where nobody moves (it must NOT be marked done).
3. LIVE FEEDBACK on the video. Remove the circle drawn on the face. Instead, draw a soft emerald glow line along the shoulders and neck, following the body like in the mockup, that pulses brighter when a move is detected. During the shoulder roll, show a small amber arrow that moves up, then down. Respect prefers-reduced-motion (no pulses or arrows; just change the color).
4. ILLUSTRATIONS. Replace the emoji (chair, muscle, smiley, wind) with simple line-art icons of a woman doing each move, in the style of the mockup: thin #111827 strokes with an emerald accent on the body part that moves. Make them as inline SVG components in src/features/print/moveIcons.tsx. The active move's icon gets a gentle 2-second looping animation showing the motion (hips sliding back, shoulders up then down, chin gliding back, chest rising).
5. LAYOUT like the mockup:
   - The active row has an amber tint and a ring, with a small countdown ring on the right.
   - Detected rows show an emerald check. Upcoming rows are gray.
   - The caption sits in its own rounded white card under the video and checklist, in large text.
   - The voice control is a proper toggle switch with a speaker icon ("Voice on" / "Voice off"), not a checkbox.
   - "Skip movements" is a sky-blue link under it.
   - Add a thin progress bar at the top: 4 segments.
6. VOICE. Speak each caption once when its move starts, not again on re-render. Prefer an on-device voice (voice.localService). Stop speech when moving to the next step or leaving the page.
7. BRAND. Replace SitGlow with DeskZen in the header and the footer line ("DeskZen is a wellness tool, not a medical device."), using public/brand/deskzen-icon.svg. If that's already done, skip it.

When done, tell me in plain English what changed and how to check it:
- sit still for 10 s and confirm it says "No worries", not "Done"
- roll your shoulders and confirm "Got it!" appears within about a second
- tuck your chin and confirm it's detected
