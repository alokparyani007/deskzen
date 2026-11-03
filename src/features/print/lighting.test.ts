import { describe, expect, it } from 'vitest';
import { lightingLabel } from './lighting';

describe('lighting label', () => {
  it('calls a bright even frame great', () => {
    expect(lightingLabel(0.55, 0.5, 0.52).text).toBe('Lighting: great');
  });

  it('asks for more light when the frame is dark', () => {
    expect(lightingLabel(0.2, 0.18, 0.22).text).toBe('A bit dark - face a window or turn on a light');
  });

  it('names a bright background behind a darker face', () => {
    expect(lightingLabel(0.5, 0.3, 0.62).text).toBe('Backlit - try turning so the light is in front of you');
  });
});
