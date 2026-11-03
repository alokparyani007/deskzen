# SitGlow Posture Engine

This is the core of SitGlow. It turns webcam frames into a smooth, fair **posture score from 0 to 100** and decides **when (and when not) to nudge**.

> **Not a medical diagnosis.** SitGlow estimates how your current sitting position compares with the "best posture" you calibrated. It is a wellness and habit tool, not a medical device, and it does not diagnose, treat, or prevent any condition. User-facing copy must never imply otherwise.

All processing runs in the browser. Frames and landmarks are never stored or sent anywhere. Only derived numbers (baseline values, scores, settings) are saved locally.

---

## 1. Why a baseline?

A front-facing laptop or monitor webcam **cannot see spine angle**. It sees a face and shoulders from the front. Absolute rules ("neck angle must be < 15°") don't work because camera height, tilt, lens, distance and body shape all differ.

So SitGlow scores **relative to the user's own calibrated baseline**:

1. During calibration the user sits in their best comfortable posture and holds still for 3 seconds.
2. We record the median of each signal over that window, the **Baseline**.
3. Every frame afterwards, each signal is expressed as a **deviation from baseline**, normalized for scale, and mapped to a sub-score.

Re-calibration is offered when the camera/desk setup changes (big jump in baseline face size or shoulder position for several minutes while score is stable) or from Settings.

---

## 2. Inputs (MediaPipe Tasks Vision)

| Model | Used landmarks | Purpose |
|---|---|---|
| **Pose Landmarker** (lite, `runningMode: 'VIDEO'`) | 0 nose, 2 left eye, 5 right eye, 7 left ear, 8 right ear, 11 left shoulder, 12 right shoulder | Head and shoulder geometry |
| **Face Landmarker** (`outputFaceBlendshapes: false`, iris refinement included in model) | Iris rings 468-472 (right) and 473-477 (left), eye corners 33/133/362/263 | Inter-pupil distance, iris diameter -> screen distance |

Coordinates are normalized `[0,1]`; convert to pixels with the video width/height before computing distances so aspect ratio doesn't distort them.

Run both models on the same frame (or alternate frames: pose on even, face on odd) at ~15 fps when the tab is visible and 2-5 fps when hidden or in picture-in-picture mode.

> **Mirroring:** the preview is mirrored for the user, but compute on unmirrored coordinates. "Left"/"right" below are the user's own left and right.

---

## 3. Signals per frame

Define helpers:

- `dist(a, b)`: Euclidean pixel distance.
- `mid(a, b)`: midpoint.
- `IPD` (inter-pupil distance in px): `dist(leftIrisCenter, rightIrisCenter)`; fall back to pose eye landmarks 2/5 if face model missing.
- `shoulderMid = mid(L_shoulder, R_shoulder)`, `shoulderWidth = dist(L_shoulder, R_shoulder)`.
- `earMid = mid(L_ear, R_ear)`.

Because the user moves closer/farther, **normalize vertical/horizontal distances by a scale reference**. Use `shoulderWidth_baseline` for torso-relative signals, and current `IPD` for head-relative signals, except where scale change is the signal itself (signal 1).

### Signal 1: Leaning in / forward head (face bigger = closer)
```
leanRatio = IPD_now / IPD_baseline          // 1.00 = same as baseline
leanDev   = max(0, leanRatio - 1)           // only penalize getting closer
```
When people slouch toward the screen, the face gets larger. 10% larger IPD ≈ ~10% closer.

### Signal 2: Head drop (nose sinking toward shoulders)
```
headDropPx   = shoulderMid.y - nose.y          // positive: nose above shoulders
headDropNorm = headDropPx / IPD_now            // scale-invariant
headDropDev  = max(0, 1 - headDropNorm / headDropNorm_baseline)
```
As the head drops or juts forward and down, the nose-to-shoulder-line vertical gap shrinks.

