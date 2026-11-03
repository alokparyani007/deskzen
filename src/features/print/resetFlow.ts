import type { MoveKind } from './moveIcons';
import type { MoveMark } from './resetLog';

export const RESET_MOVES: Array<{ kind: MoveKind; title: string; caption: string }> = [
  { kind: 'shoulders', title: 'Shoulder roll', caption: 'Roll your shoulders up, back, and let them drop.' },
  { kind: 'neck', title: 'Neck side stretch', caption: 'Ear toward your shoulder, hold 3 seconds each side.' },
  { kind: 'chin', title: 'Chin tuck', caption: 'Tuck your chin gently and lengthen the back of your neck.' },
  { kind: 'breath', title: 'Tall sit', caption: 'Sit tall for a moment, easy through the shoulders.' },
];

/** Back stops at the first move. */
export function previousMove(index: number): number {
  return Math.max(0, index - 1);
}

export function markSkipped(marks: readonly MoveMark[], index: number): MoveMark[] {
  return marks.map((mark, itemIndex) => (itemIndex === index ? 'skipped' : mark));
}
