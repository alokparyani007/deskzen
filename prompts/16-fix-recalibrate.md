# Fix: Re-calibrate steps 1-4 freeze, and the Slouch-o-meter gets stuck

The user reports the Re-calibrate flow (Setup, Body reset, Lock, Catch Me) "is not working" and that the camera image gets stuck on the Slouch-o-meter (Catch Me) screen. Fix the root causes below, then polish. Keep all scoring rules from 09b-fix-setup-fit, body-reset-v2 and lock-v2 as they are.

## 1. Root cause: the video pauses when it moves between screens (MUST FIX)
In src/features/camera/camera-context.tsx, `placeVideo` does `(slot ?? park).appendChild(video)`. Moving a <video> element in the DOM makes the browser PAUSE it. `autoPlay` does not restart it after the first play. So every time a step changes (for example Lock to Catch Me), CameraStage moves the video and the picture freezes. Landmarks stop updating, so the meter freezes too.

Fix:
- After every appendChild in placeVideo, if the video has a srcObject and is paused, call `video.play().catch(() => {})`.
- Also add a `pause` event listener on the shared video. If the camera status is 'live' and the page is visible, resume it with play().
- Also check src/hooks/useLandmarks.ts so detection never stops for good when the video was briefly paused or readyState dropped. It should keep its requestAnimationFrame or interval loop alive and just skip frames until the video is playing again.
- Add a watchdog shared by every print step: if landmarks haven't updated for 2 s while live, try play() once. If that's still stuck after 4 s, show a small friendly bar "Camera paused" with a "Resume" button that calls play() (or camera.start() if the stream ended). It must never just sit frozen.

## 2. Catch Me (Slouch-o-meter), friendlier and never stuck
In src/features/print/CatchStep.tsx:
- Make the meter big and alive: a thick bar (h-5) with a moving marker. Label the ends "Your best" and "Slouch". Add a "Slouch here" tick at the trigger level, and a short word that updates live ("Upright", "A little", "Almost", "Got it!"). Animate the width smoothly (CSS transition 150ms).
- Keep the history array bounded: keep only the last 5 s of samples.
- Add Back (to Lock) and "Skip this step" buttons that are always visible. Skip calls onCaught([], false).
- In the 'caught' phase, if the user doesn't come back to their reset within 6 s, show Continue (as now). Also show the text "Sit back up tall to finish", and auto-finish after 10 s so it can never hang.
- If no landmarks are seen (user out of frame), show "We can't see you, move back into the frame" instead of a frozen meter.

## 3. Steps 1-4, consistent and easy to move through
- Every step (Setup, Body reset, Lock, Catch Me) has the same footer: Back, the step dots "Step N of 5", and a Next or Skip button. Don't auto-advance anywhere.
- Re-calibrate starting from Home or Settings goes straight to Setup when the camera is live, or to the privacy card if it isn't. Finishing or leaving returns to the page it came from (Home by default), not always /app.
- Moving between steps must not restart the camera. One stream, no flicker. (Section 1 keeps it playing.)

## 4. Small fixes
In CameraStage.tsx, the badge text is garbled ("Live A� on-device A� no video saved"). Make it read "Live, on-device, no video saved". Search the whole src folder for any other "A�", "â€" or "Â" mojibake and fix it. Save files as UTF-8.

## 5. Tests
- placeVideo resumes a paused video.
- CatchStep finishes by itself within 10 s after being caught.
- Skip works.
- The history stays bounded.
- The watchdog shows "Camera paused" when landmarks stop.

When done, tell me in plain English how to check it: run Re-calibrate from Home and go through all 4 steps. The picture should keep moving on every screen. On Catch Me, slouch and watch the meter fill, then sit up and see it finish. Also try Skip and Back.
