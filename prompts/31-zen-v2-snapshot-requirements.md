# 31 — Set my Zen v2 (one picture → your real outline) + Live view v2

**Status:** Founder decision made. Build **Option A + step-by-step checks + "Correct posture" side panel**.
**This file REPLACES prompts 22–30 for Set my Zen and Live view.** Where an older prompt or doc disagrees, THIS file wins.
**Do NOT delete old code yet.** Build v2 next to it, switch the routes, and keep the old pages reachable at `/set-my-zen-legacy` and `/live-legacy` until the founder signs off.

---

## 0. How to work (read first, every session)

1. **Open every mockup in `design/zen-v2/` before writing any code.** Match layout, copy, colors and hierarchy. Do not invent extra panels, badges or text.
   | Mockup | What it shows |
   |---|---|
   | `S1-side-panel.jpg` | **PRIMARY Step 1.** Camera (~68% width) + "Correct posture" side panel (~30%), four check chips (Head, Shoulders, Sit tall, Distance), one tip in the dock, Back / Take picture. |
   | `OptD-guided-build.jpg` | Reference only for how the chips turn green **one at a time** (green ✓ = done, amber = the one we are working on, gray = not yet). Copy the chip look and the "hold" ring, not the layout. |
   | `S1-snap.jpg` | Step 1 at the **countdown moment** (viewfinder brackets, "eyes here" line, big 3-2-1). |
   | `S2-outline.jpg` | Step 2: frozen picture with the traced emerald outline + check badges, Retake / Looks good. |
   | `S3-fit.jpg` | Step 3: live camera, saved outline fixed, "86% fit" pill, "Hold 3s" ring, Back / Lock my Zen. (In v2 Step 3 ALSO has the side panel, same as S1.) |
   | `S4-done.jpg` | Step 4: outline only (no photo), three check lines, Retake / Start Live view. |
   | `L2-on-track.jpg` | Live view, on track: emerald outline, "95% fit", "You're in your Zen". |
   | `L1-drift.jpg` | Live view, drifting: amber body edge where outside the outline, one arrow, one tip, "72% fit". |
   Ignore any OptB / OptC images.
