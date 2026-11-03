# Fix: the Posture Print outline is wrong (tiny, in the corner, traces the background)

On the "Your Posture Print is ready" screen, the traced outline shows as a small rectangle with a person-shaped notch, stuck in the top-left corner. Below it, an old stick figure labeled "Your Zen" still shows. Root causes, found in the code:

## 1. The mask is inverted, so we trace the BACKGROUND
src/lib/vision/segment.ts uses `categoryMask` and maps `value > 0` to person. With selfie_segmenter, the category values don't mean "person = 1", so the largest blob is the background. The traced shape is the frame minus the person.

Fix:
- Use `outputConfidenceMasks: true` and read `confidenceMasks[0]` as a Float32Array of person confidence from 0 to 1 (`getAsFloat32Array`). Keep categoryMask off. Close every mask after reading it.
- Add a polarity check using landmarks. Sample the mask at the shoulder midpoint and the nose (converted to mask coordinates). If those spots aren't the person (below 0.5), invert the mask.
- In largestBlob, pick the blob that CONTAINS the shoulder midpoint, not simply the biggest one.
- Reject any blob that touches 3 or more frame edges, or that covers more than 70% of the frame (that's background). In that case, skip the frame.

## 2. Mask pixels and video pixels are mixed up, so the outline is tiny and in the corner
The mask is smaller than the video (for example 256x144 vs 640x480), but the contour (in mask pixels) is normalized with anchors in VIDEO pixels.

Fix: in traceMask or buildSilhouette, scale every contour point into video pixels (`x * videoWidth / mask.width`, `y * videoHeight / mask.height`) BEFORE normalizing. Pass videoWidth and videoHeight in. Add a test where the mask and the video have different sizes.

## 3. The desk clip breaks the shape
Filtering out points below deskY leaves an open, jagged path. Instead, clip the closed polygon at y = deskY (Sutherland–Hodgman against a horizontal line) so the bottom becomes one clean straight edge along the desk or the bottom of the frame.

## 4. The median of contours is meaningless
medianContour takes the median by point index, but each contour starts at a different spot and has a different length.

Fix:
- Resample every contour to exactly 160 points.
- Make them all run the same direction (clockwise).
- Rotate each one so index 0 is the TOP of the head (the minimum y near the center x).
- Then take the per-index median.
- Do the smoothing (Chaikin) AFTER the median, not before.

## 5. The Ready screen display
In GlowUpStep.tsx:
- When a valid silhouette exists, show ONLY the traced pair. Remove the "Your Zen" stick figure and the "We'll learn your slouch" figure block under it.
- Fit the SVG viewBox to the actual bounding box of the denormalized points plus 8% padding, not the guessed `shoulderWidth * 4` box. Make it large and centered (about 360 px tall on desktop).
- Draw in the same mirrored orientation the user saw on camera, flipping x across the bbox center.
- Style: emerald 2.5 px stroke, soft mint fill, small dots at the ears, shoulders and elbows (from the saved lockedPose), and the labels "Ears" and "Shoulders level". Draw the slouch silhouette as an amber dashed line when there is one. If Catch Me was skipped, show a small note: "We'll learn your slouch as you work."
- Add the "Side view, estimated" panel from the mockup design/live-recal/6-recal-done.jpg, if it's not there yet.
- Rename the "Confidence" stat to "Outline accuracy" and use the silhouette accuracy (mask IoU). Keep "Posture Print saved" and add "Standing: add later".
- If NO valid silhouette could be built (too few good frames), show the landmark outline drawn nicely (head, neck, shoulders as a smooth shape, not a stick figure) with "Refresh your Print for your exact outline".

## 6. The same fixes in Live view
SilhouetteOutline.tsx and LockedOutline.tsx must use the fixed denormalize (video pixel space) and the same mirroring. The outline should sit on the user's real head and shoulders.

## 7. Tests
- An inverted mask gets detected and flipped.
- The background blob is rejected.
- The mask-to-video scaling is correct.
- The desk clip gives a closed polygon with a flat bottom.
- medianContour of rotated or shifted copies of the same shape returns that shape.
- The Ready screen shows no stick figure when a silhouette exists.

Delete the current saved Posture Print's bad silhouette on load: if the silhouette fails the checks in section 1, treat it as missing so the user is asked to refresh it.

When done, tell me in plain English: run Re-calibrate again. On the Ready screen, I should see MY outline (hair, head, shoulders), big and centered, with no stick figure.

## Mockup
Match design/live-recal/7-print-ready-fixed.jpg for the fixed Ready screen. It shows a big, centered, real traced outline with a flat bottom at the desk, dots on the ears, shoulders and elbows, the amber dashed slouch, a side view panel, and the stats Outline accuracy, Posture Print saved and Standing: add later. There's no stick figure. The slouch line should sit lower and slightly forward of the best outline.
