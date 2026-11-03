const KEY = 'sitglow.resetMoves';

export type MoveMark = 'seen' | 'missed' | 'skipped' | null;

export interface ResetLooseness {
  before: number | null;
  after: number | null;
  shoulderGap: number | null;
  shoulderY?: number | null;
  faceRatio?: number | null;
  forwardHead?: number | null;
}

export interface ResetAfter {
  shoulderGap: number;
  shoulderY: number;
  faceRatio: number;
  forwardHead?: number;
}

/** On-device record of the reset. Numbers only. Never sent. */
export function saveResetMoves(marks: readonly MoveMark[], looseness: ResetLooseness): void {
  const payload = {
    shoulders: marks[0] === 'seen',
    neck: marks[1] === 'seen',
    chin: marks[2] === 'seen',
    breath: marks[3] === 'seen',
    skipped: marks.map((mark) => mark === 'skipped'),
    before: looseness.before,
    after: looseness.after,
    shoulderGap: looseness.shoulderGap,
    shoulderY: looseness.shoulderY ?? null,
    faceRatio: looseness.faceRatio ?? null,
    forwardHead: looseness.forwardHead ?? null,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(payload));
}

/** The Body reset After reading, if this device has one. */
export function loadResetAfter(): ResetAfter | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    const shoulderGap = record.shoulderGap;
    const shoulderY = record.shoulderY;
    const faceRatio = record.faceRatio;
    if (typeof shoulderGap !== 'number' || typeof shoulderY !== 'number' || typeof faceRatio !== 'number') return null;
    return {
      shoulderGap,
      shoulderY,
      faceRatio,
      forwardHead: typeof record.forwardHead === 'number' ? record.forwardHead : undefined,
    };
  } catch {
    return null;
  }
}
