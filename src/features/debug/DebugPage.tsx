import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { downloadJson } from '../../lib/download';
import { useSession } from '../session/session-context';

interface Row {
  t: number;
  smoothed: number;
  raw: number;
  quality: number;
  leanDev?: number;
  headDropDev?: number;
  shoulderDev?: number;
  tiltDevDeg?: number;
  distDev?: number;
  screenDistanceIn?: number;
  subScores: Record<string, number | undefined>;
}

export function DebugPage() {
  usePageTitle('Debug');
  const { score, readings, seedDemo, posture, standSignals } = useSession();
  const [recording, setRecording] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [seen, setSeen] = useState<number | null>(null);
  const [seeded, setSeeded] = useState(false);

  if (recording && score && readings && score.timestampMs !== seen) {
    setSeen(score.timestampMs);
    setRows((current) => [
      ...current,
      {
        t: score.timestampMs,
        smoothed: score.smoothed,
        raw: score.raw,
        quality: score.quality,
        leanDev: readings.leanDev,
        headDropDev: readings.headDropDev,
        shoulderDev: readings.shoulderDev,
        tiltDevDeg: readings.tiltDevDeg,
        distDev: readings.distDev,
        screenDistanceIn: readings.screenDistanceIn,
        subScores: score.subScores,
      },
    ]);
  }

  return (
    <section className="space-y-4 px-4 py-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-ink">Debug</h1>
      <p className="max-w-xl text-sm text-ink-muted">Numbers only. This page never saves or downloads video.</p>
      <h2 className="text-lg font-semibold text-ink">Standing confidence</h2>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt>Mode</dt>
        <dd>{posture}</dd>
        <dt>Confidence</dt>
        <dd>{standSignals.confidence.toFixed(2)}</dd>
        <dt>Baseline match</dt>
        <dd>{standSignals.baseline === null ? '—' : standSignals.baseline.toFixed(2)}</dd>
        <dt>Torso</dt>
        <dd>{standSignals.torso.toFixed(2)}</dd>
        <dt>Transition</dt>
        <dd>{standSignals.transition.toFixed(2)}</dd>
        <dt>Hips visible</dt>
        <dd>{standSignals.hipsVisible ? 'Yes' : 'No'}</dd>
        <dt>Torso / shoulders</dt>
        <dd>{standSignals.torsoRatio.toFixed(2)}</dd>
        <dt>Camera moved</dt>
        <dd>{standSignals.cameraMoved ? 'Yes' : 'No'}</dd>
      </dl>
      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt>Smoothed</dt>
        <dd>{score ? Math.round(score.smoothed) : '—'}</dd>
        <dt>Quality</dt>
        <dd>{score ? score.quality.toFixed(2) : '—'}</dd>
        {(['lean', 'headDrop', 'shoulders', 'tilt', 'distance'] as const).map((key) => (
          <span key={key} className="contents">
            <dt>{key}</dt>
            <dd>{score?.subScores[key]?.toFixed(0) ?? '—'}</dd>
          </span>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={() => setRecording((value) => !value)}>
          {recording ? 'Stop recording' : 'Record numbers'}
        </button>
        <button
          type="button"
          className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold"
          onClick={() => downloadJson('deskzen-scores.json', rows)}
        >
          Download JSON
        </button>
        <button
          type="button"
          className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold"
          onClick={() => {
            void seedDemo().then(() => setSeeded(true));
          }}
        >
          Seed 14 days of sample data
        </button>
      </div>
      <p className="text-sm text-ink-muted" role="status">
        {rows.length} rows recorded.{seeded ? ' Sample days saved on this device.' : ''}
      </p>
    </section>
  );
}
