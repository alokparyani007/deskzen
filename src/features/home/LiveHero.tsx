import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PosturePrint } from '../../calibration/print';
import { printIsStale } from '../../lib/home/liveHome';
import { CameraStage } from '../camera/CameraStage';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';
import { mirroredFit, posturePrintPoints, shoulderCenteredFit } from '../print/outlineFit';
import { OutlineSvg, useStageBox } from '../zen2/OutlineSvg';
import { loadZenPrint } from '../zen2/zenPrint';
import type { PoseMode } from '../zen2/zenConfig';
import { PostureGuideCard } from './PostureGuideCard';
import { useHomeMatch } from './useHomeMatch';

export function LiveHero({ nowMs }: { nowMs: number }) {
  const camera = useCamera();
  const { landmarks, posture, chosenPosture, choosePosture, followPosture, postureManual } = useSession();
  const { activeProfileId } = useBaseline();
  const shown = postureManual ? chosenPosture : posture;
  const mode: PoseMode = shown === 'standing' ? 'stand' : 'sit';
  const [print, setPrint] = useState<PosturePrint | null | undefined>(undefined);
  const stage = useStageBox();
  const live = camera.status === 'live';
  const { match, drifting } = useHomeMatch(print ?? null, landmarks, live, mode);

  useEffect(() => {
    let active = true;
    setPrint(undefined);
    void loadZenPrint(mode, activeProfileId, !postureManual).then((found) => {
      if (active) setPrint(found);
    });
    return () => {
      active = false;
    };
  }, [activeProfileId, mode, postureManual]);

  if (print === undefined) return <div className="min-h-72 rounded-2xl bg-white/5 motion-safe:animate-pulse" aria-hidden="true" />;
  if (!print) {
    return (
      <article className="flex h-full min-h-0 flex-col">
        <div className="relative flex min-h-72 flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-black p-6 text-center lg:min-h-[520px]">
          <svg viewBox="0 0 100 120" className="h-36 text-outline/25" aria-hidden="true">
            <path d="M50 18c8 0 14 7 14 16 0 6-3 11-7 14 12 3 24 9 28 16 4 6 5 14 5 24v22H10V88c0-10 1-18 5-24 4-7 16-13 28-16-4-3-7-8-7-14 0-9 6-16 14-16Z" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          <div>
            <h2 className="text-xl font-semibold text-white">Set my Zen to save your Posture Print</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">About 20 seconds. Sit the way you want DeskZen to remember. Your video never leaves this computer.</p>
          </div>
          <Link to={`/set-my-zen?pose=${mode}&from=home`} className="rounded-full bg-print px-5 py-2.5 text-sm font-semibold text-white">
            Set my Zen
          </Link>
        </div>
        <HeroActions mode={mode} postureManual={postureManual} chosenPosture={chosenPosture} onSit={() => choosePosture('sitting')} onStand={() => choosePosture('standing')} onAuto={followPosture} />
      </article>
    );
  }

  const zen = print.zen;
  const videoW = landmarks?.videoWidth || camera.resolution?.width || print.camera?.width || 1280;
  const videoH = landmarks?.videoHeight || camera.resolution?.height || print.camera?.height || 720;

  return (
    <article className="flex h-full min-h-0 flex-col">
      <div ref={stage.ref} className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl bg-black lg:aspect-auto lg:min-h-[520px] lg:flex-1">
        {live ? (
          <>
            <CameraStage landmarks={landmarks} alignment={null} baseline={null} showGhost={false} showLandmarks={false} frame="fill" chrome="bare" />
            {zen ? (
              <OutlineSvg saved={zen.outline} amber={drifting} videoWidth={videoW} videoHeight={videoH} viewWidth={stage.width} viewHeight={stage.height} />
            ) : null}
            {match !== null ? <MatchPill match={match} /> : null}
          </>
        ) : (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
            <PrintStill print={print} />
            <button type="button" className="rounded-full bg-print px-4 py-2.5 text-sm font-semibold text-white" onClick={() => void camera.start()}>
              Turn on camera
            </button>
          </div>
        )}
      </div>
      <HeroActions mode={mode} postureManual={postureManual} chosenPosture={chosenPosture} onSit={() => choosePosture('sitting')} onStand={() => choosePosture('standing')} onAuto={followPosture} />
      {zen ? null : <p className="mt-2 text-sm text-white/75">Set your Zen again. DeskZen has a new, more accurate outline.</p>}
      {printIsStale(print.createdAt, nowMs) ? <p className="mt-2 text-sm text-white/70">Moved your desk or chair? Set your Zen again.</p> : null}
    </article>
  );
}

function MatchPill({ match }: { match: number }) {
  const dot = match >= 80 ? 'bg-print' : match >= 60 ? 'bg-glow' : 'bg-alert';
  return (
    <p className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md" aria-live="polite">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {match}% match
    </p>
  );
}

function PrintStill({ print }: { print: PosturePrint }) {
  const points = posturePrintPoints(print.silhouette, []);
  const anchors = print.silhouette?.anchors;
  const fit = points && anchors && anchors.shoulderWidth > 0
    ? shoulderCenteredFit(points, { x: anchors.shoulderX, y: anchors.shoulderY, width: anchors.shoulderWidth })
    : points
      ? mirroredFit(points)
      : null;
  if (!fit) {
    return (
      <svg viewBox="0 0 100 120" className="h-40 text-outline" aria-hidden="true">
        <path d="M50 18c8 0 14 7 14 16 0 6-3 11-7 14 12 3 24 9 28 16 4 6 5 14 5 24v22H10V88c0-10 1-18 5-24 4-7 16-13 28-16-4-3-7-8-7-14 0-9 6-16 14-16Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox={fit.viewBox} className="h-40" role="img" aria-label="Your Posture Print">
      <path d={fit.d} fill="var(--color-outline)" />
    </svg>
  );
}

function HeroActions({
  mode,
  postureManual,
  chosenPosture,
  onSit,
  onStand,
  onAuto,
}: {
  mode: PoseMode;
  postureManual: boolean;
  chosenPosture: 'sitting' | 'standing';
  onSit: () => void;
  onStand: () => void;
  onAuto: () => void;
}) {
  const pose = mode === 'stand' ? 'standing' : 'sitting';
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link to="/live" className="rounded-full bg-print px-4 py-2.5 text-sm font-semibold text-white">
        Start Live view
      </Link>
      <Link to={`/set-my-zen?pose=${mode}&from=home`} className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white">
        Set my Zen
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-full bg-white/10 p-1" role="group" aria-label="Sitting or standing">
          <ModeButton pressed={postureManual && chosenPosture === 'sitting'} onClick={onSit}>Sitting</ModeButton>
          <ModeButton pressed={postureManual && chosenPosture === 'standing'} onClick={onStand}>Standing</ModeButton>
          <ModeButton pressed={!postureManual} onClick={onAuto}>Auto</ModeButton>
        </div>
        <PostureGuideCard variant="link" posture={pose} />
      </div>
    </div>
  );
}

function ModeButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={pressed} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${pressed ? 'bg-print text-white' : 'text-white/75'}`} onClick={onClick}>
      {children}
    </button>
  );
}
