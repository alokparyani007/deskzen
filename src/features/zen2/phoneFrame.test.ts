import { describe, expect, it } from 'vitest';
import { phoneFrameStyle } from './phoneFrame';

describe('phone camera frame', () => {
  it('adds no inline style on a laptop', () => {
    expect(phoneFrameStyle(false, 1280, 720)).toBeUndefined();
    expect(phoneFrameStyle(false, 0, 0)).toBeUndefined();
  });

  it('uses the camera aspect on a phone so the picture is not cropped sideways', () => {
    expect(phoneFrameStyle(true, 1280, 720)).toEqual({ aspectRatio: '1280 / 720' });
    expect(phoneFrameStyle(true, 0, 0)).toEqual({ aspectRatio: '4 / 3' });
  });
});
