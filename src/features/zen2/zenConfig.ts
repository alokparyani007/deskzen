/** Every Set my Zen v2 threshold. Tune here, not in components. */
export const zenConfig = {
  presenceVis: 0.5,
  /** Live "step into view" uses a looser pose check than the snapshot gate. */
  awayVis: 0.3,
  headCenter: { min: 0.35, max: 0.65 },
  eyeLine: { min: 0.25, max: 0.45 },
  /** The "eyes here" guide sits in the middle of the eye-line band. */
  eyeGuideY: 0.35,
  headRollDeg: 6,
  yawDeg: 15,
  pitchDeg: 15,
  shoulderVis: 0.5,
  shoulderFrame: { minX: 0.03, maxX: 0.97, maxY: 0.97 },
  shoulderTiltDeg: { sit: 4, stand: 4 },
  noseOffset: { sit: 0.12, stand: 0.15 },
  neckRatioMin: 0.5,
  /** Sit tall when the neck ratio is within this fraction of the tallest seen. */
  neckOfMax: 0.95,
  faceShoulder: { sit: { min: 0.3, max: 0.55 }, stand: { min: 0.28, max: 0.55 } },
  /** R11 may not be the only reason to block the picture once this long. */
  r11GraceMs: 5_000,
  distanceIn: { sit: { min: 20, max: 32 }, stand: { min: 20, max: 40 } },
  faceWidthShare: { sit: { min: 0.11, max: 0.2 }, stand: { min: 0.09, max: 0.2 } },
  multiHoldMs: 3_000,
  measureWindow: 10,
  chipHoldMs: 1_000,
  chipDropMs: 1_500,
  presenceHoldMs: 2_000,
  forcePictureMs: 10_000,
  countdownSec: 3,
  fitGood: 90,
  fitHoldMs: 3_000,
  /** A dip shorter than this pauses the hold ring. */
  fitDipPauseMs: 500,
  /** A dip this long resets the hold ring. */
  fitDipResetMs: 1_000,
  driftBelow: 80,
  onTrackAt: 85,
  driftHoldMs: 3_000,
  recoverHoldMs: 1_000,
  voiceTipMs: 20_000,
  voiceGapMs: 8_000,
  guideMs: 10_000,
  framingHoldMs: 2_000,
  arrowGap: 0.03,
  outlineBand: 0.02,
  /** Points in a saved or live outline (spec allows 120 to 180). */
  outlinePoints: 180,
  /** Light moving average on the dense pixel contour, before resampling. */
  outlineSmoothWindow: 5,
  outlineSmoothPasses: 2,
  edgeTouch: 0.02,
  /** Person confidence at or above this is the person, after bilinear upsampling. */
  maskThreshold: 0.55,
  /** The mask is upsampled to square pixels with this many on the long side before tracing. */
  traceGrid: 640,
  /** Outer arms may reach this far past each shoulder landmark (x shoulder width). Wider is chair. */
  armMargin: 0.35,
  /** Outer shoulder cap = shoulder landmark + this x shoulder width. Used by the Distance check and the shoulder sanity check. */
  shoulderCapMargin: 0.35,
  /** Shoulder guard plateau: how far (x shoulder width) above the shoulder landmarks the shoulder top may be (or guardCapBelowChin, whichever is higher). Lower = tighter. */
  trapLift: 0.2,
  /** Neck half-width as a share of the face half-width; also where the neck base sits. */
  neckWiden: 0.7,
  /** In the shoulder band (above the shoulder line, outside the head), mask confidence below this counts as unsure and is dropped. */
  bandThreshold: 0.72,
  /** Shoulder guard flattens out this far past each shoulder point (x shoulder width), then rounds down over the cap. */
  capPlateau: 0.05,
  /** How far the guard's rounded shoulder cap drops before it meets the arm limit (x shoulder width). */
  capDrop: 0.2,
  /** Corner rounding after the clamps (x shoulder width): open rounds convex corners, close fills concave steps. */
  shapeOpen: 0.08,
  shapeClose: 0.06,
  /** Snapshot only: chest patch half-size for the shirt colour, from just below the shoulder line (x shoulder width). */
  shirtPatch: 0.12,
  /** Shirt colour tolerance: at least shirtTolMin (RGB distance), or shirtTolSpread x the patch's own spread. */
  shirtTolMin: 28,
  shirtTolSpread: 2.5,
  /** Rows averaged above and below a candidate edge (x shoulder width). */
  edgeWindow: 0.012,
  /** The edge search runs from the neck base to this far past each shoulder point (x shoulder width). */
  edgeReach: 0.15,
  /** Share of columns on a side that must show a clear edge before that side is moved. */
  edgeMinShare: 0.3,
  /** Median and moving-average half-window for the edge line (x shoulder width). */
  edgeSmooth: 0.03,
  /** Step 2 shoulder dots: on the outline top, this far from the neck toward each shoulder landmark. */
  shoulderDotAt: 0.85,
  /** If the two dots' tilt differs from the landmark tilt by more than this (x frame height), use the landmark tilt. */
  dotTiltTol: 0.03,
  /** Shoulder dots: crossings only count from the face middle down to dotBandBelow x shoulder width below the landmarks. */
  dotBandAbove: 0.6,
  dotBandBelow: 0.3,
  /** The two dots must be at least this far apart (x shoulder width), never one above the other. */
  dotMinApart: 0.3,
  /**
   * Step 2 snapshot mask from the multiclass selfie segmenter (hair + face skin + body skin + clothes).
   * threshold: person confidence needed; a merged chair edge reads about 0.5 to 0.78, the body about 0.96.
   * headLoose / hairLoose: sanity-only head limits (x the usual head width / x face height above the face).
   * Head zone (face box x headZoneWiden wide, from headZoneRise x face height above the face to the chin):
   * "others" (glasses, hats) count as the person and headThreshold is enough, so the head stays whole.
   */
  multiclass: {
    threshold: 0.85,
    headLoose: 1.5,
    hairLoose: 0.9,
    headThreshold: 0.5,
    headZoneWiden: 1.1,
    headZoneRise: 0.5,
    /** [distance from head centre, height below chin], both x shoulder width: measured highest shoulder top. */
    profile: [[0.21, -0.3], [0.22, -0.1], [0.25, -0.057], [0.27, -0.041], [0.29, -0.032], [0.34, -0.012], [0.39, -0.001], [0.44, 0.019], [0.49, 0.046], [0.56, 0.077]] as ReadonlyArray<readonly [number, number]>,
    profileSlack: 0.01,
    /** The profile starts this far above the chin (x face height), below the ear lobes. */
    profileFromFace: 0.25,
    /** Corner rounding for the clean mask (x shoulder width): it already follows the body, so round less. */
    shapeOpen: 0.04,
    shapeClose: 0.03,
    /** No clothes beside the face (outside clothesBesideFace x half the face width) above chin - this x shoulder width. */
    clothesAboveChin: 0.1,
    clothesBesideFace: 1,
  },
  /** Snapshot shirt edge may lower the line at most this much (x frame height). */
  edgeMaxDrop: 0.025,
  /** Above a shirt edge must be at least this much darker than the shirt (0.35 = 35% darker). */
  edgeDarker: 0.35,
  /** ...and differ in hue (rgb chromaticity distance) from the shirt. */
  edgeHueOff: 0.03,
  /** ...and be a sharp local step: luminance above at most this fraction of the luminance just below. */
  edgeStep: 0.75,
  /** Shoulder guard (a loose backstop, the mask is the shape): neck-base height above the chin (x shoulder width). */
  guardNeckRise: 0.25,
  /** Guard plateau is no lower than this far below the chin (x shoulder width), whatever the landmarks say. */
  guardCapBelowChin: 0.05,
  /** Extra room above the whole guard curve (x shoulder width). */
  guardSlack: 0.04,
  /** Beside the neck the top may rise at most this many px per px outward from the chin (keeps the jaw join close). */
  neckRamp: 1.2,
  /** Jaw taper from the face middle to the neck at the chin: higher keeps the jaw wider longer (2 = elliptic). */
  jawTaper: 3,
  /** bandThreshold also applies just past each shoulder point, this far below the shoulder line (x shoulder width). */
  capBand: 0.25,
  /** Upper-arm smoothing (dense contour, below the shoulder line only). Head and neck keep outlineSmooth*. */
  armSmoothWindow: 21,
  armSmoothPasses: 4,
  /** Arm smoothing ramps in over this many shoulder widths below the shoulder line. */
  armSmoothStart: 0.15,
  /** Keep the body this far below the shoulder line (x shoulder width), or to the frame bottom. */
  torsoDepth: 1.2,
  /** Head clamp: half the face-box width times this. Covers ears and side hair. */
  headWiden: 1.08,
  /** Head dome profile: 2 = ellipse (round), higher = squarer. */
  domeShape: 2.5,
  /** Head clamp: hair may rise this far above the face box (x face-box height). */
  hairRise: 0.35,
  area: { min: 0.03, max: 0.55 },
  fit: {
    iou: 0.5,
    landmark: 0.3,
    rules: 0.2,
    landmarkOnly: { landmark: 0.7, rules: 0.3 },
    iouLow: 0.7,
    iouHigh: 0.92,
    landmarkReach: 0.25,
    gridW: 160,
    gridH: 90,
    ema: 0.25,
  },
  live: {
    neckOfBase: 0.9,
    faceShoulderOfBase: 1.12,
    faceCloseOfBase: 1.2,
    faceFarOfBase: 0.8,
    tiltDeg: 5,
    rollDeg: 7,
    shoulderDrop: 0.04,
    noseOffset: 0.1,
    pitchDownDeg: 12,
    segHz: 5,
    fitSegHz: 6,
    /** Saved outline anchoring (translation + uniform scale only). y may follow the shoulder line at most this x shoulder width. */
    anchorMaxShift: 0.12,
    /** One Euro filter for the anchor position (Hz, and speed gain per live px/s) and for the scale. */
    anchorMinCutoff: 0.8,
    anchorBeta: 0.01,
    scaleMinCutoff: 0.3,
    scaleBeta: 0.5,
    /** Live outline: the bottom is closed this many px above the stage edge so it reads as one loop. */
    bottomInset: 14,
  },
  crop: {
    sourceW: 1280,
    sourceH: 720,
    sit: { x: 215, y: 150, w: 425, h: 460 },
    stand: { x: 735, y: 150, w: 325, h: 460 },
  },
} as const;

export type PoseMode = 'sit' | 'stand';

export type ChipId = 'head' | 'shoulders' | 'tall' | 'distance';

export const CHIP_ORDER: readonly ChipId[] = ['head', 'shoulders', 'tall', 'distance'];
