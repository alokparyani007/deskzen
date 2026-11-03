import { describe, expect, it } from 'vitest';
import type { MinuteRecord } from '../../lib/progress/aggregate';
import {
  bodyCheck,
  bounceCount,
  chooseDrift,
  emptyBand,
  emptyCoach,
  emptyVoice,
  gateCoachVoice,
  highlightedRow,
  leanDirection,
  nextVoice,
  outlineKind,
  RECOVERY_LINE,
  stepBand,
  stepCoach,
  tipFor,
  ZEN_TITLE,
} from './coach';

describe('live coach', () => {
  it('falls back to the locked outline when the silhouette is invalid', () => {
    expect(outlineKind({ hasPrint: true, silhouette: { points: [{ x: 0, y: 0 }] }, hasLockedPose: true })).toBe('locked');
    expect(outlineKind({ hasPrint: false, silhouette: null, hasLockedPose: false })).toBe('generic');
  });

  it('maps each drift to one plain tip', () => {
    expect(tipFor('head-forward')).toEqual({ title: 'Sit back about 2 inches', helper: 'Let your shoulders relax over your hips' });
    expect(tipFor('head-down').title).toBe('Lift your chin a little');
    expect(tipFor('slouch')).toEqual({ title: 'Sit back about 2 inches', helper: 'Let your shoulders relax over your hips' });
    expect(tipFor('lean-left').helper).toBe('Shift a little to the left.');
    expect(tipFor('lean-right').helper).toBe('Shift a little to the right.');
    expect(tipFor('shoulders-tilt').title).toBe('Level your shoulders');
    expect(tipFor('shoulders-up').title).toBe('Drop your shoulders');
    expect(tipFor('too-close').title).toBe('Move back from the screen');
    expect(tipFor('too-far').title).toBe('Move a little closer');
    expect(tipFor('out-of-frame').title).toBe('Step into view');
    expect(tipFor('chin-slouch').title).toBe('Sit back about 2 inches');
  });

  it('uses the mirror direction when the head is off to one side', () => {
    expect(leanDirection(0.4, 0.5, 0.5, 0.5)).toBe('right');
    expect(leanDirection(0.6, 0.5, 0.5, 0.5)).toBe('left');
  });

  it('joins head forward and a slouch into one tip', () => {
    expect(
      chooseDrift([
        { id: 'head-forward', amount: 2 },
        { id: 'slouch', amount: 1.4 },
        { id: 'too-close', amount: 1.1 },
      ]),
    ).toBe('chin-slouch');
    expect(chooseDrift([{ id: 'head-forward', amount: 2.4 }, { id: 'too-close', amount: 1.1 }])).toBe('head-forward');
  });

  it('holds the same tip for 4 seconds, then switches', () => {
    let step = stepCoach(emptyCoach(), 0, 'head-forward');
    expect(step.chip.title).toBe('Sit back about 2 inches');
    expect(step.chip.tone).toBe('drift');
    step = stepCoach(step.memory, 3_999, 'shoulders-up');
    expect(step.chip.title).toBe('Sit back about 2 inches');
    step = stepCoach(step.memory, 4_000, 'shoulders-up');
    expect(step.chip.title).toBe('Drop your shoulders');
  });

  it('lets step into view interrupt, then celebrates the fix', () => {
    const drifting = stepCoach(emptyCoach(), 0, 'head-forward');
    const gone = stepCoach(drifting.memory, 500, 'out-of-frame');
    expect(gone.chip.title).toBe('Step into view');
    const fixed = stepCoach(drifting.memory, 2_000, null);
    expect(fixed.chip.title).toBe(ZEN_TITLE);
    expect(fixed.chip.helper).toBe('Tall for 0 seconds. Keep it easy.');
    expect(fixed.recovered).toBe(true);
    const later = stepCoach(fixed.memory, 44_000, null);
    expect(later.chip.helper).toBe('Tall for 42 seconds. Keep it easy.');
    expect(later.recovered).toBe(false);
  });

  it('waits 1.5 seconds before the match color changes', () => {
    let step = stepBand(emptyBand(92), 0, 60);
    expect(step.band).toBe('good');
    step = stepBand(step.memory, 1_000, 92);
    expect(step.band).toBe('good');
    expect(step.memory.pending).toBeNull();
    step = stepBand(emptyBand(92), 0, 75);
    step = stepBand(step.memory, 1_499, 75);
    expect(step.band).toBe('good');
    step = stepBand(step.memory, 1_500, 75);
    expect(step.band).toBe('mid');
    step = stepBand(step.memory, 1_600, 50);
    expect(step.band).toBe('mid');
    step = stepBand(step.memory, 3_100, 50);
    expect(step.band).toBe('low');
  });

  it('waits between spoken tips and says the recovery line at most once a minute', () => {
    const first = nextVoice(emptyVoice(), 0, { text: 'Bring your head back', kind: 'tip' });
    expect(first.speak).toBe('Bring your head back');
    const soon = nextVoice({ ...first.state, busy: false }, 5_000, { text: 'Lift your chin a little', kind: 'tip' });
    expect(soon.speak).toBeNull();
    const same = nextVoice({ ...first.state, busy: false }, 21_000, { text: 'Bring your head back', kind: 'tip' });
    expect(same.speak).toBeNull();
    const next = nextVoice({ ...first.state, busy: false }, 21_000, { text: 'Lift your chin a little', kind: 'tip' });
    expect(next.speak).toBe('Lift your chin a little');
    const busy = nextVoice({ ...next.state, busy: true }, 100_000, { text: 'Sit up tall', kind: 'tip' });
    expect(busy.speak).toBeNull();
    const nice = nextVoice(emptyVoice(), 0, { text: 'Nice', kind: 'nice' });
    expect(nice.speak).toBe(RECOVERY_LINE);
    expect(nextVoice({ ...nice.state, busy: false }, 10_000, { text: 'Nice', kind: 'nice' }).speak).toBeNull();
    expect(nextVoice({ ...nice.state, busy: false }, 70_000, { text: 'Nice', kind: 'nice' }).speak).toBe(RECOVERY_LINE);
  });

  it('waits 3 seconds for the first tip and stays quiet while guiding', () => {
    const early = gateCoachVoice(emptyVoice(), 5_000, { guiding: false, text: 'Sit up tall', kind: 'tip', driftMs: 2_999 });
    expect(early.speak).toBeNull();
    const first = gateCoachVoice(early.state, 5_000, { guiding: false, text: 'Sit up tall', kind: 'tip', driftMs: 3_000 });
    expect(first.speak).toBe('Sit up tall');
    const guided = gateCoachVoice({ ...first.state, busy: false }, 40_000, { guiding: true, text: 'Drop your shoulders', kind: 'tip', driftMs: 20_000 });
    expect(guided.speak).toBeNull();
    expect(guided.state.tip).toBe(first.state.tip);
    const nice = gateCoachVoice({ ...first.state, busy: false }, 40_000, { guiding: true, text: 'Nice', kind: 'nice', driftMs: 20_000 });
    expect(nice.speak).toBeNull();
  });

  it('marks the body check from the active tip and counts real bounce-backs', () => {
    const rows = bodyCheck('head-forward', true);
    expect(rows.map((row) => row.label)).toEqual(['Head over shoulders', 'Sitting tall', 'Shoulders level', 'Screen distance']);
    expect(rows.find((row) => row.id === 'head')?.state).toBe('fix');
    expect(rows.find((row) => row.id === 'tall')?.state).toBe('ok');
    expect(highlightedRow('head-forward')).toBe('head');
    expect(bodyCheck('chin-slouch', true).filter((row) => row.state === 'fix').map((row) => row.id)).toEqual(['head', 'tall']);
    expect(bodyCheck('too-far', true).find((row) => row.id === 'distance')?.state).toBe('fix');
    expect(bodyCheck('out-of-frame', true).every((row) => row.state === 'wait')).toBe(true);
    const base = Math.floor(Date.parse('2026-10-26T15:00:00Z') / 60_000);
    const minutes: MinuteRecord[] = [
      { minute: base, score: 60, state: 'slouch' },
      { minute: base + 1, score: 90, state: 'great' },
      { minute: base + 2, score: 72, state: 'drift' },
      { minute: base + 3, score: 90, state: 'great' },
    ];
    expect(bounceCount(minutes, Date.parse('2026-10-26T16:00:00Z'), 'UTC')).toBe(2);
  });
});
