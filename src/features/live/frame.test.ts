import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';
import { emptyFrame, frameStatus, framingCopy, PRESENCE_VISIBILITY, shoulderWidthRatio, stepFrame } from './frame';

function marks(patch: Partial<Landmarks> = {}): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 320, y: 180, visibility: 1 },
    leftShoulder: { x: 220, y: 340, visibility: 1 },
    rightShoulder: { x: 420, y: 340, visibility: 1 },
    ...patch,
  };
}

describe('frameStatus', () => {
  it('asks the person to step in when nobody is there', () => {
    expect(frameStatus(null).status).toBe('no-person');
    expect(frameStatus(marks({ faceCount: 0, nose: undefined })).status).toBe('no-person');
    expect(frameStatus(marks({ nose: { x: 320, y: 180, visibility: 0.1 } })).status).toBe('no-person');
  });

  it('treats a pose as a person even when the face model missed them', () => {
    expect(frameStatus(marks({ faceCount: 0 })).status).toBe('ok');
    expect(frameStatus(marks({ faceCount: 0 })).person).toBe(true);
    expect(frameStatus(marks({ nose: { x: 320, y: 180, visibility: PRESENCE_VISIBILITY } })).person).toBe(true);
    expect(frameStatus(null, { videoReady: false })).toEqual({ status: 'ok', estimated: false, coaching: null, person: false });
  });

  it('keeps coaching when one shoulder is missing by mirroring it', () => {
    const read = frameStatus(marks({ rightShoulder: undefined }));
    expect(read.status).toBe('ok');
    expect(read.estimated).toBe(true);
    expect(read.coaching?.rightShoulder?.x).toBeCloseTo(420);
    expect(read.coaching?.rightShoulder?.y).toBe(340);
    const low = frameStatus(marks({ rightShoulder: { x: 400, y: 300, visibility: 0.2 } }));
    expect(low.status).toBe('ok');
    expect(low.estimated).toBe(true);
  });

  it('uses the saved shoulder width ratio when placing the missing shoulder', () => {
    const ratio = shoulderWidthRatio({
      nose: { x: 0.5, y: 0.3 },
      leftEye: { x: 0.45, y: 0.28 },
      rightEye: { x: 0.55, y: 0.28 },
      leftShoulder: { x: 0.3, y: 0.7 },
      rightShoulder: { x: 0.7, y: 0.7 },
      faceWidth: 0.2,
      videoWidth: 640,
      videoHeight: 480,
    });
    expect(ratio).toBeCloseTo(2);
    const read = frameStatus(marks({ faceBox: { x: 0.4, y: 0.2, w: 0.25, h: 0.3 }, rightShoulder: undefined }), { shoulderRatio: ratio });
    expect(read.coaching?.rightShoulder?.x).toBeCloseTo(320 + 160);
  });

  it('treats a low shoulder on both sides as missing, and names extra faces', () => {
    expect(frameStatus(marks({ leftShoulder: { x: 220, y: 340, visibility: 0.2 }, rightShoulder: { x: 420, y: 340, visibility: 0.2 } })).status).toBe('no-shoulders');
    expect(frameStatus(marks({ leftShoulder: undefined, rightShoulder: undefined })).status).toBe('no-shoulders');
    expect(frameStatus(marks({ faceCount: 2 })).status).toBe('multiple');
    expect(frameStatus(marks({ faceAmbiguous: true })).status).toBe('multiple');
    expect(frameStatus(marks(), { dark: true }).status).toBe('dark');
  });

  it('picks the shoulder hint from where the face sits, and waits 1.5s', () => {
    const high = marks({ nose: { x: 320, y: 40, visibility: 1 }, leftShoulder: undefined, rightShoulder: undefined });
    const low = marks({ nose: { x: 320, y: 420, visibility: 1 }, leftShoulder: undefined, rightShoulder: undefined });
    expect(framingCopy('no-shoulders', high)?.title).toBe('Show both shoulders');
    expect(framingCopy('no-shoulders', low)?.title).toBe('Show both shoulders');
    expect(framingCopy('no-shoulders', marks({ leftShoulder: undefined, rightShoulder: undefined }))?.title).toBe('Show both shoulders');
    expect(framingCopy('multiple', null)?.title).toBe('Just you in the frame, please');
    expect(framingCopy('dark', null)?.title).toBe('Add some light');
    let step = stepFrame(emptyFrame(), 0, 'no-person');
    expect(step.shown).toBe('ok');
    step = stepFrame(step.memory, 1_499, 'no-person');
    expect(step.shown).toBe('ok');
    step = stepFrame(step.memory, 1_500, 'no-person');
    expect(step.shown).toBe('no-person');
    step = stepFrame(step.memory, 1_600, 'ok');
    expect(step.shown).toBe('ok');
  });
});
