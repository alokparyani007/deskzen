import { postureConfig } from './config';
import { frameSignals, mid } from './signals';
import type { Alignment, GuideStatus, Landmarks } from './types';

function pointVisible(visibility: number | undefined): boolean {
  return visibility === undefined || visibility >= postureConfig.minVisibility;
}

function blank(coaching: string): Alignment {
  return {
    guides: guideList(false, false, false, false, false, null),
    allGreen: false,
    coaching,
    distanceIn: null,
  };
}

export function assessAlignment(landmarks: Landmarks | null): Alignment {
  if (!landmarks || landmarks.videoWidth <= 0 || landmarks.videoHeight <= 0) {
    return blank('Sit in the frame so I can see your face and shoulders.');
  }
  if (landmarks.faceAmbiguous) {
    return blank('I see more than one person. Sit so only you are in frame.');
  }
  if (!landmarks.nose || !landmarks.leftEye || !landmarks.rightEye) {
    return blank('Sit in the frame so I can see your face and shoulders.');
  }
  if (!pointVisible(landmarks.nose.visibility) || !pointVisible(landmarks.leftEye.visibility)) {
    return blank("I can't see you clearly. Turn toward a light.");
  }

  const { calibration } = postureConfig;
  const signals = frameSignals(landmarks);
  const eyeMid = mid(landmarks.leftEye, landmarks.rightEye);
  const centerTolerance = landmarks.videoWidth * calibration.centerToleranceRatio;
  const lineTolerance = landmarks.videoHeight * calibration.lineToleranceRatio;
  const eyeLineY = landmarks.videoHeight * calibration.eyeLineYRatio;
  const shoulderLineY = landmarks.videoHeight * calibration.shoulderLineYRatio;

  const centered = Math.abs(landmarks.nose.x - landmarks.videoWidth / 2) <= centerTolerance;
  const eyesLevel =
    signals.eyeAngleDeg !== undefined && Math.abs(signals.eyeAngleDeg) <= calibration.eyeLevelMaxDeg;
  const eyesOnLine = Math.abs(eyeMid.y - eyeLineY) <= lineTolerance;
  const eyesAligned = eyesLevel && eyesOnLine;

  const shouldersPresent = Boolean(landmarks.leftShoulder && landmarks.rightShoulder);
  const shouldersLevel =
    shouldersPresent &&
    signals.shoulderAngleDeg !== undefined &&
    Math.abs(signals.shoulderAngleDeg) <= calibration.shoulderLevelMaxDeg;
  const shoulderMid = shouldersPresent
    ? mid(landmarks.leftShoulder!, landmarks.rightShoulder!)
    : undefined;
  const shouldersOnLine = shoulderMid ? Math.abs(shoulderMid.y - shoulderLineY) <= lineTolerance : false;
  const shouldersAligned = shouldersLevel && shouldersOnLine;

  let headStacked = false;
  if (shoulderMid && signals.shoulderWidthPx && landmarks.leftEar && landmarks.rightEar) {
    const earMid = mid(landmarks.leftEar, landmarks.rightEar);
    headStacked =
      Math.abs(earMid.x - shoulderMid.x) <=
      signals.shoulderWidthPx * calibration.headStackToleranceRatio;
  } else if (shoulderMid) {
    headStacked =
      Math.abs(landmarks.nose.x - shoulderMid.x) <=
      (signals.shoulderWidthPx ?? landmarks.videoWidth) * calibration.headStackToleranceRatio;
  }

  const distance = signals.screenDistanceIn ?? null;
  const distanceOk =
    distance !== null && distance >= calibration.distanceMinIn && distance <= calibration.distanceMaxIn;

  const coaching = coachingFor({
    centered,
    eyesLevel,
    eyesOnLine,
    eyesTooLow: eyeMid.y > eyeLineY + lineTolerance,
    shouldersPresent,
    shouldersLevel,
    shouldersOnLine,
    shouldersTooHigh: shoulderMid ? shoulderMid.y < shoulderLineY - lineTolerance : false,
    headStacked,
    distance,
  });

  return {
    guides: guideList(centered, eyesAligned, shouldersAligned, headStacked, distanceOk, distance),
    allGreen: centered && eyesAligned && shouldersAligned && headStacked && distanceOk,
    coaching,
    distanceIn: distance,
  };
}

function guideList(
  centered: boolean,
  eyes: boolean,
  shoulders: boolean,
  headStack: boolean,
  distanceOk: boolean,
  distanceIn: number | null,
): GuideStatus[] {
  return [
    { id: 'center', label: 'Face centered', aligned: centered, detail: centered ? 'Centered' : 'Move to the middle' },
    { id: 'eyes', label: 'Eyes level', aligned: eyes, detail: eyes ? 'Level' : 'Line up with the eye line' },
    {
      id: 'shoulders',
      label: 'Shoulders level',
      aligned: shoulders,
      detail: shoulders ? 'Level' : 'Relax both shoulders',
    },
    {
      id: 'headStack',
      label: 'Head over shoulders',
      aligned: headStack,
      detail: headStack ? 'Stacked' : 'Ears over shoulders',
    },
    {
      id: 'distance',
      label: "About an arm's length",
      aligned: distanceOk,
      detail: distanceIn === null ? 'Need a clear view of your eyes' : `${Math.round(distanceIn)} in`,
    },
  ];
}

function coachingFor(state: {
  centered: boolean;
  eyesLevel: boolean;
  eyesOnLine: boolean;
  eyesTooLow: boolean;
  shouldersPresent: boolean;
  shouldersLevel: boolean;
  shouldersOnLine: boolean;
  shouldersTooHigh: boolean;
  headStacked: boolean;
  distance: number | null;
}): string | null {
  const { calibration } = postureConfig;
  if (!state.shouldersPresent) return "I can't see your shoulders. Sit back a little so both are in frame.";
  if (state.distance === null) return 'Look at the screen so I can see your eyes.';
  if (state.distance < calibration.distanceMinIn) return 'Sit back a little.';
  if (state.distance > calibration.distanceMaxIn) return 'Come a little closer.';
  if (!state.centered) return 'Slide into the center of the frame.';
  if (!state.eyesLevel) return 'Level your head.';
  if (state.eyesTooLow || !state.eyesOnLine) return 'Raise your screen or sit taller.';
  if (state.shouldersTooHigh) return 'Drop your shoulders.';
  if (!state.shouldersLevel || !state.shouldersOnLine) return 'Level your shoulders.';
  if (!state.headStacked) return 'Bring your ears over your shoulders.';
  return null;
}
