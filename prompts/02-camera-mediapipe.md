# Prompt 02: Camera + MediaPipe with live landmark overlay

Copy everything below the line into Cursor's Agent chat.

---

Next step for SitGlow. Read `.cursor/rules/sitglow.mdc` (especially Privacy), `docs/product-spec.md` sections 1.2, 1.3, 1.5, and `docs/posture-engine.md` sections 2 and 5. Look at `design/screens/earlier-set/01-setup.jpg` and `design/screens/live-slouch-vs-good-posture.jpg`.

Build:
1. **Onboarding** (3 short steps: what SitGlow does → privacy promise → "Turn on camera"). Request the camera only when the user taps the button. Handle denied/unavailable camera with a friendly help screen and "Try again". Remember onboarding completion in localStorage.
2. **Privacy page** (`/privacy`) with the plain-language copy from `docs/brand.md`, the "wellness tool, not a medical device" line, and a working "Delete all my data" button (with confirm).
3. A `useCamera` hook: `getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })`, start/stop/pause, stops all tracks on pause/unmount, exposes status. A visible "Camera on" indicator + Pause button in the shell whenever the camera is live.
4. Install `@mediapipe/tasks-vision`. Create `src/lib/vision/` that loads **PoseLandmarker** (lite) and **FaceLandmarker** in `VIDEO` mode, GPU delegate with CPU fallback. Put model `.task` files and WASM in `public/models` and `public/wasm` (add a small script `npm run fetch-models` that downloads them), so nothing loads from third parties at runtime. 
5. An inference loop hook (`useLandmarks`) using `requestVideoFrameCallback` (fallback `requestAnimationFrame`), throttled to ~15 fps visible / ~3 fps hidden, returning the typed `Landmarks` object from `docs/posture-engine.md` §8 (pixel space, unmirrored).
6. **Live view** page: mirrored video preview, a canvas overlay drawing the key points (nose, eyes, ears, shoulders, iris circles) and the shoulder/eye lines, toggleable in Settings. Show "Can't see you clearly" or "Are you away?" states from §5.
7. Add a dev-only on-screen debug panel (fps, faces found, visibility values).

Absolutely no video frames, images, or landmarks may be sent over the network or saved. Confirm this in your summary.

**How to verify**
- First visit shows onboarding; camera permission is asked only after "Turn on camera".
- On Live view you see yourself mirrored with dots on your eyes, nose, ears, and shoulders that follow you smoothly.
- Cover the camera or walk away → "Are you away?" appears.
- Click Pause → camera light on your computer turns off.
- Open DevTools → Network tab while on Live view: no requests containing images/video (only the local model files on first load).
- Privacy page "Delete all my data" resets you to onboarding.
