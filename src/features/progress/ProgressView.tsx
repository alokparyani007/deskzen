import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, CircleCheck, Coffee, Hourglass, type LucideIcon } from 'lucide-react';
import { formatDuration, type DayCounts, type MinuteRecord } from '../../lib/progress/aggregate';
import { buildProgress, hourLabel, type NoteTone, type PeriodId, type ProgressModel, type Tile } from '../../lib/progress/period';
import { postureConfig } from '../../lib/posture/config';
import { PeriodChart } from './PeriodChart';

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

const card = 'rounded-2xl border border-white/10 bg-white/[0.04]';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

export interface ProgressViewProps {
  minutes: readonly MinuteRecord[];
  dayCounts: readonly DayCounts[];
  timeZone: string;
  nowMs: number;
  name: string;
  period: PeriodId;
  onPeriod: (period: PeriodId) => void;
  details: boolean;
  onToggleDetails: () => void;
}

/** Progress "Score story": score ring, one true insight, three tiles, and details tucked away. */
export function ProgressView(props: ProgressViewProps) {
  const { minutes, dayCounts, timeZone, nowMs, name, period } = props;
  const model = useMemo(() => buildProgress({ minutes, counts: dayCounts, timeZone, nowMs, period, name }), [minutes, dayCounts, timeZone, nowMs, period, name]);

  return (
    <section className="min-h-dvh bg-stage px-4 pb-8 pt-6 text-white lg:px-8" aria-labelledby="progress-title">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="progress-title" className="text-3xl font-semibold">
            Your progress
          </h1>
          {model.empty ? null : <PeriodSwitch period={period} onPeriod={props.onPeriod} />}
        </header>
        {model.empty ? <EmptyState /> : <Story model={model} details={props.details} onToggleDetails={props.onToggleDetails} />}
        <footer className="mt-2 space-y-1 text-center text-xs text-white/50">
          <p>DeskZen is a wellness tool, not a medical device.</p>
          <p>All data stays on this device.</p>
        </footer>
      </div>
    </section>
  );
}

function PeriodSwitch({ period, onPeriod }: { period: PeriodId; onPeriod: (period: PeriodId) => void }) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Time period">
      {PERIODS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={period === item.id}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${focus} ${period === item.id ? 'bg-print text-white' : 'text-white/70 hover:text-white'}`}
          onClick={() => onPeriod(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <article className={`${card} flex flex-col items-start gap-4 p-6 sm:p-8`}>
      <h2 className="text-2xl font-semibold">Your progress shows up after your first session</h2>
      <p className="max-w-xl text-sm text-white/70">Start Live view and keep DeskZen open while you work. Your score, sitting time, and breaks fill in here.</p>
      <Link to="/live" className={`rounded-full bg-print px-5 py-2.5 text-sm font-semibold text-white ${focus}`}>
        Start Live view
      </Link>
    </article>
  );
}

function Story({ model, details, onToggleDetails }: { model: ProgressModel; details: boolean; onToggleDetails: () => void }) {
  const { names } = model;
  return (
    <>
      <article className={`${card} flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-center sm:p-6`} aria-live="polite">
        <ScoreRing score={model.score} label={names.scoreLabel} />
        <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <h2 className="text-2xl font-semibold sm:text-3xl">{model.headline.title}</h2>
          {model.headline.note ? <p className="text-sm text-white/65">{model.headline.note}</p> : null}
          {model.insight ? <p className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand">{model.insight}</p> : null}
          {model.previousScore !== null ? (
            <p className="text-sm text-white/60">
              {capitalize(names.previous)}: {model.previousScore}
            </p>
          ) : null}
          {model.score === null ? (
            <Link to="/live" className={`rounded-full bg-print px-4 py-2 text-sm font-semibold text-white ${focus}`}>
              Start Live view
            </Link>
          ) : null}
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <TileCard icon={CircleCheck} tile={model.tiles.sitting} />
        <TileCard icon={Coffee} tile={model.tiles.breaks} />
        <TileCard icon={Hourglass} tile={model.tiles.slouch} />
      </div>

      <article className={card}>
        <button
          type="button"
          className={`flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left ${focus}`}
          aria-expanded={details}
          aria-controls="progress-details"
          onClick={onToggleDetails}
        >
          <span className="font-semibold">Details</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-outline">
            {details ? 'Hide details' : 'See details'}
            <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${details ? 'rotate-180' : ''}`} aria-hidden="true" />
          </span>
        </button>
        {details ? <Details model={model} /> : null}
      </article>
    </>
  );
}

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const radius = 64;
  const length = 2 * Math.PI * radius;
  const share = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative grid size-40 shrink-0 place-items-center" role="img" aria-label={score === null ? `${label}: nothing tracked yet` : `${label}: ${score} out of 100`}>
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="12" />
        {score === null ? null : (
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--color-brand-light)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - share)}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700"
          />
        )}
      </svg>
      <div className="text-center" aria-hidden="true">
        <p className="text-5xl font-semibold leading-none">{score ?? '\u2014'}</p>
        <p className="mt-2 text-xs text-white/60">{label}</p>
      </div>
    </div>
  );
}

