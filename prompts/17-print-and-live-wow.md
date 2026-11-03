# Re-calibrate and Live view: the "wow" version

These are DeskZen's winning features, so make them feel premium. Run prompts/16-fix-recalibrate.md first: the camera must never freeze.

Mockups are in design/live-recal/:
- 4a-recal-frame.jpg
- 4b-recal-loosen.jpg
- 4-recal-lock.jpg
- 5-recal-slouch.jpg
- 6-recal-done.jpg
- 1-live-mirror.jpg
- 2-live-slouch.jpg
- 3-mini-mirror.jpg

Match them closely, but keep the app's real nav, name and branding. Ignore "Emma" and any made-up nav labels in the pictures.

Rules:
- emerald #059669, amber #F59E0B, mint #ECFDF5, on white
- US wording, no medical claims
- coaching is text AND voice (respect the existing mute setting)
- everything runs on-device, and no photo or video is ever saved

## A. Accurate outline: the Posture Print is the user's REAL body shape (most important)
Right now the outline is drawn from a few landmark points, so it looks generic. Make it trace the user's actual silhouette: hair, head, neck, shoulders, arms.

1. Add the MediaPipe Image Segmenter with the selfie segmenter model. Download `selfie_segmenter.tflite` from the official MediaPipe models storage into public/models/ and load it in src/lib/vision/session.ts next to pose and face.
   - Load it lazily, only for the Posture Print flow and for drawing.
   - Run it at about 5–10 fps during calibration only, not all day.
2. New file src/lib/posture/silhouette.ts:
   - Turn the person mask into a clean contour: threshold at 0.5, keep the largest blob, trace the outer edge (marching squares), simplify (Ramer–Douglas–Peucker, about 120–200 points) and smooth it (Chaikin, 2 passes).
   - Normalize the points relative to body anchors from pose and face (the shoulder midpoint as origin, shoulder width as scale, plus the eye line) so it can be redrawn at any size or position.
   - Crop it at desk level, so only the parts above the desk or lower edge of the frame are kept.
3. During Lock ("Find your best"), collect about 15–25 masks while the user holds good posture. Build the Print outline as a per-point median of the aligned contours so it's stable and accurate. Save it in the PosturePrint as `silhouette: { points, anchors, capturedAt, accuracy }`, next to lockedPose.
   - Accuracy comes from how consistent the frames were (IoU between masks).
4. During "Learn your slouch" (Catch Me), also save a slouch silhouette the same way.
5. Store only these numbers. NEVER store the mask image or any video frame.
6. Old prints with no silhouette fall back to the current landmark outline, with a small "Refresh your Print for your exact outline" link.

## B. Re-calibrate: one smooth flow, about 45 seconds
This is a new layout for the existing PrintFlow steps. Keep the scoring logic as it is.
- Left: a vertical step rail with these steps: 1 Frame check, 2 Loosen up, 3 Find your best, 4 Learn your slouch. Each one shows Done, Active or Upcoming, plus "About 45 seconds total". On a phone, the rail becomes a top progress bar.
- Center: the camera stays big and live at all times.
- Right: a Coach card with a friendly illustrated avatar, a speech bubble that matches the voice line, and a Voice on toggle.
- Footer on every step: Back, the step dots, Skip (where allowed) and Next. Nothing auto-advances.

The steps:
- **Frame check:** the outline fits the user, a "Great framing, 96" pill, and five check chips: In frame, Distance good, Camera at eye level, Facing the screen, Light good.
- **Loosen up:** four move cards (Shoulder roll, Neck stretch, Chin glide, Breathe), a ring timer, the "Shoulder roll, 3 of 5" pill, motion arrows, and the Looseness meter showing Before and Now.
- **Find your best:**
  - The posture checklist chips (Sitting tall, Shoulders relaxed, Ears over shoulders, Screen at eye level) with one tip at a time.
  - When all are green, a glowing ring traced on the user's LIVE silhouette fills clockwise during the 5 s hold, with a 3-2-1 countdown.
  - Next to it, a mini "Your Posture Print" card where the outline draws itself as frames come in.
