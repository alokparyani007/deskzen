import type { Landmarks } from '../../lib/posture/types';
import type { MaskGrid } from '../../lib/posture/silhouette';
import { outlineFromMask, type OutlineTrace, type SnapshotMask, type SnapshotPixels } from './snapshotOutline';
import type { PoseMode } from './zenConfig';

export interface SnapshotSources {
  /** Multiclass person mask (hair + skin + clothes, plus its others and clothes channels), or null when that model can't load or run. */
  multiclass: () => Promise<SnapshotMask | null>;
  /** The binary selfie mask used before (and still used by Live view). */
  binary: () => Promise<MaskGrid | null>;
}

export interface SnapshotTrace extends OutlineTrace {
  source: 'multiclass' | 'binary' | 'none';
}

/**
 * Step 2 snapshot trace: the multiclass mask first (it leaves the chair out), traced with loose limits;
 * if that model fails or its trace fails, the previous binary-mask pipeline exactly as before.
 */
export async function traceSnapshot(sources: SnapshotSources, frame: Landmarks, mode: PoseMode, image: SnapshotPixels | null): Promise<SnapshotTrace> {
  const multi = await sources.multiclass().catch(() => null);
  if (multi) {
    // A multiclass trace whose top is below the eyes (head lost) comes back with no points: use the binary mask.
    const traced = outlineFromMask(multi, frame, mode, image, { clean: true });
    if (traced.points) return { ...traced, source: 'multiclass' };
  }
  const binary = await sources.binary().catch(() => null);
  if (binary) return { ...outlineFromMask(binary, frame, mode, image), source: 'binary' };
  return { points: null, reason: 'trace-failed', source: 'none' };
}
