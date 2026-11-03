# Live view: show the outline of the good posture the user locked in

Match the mockup design/posture-print/7-live-view-ghost.jpg. The woman is a sample; the app shows the live camera.

Goal: in Live view (src/features/live/LiveViewPage.tsx), the user sees a clear outline of THEIR locked-in best posture (from Step 3 Lock of the Posture Print), and sees themselves drift away from it and back.

Today Live view draws its ghost from the OLD `baseline` (useBaseline), not from the new Posture Print (src/calibration/print.ts, saved by src/features/print/savePrint.ts). The print stores only features, so there's nothing to draw an outline from. Fix both.

## 1. Save the locked pose shape in the print
- In PosturePrint, add an optional `lockedPose` field (keep version 2, it's optional) holding the AVERAGED, mirrored, normalized (0..1 of the video frame) points from the Lock frames:
  - nose, left/right eye, left/right ear, chin (face mesh 152), top of head (face mesh 10)
  - left/right face edge (face mesh 234, 454)
  - left/right shoulder
  - plus faceWidth and the video width and height
- Compute it in savePrint from `input.zen` (the Lock frames). Use the median per point to drop outliers.
- When a stand print is saved later, it gets its own lockedPose.

## 2. Draw "Your best posture" outline
- New component src/features/live/LockedOutline.tsx draws a smooth head-and-shoulders silhouette path from lockedPose:
  - a head ellipse from the top of head, chin and face edges
  - a neck from the bottom of the ear and jaw to the shoulders
  - shoulder curves out to and past each shoulder point, down to the bottom of the frame
  - the same style as the Setup guide: a rounded dashed emerald stroke (#059669, about 3 px, dash "2 10"), no fill
  - a small emerald tag "Your best posture" near the head
- Use the same mirrored, object-cover mapping as the video (reuse toGuideSpace from setupCheck.ts), so it sits exactly where the user was when they locked it.
- If the user's camera or distance changed (current faceWidth differs by more than 15%), scale the outline around the shoulder midpoint by the ratio, so it still fits. Show a small hint "Camera moved? Re-lock my posture".

## 3. Show the drift
- Use the Posture Print (current values, slouchDelta, weights) for the Live score and callouts when a print exists. Fall back to the old baseline only when there's no print.
- When drifting (the print's slouch amount is 1 or more), add a soft amber glow on the part that moved most (head or shoulders), a small curved amber arrow pointing from the user's current head toward the outline's head, and one amber pill at the top of the video naming it:
  - "Head drifting forward. Glide back into your outline."
  - "Shoulders creeping up. Let them drop."
  - "Leaning to one side. Center yourself."
- Show the same text in the sidebar. Speak it only if voice coaching is on and the nudge rules allow it.
- When back in posture: the outline briefly glows emerald and shows "Back in your outline ✓".
- Respect reduced motion.

## 4. Sidebar
- Score ring (amber when drifting, emerald when good), a label like "Drifting" or "Great posture"
- 2 to 3 rows of checks with an emerald check or an amber warning icon
- a toggle "Show my best-posture outline", saved in settings, default on
- an outline button "Re-lock my posture", which goes to the Posture Print flow
- Update the page subtitle to: "The green outline is your locked-in best posture. Video never leaves this device."
- If there's no print, show "Lock in your best posture first" with a link to the Posture Print flow, replacing the old "Find your Glow" link.

## 5. Clean up
Fix the garbled text in LiveViewPage.tsx caused by bad encoding:
- "Getting the on-device model ready�?�" should be "Getting the on-device model ready…"
- the mini widget label "A�" should be " · "
Save the file as UTF-8. Search all of src for "�" and "A�" and fix every other occurrence the same way.

## 6. Tests
- lockedPose is the median of the Lock frames.
- The outline path is within 2% of the saved points.
- Scaling works when faceWidth changes.
- With a print present, Live uses print-based scoring.
- No "�" left in src.

When done, tell me in plain English how to check it: open Live view after locking in, sit well and you should be inside the green outline, then slouch forward and the amber arrow and tip should appear, then sit back and it should say "Back in your outline".
