import type { NormPoint } from '../../lib/posture/types';
import { OutlineSvg, useStageBox } from './OutlineSvg';
import type { PoseMode } from './zenConfig';

/**
 * Step 4 (mockup M2): the saved outline alone on a black stage, no picture.
 * Same stage box and the same OutlineSvg mapping (object-cover + mirror) as the Step 2 picture,
 * so the Posture Print shows at its true proportions, exactly where it was traced.
 */
export function DoneStep({ outline, mode, video }: { outline: readonly NormPoint[]; mode: PoseMode; video: { width: number; height: number } }) {
  const stage = useStageBox();
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-[2%] px-[2%]">
      <div ref={stage.ref} className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-black">
        <OutlineSvg saved={outline} fill videoWidth={video.width} videoHeight={video.height} viewWidth={stage.width} viewHeight={stage.height} />
        <p className="absolute inset-x-0 bottom-6 text-center text-lg font-medium text-white">Your Posture Print · {mode === 'stand' ? 'Standing' : 'Sitting'}</p>
      </div>
    </div>
  );
}
