import { describe, expect, it } from 'vitest';
import { catchAutoFinish, catchMeterWord, skipCatchResult, trimCatchHistory } from '../../calibration/catchMeter';
import { restartAfterMove, resumeIfPaused } from '../camera/resumeVideo';
import { cameraWatchStep } from './cameraWatch';
import { printReturnPath } from './printSteps';

describe('recalibrate playback', () => {
  it('resumes a paused video that still has a stream', async () => {
    let played = false;
    resumeIfPaused({
      paused: true,
      srcObject: {},
      play: () => {
        played = true;
        return Promise.resolve();
      },
    });
    await Promise.resolve();
    expect(played).toBe(true);
  });

  it('restarts a playing video after the element moves', () => {
    let paused = false;
    let played = false;
    restartAfterMove({
      get paused() {
        return paused;
      },
      srcObject: {},
      pause: () => {
        paused = true;
      },
      play: () => {
        played = true;
        paused = false;
        return Promise.resolve();
      },
    });
    expect(played).toBe(true);
  });

  it('leaves a playing video alone', () => {
    let played = false;
    resumeIfPaused({
      paused: false,
      srcObject: {},
      play: () => {
        played = true;
        return Promise.resolve();
      },
    });
    expect(played).toBe(false);
  });

  it('shows Camera paused when landmarks stop on a paused video', () => {
    expect(cameraWatchStep({ landmarkStaleMs: 1_000, videoPaused: true, nudged: false })).toEqual({ nudge: false, showPaused: false });
    expect(cameraWatchStep({ landmarkStaleMs: 2_000, videoPaused: true, nudged: false })).toEqual({ nudge: true, showPaused: false });
    expect(cameraWatchStep({ landmarkStaleMs: 4_000, videoPaused: true, nudged: true })).toEqual({ nudge: false, showPaused: true });
  });
});

describe('catch meter', () => {
  it('finishes by itself within 10 s after being caught', () => {
    expect(catchAutoFinish(9_999)).toBe(false);
    expect(catchAutoFinish(10_000)).toBe(true);
  });

  it('skip sends no slouch frames', () => {
    expect(skipCatchResult()).toEqual({ frames: [], detected: false });
  });

  it('keeps only the last 5 seconds of samples', () => {
    const samples = [
      { tMs: 0, amount: 1 },
      { tMs: 5_000, amount: 2 },
      { tMs: 9_100, amount: 3 },
    ];
    expect(trimCatchHistory(samples, 10_000).map((sample) => sample.tMs)).toEqual([5_000, 9_100]);
  });

  it('names the meter from the live amount', () => {
    expect(catchMeterWord(0, 3)).toBe('Upright');
    expect(catchMeterWord(1.2, 3)).toBe('A little');
    expect(catchMeterWord(2.2, 3)).toBe('Almost');
    expect(catchMeterWord(3, 3)).toBe('Got it!');
  });
});

describe('print return path', () => {
  it('goes home unless the flow started somewhere else', () => {
    expect(printReturnPath(null)).toBe('/app');
    expect(printReturnPath('home')).toBe('/app');
    expect(printReturnPath('settings')).toBe('/settings');
    expect(printReturnPath('live')).toBe('/live');
  });
});
