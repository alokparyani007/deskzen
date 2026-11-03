/**
 * Posture Print tunables from prompts/09-posture-print.md.
 * Starting points, not validated constants.
 */
export const calibrationConfig = {
  /** Feature flag. On in dev unless sitglow.posturePrintV2 is "0". */
  flagKey: 'sitglow.posturePrintV2',
  /** Existing baselines migrate to this confidence until a real check. */
  migratedConfidence: 40,
  trimRatio: 0.2,
  madScale: 1.4826,
  /** Below this many good frames, aggregation uses the existing median. */
  medianFallbackCount: 30,
  captureFps: 15,
  lockMs: 5_000,
  lockExtendMs: 10_000,
  minGoodFrames: 45,
  /** Target ring radius, as a fraction of the camera frame. */
  lockRingRadius: 0.09,
  /** Head orb eases toward the live head over about this long. */
  lockOrbMs: 200,
  deadbandMultiplier: 3,
  slouchK: 0.5,
  /** |slouchDelta| under this many spreads means the camera barely sees that feature. */
  weakSpreadMultiplier: 2,
  weakWeight: 0.5,
  fullWeight: 1,
  presenceMin: 0.5,
  shoulderVisibilityMin: 0.6,
  yawMaxDeg: 15,
  rollMaxDeg: 10,
  /** Nose may move this fraction of frame width between frames. */
  noseMotionRatio: 0.015,
  luminanceMin: 0.12,
  luminanceMax: 0.92,
  confidence: {
    goodFrames: 30,
    stillness: 20,
    visibility: 20,
    lighting: 15,
    framing: 15,
    saveAt: 75,
    tipAt: 55,
  },
  learnAlpha: 0.05,
  /** Current may drift this fraction of slouchDelta away from the slouch. */
  maxDriftRatio: 0.35,
  /** Current may drift only this fraction of slouchDelta toward the slouch. */
  maxTowardSlouchRatio: 0.15,
  steadyHoldMs: 20_000,
  steadyConfidence: 75,
  correctedHoldMs: 10_000,
  buttonHoldMs: 3_000,
  /**
   * Floors and default alert offsets, in each feature's own units.
   * Ratio features start from the sitting dead zone and full penalty.
   */
  floor: {
    headDrop: 0.06,
    leanIn: 0.04,
    shrug: 0.08,
    rounding: 0.08,
    forwardHead: 2,
    headRoll: 2,
    hipLean: 0.08,
    elbowLeft: 0,
    elbowRight: 0,
  },
  defaultThreshold: {
    headDrop: 0.35,
    leanIn: 0.22,
    shrug: 0.35,
    rounding: 0.35,
    forwardHead: 15,
    headRoll: 10,
    hipLean: 0.35,
    elbowLeft: 30,
    elbowRight: 30,
  },
  /** Later phases read these. They live here so every spec number has one home. */
  setup: {
    /** Displayed score averages about this long so it does not flicker. */
    scoreSmoothMs: 1_000,
    /** A full part stays full only this many times past its full zone. */
    holdFactor: 1.25,
    guideAspect: 16 / 9,
    /** Guide head width in the 1280-wide silhouette, as a fraction of the frame. */
    guideHeadWidth: 204 / 1280,
    /** Guide shoulder span in that silhouette. */
    guideShoulderSpan: 536 / 1280,
    /** Faint ideal zone for the head, as fractions of the frame. */
    zoneXMin: 0.3,
    zoneXMax: 0.7,
    zoneYMin: 0.15,
    zoneYMax: 0.6,
    /** Top of the head must sit at least this far below the frame. */
    headClear: 0.04,
    shoulderVisibility: 0.6,
    points: {
      frame: 25,
      distance: 20,
      angle: 20,
      facing: 15,
      level: 10,
      light: 10,
    },
    faceWidthFullMin: 0.11,
    faceWidthFullMax: 0.2,
    faceWidthZeroMin: 0.06,
    faceWidthZeroMax: 0.3,
    distanceFullMinIn: 20,
    distanceFullMaxIn: 30,
    distanceZeroMinIn: 13,
    distanceZeroMaxIn: 43,
    yawFullDeg: 12,
    yawZeroDeg: 35,
    pitchFullDeg: 12,
    pitchZeroDeg: 30,
    rollFullDeg: 5,
    rollZeroDeg: 18,
    lightFullFace: 0.16,
    lightZeroFace: 0.06,
    backlitFull: 0.18,
    backlitZero: 0.4,
    /** Outline follows the user with this smoothing time. */
    fitSmoothMs: 400,
    speakGapMs: 4_000,
    speakRepeatMs: 8_000,
    minStayMs: 5_000,
    greatScore: 90,
    lookingGreatScore: 95,
    goodEnoughHighScore: 75,
    goodEnoughHighMs: 15_000,
    goodEnoughMs: 25_000,
  },
  bodyReset: {
    sampleMs: 100,
    /** Landmark smoothing time constant. */
    smoothMs: 300,
    /** First sit, before the moves. */
    beforeMs: 3_000,
    /** Looseness averages about this much still sitting. */
    averageMs: 2_000,
    moveTimeoutMs: 8_000,
    breathInMs: 4_000,
    breathOutMs: 6_000,
    /** Auto-advance after a move is seen. */
    gotItMs: 1_200,
    holdMs: 1_000,
    /** Stillness band, as a fraction of shoulder width. */
    holdStillRatio: 0.015,
    /** Shoulder rise, as a fraction of shoulder width, that starts a roll. */
    rollRiseRatio: 0.06,
    /** Rolls required: up, then down to or below the start. */
    rollCount: 2,
    /** Head roll, in degrees, that marks one side of the neck stretch. */
    neckRollDeg: 12,
    chinFaceDropRatio: 0.02,
    /** A larger nose drop is a nod, not a tuck. */
    chinNoseDropMax: 0.03,
    chinShoulderStillRatio: 0.03,
    /** Shoulder gap growth that earns the full drop score. */
    shoulderDropShare: 0.06,
    /** A before-gap at least this wide is already loose. */
    typicalLooseGap: 1.2,
    levelMaxDeg: 4,
    /** Face may grow this much vs before without counting as a forward head. */
    headForwardRatio: 0.08,
    /** Shoulder and nose jitter, as a fraction of shoulder width, that still counts as settled. */
    jitterMax: 0.02,
    looseScore: 80,
    /** Hide the inch row under this. */
    dropMinIn: 0.2,
    points: { drop: 50, level: 20, stacked: 15, settled: 15 },
  },
  lockCoach: {
    smoothMs: 500,
    holdFactor: 1.2,
    holdMs: 5_000,
    /** Shoulders may sit this much lower than the reset, as a fraction of shoulder width. */
    tallDrop: 0.04,
    noseOffset: 0.05,
    faceRatioBand: 0.12,
    /** Shoulder gap must stay at least this share of the reset. */
    gapKeep: 0.95,
    shoulderTiltDeg: 4,
    /** Forward-head angle may drift this far from the reset. */
    forwardHeadDeg: 12,
    faceBigger: 0.08,
    pitchDeg: 10,
    rollDeg: 5,
    partialAtMs: 30_000,
    giveUpAtMs: 45_000,
    speakGapMs: 4_000,
    speakRepeatMs: 8_000,
  },
  catchMe: {
    windowMs: 10_000,
    sampleMs: 100,
    smoothMs: 300,
    /** Slouching when the weighted distance from the print reaches this. */
    slouchAmount: 3,
    slouchHoldMs: 1_500,
    returnAmount: 1,
    returnHoldMs: 1_000,
    recordMs: 3_000,
    giveUpMs: 8_000,
    continueAfterMs: 6_000,
  },
  zen: {
    windowMs: 20_000,
    tuneMs: 8_000,
  },
  reanchor: {
    externalStepRatio: 0.4,
    stepMs: 3_000,
    holdMs: 20_000,
  },
  deskSense: {
    headMoveRatio: 0.25,
    headMoveMs: 3_000,
    stillMs: 3_000,
    shiftRatio: 0.1,
    shiftWindowMs: 20_000,
    profileMs: 150,
    switchMs: 15_000,
    slowSwitchMs: 60_000,
    confirmCount: 3,
  },
  tune: {
    loosenRatio: 0.15,
    maxLoosenRatio: 0.5,
    dismissCount: 3,
    dismissWindowMs: 60 * 60 * 1000,
    fastDismissMs: 5_000,
  },
  edge: {
    sideYawDeg: 25,
    lowShoulderVisibility: 0.5,
    slowFps: 8,
  },
} as const;

export type FeatureKey = keyof typeof calibrationConfig.floor;