2. **Read the current code first** (names below are real files in this repo): `src/features/print/` (PrintFlow.tsx, SetupStep.tsx, LockStep.tsx, frameCoach.ts, landmarkBody.ts, glowOutline.ts, contourSample.ts, outlineFit.ts, savePrint.ts), `src/calibration/` (lockCoach.ts, lockedPose.ts, print.ts, store.ts, config.ts), `src/features/live/` (LiveViewPage.tsx, useLiveWire.ts, frame.ts, outline.ts, LiveOverlay.tsx, coach.ts), `src/lib/vision/` (session.ts, segment.ts, extract.ts, inferenceFrame.ts), `src/lib/posture/` (types.ts, signals.ts, silhouette.ts), `src/hooks/useLandmarks.ts`, `src/app/router.tsx`.
3. **Build in small steps, in the order of Section 5.** After every step: `npm test` (Vitest) must pass, then run `npm run dev` and test **with a real webcam in Chrome at `http://localhost:5173`** (not Cursor's preview) at **1920×1080 and 1366×768**. Primary buttons must always be visible without scrolling.
4. **Never store images or video.** The picture lives only in memory (a canvas / ImageBitmap) until the user taps Looks good, Retake, Back or closes the page — then it is wiped. Never call `toDataURL`, `toBlob`, `createObjectURL`, never put pixels in localStorage / IndexedDB / console / analytics. Only numbers (outline points, landmark numbers) are saved.
5. **US English. No medical claims.** Say "posture", "comfortable", "upright". Never say "treat", "prevent", "cure", "diagnose", "pain relief", "spine health". Footer line stays: "DeskZen is a wellness tool, not a medical device."
6. Every coaching line is shown as text AND spoken when Voice is on (reuse `speakCaption` from `src/features/calibrate/glowVoice`).
7. **One coordinate rule for all new code:** store points as **normalized, UNMIRRORED camera space** (`x = px / videoWidth`, `y = px / videoHeight`, 0–1). Mirror ONLY when drawing, in one helper. (Old `lockedPose.ts` stores mirrored x = `1 - x`; do not mix the two. If you read an old `lockedPose`, convert with `x = 1 - x` first.)
8. All thresholds live in ONE file: `src/features/zen2/zenConfig.ts`. No magic numbers in components.

### Design tokens (unchanged)
Emerald `#059669` (good, primary buttons, saved outline). Amber `#F59E0B` (current issue, live body edge outside the outline). Mint `#ECFDF5` / panel `#EEF6F1`. Dark stage `#0B1F17`. Frosted dock `rgba(15,23,42,0.72)` + `backdrop-blur-md`, white text, title 24–28px, helper ≥16px. Overlays never cover the face.

---

## 1. Research summary

### 1.1 What ergonomics guides agree on (sitting and standing)
- **Head level, facing forward, in line with the torso; not turned, tilted, flexed or extended.** (OSHA Positions; CCOHS Sitting Basic Requirements)
- **Shoulders relaxed, upper arms hanging at the sides.** (OSHA Positions; CCOHS; Mayo Clinic)
- **Top of the screen at or slightly below eye level**; center of the screen ~15–20° below eye level. (OSHA Monitors; Mayo Clinic; CCOHS Monitor Positioning says ~15°; Cornell says ~17–18° and "eyes in line with a point 2–3 in below the top of the monitor casing")
- **Screen about an arm's length away, at least 20 in; OSHA/Mayo give 20–40 in (50–100 cm).** (OSHA Monitors; Mayo Clinic; Cornell; CCOHS)
- **Screen directly in front; optimum ±15° side to side, 35° max.** (CCOHS Sitting Basic Requirements; OSHA Monitors)
- **Standing:** legs, torso, neck and head approximately in line and vertical. (OSHA Positions) Same head/shoulder/screen rules as sitting.
- **No single posture is right all day; change position often.** (OSHA Positions; CCOHS; Cornell recommends a slight recline of 100–110° rather than bolt-upright 90°). → We coach "back to *your* best", never "hold rigidly".

### 1.2 How existing webcam posture apps work
- **Calibrate on the user's own good posture, then compare to it.** Nekoze remembers where your face is when you start and alerts when it drifts. ProxErgo (MediaPipe) calibrates ~30 frames (~1 s) of neutral posture and stores depth, ear–shoulder vertical distance and shoulder tilt. SitRight uses a 30-frame baseline. ProPosture uses a 3 s / 90-frame baseline with robust median. slouch-detector uses the median of 15 frames. BatesPosture uses a 6 s baseline. PoseX records personal parameters in 3 s.
- **Signals from a FRONT webcam:**
  - *Head-to-shoulder vertical distance, normalized by shoulder width* (SitRight, ProxErgo "vertical", slouch-detector nose-to-shoulder, ProPosture nose-shoulder gap). It shrinks when you slouch, push your head forward or shrug.
  - *Face size as a distance / lean-in proxy*: SitRight flags "too close" when eye-corner distance grows past ~1.25× baseline; PoseX uses face width vs shoulder width vs ear–shoulder height to get depth from a plain RGB image (≥84% accuracy at 60/85/110 cm); a Korean webcam "turtle neck" study divides jaw-to-shoulder distance by face (cheekbone) width (~91% accuracy) and uses face width growth when shoulders are out of view.
  - *Shoulder tilt* (y difference of shoulders / shoulder width). ProxErgo flags tilt at >7° from calibrated (10° uncalibrated).
  - *Nose vs shoulder midpoint* (ProxErgo "depth"/offset).
  - *Shoulder height on screen* drops when you slump (ProPosture).
- **Not fully in frame:** apps ask for head, neck, both shoulders and upper chest in frame; camera near eye height; good front light; recalibrate when the camera, chair or lighting changes (posturereminderapp accuracy guide; Nekoze listing).
- **Avoiding nagging:** alert only after the bad state is *sustained* — ProPosture default 10 s; SitRight "several seconds"; BatesPosture cooldown-controlled notifications; Posture Pal has an adjustable "warning delay" because reviewers complained it fired on every glance down; Posture Pal sensitivities were 10/20/35° of neck tilt. Smooth the score (SitRight uses an exponential moving average).
- **Known limits:** a front camera sees forward-head posture only indirectly (face grows, neck gap shrinks). That is exactly why a *personal* snapshot baseline beats generic absolute thresholds.

### 1.3 Good Posture Pose rules (computed from MediaPipe landmarks, front webcam)

Notation (pixels, unmirrored, y grows downward): `LS`/`RS` = shoulders (pose 11/12), `LE`/`RE` = eyes (pose 2/5), `LEar`/`REar` (7/8), `N` = nose (0), `LEl`/`REl` elbows (13/14). `W`,`H` = video size. `sw = dist(LS,RS)`. `shMid = mid(LS,RS)`. `eyeMid = mid(LE,RE)`. `faceW = faceBox.w * W` (face mesh), else `|rightFace.x − leftFace.x|`, else `2.2 × |RE.x − LE.x|`. Use the **median of the last 10 frames** (~0.7 s at 15 fps) for every value.

**Legend for "Source":** **[S]** = number comes straight from a cited source. **[S→E]** = the idea is from sources, the exact number is our engineering default. **[E]** = engineering default, tune with real users. Every **[E]** value lives in `zenConfig.ts`.

#### A. Snapshot rules (absolute, used in Step 1 before the picture, and Step 2 badges)

| # | Rule (chip) | Signal | How computed | Good range — SITTING | Good range — STANDING | Source |
|---|---|---|---|---|---|---|
| R1 | In view (gate) | Pose present | `N.visibility ≥ 0.5` OR both eyes ≥ 0.5 | pass | pass | [E] (existing `PRESENCE_VISIBILITY`) |
| R2 | **Head** | Head centered | `eyeMid.x / W` | 0.35–0.65 (middle 30%) | 0.35–0.65 | [S→E] OSHA/CCOHS "directly in front, ±15°" |
| R3 | **Head** | Eyes line height | `eyeMid.y / H` | 0.25–0.45 | 0.25–0.45 | [E] matches "eyes here" line in S1 mockup |
| R4 | **Head** | Head roll (tilt) | angle of `LE→RE` vs horizontal | \|roll\| ≤ 6° | ≤ 6° | [S→E] OSHA "head level"; ProxErgo 7°/10° |
| R5 | **Head** | Facing screen (yaw) | `yawDeg` from face matrix | \|yaw\| ≤ 15° | ≤ 15° | [S] CCOHS optimum ±15° |
| R6 | **Head** | Chin level (pitch) | `pitchDeg` from face matrix | \|pitch\| ≤ 15° | ≤ 15° | [S→E] OSHA/CCOHS "not flexed or extended" |
| R7 | **Shoulders** | Both shoulders visible | `LS.vis ≥ 0.5` AND `RS.vis ≥ 0.5`, AND both inside `x ∈ [0.03W, 0.97W]`, `y ≤ 0.97H` | pass | pass | [S→E] apps need both shoulders in frame |
| R8 | **Shoulders** | Shoulders level | angle of `LS→RS` vs horizontal | \|tilt\| ≤ 4° | ≤ 4° | [S→E] OSHA/CCOHS "shoulders relaxed"; ProxErgo 7° |
| R9 | **Shoulders** | Body centered under head | `|N.x − shMid.x| / sw` | ≤ 0.12 | ≤ 0.15 | [E] ProxErgo nose-vs-shoulder idea |
| R10 | **Sit tall** (Stand tall) | Neck ratio (not slumped / shrugged) | `(shMid.y − N.y) / sw` | ≥ 0.50 AND ≥ 0.95 × the highest value seen in the last 15 s | ≥ 0.50 AND ≥ 0.95 × max | [S→E] SitRight / slouch-detector / ProPosture use this signal; numbers [E] |
| R11 | **Sit tall** | Ears over shoulders (front proxy) | face/shoulder ratio `faceW / sw` | 0.30–0.55 | 0.28–0.55 | [S→E] PoseX face-width vs shoulder-width; band [E] |
| R12 | **Distance** | Screen distance | iris-based `screenDistanceIn()` (existing `lib/posture/signals.ts`) | 20–32 in | 20–40 in | [S] OSHA/Mayo ≥20 in, 20–40 in; arm's length (Cornell) |
| R12b | **Distance** (fallback when no iris) | Face width share of frame | `faceW / W` | 0.11–0.20 | 0.09–0.20 | [E] (existing `calibrationConfig.setup.faceWidthFull*`) |
| R13 | (gate) | Only one person | `faceCount ≥ 2 && faceAmbiguous` for 3 s → fail | pass | pass | [E] |

Notes:
- R10 "≥ 0.95 × max seen" means: while the user is on Step 1 we keep the tallest neck ratio we have seen. "Sit tall" turns green when they are within 5% of their own tallest. This makes the rule personal without a prior baseline.
- R11 is a soft check (it can never be the ONLY reason to block the picture; if R11 is the only failure after 5 s, pass it).
- Pitch from a laptop camera below the eyes reads slightly "chin up". If many testers fail R6 while looking straight, widen to 20° (the old `frameCoach.ts facing()` used 20°).

#### B. Live rules (relative to the user's saved baseline, used in Step 3 and Live view)

| Signal | Drift when | Tip it drives | Source |
|---|---|---|---|
| Neck ratio `(shMid.y − N.y)/sw` | < 0.90 × baseline | "Sit tall" / "Lift your chest a little." | [S→E] ProPosture % of baseline; SitRight ramps from 3% |
| Face/shoulder ratio `faceW/sw` | > 1.12 × baseline (lean in / head forward) | "Sit back into your outline" | [S→E] PoseX; SitRight too-close at 1.25× |
| Face width share `faceW/W` | > 1.20 × baseline | "Move back a little" (too close) | [S] SitRight 1.25×; [E] 1.20 |
| Face width share | < 0.80 × baseline | "Come a little closer" | [E] |
| Shoulder tilt | \|tilt − baseline\| > 5° | "Level your shoulders" | [S→E] ProxErgo 7° calibrated |
| Head roll | \|roll − baseline\| > 7° | "Straighten your head" | [S→E] |
| Shoulder line height `shMid.y / H` | > baseline + 0.04 (slumped down) | "Sit tall" | [S→E] ProPosture "shoulder height" |
| Nose offset `|N.x − shMid.x|/sw` | > baseline + 0.10 | "Center your head over your shoulders" | [E] |
| Pitch | < baseline − 12° (looking down) | "Chin level, eyes up" | [S→E] Posture Pal 10/20/35° tiers |

**Timing (anti-nag):** drift state needs **3 s continuous** below the fit threshold [E, shorter than ProPosture's 10 s because Live view is a foreground coaching screen]; voice per-tip cooldown **20 s** [E]; any voice line at most every 8 s [E]; return to "on track" needs ≥ 85% fit for 1 s (hysteresis) [E].

---

## 2. Set my Zen v2 (`/set-my-zen?pose=sit|stand`)

Full-screen dark stage, no sidebar (reuse the shell in `src/features/print/ImmersiveStage.tsx` / `zenChrome.tsx`). Top bar: DeskZen logo left; step pill center ("Step 1 of 4 · Get ready"); "● HD camera" pill + close (X) right. Close returns to `printReturnPath(from)` (existing `printSteps.ts`). Mode comes from `?pose=` (`stand` → standing, anything else → sitting) and from the Sitting | Standing toggle in the side panel (toggle updates the URL with `replace`).

Layout for Steps 1 and 3 (mockup `S1-side-panel.jpg`): `h-dvh flex flex-col`; middle row is a grid `grid-cols-[minmax(0,68fr)_minmax(280px,30fr)] gap-[2%]`; bottom dock is a normal flex child (never absolutely positioned off-screen). Camera: mirrored, `object-cover`, rounded-2xl, request 1280×720 minimum (existing HD camera). At 1366×768 the panel may shrink to 280px; the camera keeps the rest.

### 2.0 The "Correct posture" side panel (Steps 1 and 3; collapsible in Live view)

Component: `src/features/zen2/PostureSidePanel.tsx`.
- Title: **"Correct posture"** (white, 20px, on the dark panel `#0B1F17` with a 1px emerald/20% border).
- Image: the existing illustration **`/media/guides/good-desk-posture.jpg`** (file `public/media/guides/good-desk-posture.jpg`, 1280×720; left half = "1 Sitting", right half = "2 Standing"). Show it on a mint card (`#EEF6F1`, rounded-xl), **cropped with CSS** (`object-fit: none` + `object-position`, or a wrapper with `background-image` / `background-size` / `background-position`) — do NOT edit or re-save the file.
  - Sitting crop (source pixels, starting values, tune visually): `x 215–640, y 150–610`.
  - Standing crop: `x 735–1060, y 150–610`.
  - The original image has small printed labels. Adjust the crop so no printed label text is visible inside the crop. If one cannot be avoided, cover it with a mint rectangle (`#EEF6F1`). If it still looks messy, stop and tell the founder: "Please add a label-free version at `public/media/guides/good-desk-posture-clean.jpg`" — the component should prefer that file when it exists (try load, fall back).
- **Four callouts** drawn as HTML on top of the cropped image (text 13–14px, emerald `#065F46` text, emerald leader line + 6px dot on the body part, like the mockup). Positions are % of the crop box (store per mode in `PostureSidePanel.tsx`, tune against the mockup):
  | Callout text | Linked rules | Dot (sitting) | Dot (standing) |
  |---|---|---|---|
  | **Eyes level with top of screen** | R3, R6 | eye of the figure (~35%, 18%) | (~30%, 12%) |
  | **Ears over shoulders** | R10, R11 | ear/neck (~30%, 28%) | (~25%, 20%) |
  | **Shoulders relaxed and level** | R7, R8, R9 | shoulder (~32%, 36%) | (~28%, 30%) |
  | **Screen about an arm's length away** | R12 | between face and screen (~60%, 30%) | (~60%, 25%) |
- **Highlight:** the callout linked to the chip that is currently amber (the first failing check) turns **amber** (`#F59E0B` text, line and dot, with a soft 1.5 s pulse unless `prefers-reduced-motion`). All others stay emerald. When everything passes, all callouts are emerald. The "Head" chip (R2–R6) highlights "Eyes level with top of screen".
- Under the image: toggle **"Sitting | Standing"** (switch). Changing it swaps the crop, the rule set (Section 1.3 columns) and the saved mode.
- Live view: the same panel, **collapsed by default**, opened from a small "Posture guide" button in the top bar; when open it takes 30% and the camera 68%.
- Accessibility: image `alt="Illustration of good desk posture while sitting"` / "…while standing"; callouts are real text.

### 2.1 Step 1 — Get ready + Snap (mockups `S1-side-panel.jpg`, then `S1-snap.jpg` for the countdown)

Live camera on the left, side panel on the right.
On the video: viewfinder brackets (4 white corners) sized to the expected head box, a thin dashed horizontal line labeled "eyes here" at `y = 0.35H` (middle of R3's band), and **four chips in a row at the top of the video**: **Head · Shoulders · Sit tall · Distance** (standing mode: **Head · Shoulders · Stand tall · Distance**). Small amber landmark dots on eyes, shoulders and chest may be drawn (as in the mockup) — dots only, no skeleton lines.

**Chip-by-chip logic** (`chipSequence.ts`, mockup `OptD-guided-build.jpg` for the look):
- Chip states: `todo` (gray), `active` (amber outline + amber text — the one we are coaching now), `done` (emerald fill + ✓).
- Chips go green **one at a time, in order**. Only the first not-done chip is `active`. A chip becomes `done` after its rules pass continuously for **1 s** [E] (show a small ring filling in the dock while holding).
- A `done` chip falls back to `active` only if its rules fail continuously for **1.5 s** (hysteresis, so blinking or a glance does not undo progress).
- Later chips are evaluated silently; if they already pass when it is their turn, they turn green after their 1 s hold.
- Gates R1 and R13 are not chips: if R1 fails for 2 s the dock says "Step into view"; if R13 fails the top pill says "Just you in the frame, please".

**Dock** (frosted, full width): icon circle (amber posture icon while coaching, emerald camera icon when ready), title = ONE tip for the active chip, helper line, buttons **Back** and **Take picture**.

| Situation | Title | Helper | Voice (once per change, 20 s cooldown per line) |
|---|---|---|---|
| Opening | "Let's set your Zen" | "Match the picture on the right. When all four are green, I'll take your picture." | "Let's set your Zen. Match the picture on the right." |
| No person 2 s | "Step into view" | "Sit where the camera can see your head and shoulders." | same title |
| Head: off-center (R2) | "Move a little left" / "Move a little right" (screen direction, mirrored preview) | "Center your face in the brackets." | title |
| Head: eyes too high/low (R3) | "Raise your screen a little" / "Lower your screen a little" (eyes below band → screen/camera too high → "Lower…"; eyes above band → "Raise…") | "Line your eyes up with the dotted line." | title |
| Head: tilted (R4) | "Straighten your head" | "Keep your eyes level." | title |
| Head: turned (R5) | "Face the screen" | "Look straight at the camera." | title |
| Head: chin up/down (R6) | "Chin level" | "Eyes straight ahead, not up or down." | title |
| Shoulders: not visible (R7) | "Show both shoulders" | "Lean back a little or tilt your screen down." | title |
| Shoulders: not level (R8) | "Drop and level your shoulders" | "Let them sink away from your ears." | title |
| Shoulders: body off-center (R9) | "Center your body" | "Head right over your shoulders." | title |
| Sit tall (R10/R11) | "Sit tall" (standing: "Stand tall") | "Lift your chest a little, chin level." | title |
| Distance: too close (R12) | "Move back a little" | "About an arm's length from the screen." | title |
| Distance: too far | "Come a little closer" | "About an arm's length from the screen." | title |
| All four green | "Perfect. Hold still" | "Taking your picture in 3…" | "Perfect. Hold still." |

**Taking the picture:**
- When all four chips are green → automatic **3-2-1 countdown** (big translucent number in the lower middle of the video, see `S1-snap.jpg`; one soft tick per number; no voice per number). If any chip drops during the countdown, cancel the countdown and go back to coaching.
- **Take picture** button: enabled when all four are green (starts the countdown immediately). Before that it is disabled for the first **10 s**; after 10 s it becomes enabled with the helper "Some checks aren't green yet. Your outline may be less accurate." and tapping it starts the countdown anyway (store `forced: true`).
- **Back**: leaves to `printReturnPath(from)`.
- At 0: capture ONE frame (Section 2.6 "Capture") → go to Step 2.

### 2.2 Step 2 — Your outline (mockup `S2-outline.jpg`)

- Show the **frozen picture** (from the in-memory canvas, mirrored like the preview) with a small "Picture" tag top-left. Camera keeps running in the background but is not shown.
- Run, **on that single frame only**: pose landmarks + face landmarks (same models) and selfie segmentation. Then trace the outline (Section 2.6 "Trace").
- While tracing (< 1.5 s): title "Tracing your outline…", helper "This stays on your device." Spinner in the dock icon.
- Draw the traced outline as a smooth emerald line (3px + soft glow) on the picture.
- **Check badges** on the right of the picture (emerald with ✓, or amber with !): **"Head centered"** (R2–R6), **"Both shoulders"** (R7–R9), **"Sitting tall"** / **"Standing tall"** (R10–R11), **"Good distance"** (R12). Computed from the snapshot landmarks, not live.
- Dock (all pass): ✓ icon, title **"That's your outline"**, helper **"This is how you sit at your best. Look right?"** (standing: "…how you stand at your best…"), buttons **Retake** and **Looks good**. Voice: "That's your outline. Look right?"
- **Looks good** → build the baseline from the snapshot (Section 2.5), wipe the picture, go to Step 3.
- **Retake** → wipe the picture, back to Step 1 (chips keep their progress only if still passing).

**Step 2b — Retake state** (same screen, amber). If the snapshot fails a hard check, the Looks good button is replaced by **Retake** as the primary button and the dock gives ONE specific fix (first failing in this order):

| Problem found in the picture | Title | Helper |
|---|---|---|
| A shoulder is cut off (R7 fails, or the outline touches the left/right frame edge within 2%) | "A shoulder is cut off" | "Move back a little or center yourself, then retake." |
| Off-center (R2) | "You're a bit off-center" | "Move a little left/right, then retake." |
| Too far (R12) | "You're a bit far away" | "Come a little closer, about an arm's length." |
| Too close (R12) | "You're a bit close" | "Move back a little, about an arm's length." |
| Leaning (R8 or R9 or R4) | "You're leaning a little" | "Sit centered with level shoulders, then retake." |
| Trace failed (no usable outline) | "I couldn't trace your outline" | "Try more light on your face and a plain background, then retake." |
Voice: the title. A small link "Use it anyway" stays available for every problem except "Trace failed" and "shoulder cut off".

### 2.3 Step 3 — Fit your outline (mockup `S3-fit.jpg` + side panel like S1)

- Live camera again (left 68%), side panel (right 30%) with the same callout highlight logic (highlight the worst live rule).
- The **saved outline is drawn fixed** (emerald) exactly where it was in the picture (same normalized coordinates → same screen position because the camera has not moved). It must NOT follow the user.
- The live body edge (from segmentation, ~6 Hz) is drawn **amber only where it is outside the saved outline** (Section 3 rule), nothing where it is inside.
- Top-center pill: **"●86% fit"** (dot emerald ≥ 90, amber 70–89, gray < 70). Fit from `fitScore.ts` (Section 2.7). Never show "0%" because a value is missing: if fit is null show "—% fit" and log the reason in the debug strip.
- Hold ring in the lower middle of the video: **"Hold 3s"**; fills while fit ≥ 90%; pauses (does not reset) when fit dips for < 0.5 s; resets after 1 s below 90.
- Dock: camera icon, title = ONE tip from the worst live rule (default **"Ease your head back into your outline"**), helper **"Fit your shape and hold still for 3 seconds."**, buttons **Back** (→ Step 1) and **Lock my Zen**.
- **Lock my Zen ALWAYS works** (never disabled). It locks immediately, whatever the fit. Locking also happens automatically when the ring completes.
- Voice on enter: "Now fit your outline and hold still." On lock: chime + "Locked."

### 2.4 Step 4 — Done (mockup `S4-done.jpg`)

- Left card: the saved outline only (emerald glowing line on dark, NO picture), caption **"Your Posture Print · Sitting"** (or "· Standing").
- Right: title **"Your Zen is set"** and three lines with emerald check boxes: **"Outline traced from your picture"**, **"Picture deleted, only the outline is kept"**, **"Live view will guide you back"**.
- Buttons: **Retake** (→ Step 1) and **Start Live view** (→ `/live`).
- Voice: existing `ZEN_SET_VOICE` = "Your Zen is set. I'll help you get back to it."
- Before showing Step 4, assert in code that no picture reference is left (canvas width/height set to 0, ImageBitmap `.close()` called, refs nulled).

### 2.5 What is saved (numbers only)

New type in `src/features/zen2/zenPrint.ts`, saved inside the existing `posture-prints` library (`src/calibration/print.ts`, `PRINTS_RECORD_KEY`) as an extra optional field so old screens keep working:

```ts
export interface ZenV2 {
  version: 3;
  mode: 'sit' | 'stand';
  createdAt: string;              // ISO timestamp
  video: { width: number; height: number };
  outline: { x: number; y: number }[];  // 120–180 points, normalized 0–1, UNMIRRORED, closed
  baseline: {
    shoulderMidX: number; shoulderMidY: number;   // normalized
    shoulderWidth: number;                        // normalized to W
    faceWidth: number;                            // normalized to W
    noseOffset: number;                           // |N.x − shMid.x| / sw
    neckRatio: number;                            // (shMid.y − N.y) / sw
    faceShoulderRatio: number;                    // faceW / sw
    shoulderRollDeg: number; headRollDeg: number;
    eyeLineY: number;                             // normalized
    pitchDeg?: number; yawDeg?: number; distanceIn?: number;
  };
  points: Record<'nose'|'leftEye'|'rightEye'|'leftShoulder'|'rightShoulder', { x: number; y: number }>; // normalized, unmirrored
  rulesAtSnap: Record<string, { value: number | null; pass: boolean }>;
  forced: boolean;                // picture taken before all chips were green
  fitAtLock: number | null;
}
// PosturePrint gets:  zen?: ZenV2
```
- Save with the **real mode** (`'sit'` or `'stand'`) — do not copy `savePrint.ts`, which hard-codes `mode: 'sit'`.
- Also fill the existing fields so old code does not break: `lockedPose = lockedPoseFromFrames([snapshotLandmarks])`, `anchor/current` from `aggregateFrames`, `camera.width/height`. Leave `silhouette` undefined.
- Baseline values: from the snapshot landmarks; if Step 3 collected ≥ 10 frames with fit ≥ 90, replace each baseline value with the median of those frames (more stable). Outline always comes from the picture.
- Never saved: the picture, the mask, any pixels.

### 2.6 Capture and trace (single frame)

**Capture** (`captureFrame.ts`): draw the current `video` frame into an in-memory `OffscreenCanvas` (fallback `HTMLCanvasElement` not attached to the DOM) at native video size. Return `{ canvas, width, height, dispose() }`. `dispose()` sets width/height to 0 and drops references. Call `dispose()` on Looks good, Retake, Back, close, route change and unmount.

**Detect on that frame**: add `detectFrame(source: HTMLCanvasElement | OffscreenCanvas, width, height)` to `src/lib/vision/session.ts` (calls the same pose + face landmarkers with `detectForVideo(source, nextTimestamp)` so we reuse the loaded models; timestamps must stay increasing). Add `readPersonMaskFrom(source, width, height, probes)` to `src/lib/vision/segment.ts` (same as `readPersonMask` but takes a canvas). Do not create a second set of models.

**Trace** (`snapshotOutline.ts`, pure, no DOM):
1. Threshold the person confidence mask at 0.5 → binary grid. Reuse `cleanPersonGrid()` from `lib/posture/silhouette.ts` with nose, shoulders and the face ellipse (see `faceEllipse` in `contourSample.ts`) to keep only the person blob.
2. **Cut at mid upper arm:** `cutY = shMid.y + 0.5 × (elbowY − shoulderY)` using the mean of visible elbows (visibility ≥ 0.5); if elbows are not visible, `cutY = shMid.y + 0.45 × sw`. Clear everything below `cutY`.
3. **Remove the chair:** below the shoulder line keep only `x ∈ [min(LS.x,RS.x) − 0.35·sw, max(LS.x,RS.x) + 0.35·sw]`; above the shoulder line keep only the face ellipse widened ×1.6 plus a neck band `|x − N.x| ≤ 0.35·sw`. Then keep the largest connected component that contains the nose.
4. Trace the outer contour (`traceBinary()`), scale to video pixels (`scaleToVideo()`), then **resample to 150 points evenly spaced along the contour (allowed 120–180)**, then smooth (moving average window 5, 2 passes, or existing `smoothContour()`); keep the bottom edge as one straight line at `cutY`.
5. Sanity: `outlineIsSane()` (existing) + area between 3% and 45% of the frame + head part above the shoulder line. If it fails, return `{ points: null, reason: 'trace-failed' }` → Step 2b.
6. Output normalized, unmirrored points.

### 2.7 Fit score (`fitScore.ts`, pure)

```
fit% = 100 × (0.50 × iouScore + 0.30 × landmarkScore + 0.20 × rulesScore)
iouScore      = clamp((IoU − 0.70) / (0.92 − 0.70), 0, 1)
                IoU = saved outline polygon vs live outline polygon, both rasterized on a 160×90 grid
landmarkScore = clamp(1 − d / 0.25, 0, 1)
                d = mean distance of nose, eye-mid, LS, RS (live vs saved) ÷ saved shoulder width
rulesScore    = (live rules in Section 1.3 B that pass) ÷ (rules that could be computed)
```
- If no live outline (segmentation not ready or tab hidden): `fit% = 100 × (0.70 × landmarkScore + 0.30 × rulesScore)`.
- Return `null` ONLY when there are no pose landmarks or no saved print — never 0 for "missing data".
- Smooth the shown value with an EMA (alpha 0.25) and round to whole percent. All weights [E] in `zenConfig.ts`.

---

## 3. Live view v2 (`/live`, mockups `L2-on-track.jpg` and `L1-drift.jpg`)

Same dark full-screen stage as Set my Zen. Top bar: logo left; **fit pill** center ("● 95% fit"); right: **Voice on** toggle, **HD camera**, **Posture guide** (opens the side panel, Section 2.0), minimize and close. Big mirrored camera; frosted dock below.

- **Saved outline drawn fixed** in emerald (from `ZenV2.outline`, mirrored at draw time). It does not move with the user. (If the camera resolution changed, map with normalized coordinates; if the camera itself moved, the user should "Set my Zen again".)
- **Live body edge**: from segmentation at ~5 Hz while the page is visible (pause when hidden). Draw it **amber only for the parts outside the saved outline** (point-in-polygon with a 2% tolerance band). Parts inside are not drawn.
- **Fit %** from `fitScore.ts`.
- **On track** (`L2-on-track.jpg`): fit ≥ 85. Dock: ✓ icon, **"You're in your Zen"**, helper **"Nice. I'll nudge you if you drift."**, small line **"Back in Zen N times today"** (existing progress data if present; hide the line if not). Button: **Set my Zen again**.
- **Drifting** (`L1-drift.jpg`): only after fit < 80 for **3 s** continuous. Dock: amber → icon, ONE tip title (default **"Sit back into your outline"**) + helper (default **"Chin level, shoulders down."**), buttons **Set my Zen again** and **Guide me back**. One curved emerald **arrow** from the live head toward the saved head (reuse `curveArrow` / `arrowHead` in `live/outline.ts`), only when the head gap is > 3% of the frame.
- Tip choice: the live rule (Section 1.3 B) with the biggest deviation past its line. Tips (title / helper):
  - lean in or head forward → "Sit back into your outline" / "Chin level, shoulders down."
  - neck ratio low or shoulders dropped → "Sit tall" / "Lift your chest a little."
  - shoulder tilt → "Level your shoulders" / "Let both sink away from your ears."
  - head roll → "Straighten your head" / "Keep your eyes level."
  - too close → "Move back a little" / "About an arm's length from the screen."
  - too far → "Come a little closer" / "About an arm's length from the screen."
  - looking down → "Chin level, eyes up" / "Bring your eyes back to the screen."
  - off-center → "Center your head over your shoulders" / "Shift a little left/right."
- **Back on track** → after fit ≥ 85 for 1 s: dock returns to "You're in your Zen", soft chime, voice "Nice, that's your Zen."
- **Voice**: default **ON** (persist the user's choice in settings). Each tip at most once every **20 s**; any voice line at most every 8 s.
- **Guide me back**: speaks the current tip and shows the arrow for 10 s; enabled whenever a person and a Print exist.
- **"Step into view"** ONLY when there are **no pose landmarks at all for 2 s** (no nose, eyes or shoulders with visibility ≥ 0.3). Face count, video size, dark lighting and missing shoulders must NEVER produce "Step into view".
- **Framing problems → small top pill** under the top bar (never a big card over the face): "Show both shoulders", "Just you in the frame, please", "Add some light", "Move a little left/right". Pill appears after the problem holds 2 s and disappears immediately when fixed.
- **No Print** for this mode: use `findLivePrint` (falls back to any print for this desk when mode is Auto). If none at all: dim the video and show a frosted card BELOW the face: **"Set your Zen first"** / "It takes about 30 seconds so I know your best posture." / button **"Set my Zen"** → `/set-my-zen?pose=sit` (or `stand` when Standing is selected). If a print exists but has no `zen` (v2) field: same card with title "Set your Zen again" / "DeskZen has a new, more accurate outline."
- **Debug strip** at `/live?debug=1` (and `/set-my-zen?debug=1`): one monospaced line at the bottom: `pose N/33 · nose vis 0.97 · LS 0.91 RS 0.88 · faces 1 · video 1280×720 · mode sit · print yes(v3) · fit 86 (iou .81 lm .77 rules 5/7) · neck .62/.66 · face/sh .41/.40 · tilt 1.2° · roll 2.0° · dist 24in · state ontrack · seg 5Hz`. Each rule value with its pass/fail.

---

## 4. Root causes of past bugs — do NOT repeat

1. **Generic, fixed-position guide never matched the user.** `live/outline.ts genericOutline()` draws a made-up head/shoulder shape at a fixed spot (`x = 0.5·width`, `y = 0.36·height`), and `LiveOverlay.tsx` falls back to it whenever there is no placed outline OR any framing message is showing (`model.ghost`). Setup also used a fixed guide size (`calibrationConfig.setup.guideHeadWidth / guideShoulderSpan`). → v2 only ever draws the user's own traced outline. No generic shape anywhere. If there is no outline, show the "Set your Zen first" card instead.
2. **"Find your best" match stuck at 0%.** `calibration/lockCoach.ts`: `movingMatch()` uses `fromChecks = hasBaseline ? … : 0`, and `judge()` fails every check when the earlier Body reset baseline (`after`) is missing or stale, so the match could sit at 0 and `lockMaySave()` blocked saving. → v2 builds the baseline from the picture itself in Step 2, so Step 3 always has one; `fitScore()` returns `null` (shown as "—") for missing data, never 0; Lock my Zen always works.
3. **Live view said "Step into view" while the user was in frame.** In `features/live/frame.ts frameStatus()` and `useLiveWire.ts`:
   - `faceCount > 1 || faceAmbiguous` returns `'multiple'` before presence is checked (face model runs with `numFaces: 2`; a poster, photo or reflection can trigger it).
   - `videoWidth/videoHeight` of 0 (before `loadedmetadata`) returns `'no-person'`.
   - Presence needs nose/eye visibility ≥ 0.5, while shoulders use `postureConfig.coachShoulderVisibility = 0.3` and setup uses `0.6` — three different thresholds in three files.
   - `useLiveWire.ts` starts `shownRef` as `'no-person'` and shows `'no-person'` whenever `live` is false.
   - **Mode lookup:** `features/print/savePrint.ts` always saves `mode: 'sit'`, so a standing user never gets a standing print; with a manual Standing choice `findLivePrint()` returns nothing and coaching never starts.
   → v2: presence = pose landmarks only, decided in ONE function with ONE threshold from `zenConfig.ts`; wait for `loadedmetadata` before judging; "Step into view" only after 2 s with zero pose landmarks; multiple people is a top pill, never "Step into view"; save prints with the real mode.
4. **Coordinate mix-ups.** `Landmarks` are unmirrored pixels, `LockedPose` is mirrored normalized (`1 − x`), `Silhouette` points are relative to anchors. → v2 stores unmirrored normalized points only and mirrors in one draw helper.
5. **Multi-frame mask averaging during movement** (`PrintFlow.tsx` samples masks every 150 ms while the user moves) produced blurry or wrong outlines. → v2 traces from ONE still frame the user approved.

---

## 5. Implementation plan (do in this order; tests first for pure files)

New folder `src/features/zen2/`.

1. **`zenConfig.ts`** — every threshold from Section 1.3 (sit and stand columns), timings (chip hold 1 s, drop 1.5 s, drift 3 s, voice 20 s / 8 s, presence 2 s), fit weights, crop rectangles. Export typed objects.
2. **`poseRules.ts` + `poseRules.test.ts`** (pure)
   - `measurePose(l: Landmarks): PoseMeasures` (all signals, `null` when not computable).
   - `snapshotRules(m: PoseMeasures, mode, history): RuleResult[]` (R1–R13; `history` holds the max neck ratio for R10).
   - `liveRules(m, baseline, mode): RuleResult[]` (Section 1.3 B).
   - `chipFor(rule)`, `tipFor(rule, mirrored: boolean)` → `{ title, helper }` (exact copy from Sections 2.1 / 3).
   - Tests: centered upright synthetic landmarks pass all; shoulder tilt 6° fails R8; nose at 0.2W fails R2 with "Move a little …" in the correct mirrored direction; missing right shoulder fails R7; faceW share 0.25 → too close; standing mode uses the stand band; values never `NaN`.
3. **`chipSequence.ts` + test** (pure) — `stepChips(state, nowMs, results)`: in-order green, 1 s hold, 1.5 s drop hysteresis, `allGreen`, `activeChip`. Tests with fake clocks.
4. **`snapshotOutline.ts` + test** (pure) — `outlineFromMask(mask: MaskGrid, l: Landmarks, mode) → { points: NormPoint[] | null, reason }`, `resampleClosed(points, n)`, `cutAtUpperArm`, `removeChair`. Tests: synthetic disk-plus-rectangle mask gives 150 points, all within 0–1, bottom flat at cutY; a "chair" blob to the side is removed; an empty mask returns `trace-failed`; a mask touching the frame edge reports `shoulder-cut`.
5. **`fitScore.ts` + test** (pure) — `polygonIou(a, b, gridW = 160, gridH = 90)`, `landmarkScore`, `fitScore(saved, live) → { percent: number | null, parts }`. Tests: identical outline → ≥ 98; shifted by 10% of the frame → < 70; no live outline → landmark-only formula; no landmarks → `null` (not 0).
6. **`liveCoach2.ts` + test** (pure) — state machine `ontrack | drifting | away`, 3 s drift timer, 1 s recovery, presence 2 s, per-tip 20 s voice cooldown, framing pill hold 2 s. Tests with fake clocks, including "user in frame with faceCount 2 never shows Step into view".
7. **`zenPrint.ts` + test** — `buildZenV2(...)`, `saveZenPrint(...)` (real mode; replaces only same mode + same desk), `loadZenPrint(mode, deskId, auto)`. Test: saving stand does not delete sit; JSON contains no strings longer than 40 chars except ISO dates (no image data).
8. **Vision helpers** — `session.ts detectFrame()`, `segment.ts readPersonMaskFrom()`; `captureFrame.ts` with `dispose()`. Manual test: no new network requests, no blobs (`chrome://blob-internals` empty).
9. **UI components** — `CheckChips.tsx`, `PostureSidePanel.tsx`, `OutlineSvg.tsx` (saved outline + amber outside parts + arrow, mirrored draw), `SnapStep.tsx`, `OutlineStep.tsx`, `FitStep.tsx`, `DoneStep.tsx`, `ZenFlowV2.tsx` (state machine `snap → outline → fit → done`). Reuse `ImmersiveStage.tsx`, `zenChrome.tsx`, `PrivacyCard.tsx`, `CameraPausedBar.tsx`, `HdCameraPill.tsx`, `speakCaption`.
10. **Live view** — `src/features/live/useLiveV2.ts` (uses `liveCoach2`, `fitScore`, `loadZenPrint`) and `LiveViewV2.tsx` (stage, pill, dock, debug strip, collapsible side panel).
11. **Routes** — `src/app/router.tsx`: `/set-my-zen` → `ZenFlowV2`, `/live` → `LiveViewV2`; old `CalibratePage` → `/set-my-zen-legacy`, old `LiveViewPage` → `/live-legacy`. Links that already point to `/set-my-zen?pose=…&from=live` keep working.
12. **Manual test pass** (Section 6) at 1920×1080 and 1366×768, sitting AND standing, then report.

Do not modify `savePrint.ts`, `lockCoach.ts`, `frame.ts`, `useLiveWire.ts` beyond what the route switch needs; v2 must not depend on them.

---

## 6. Acceptance checklist (real webcam, Chrome, `http://localhost:5173`)

**Set my Zen — Step 1**
- [ ] Layout matches `S1-side-panel.jpg`: camera ~68%, "Correct posture" panel ~30%, both visible without scrolling at 1920×1080 and 1366×768.
- [ ] The panel shows the Sitting half of `good-desk-posture.jpg`; toggling to Standing shows the Standing half and switches the rules. No printed label text from the original image is visible inside the crop.
- [ ] Four callouts in emerald; the callout for the active (amber) chip turns amber.
- [ ] Chips turn green one at a time, in order; one tip at a time in the dock; tip is spoken once.
- [ ] Slumping or tilting shoulders for > 1.5 s turns a green chip back to amber; a quick glance does not.
- [ ] All green → 3-2-1 countdown (`S1-snap.jpg`) → picture. Moving during the countdown cancels it.
- [ ] Take picture is disabled for 10 s while checks fail, then works with the warning line.
- [ ] Sitting normally in frame never shows "Step into view".

**Step 2**
- [ ] Frozen picture with a smooth emerald outline of MY real head, neck and shoulders, cut at mid upper arm, chair not included, no jagged steps.
- [ ] Badges match reality (cover one shoulder → "A shoulder is cut off" retake state with that exact fix).
- [ ] Retake and Looks good both wipe the picture (DevTools Memory/Application: nothing in localStorage/IndexedDB except numbers).

**Step 3**
- [ ] Saved outline stays fixed; amber edge appears only where my body is outside it; fit % moves smoothly and is never stuck at 0.
- [ ] Holding ≥ 90% for 3 s locks automatically; Lock my Zen locks at any fit.
- [ ] Side panel highlights the worst rule.

**Step 4**
- [ ] Only the outline is shown (no photo); the three lines and "Your Posture Print · Sitting/Standing" are correct; Start Live view opens `/live`.
- [ ] Saved record has `zen.version = 3`, the right `mode`, 120–180 outline points, baseline numbers, timestamp; no image data.

**Live view**
- [ ] On track matches `L2-on-track.jpg`; drift matches `L1-drift.jpg` and appears only after 3 s of drifting.
- [ ] One tip + one arrow at a time; voice on by default; the same tip is not repeated within 20 s.
- [ ] "Step into view" appears only after leaving the frame for 2 s, and disappears within 1 s of returning.
- [ ] Framing problems show as a small top pill, never over the face.
- [ ] No Print → "Set your Zen first" card; standing print found in Standing mode; sitting print not overwritten by a standing one.
- [ ] `?debug=1` strip shows landmark count, visibilities, faces, video size, mode, print, fit parts and each rule value.
- [ ] `npm test` passes; no console errors; ≥ 12 fps on the founder's laptop.

---

## 7. Sources
- OSHA eTools, Computer Workstations — Good Working Positions: https://www.osha.gov/etools/computer-workstations/positions
- OSHA eTools, Computer Workstations — Monitors: https://www.osha.gov/etools/computer-workstations/components/monitors
- Mayo Clinic, Office ergonomics: Your how-to guide: https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/office-ergonomics/art-20046169
- Cornell University Ergonomics Web (Prof. Alan Hedge), Computer Workstation Ergonomics Guidelines: https://ergo.human.cornell.edu/ergoguide.html
- CCOHS, Office Ergonomics — Positioning the Monitor: https://www.ccohs.ca/oshanswers/ergonomics/office/monitor_positioning.html
- CCOHS, Working in a Sitting Position — Basic Requirements: https://www.ccohs.ca/oshanswers/ergonomics/sitting/sitting_basic.html
- Nekoze (Mac App Store): https://apps.apple.com/us/app/nekoze/id627505674?mt=12 ; comparison write-up: https://sitapp.app/blog/sitapp-vs-nekoze
- Posture Pal (App Store): https://apps.apple.com/us/app/posture-pal-improve-alert/id1590316152 ; https://goodsnooze.gumroad.com/l/posturepal ; https://sitapp.app/blog/sitapp-vs-posture-pal
- Webcam posture accuracy guide: https://posturereminderapp.com/blog/webcam-posture-app-accuracy-camera-angle-calibration/
- ProxErgo (MediaPipe, front webcam): https://github.com/Acch123/ProxErgo
- SitRight (MediaPipe): https://github.com/shahramshafiq/sitright
- slouch-detector (MediaPipe): https://github.com/aaronhubhachen/slouch-detector
- ProPosture (MediaPipe): https://github.com/EthanHarter934/ProPosture
- BatesPosture (MediaPipe): https://github.com/wtbates99/batesposture
- PoseX, webcam-based postural syndrome detection (IEEE IECBES 2021): https://doi.org/10.1109/iecbes48179.2021.9398773
- Webcam turtle-neck discrimination (J. Korea Multimedia Society): https://koreascience.kr/article/JAKO202106763002134.page
