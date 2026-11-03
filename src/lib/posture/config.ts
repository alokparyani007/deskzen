import type { SignalKey } from './types';

/**
 * Starting values to tune with real sessions. Not validated constants.
 * See docs/posture-engine.md §4, §5, §6, and §8.
 */
export const postureConfig = {
  weights: {
    lean: 0.35,
    headDrop: 0.3,
    shoulders: 0.15,
    tilt: 0.12,
    distance: 0.08,
  } satisfies Record<SignalKey, number>,
  deadZone: {
    lean: 0.04,
    headDrop: 0.06,
    shoulders: 0.08,
    tilt: 4,
    distance: 0,
  } satisfies Record<SignalKey, number>,
  fullPenalty: {
    lean: 0.22,
    headDrop: 0.35,
    shoulders: 0.35,
    tilt: 15,
    distance: 0.4,
  } satisfies Record<SignalKey, number>,
  /**
   * Standing score. Starting values to tune, same idea as the sitting weights.
   * Forward head and head drop are a little looser than sitting.
   */
  standing: {
    weights: { forwardHead: 0.3, headDrop: 0.28, hipLean: 0.18, elbow: 0.14, tilt: 0.1 },
    deadZone: { forwardHead: 0.06, headDrop: 0.09, hipLean: 0.08, elbow: 0, tilt: 6 },
    fullPenalty: { forwardHead: 0.28, headDrop: 0.45, hipLean: 0.35, elbow: 30, tilt: 18 },
    elbowMinDeg: 80,
    elbowMaxDeg: 110,
    hipTiltDeg: 8,
    hipShiftRatio: 0.12,
    /** Face and shoulders must rise this fraction of the frame to count as standing. */
    riseRatio: 0.08,
    sitRatio: 0.04,
    /** Switch only after standing confidence stays past these for switchMs. */
    standConfidence: 0.7,
    sitConfidence: 0.3,
    switchMs: 8000,
    /** "Actually I'm sitting" stays manual for this long, then auto returns. */
    manualHoldMs: 10 * 60 * 1000,
    /** Hips count as visible above this MediaPipe visibility. */
    hipVisibility: 0.5,
    headDropSustainMs: 8000,
    /** Movement below this fraction of the frame height counts as still. */
    stillnessRatio: 0.015,
  },
  emaTauSeconds: 2.5,
  minVisibility: 0.6,
  /** Live coaching still runs when a shoulder is this visible. Set my Zen keeps minVisibility. */
  coachShoulderVisibility: 0.3,
  /** Screen-distance alerts treat this as the close edge, in inches. */
  minComfortIn: 18,
  /** Average human iris diameter, millimeters. */
  irisMm: 11.7,
  /** Typical laptop webcam horizontal field of view. */
  assumedFovDeg: 60,
  /** Rough adult biacromial breadth, used only to size the guide box. */
  guideShoulderMm: 380,
  /** Typical inter-pupil distance, millimeters, for guide geometry in tests. */
  typicalIpdMm: 63,
  calibration: {
    holdMs: 5000,
    /** Morning Glow check is shorter than a full capture. */
    checkMs: 3000,
    /** Face size this far from the saved baseline means the setup changed. */
    setupShiftRatio: 0.15,
    historyLimit: 5,
    minSamples: 10,
    minGoodFrameRatio: 0.7,
    /**
     * Nose may wander at most this many IPD lengths during the hold.
     * Loosened to about 2x the first guess so a normal shift still saves.
     */
    maxNoseJitterIpd: 0.2,
    /** Hold ring pauses while you drift, and resets after this long out of the outline. */
    driftResetMs: 1500,
    /** The coaching pill changes no faster than this. */
    coachingDebounceMs: 1000,
    /** Smooth landmark positions during calibration so small shifts do not flicker the guide. */
    smoothTauSeconds: 0.4,
    /** After this many real save failures, offer a gentler retry. */
    helpAfterFails: 3,
    eyeLevelMaxDeg: 3,
    shoulderLevelMaxDeg: 4,
    distanceMinIn: 20,
    distanceMaxIn: 30,
    targetDistanceIn: 25,
    /** Face may sit this fraction of the frame width off center. */
    centerToleranceRatio: 0.08,
    eyeLineYRatio: 0.36,
    shoulderLineYRatio: 0.58,
    /** Eyes and shoulders may sit this fraction of frame height off their lines. */
    lineToleranceRatio: 0.07,
    /** Ears may sit this fraction of shoulder width off the shoulder midpoint. */
    headStackToleranceRatio: 0.15,
  },
  /** Find your Glow experience. Scoring weights stay in the blocks above. */
  glow: {
    guideMs: 25_000,
    captureMs: 4_000,
    tuneMs: 15_000,
    recheckMs: 10_000,
    ringFillMs: 3_000,
    ringRadius: 0.12,
    orbTauSeconds: 0.35,
    /** How far above the shoulder midpoint the nose sits when the orb is centered. */
    targetHeadRatio: 0.9,
    blendKeep: 0.7,
    greatScore: 90,
    greatSteadyMs: 20_000,
    strictCount: 3,
    strictWindowMs: 60 * 60 * 1000,
    angleDeg: 10,
    pitchRatio: 0.15,
    profileIpdRatio: 0.12,
    profilePos: 0.08,
    profileHoldMs: 2_000,
    quickCaptureMs: 3_000,
    minStatIn: 0.4,
  },
  nudge: {
    threshold: 65,
    sustainSeconds: 30,
    cooldownMinutes: 5,
    snoozeMinutes: 15,
    maxPerHour: 6,
  },
  /**
   * A "good day" (one streak day) needs both of these. One rule for Home, Progress and the sidebar.
   * 75 sits in the middle of the drift band (70 to 85), so a good day means mostly upright, not just "not slouching".
   */
  streak: {
    minAverage: 75,
    minTrackedMinutes: 30,
  },
  /** Presence between stretch reminders. */
  breakMinutes: 45,
  /** Screen-distance tip after this long below minComfortIn. */
  distanceAlertMs: 60_000,
  breakSnoozeMs: 10 * 60 * 1000,
  inferenceFpsVisible: 15,
  inferenceFpsHidden: 3,
  /** How long "away" must last before the live view says so. */
  absentUiMs: 1500,
  /** Hide the camera after the tab stays in the background this long. */
  hideCameraAfterMs: 60_000,
} as const;