### Signal 3: Shoulders raised or rounded
**Shrugging (raised):** shoulder-to-ear vertical gap shrinks.
```
shrugNorm = ((L_shoulder.y - L_ear.y) + (R_shoulder.y - R_ear.y)) / 2 / IPD_now
shrugDev  = max(0, 1 - shrugNorm / shrugNorm_baseline)
```
**Rounding (forward):** shoulders roll in, so apparent shoulder width narrows *relative to head size*.
```
roundNorm = shoulderWidth_now / IPD_now
roundDev  = max(0, 1 - roundNorm / roundNorm_baseline)
```
Combined: `shoulderDev = max(shrugDev, roundDev)`.

### Signal 4: Lateral tilt
```
shoulderAngle = atan2(R_sh.y - L_sh.y, R_sh.x - L_sh.x)   // degrees
eyeAngle      = atan2(R_eye.y - L_eye.y, R_eye.x - L_eye.x)
tiltDevDeg    = max(|shoulderAngle - shoulderAngle_baseline|,
                    |eyeAngle - eyeAngle_baseline|)
```

### Signal 5: Screen distance (inches)
Human iris diameter is roughly constant (~**11.7 mm**). With a pinhole camera model:
```
irisPx       = mean of the horizontal diameters of both iris rings (px)
focalPx      = estimated focal length in px
distance_mm  = focalPx * 11.7 / irisPx
distance_in  = distance_mm / 25.4
```
`focalPx` is unknown for most webcams. Estimate it: assume horizontal field of view ≈ 60° (typical laptop webcam) so `focalPx ≈ (videoWidth / 2) / tan(30°)`. Then let the user optionally correct once in calibration ("About how far are you from the screen? 20 in / 25 in / 30 in") and store `focalPx` in the baseline.

Screen distance feeds **screen-distance alerts** (Phase 2) and contributes a small weight to the score only when closer than a threshold.
```
distDev = max(0, (minComfortIn - distance_in) / minComfortIn)
```

---

## 4. From deviations to sub-scores

Each deviation maps to a 0-100 sub-score with a soft "dead zone" (ignore tiny changes) and a "full penalty" point:

```
subScore(dev, deadZone, fullPenalty) =
  dev <= deadZone      -> 100
  dev >= fullPenalty   -> 0
  otherwise            -> 100 * (1 - smoothstep((dev - deadZone) / (fullPenalty - deadZone)))
```
`smoothstep(t) = t*t*(3 - 2t)` gives a gentle curve near both ends.

### Starting values (TO TUNE)

> ⚠️ **These are starting values to tune with real recordings, not validated constants.** Keep them in `src/lib/posture/config.ts`.

| Signal | Dead zone | Full penalty | Weight |
|---|---|---|---|
| Leaning in (`leanDev`) | 0.04 (4% larger face) | 0.22 | **0.35** |
| Head drop (`headDropDev`) | 0.06 | 0.35 | **0.30** |
| Shoulders (`shoulderDev`) | 0.08 | 0.35 | 0.15 |
| Lateral tilt (`tiltDevDeg`) | 4° | 15° | 0.12 |
| Screen distance (`distDev`) | 0 (below 18 in) | 0.40 | 0.08 |

Weights sum to 1.0. Leaning in and head drop are weighted most heavily because they are the most reliable front-camera signals of slouching.

```
rawScore = Σ weight_i * subScore_i        // 0..100
```
If a signal is unavailable this frame (e.g., ears hidden by hair), drop it and **re-normalize** the remaining weights.

### Smoothing
Apply an exponential moving average over a ~2.5 s time constant, using real frame time so it works at any fps:
```
alpha  = 1 - exp(-dtSeconds / tau)        // tau = 2.5 (tune 2-3 s)
smooth = smooth + alpha * (rawScore - smooth)
```
Display `round(smooth)`. Labels: **85-100 "Great"**, **70-84 "Good"**, **50-69 "Okay - sit back to glow"**, **< 50 "Time to reset"**.

---

## 5. Frame quality gating

