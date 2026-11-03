import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';
import { frameMessage } from './frameCoach';

function person(patch: Partial<Landmarks> = {}): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 1280,
    videoHeight: 720,
    nose: { x: 640, y: 280, visibility: 1 },
    leftEye: { x: 600, y: 260, visibility: 1 },
    rightEye: { x: 680, y: 260, visibility: 1 },
    leftShoulder: { x: 480, y: 480, visibility: 1 },
    rightShoulder: { x: 800, y: 480, visibility: 1 },
    faceBox: { x: 0.42, y: 0.22, w: 0.16, h: 0.22 },
    ...patch,
  };
}

describe('frame check message', () => {
  it('asks someone out of view to step in', () => {
    expect(frameMessage(null, undefined, 0)).toEqual({
      title: 'Step into view',
      helper: 'Sit where the camera can see your head and shoulders.',
      good: false,
    });
  });

  it('asks for shoulders before it praises the setup', () => {
    const message = frameMessage(person({ leftShoulder: undefined, rightShoulder: undefined }), { face: 0.4, background: 0.4 }, 100);
    expect(message.title).toBe('Show your shoulders');
    expect(message.good).toBe(false);
  });

  it('uses one good line, and only when the score is there', () => {
    const message = frameMessage(person(), { face: 0.4, background: 0.4 }, 92);
    expect(message).toEqual({ title: 'Great setup!', helper: 'Hold still for a second.', good: true });
    expect(frameMessage(person(), { face: 0.4, background: 0.4 }, 40).title).not.toBe('Great setup!');
  });

  it('names a dark room without calling the setup great', () => {
    const message = frameMessage(person(), { face: 0.02, background: 0.02 }, 100);
    expect(message.title).toBe('Add some light');
    expect(message.good).toBe(false);
  });
});
