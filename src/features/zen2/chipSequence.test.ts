import { describe, expect, it } from 'vitest';
import { initialChips, stepChips } from './chipSequence';
import { chipPassing, snapshotRules, type RuleResult } from './poseRules';
import type { ChipId } from './zenConfig';

function results(passing: Record<ChipId, boolean>): RuleResult[] {
  return (Object.keys(passing) as ChipId[]).map((chip) => ({
    id: chip,
    chip,
    pass: passing[chip],
    value: passing[chip] ? 1 : 0,
    deviation: passing[chip] ? 0 : 1,
  }));
}

const allOn = { head: true, shoulders: true, tall: true, distance: true };

describe('chip sequence', () => {
  it('turns chips green in order after a 1 second hold', () => {
    let board = initialChips();
    board = stepChips(board, 0, results({ ...allOn, shoulders: false, tall: false, distance: false }));
    expect(board.activeChip).toBe('head');
    expect(board.chips.find((chip) => chip.id === 'head')?.status).toBe('active');
    board = stepChips(board, 999, results({ ...allOn, shoulders: false, tall: false, distance: false }));
    expect(board.chips.find((chip) => chip.id === 'head')?.status).toBe('active');
    board = stepChips(board, 1000, results({ ...allOn, shoulders: false, tall: false, distance: false }));
    expect(board.chips.find((chip) => chip.id === 'head')?.status).toBe('done');
    expect(board.activeChip).toBe('shoulders');
    expect(board.allGreen).toBe(false);
  });

  it('lets a later chip that already held go green on its turn', () => {
    let board = initialChips();
    board = stepChips(board, 0, results(allOn));
    board = stepChips(board, 1000, results(allOn));
    expect(board.allGreen).toBe(true);
    expect(board.activeChip).toBeNull();
  });

  it('drops a green chip only after 1.5 seconds of failure', () => {
    let board = initialChips();
    board = stepChips(board, 0, results(allOn));
    board = stepChips(board, 1000, results(allOn));
    expect(board.allGreen).toBe(true);
    board = stepChips(board, 1100, results({ ...allOn, head: false }));
    board = stepChips(board, 1100 + 1499, results({ ...allOn, head: false }));
    expect(board.chips.find((chip) => chip.id === 'head')?.status).toBe('done');
    board = stepChips(board, 1100 + 1500, results({ ...allOn, head: false }));
    expect(board.chips.find((chip) => chip.id === 'head')?.status).toBe('active');
  });

  it('does not treat a missing rule as a pass', () => {
    expect(chipPassing([], 'head')).toBe(false);
  });
});
