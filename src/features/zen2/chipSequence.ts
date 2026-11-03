import { chipPassing, type RuleResult } from './poseRules';
import { CHIP_ORDER, zenConfig, type ChipId } from './zenConfig';

export type ChipStatus = 'todo' | 'active' | 'done';

export interface ChipRuntime {
  id: ChipId;
  status: ChipStatus;
  passSince: number | null;
  failSince: number | null;
}

export interface ChipBoard {
  chips: ChipRuntime[];
  allGreen: boolean;
  activeChip: ChipId | null;
}

export function initialChips(): ChipBoard {
  return {
    chips: CHIP_ORDER.map((id) => ({ id, status: 'todo', passSince: null, failSince: null })),
    allGreen: false,
    activeChip: 'head',
  };
}

/**
 * Chips turn green in order. A chip needs a continuous pass of chipHoldMs.
 * A done chip drops only after chipDropMs of failure. Later chips keep a silent timer.
 */
export function stepChips(
  state: ChipBoard,
  nowMs: number,
  results: readonly RuleResult[],
  holdMs = zenConfig.chipHoldMs,
  dropMs = zenConfig.chipDropMs,
): ChipBoard {
  const chips: ChipRuntime[] = state.chips.map((chip) => ({
    ...chip,
    status: chip.status === 'active' ? 'todo' : chip.status,
  }));
  let gateOpen = true;
  for (const chip of chips) {
    const passing = chipPassing(results, chip.id);
    if (passing) {
      chip.failSince = null;
      if (chip.passSince === null) chip.passSince = nowMs;
    } else {
      chip.passSince = null;
      if (chip.status === 'done') {
        if (chip.failSince === null) chip.failSince = nowMs;
      } else {
        chip.failSince = null;
      }
    }
    const held = chip.passSince !== null && nowMs - chip.passSince >= holdMs;
    const dropped = chip.failSince !== null && nowMs - chip.failSince >= dropMs;
    if (chip.status === 'done' && dropped) chip.status = 'todo';
    if (!gateOpen) continue;
    if (chip.status === 'done') continue;
    if (held) {
      chip.status = 'done';
      continue;
    }
    gateOpen = false;
  }
  const active = chips.find((chip) => chip.status !== 'done') ?? null;
  if (active) active.status = 'active';
  return {
    chips,
    allGreen: chips.every((chip) => chip.status === 'done'),
    activeChip: active?.id ?? null,
  };
}