function TileCard({ icon: Icon, tile }: { icon: LucideIcon; tile: Tile }) {
  return (
    <article className={`${card} flex gap-3 p-4`}>
      <Icon className="mt-0.5 size-6 shrink-0 text-outline" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-sm text-white/75">{tile.label}</h3>
        <p className="mt-1 text-2xl font-semibold">{tile.value ?? '\u2014'}</p>
        <p className={`mt-1 text-xs ${toneClass(tile.note.tone)}`}>{tile.note.text}</p>
      </div>
    </article>
  );
}

function Details({ model }: { model: ProgressModel }) {
  const { names } = model;
  const sitStandTotal = model.sitStand.sit + model.sitStand.stand;
  return (
    <div id="progress-details" className="space-y-4 border-t border-white/10 px-5 pb-5 pt-4">
      <section aria-labelledby="chart-title">
        <h3 id="chart-title" className="text-sm font-semibold text-white/85">
          {names.compare}
        </h3>
        <PeriodChart points={model.points} currentName={capitalize(names.current)} previousName={capitalize(names.previous)} />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className={`${card} p-4`} aria-labelledby="split-title">
          <h3 id="split-title" className="text-sm font-semibold text-white/85">
            How you spent your time
          </h3>
          {model.split ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="bg-print" style={{ width: `${model.split.great}%` }} />
                <span className="bg-sky-brand" style={{ width: `${model.split.drift}%` }} />
                <span className="bg-glow" style={{ width: `${model.split.slouch}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
                <Legend dot="bg-print" text={`Great ${model.split.great}%`} />
                <Legend dot="bg-sky-brand" text={`Drifting ${model.split.drift}%`} />
                <Legend dot="bg-glow" text={`Slouching ${model.split.slouch}%`} />
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/60">Nothing tracked yet {names.current}.</p>
          )}
        </section>

        <section className={`${card} p-4`} aria-labelledby="hours-title">
          <h3 id="hours-title" className="text-sm font-semibold text-white/85">
            Your hours
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-white/60">Best hour</dt>
              <dd className="mt-1 text-lg font-semibold">{model.bestHour ? hourLabel(model.bestHour.hour) : '\u2014'}</dd>
              {model.bestHour ? <dd className="text-xs text-white/55">Average score {model.bestHour.average}</dd> : null}
            </div>
            <div>
              <dt className="text-white/60">Most slouching</dt>
              <dd className="mt-1 inline-flex items-center gap-2 text-lg font-semibold">
                {model.slouchHour === null ? 'None' : (
                  <>
                    <span className="size-2 rounded-full bg-glow" aria-hidden="true" />
                    {hourLabel(model.slouchHour)}
                  </>
                )}
              </dd>
              {model.slouchHour === null ? null : <dd className="text-xs text-white/55">A short move around then helps.</dd>}
            </div>
          </dl>
        </section>

        <section className={`${card} p-4`} aria-labelledby="sitstand-title">
          <h3 id="sitstand-title" className="text-sm font-semibold text-white/85">
            Sitting and standing
          </h3>
          {sitStandTotal > 0 ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="bg-print" style={{ width: `${(model.sitStand.sit / sitStandTotal) * 100}%` }} />
                <span className="bg-white/35" style={{ width: `${(model.sitStand.stand / sitStandTotal) * 100}%` }} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/75">
                <Legend dot="bg-print" text={`Sitting ${formatDuration(model.sitStand.sit)}`} />
                <Legend dot="bg-white/35" text={`Standing ${formatDuration(model.sitStand.stand)}`} />
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/60">Nothing tracked yet {names.current}.</p>
          )}
        </section>

        <section className={`${card} p-4`} aria-labelledby="streak-title">
          <h3 id="streak-title" className="text-sm font-semibold text-white/85">
            Streak
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-white/60">Current</dt>
              <dd className="mt-1 text-lg font-semibold">{dayCount(model.streak.current)}</dd>
            </div>
            <div>
              <dt className="text-white/60">Best</dt>
              <dd className="mt-1 text-lg font-semibold">{dayCount(model.streak.best)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-white/55">
            A good day has {postureConfig.streak.minTrackedMinutes}+ tracked minutes and an average score of {postureConfig.streak.minAverage} or more.
          </p>
        </section>
      </div>

      <section className={`${card} p-4`} aria-labelledby="habits-title">
        <h3 id="habits-title" className="text-sm font-semibold text-white/85">
          Daily habits
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {model.habits.map((habit) => (
            <li key={habit.label}>
              <p className="text-xs text-white/60">{habit.label}</p>
              <p className="mt-0.5 font-semibold">{habit.value ?? '\u2014'}</p>
              <p className={`text-xs ${toneClass(habit.note.tone)}`}>{habit.note.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Legend({ dot, text }: { dot: string; text: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {text}
    </li>
  );
}

function toneClass(tone: NoteTone): string {
  if (tone === 'good') return 'text-outline';
  return 'text-white/55';
}

function dayCount(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
