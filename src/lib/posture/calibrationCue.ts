import { postureConfig } from './config';
import type { Alignment, GuideId } from './types';

export interface CalibrationChips {
  position: boolean;
  level: boolean;
  distance: boolean;
}

export function calibrationCue(alignment: Alignment | null, pose: 'sit' | 'stand' = 'sit'): string {
  if (!alignment) return 'Move into the outline';
  const note = alignment.coaching ?? '';
  const inOutline =
    aligned(alignment, 'center') &&
    !note.includes('Sit in the frame') &&
    !note.includes("can't see") &&
    !note.includes('more than one') &&
    !note.includes('Look at the screen');
  if (!inOutline) return 'Move into the outline';

  const inches = alignment.distanceIn;
  const { distanceMinIn, distanceMaxIn } = postureConfig.calibration;
  if (inches !== null && inches < distanceMinIn) return 'Sit back a little';
  if (inches !== null && inches > distanceMaxIn) return 'Come a bit closer';
  if (!aligned(alignment, 'distance')) return 'Move into the outline';
  if (!aligned(alignment, 'eyes') || !aligned(alignment, 'headStack')) return 'Lift your chin';
  if (!aligned(alignment, 'shoulders')) return 'Relax your shoulders';
  return pose === 'stand' ? 'Stand tall, weight on both feet' : 'Perfect, hold still';
}

export function calibrationChips(alignment: Alignment | null): CalibrationChips {
  return {
    position: aligned(alignment, 'center') && aligned(alignment, 'headStack'),
    level: aligned(alignment, 'eyes') && aligned(alignment, 'shoulders'),
    distance: aligned(alignment, 'distance'),
  };
}

function aligned(alignment: Alignment | null, id: GuideId): boolean {
  return alignment?.guides.find((guide) => guide.id === id)?.aligned ?? false;
}
