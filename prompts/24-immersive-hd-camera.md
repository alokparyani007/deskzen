# 24 - Set my Zen: immersive full-screen HD camera

Mockup: design/live-recal/13-set-my-zen-immersive.jpg (match the feel: camera fills the screen, everything else floats on top).
Also match 10-slouch-meter.jpg and 11-zen-is-set.jpg content, but inside this immersive layout.

## Why it feels small today (found in code)
- camera-context.tsx asks for `{ width: 640, height: 480 }` (VGA), so it looks soft when enlarged.
- SetupStep / ResetStep / LockStep put CameraStage in a `max-w-5xl` grid at `1.2fr` (~560px wide); CatchStep wraps it in `max-w-xl`.
- CameraStage `frame="guide"` forces `aspect-video` + object-cover, cropping the 4:3 feed, and caps at `max-w-3xl`.

## 1. HD camera
- Constraints: `{ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: 'user' }` (+ `deviceId` when the user picks a camera). If that fails, retry with 640x480. Keep prompt 16's play/resume watchdog.
- Keep ML cheap: if pose or segmentation fps drops below ~12, feed MediaPipe a downscaled frame (max 640px wide) from an OffscreenCanvas/canvas instead of the full video. Display stays HD.
- Audit every absolute pixel threshold (e.g. `expectedShoulderPx`, iris/IPD px, face size px, distance checks) and make it relative to video width/height so 1280x720 behaves the same as 640x480. Existing tests must still pass; add one test that runs the same pose at 640 and 1280 width and gets the same scores.
- Pill top-right: "HD camera" when actual track settings are >= 1280x720, otherwise "Camera". Clicking it opens a small menu listing cameras (`enumerateDevices`) to switch. Remember the choice in local settings.

## 2. Immersive layout for the whole Set my Zen flow
- New `ImmersiveStage` wrapper: fixed full-viewport overlay (`fixed inset-0 z-50`) on a near-black emerald background (#04140E). Video fills it with `object-cover`, 24px rounded corners, 16px inset, thin emerald glow border (box-shadow 0 0 40px rgba(5,150,105,.35)). Optional: call `requestFullscreen()` when the flow starts; Esc or X exits and returns to where the user started.
- Soft top and bottom dark gradients on the video for legible text.
- Overlays (all frosted glass: bg-white/10-15, backdrop-blur-xl, white text, rounded-2xl):
  - Top-left: DeskZen logo (real logo).
  - Top-center: slim segmented progress bar with step names: Frame check, Loosen up, Find your best, Learn your slouch (active = emerald, done = white, upcoming = white/30).
  - Top-right: X close, HD camera pill.
  - Bottom-center: the ONE instruction card for the current step (big 28-32px bold line + small helper line), with a circular emerald countdown ring on the right when a hold is running.
  - Bottom-left: "On-device, no video saved". Bottom-right: lighting pill.
  - Slouch step: the vertical slouch meter from mockup 10 floats on the right edge of the video (frosted), not beside it.
- The outline(s) draw on the video via the shared `toScreen()` helper with object-cover math so they sit exactly on the body at any screen size. Add tiny drifting light particles along the emerald outline while "locking" (canvas, max 40 particles; off for prefers-reduced-motion).
- Back/Next/Skip footer from prompt 16 becomes small frosted buttons at the bottom edge of the overlay (keep keyboard: Left/Right arrows, Esc).
- "Your Zen is set" finish screen: same dark immersive background, the user's traced outline large in the center glowing, checklist and Start Live view button floating on the right (from mockup 11).
- Mobile: same, video full-bleed, card at bottom, meter horizontal above the card.

## 3. Lighting check (numbers only)
- Every 1s draw the video to a 32x18 canvas and compute average luminance and center-vs-edge contrast. Pill text: "Lighting: great" / "A bit dark - face a window or turn on a light" / "Backlit - try turning so the light is in front of you". If not great during Frame check, show that as the instruction. Never store pixels.

## 4. Apply HD to Home and Live view too
- They share the camera context, so they get HD automatically. Make the Live view video column take at least 65% width on desktop (use the 9-live-coach-match mockup layout).

## 5. Check
- Video looks sharp full screen; outlines line up at 1280x720 and on a small laptop screen.
- No freezing between steps; fps of pose loop >= 12 on a normal laptop.
- `npm run build` and `npm test` pass. Report the actual camera resolution you got and files changed.
