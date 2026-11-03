export interface Point2D {
  x: number;
  y: number;
}

export interface Landmark extends Point2D {
  z?: number;
  visibility?: number;
}

/** Landmarks from one frame, in pixels, unmirrored. */
export interface Landmarks {
  timestampMs: number;
  nose?: Landmark;
  leftEye?: Landmark;
  rightEye?: Landmark;
  leftEar?: Landmark;
  rightEar?: Landmark;
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftElbow?: Landmark;
  rightElbow?: Landmark;
  leftWrist?: Landmark;
  rightWrist?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
  /** Face-mesh points used only to draw the locked outline. */
  chin?: Landmark;
  headTop?: Landmark;
  leftFace?: Landmark;
  rightFace?: Landmark;
  leftIrisCenter?: Point2D;
  rightIrisCenter?: Point2D;
  leftIrisDiameterPx?: number;
  rightIrisDiameterPx?: number;
  faceCount: number;
  faceAmbiguous?: boolean;
  /** How many pose landmarks the model returned. 33 when the full body pose is present. */
  poseCount?: number;
  videoWidth: number;
  videoHeight: number;
  /** Highest face-mesh point, in pixels. Used for setup framing only. */
  faceTopPx?: number;
  /** Face-mesh height, in pixels. */
  faceHeightPx?: number;
  /** Normalized face box, 0–1. On-device light sampling only. Never stored. */
  faceBox?: { x: number; y: number; w: number; h: number };
  /** Pitch in degrees from the facial transformation matrix. */
  pitchDeg?: number;
  /** Yaw in degrees from the facial transformation matrix. 0 faces the camera. */
  yawDeg?: number;
}

/** Normalized 0–1 position. Numbers only, never an image. */
export interface NormPoint {
  x: number;
  y: number;
}

/** Saved at calibration: medians over the hold. Numbers only. */
export interface Baseline {
  version: 1;
  createdAt: string;
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
  nose: NormPoint;
  leftEye: NormPoint;
  rightEye: NormPoint;
  leftEar?: NormPoint;
  rightEar?: NormPoint;
  leftShoulder: NormPoint;
  rightShoulder: NormPoint;
  /** Sitting baseline when omitted. */
  pose?: 'sit' | 'stand';
  elbowAngleDeg?: number;
}

export type SignalKey = 'lean' | 'headDrop' | 'shoulders' | 'tilt' | 'distance';

export type FrameQuality = 'good' | 'low-visibility' | 'absent' | 'moving' | 'multiple-faces';

export interface SignalReadings {
  leanDev?: number;
  headDropDev?: number;
  shoulderDev?: number;
  tiltDevDeg?: number;
  distDev?: number;
  screenDistanceIn?: number;
  quality: FrameQuality;
}

export type GuideId = 'center' | 'eyes' | 'shoulders' | 'headStack' | 'distance';

export interface GuideStatus {
  id: GuideId;
  label: string;
  aligned: boolean;
  detail: string;
}

export interface Alignment {
  guides: GuideStatus[];
  allGreen: boolean;
  coaching: string | null;
  distanceIn: number | null;
}

export type BaselineCode =
  | 'not-enough-frames'
  | 'too-few-good-frames'
  | 'moved'
  | 'cant-see-shoulders'
  | 'too-dark';

export type BaselineResult =
  | { ok: true; baseline: Baseline }
  | { ok: false; code: BaselineCode; message: string };

export type ScoreLabel = 'great' | 'good' | 'okay' | 'reset';

export interface PostureScore {
  timestampMs: number;
  raw: number;
  smoothed: number;
  label: ScoreLabel;
  subScores: Partial<Record<SignalKey, number>>;
  dominantIssue?: SignalKey;
  quality: number;
  /** Friendlier standing cue, when this frame has one. */
  cue?: string;
}
