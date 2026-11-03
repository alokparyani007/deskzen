import { useEffect, useRef, useState } from 'react';
import type { Landmarks } from '../../lib/posture/types';
import { initialChips, stepChips, type ChipBoard } from './chipSequence';
import { advanceHistory, EMPTY_HISTORY, measurePose, medianMeasures, rememberMeasures, snapshotRules, type PoseMeasures, type RuleHistory, type RuleResult } from './poseRules';
import { zenConfig, type PoseMode } from './zenConfig';

export function useSnapLoop(frame: Landmarks | null, mode: PoseMode, active: boolean): {
  board: ChipBoard;
  rules: RuleResult[];
  measures: PoseMeasures | null;
  away: boolean;
  reset: () => void;
} {
  const history = useRef<RuleHistory>({ ...EMPTY_HISTORY });
  const board = useRef(initialChips());
  const samples = useRef<PoseMeasures[]>([]);
  const last = useRef<number | null>(null);
  const missing = useRef<number | null>(null);
  const modeRef = useRef(mode);
  if (modeRef.current !== mode) {
    modeRef.current = mode;
    history.current = { ...EMPTY_HISTORY };
    board.current = initialChips();
    samples.current = [];
  }
  const [view, setView] = useState<{ board: ChipBoard; rules: RuleResult[]; measures: PoseMeasures | null; away: boolean }>({
    board: initialChips(),
    rules: [],
    measures: null,
    away: false,
  });

  const reset = () => {
    history.current = { ...EMPTY_HISTORY };
    board.current = initialChips();
    samples.current = [];
    last.current = null;
    missing.current = null;
    setView({ board: initialChips(), rules: [], measures: null, away: false });
  };

  useEffect(() => {
    if (!active) return;
    const now = performance.now();
    const dt = last.current === null ? 0 : now - last.current;
    last.current = now;
    if (!frame) {
      missing.current = missing.current ?? now;
      setView((current) => ({ ...current, away: now - (missing.current ?? now) >= zenConfig.presenceHoldMs }));
      return;
    }
    const measured = measurePose(frame);
    if (!measured.present) {
      missing.current = missing.current ?? now;
    } else {
      missing.current = null;
    }
    samples.current = rememberMeasures(samples.current, measured);
    const smooth = medianMeasures(samples.current) ?? measured;
    const rules = snapshotRules(smooth, mode, history.current);
    history.current = advanceHistory(history.current, smooth, rules, dt);
    board.current = stepChips(board.current, now, rules);
    setView({
      board: board.current,
      rules,
      measures: smooth,
      away: missing.current !== null && now - missing.current >= zenConfig.presenceHoldMs,
    });
  }, [active, frame, mode]);

  return { ...view, reset };
}