Skip (don't update score, don't count toward nudges) when:

- No face/pose detected → **user absent**. After 10 s absent, pause the session timer; after 5 min absent, stop inference to save battery (resume on visibility/motion).
- Pose landmark `visibility` < **0.6** for nose, either eye, or either shoulder.
- Face detected but IPD < 50% or > 200% of baseline (probably someone else or camera moved).
- More than one face detected → use the largest face; if ambiguous, skip.
- Rapid motion: if nose moves > 0.5 × IPD between consecutive frames, mark as "moving" and skip for 1 s (reaching for coffee, turning to talk).

Track a `quality` value 0-1 (fraction of good frames over last 5 s) and expose it so the UI can show "Can't see you clearly - check lighting".

---

## 6. Nudge logic

Goal: helpful, rare, never annoying.

```
NUDGE_THRESHOLD      = 65    // smoothed score         (starting value to tune)
SUSTAIN_SECONDS      = 30    // must stay below threshold this long
COOLDOWN_MINUTES     = 5     // min gap between nudges
SNOOZE_MINUTES       = 15
MAX_NUDGES_PER_HOUR  = 6
```

State machine:

```
OK ──(score < threshold)──> BELOW (start timer)
BELOW ──(score ≥ threshold + 5 hysteresis)──> OK (reset timer)
BELOW ──(timer ≥ SUSTAIN_SECONDS and not in cooldown/snooze/focus-quiet)──> NUDGING
NUDGING ──(user taps "Fixed it" or score ≥ threshold+10 for 3s)──> COOLDOWN
NUDGING ──(user taps "Snooze 15 min")──> SNOOZED
COOLDOWN/SNOOZED ──(time elapsed)──> OK
```

- Brief movements don't trigger nudges: gated frames pause the BELOW timer (don't reset it, don't advance it).
- Nudge text names the **dominant** signal (lowest weighted sub-score): "Lean back a little, you're 5 in closer than your best", "Lift your chin slightly", "Drop your shoulders", "Level your head".
- When posture recovers after a nudge, celebrate briefly: "Perfect! Posture back to 90".
- Delivery: in-app toast → floating mini widget → desktop notification (only if the tab is hidden and the user opted in).

---

## 7. Adaptive strictness

Learn per user from responses, bounded so it can't drift wildly:

- **"Fixed it"** (and score actually improves within 10 s) → nudge was useful. Keep threshold; if many "Fixed it" in a row with fast recovery, allow threshold +1 (max 75).
- **"Snooze"** or dismissed without improvement → nudge felt too strict. Threshold −2 (min 50) and SUSTAIN_SECONDS +5 (max 90).
- Also track **which signal** triggered snoozed nudges; if one signal is repeatedly snoozed, reduce its weight by 10% (min 50% of default) and re-normalize.
- Store the adaptive state in local storage; show it in Settings as a simple slider ("Gentle ↔ Strict") the user can override, plus "Reset to defaults".

```
threshold = clamp(threshold + delta, 50, 75)
```

---

## 8. TypeScript sketches

