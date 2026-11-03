import { useEffect, useRef, useState } from 'react';
import { liveFromPrint } from '../../calibration/lockedPose';
import type { PosturePrint } from '../../calibration/print';
import type { Landmarks } from '../../lib/posture/types';
import { printDrift } from '../live/drift';
import { fitScore, smoothFit } from '../zen2/fitScore';
import { liveRules, measurePose } from '../zen2/poseRules';
import { zenConfig, type PoseMode } from '../zen2/zenConfig';

/** Match percent for the home camera. Uses the Zen outline score when one is saved, otherwise the older print drift. */
export function useHomeMatch(print: PosturePrint | null, landmarks: Landmarks | null, live: boolean, mode: PoseMode): { match: number | null; drifting: boolean } {
  const ema = useRef<number | null>(null);
  const [match, setMatch] = useState<number | null>(null);
  const [drifting, setDrifting] = useState(false);
  const zen = print?.zen ?? null;

  useEffect(() => {
    ema.current = null;
  }, [print?.createdAt, mode]);

  useEffect(() => {
    if (!live || !print || !landmarks) {
      setMatch(null);
      setDrifting(false);
      return;
    }
    if (zen) {
      const measures = measurePose(landmarks);
      const rules = liveRules(measures, zen.baseline, mode);
      const computable = rules.filter((rule) => rule.pass !== null);
      const score = fitScore(
        {
          outline: zen.outline,
          landmarks: {
            nose: zen.points.nose,
            eyeMid: { x: (zen.points.leftEye.x + zen.points.rightEye.x) / 2, y: (zen.points.leftEye.y + zen.points.rightEye.y) / 2 },
            leftShoulder: zen.points.leftShoulder,
            rightShoulder: zen.points.rightShoulder,
            shoulderWidth: zen.baseline.shoulderWidth,
          },
        },
        {
          outline: null,
          landmarks: {
            nose: measures.noseX !== null && measures.noseY !== null ? { x: measures.noseX, y: measures.noseY } : null,
            eyeMid: measures.eyeMidX !== null && measures.eyeMidY !== null ? { x: measures.eyeMidX, y: measures.eyeMidY } : null,
            leftShoulder: measures.leftShoulderX !== null && measures.leftShoulderY !== null ? { x: measures.leftShoulderX, y: measures.leftShoulderY } : null,
            rightShoulder: measures.rightShoulderX !== null && measures.rightShoulderY !== null ? { x: measures.rightShoulderX, y: measures.rightShoulderY } : null,
            shoulderWidth: measures.shoulderWidth,
          },
          rulesPassed: computable.filter((rule) => rule.pass).length,
          rulesTotal: computable.length,
        },
      );
      const smoothed = smoothFit(ema.current, score.percent);
      ema.current = smoothed;
      const shown = smoothed === null ? null : Math.round(smoothed);
      setMatch(shown);
      setDrifting(shown !== null && shown < zenConfig.driftBelow);
      return;
    }
    const drift = printDrift(landmarks, print, print.lockedPose);
    const printed = liveFromPrint(drift.amount);
    setMatch(printed.score);
    setDrifting(printed.drifting);
  }, [landmarks, live, mode, print, zen]);

  return { match, drifting };
}