- **Learn your slouch:**
  - A big Slouch-o-meter running from "Your best" to "Slouch", with the "Slouch here" tick and live words.
  - A playful "Caught it!" banner with sparkles.
  - The emerald best outline and the amber current outline both drawn on the video.
  - "Skip this step" always available.
- **Ready (6-recal-done.jpg):**
  - The title "Your Posture Print is ready" and the subtitle "Traced from YOUR body outline. No photo saved."
  - The big card shows the user's REAL silhouette (emerald line, soft mint fill, small dots on ears, shoulders and elbows, labels "Shoulders level" and "Ears"), with the dotted amber slouch silhouette overlaid. The slouch must sit lower and further forward, never behind.
  - A small "Side view, estimated" panel: a seated profile figure posed from the landmarks (head-forward angle and torso lean), with a dashed "Ear over shoulder" line.
  - Stats: Outline accuracy %, Sitting print saved, Standing: add later.
  - Buttons: Start Live view, Back to Home, Add a standing print (15 sec), Share my Print card (the share card uses the outline only).
  - Soft emerald confetti (unless reduced motion is on).

## C. Live view: the posture mirror
In LiveViewPage.tsx and LockedOutline.tsx:
- **Mirror:** draw the saved Print silhouette over the mirrored video, anchored to the user's current shoulders and eye line. This is the dotted emerald "Your best posture" outline, in their exact shape.
- **Match score:** a big pill "92% match to your Posture Print" with an arc, using the existing print-based score. Colors: emerald at 85 or above, sky from 70 to 84, amber below 70 ("64% match, let's reset").
- **Body map:**
  - Draw a thin glowing line along the live neck and shoulders, colored per part (green when good, amber where it's off).
  - When drifting, draw a soft ghost arrow from the current head toward the outline, with ONE tip chip ("Ease your head back a little" or "Slide your hips back and sit tall"), also spoken with cooldowns.
- **Side view card:** an estimated seated profile showing the live head-forward angle in degrees compared with the dashed best line ("Head forward 8 degrees"). Label it "estimated" and don't claim it's exact.
- **Body check card:** Shoulders level, Sitting tall, Head over shoulders, Screen distance good, each marked Good or Needs attention.
- **Encouragement:**
  - A "Tall for 12:34" timer chip
  - a small card like "You bounced back 14 times today, nice!", using real counts only
- **Pop out mini mirror:**
  - Use the Document Picture-in-Picture API (Chrome and Edge) to open a small always-on-top window with the mirrored video, the outline, the match pill, the Tall timer, and Pause and Expand buttons.
  - Add a compact pill option, "DeskZen 94% Sitting tall".
  - If the API isn't available, fall back to video Picture-in-Picture using a canvas captureStream with the outline drawn in.
  - Reuse or replace src/features/live/miniWidget.ts.
  - It must keep working while the user works in other apps.
- **Bottom bar:** Pause, Re-calibrate (15 sec), Voice tips toggle, Sitting / Standing auto.
- Use ONE shared camera stream with Home and the Print flow.

## D. Performance
- Keep Live view smooth at 30 fps on a normal laptop. Segmentation runs only in the Print flow.
- Live drawing reuses the saved contour, transformed each frame. No per-frame segmentation in Live view.

## E. Tests
- The silhouette contour is built from a sample mask: a single closed path with 120–200 points.
- Normalize and denormalize round-trip.
- The median of aligned contours is stable.
- No image data is saved in the PosturePrint (assert it holds only numbers).
- Fallback for old prints.
- The slouch silhouette sits below and forward of the best one in the test fixture.
- The match score colors are correct.
- The mini mirror fallback is used when documentPictureInPicture is missing.

When done, tell me in plain English how to check it:
1. Run Re-calibrate from Home and go through all 4 steps.
2. On the Ready screen, check the outline really looks like YOUR shape (hair and shoulders).
3. Open Live view and see your exact outline over you.
4. Slouch and see the amber body map, the arrow and the tip.
5. Press Pop out mini mirror and switch to another app.
