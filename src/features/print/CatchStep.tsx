import { useEffect, useRef, useState } from 'react';
import type { FeatureBundle } from '../../calibration/print';
import { slouchAmount } from '../../calibration/catchMe';
import { liveFromPrint } from '../../calibration/lockedPose';
import type { Point, Silhouette } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { speakCaption } from '../calibrate/glowVoice';
import { SlouchMeter } from './SlouchMeter';
import { SlouchOutlines } from './SlouchOutlines';
import { useSlouchWatch } from './useSlouchWatch';
import { useZenChrome, useZenVoice } from './zenChrome';

export function CatchStep({
  landmarks,
  anchor,
  best,
  bestFrame,
  liveContour,
  onCaught,
  onBack,
}: {
  landmarks: Landmarks | null;
  anchor: FeatureBundle | null;
  best: Silhouette | null;
  bestFrame: Landmarks | null;
  liveContour: Point[] | null;
  onCaught: (frames: Landmarks[], detected: boolean) => void;
  onBack: () => void;
}) {
  const { voice } = useZenVoice();
  const [recover, setRecover] = useState<{ frames: Landmarks[]; detected: boolean } | null>(null);
  const sent = useRef(false);
  const watch = useSlouchWatch(landmarks, anchor, (frames, detected) => {
    if (!detected) {
      if (sent.current) return;
      sent.current = true;
      onCaught(frames, false);
      return;
    }
    setRecover({ frames, detected });
  });
  const upright = landmarks && anchor ? liveFromPrint(slouchAmount(landmarks, anchor)).score : 0;
  const recoverRef = useRef(recover);
  recoverRef.current = recover;
  const onCaughtRef = useRef(onCaught);
  onCaughtRef.current = onCaught;

  useEffect(() => {
    if (!recover || sent.current || upright < 85) return;
    sent.current = true;
    onCaught(recover.frames, recover.detected);
  }, [recover, upright, onCaught]);

  useEffect(() => {
    if (!recover || !voice) return;
    speakCaption('Great, sit back up', false, 1);
  }, [recover, voice]);

  function finishRecover() {
    const saved = recoverRef.current;
    if (!saved || sent.current) return;
    sent.current = true;
    onCaughtRef.current(saved.frames, saved.detected);
  }

  useZenChrome({
    title: recover ? 'Great, sit back up' : 'Slump a bit more',
    helper: recover
      ? 'Come back up to your Zen.'
      : anchor
        ? 'Slump like you do at 3pm. This helps us nudge you at the right moment.'
        : 'Go back and hold your best posture.',
    countdown: null,
    holdFraction: recover ? 0 : watch.holdFraction,
    nextLabel: recover ? 'Next' : "That's my slouch",
    backLabel: 'Back',
    skipLabel: recover || !anchor ? null : 'Skip',
    showCard: true,
    showNav: true,
    locking: false,
    match: recover ? upright : null,
    icon: 'slouch',
    onBack,
    onSkip: anchor && !recover ? watch.skip : onBack,
    onNext: recover ? finishRecover : anchor ? watch.acceptPeak : onBack,
  });

  if (!anchor) return null;

  return (
    <>
      <SlouchOutlines best={best} bestFrame={bestFrame} liveContour={liveContour} liveFrame={landmarks} />
      {recover ? null : (
      <div className="pointer-events-none absolute right-4 top-1/2 z-10 flex w-56 -translate-y-1/2 justify-end">
        <SlouchMeter
          value={watch.meter}
          pulsing={watch.status === 'hold'}
          line={watch.status === 'hold' || watch.status === 'done' ? watch.line : ''}
          countdown={watch.countdown}
          holdFraction={watch.holdFraction}
          showFallback={false}
          onAccept={watch.acceptPeak}
        />
      </div>
      )}
    </>
  );
}