```ts
// src/lib/posture/types.ts

export interface Point2D { x: number; y: number }          // pixels
export interface Landmark extends Point2D { z?: number; visibility?: number }

/** Landmarks extracted from one frame (pixel space, unmirrored). */
export interface Landmarks {
  timestampMs: number;
  nose?: Landmark;
  leftEye?: Landmark;
  rightEye?: Landmark;
  leftEar?: Landmark;
  rightEar?: Landmark;
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftIrisCenter?: Point2D;
  rightIrisCenter?: Point2D;
  leftIrisDiameterPx?: number;
  rightIrisDiameterPx?: number;
  faceCount: number;
  videoWidth: number;
  videoHeight: number;
}

/** Saved once at calibration (median over the 3 s hold). Numbers only, no images. */
export interface Baseline {
  version: 1;
  createdAt: string;            // ISO date
  ipdPx: number;
  headDropNorm: number;
  shrugNorm: number;
  roundNorm: number;
  shoulderAngleDeg: number;
  eyeAngleDeg: number;
  shoulderWidthPx: number;
  focalPx: number;
  screenDistanceIn: number;
  videoWidth: number;
  videoHeight: number;
}

/** Normalized deviations for one frame (0 = same as baseline). */
export interface SignalReadings {
  leanDev?: number;
  headDropDev?: number;
  shoulderDev?: number;
  tiltDevDeg?: number;
  distDev?: number;
  screenDistanceIn?: number;
  quality: 'good' | 'low-visibility' | 'absent' | 'moving' | 'multiple-faces';
}

export type SignalKey = 'lean' | 'headDrop' | 'shoulders' | 'tilt' | 'distance';

export interface PostureScore {
  timestampMs: number;
  raw: number;                  // 0-100, this frame
  smoothed: number;             // 0-100, EMA
  label: 'great' | 'good' | 'okay' | 'reset';
  subScores: Partial<Record<SignalKey, number>>;
  dominantIssue?: SignalKey;
  quality: number;              // 0-1 over last 5 s
}

export interface EngineConfig {
  weights: Record<SignalKey, number>;
  deadZone: Record<SignalKey, number>;
  fullPenalty: Record<SignalKey, number>;
  emaTauSeconds: number;
  minVisibility: number;
  nudge: {
    threshold: number;
    sustainSeconds: number;
    cooldownMinutes: number;
    snoozeMinutes: number;
    maxPerHour: number;
  };
}

// Pure functions, no React, fully unit-tested:
export declare function extractLandmarks(/* pose + face results */): Landmarks;
export declare function computeBaseline(samples: Landmarks[]): Baseline;
export declare function readSignals(l: Landmarks, b: Baseline): SignalReadings;
export declare function scoreFrame(r: SignalReadings, cfg: EngineConfig, prev?: PostureScore): PostureScore;
```

Calibration `computeBaseline`: collect ~45 frames over 3 s, discard gated frames, require ≥ 70% good frames and low variance (nose jitter < 0.1 × IPD), else ask the user to try again. Use medians.

---

## 9. Test plan

### Unit tests (Vitest)
- `readSignals` with a synthetic baseline: identical landmarks → all deviations 0, score 100.
- Scale face up 15% → `leanDev ≈ 0.15`, score drops mostly via lean sub-score.
- Move nose down toward shoulders → `headDropDev` rises.
- Rotate shoulder line 10° → tilt sub-score drops.
- Missing ears → shoulder signal dropped, weights re-normalized, still sums to 1.
- EMA: step input from 100 → 40 reaches ~63% of change after `tau` seconds regardless of fps (test at 5 and 30 fps).
- Nudge state machine: 29 s below threshold → no nudge; 31 s → nudge; gated frames pause timer; cooldown respected; snooze respected.
- Adaptive: 3 snoozes lower threshold within bounds; reset restores defaults.

### Manual recording test (developer debug page `/debug`)
1. Calibrate sitting upright.
2. Using the debug page, record **numbers only** (scores + signals, never video) to a local JSON download for 2-minute sessions:
   - Upright (baseline posture)
   - Slouched / leaning toward screen
   - Head dropped (looking at phone on desk)
   - Shrugged shoulders
   - Tilted to one side
   - Natural work (typing, drinking, turning to talk)
3. **Pass criteria (starting targets):**
   - Upright median score ≥ 85; slouched median ≤ 60, a separation of **≥ 25 points**.
   - Natural-work session: ≤ 1 nudge per 10 minutes.
   - Score responds to a real slouch within ~3-5 s and stabilizes (no flicker > ±5 at rest).
4. Repeat in different lighting (window behind you, dim evening), with glasses, and with a second person in the background.
5. Try 3+ people with different camera heights (laptop vs. external monitor). Tune the table in §4 and record changes in a CHANGELOG section below.

### Tuning changelog
| Date | Change | Why |
|---|---|---|
| | | |
