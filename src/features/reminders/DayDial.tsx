import { Moon } from 'lucide-react';
import { arcPath, clusterMarks, pointAt } from '../../lib/reminders/dial';
import { clockMinutes, inLabel, workWindow } from '../../lib/reminders/plan';
import { formatMinute, type RhythmDot } from '../../lib/wellness/rhythm';
import { kindLook } from './kinds';

const SIZE = 360;
const C = SIZE / 2;
const R = 128;
const STROKE = 14;

export interface DayDialProps {
  /** Wall clock (epoch ms). Ticks every second for the countdown. */
  clockMs: number;
  dots: readonly RhythmDot[];
  workStart: string;
  workEnd: string;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
  snoozedUntilMs: number | null;
}

/** A live 24-hour dial: 12 AM at the bottom, 12 PM at the top, time running clockwise. */
export function DayDial(props: DayDialProps) {
  const clock = new Date(props.clockMs);
  const nowSec = clock.getHours() * 3600 + clock.getMinutes() * 60 + clock.getSeconds();
  const nowMin = nowSec / 60;
  const { start, end } = workWindow(props);
  const quietFrom = clockMinutes(props.quietStart, 21 * 60);
  const quietTo = clockMinutes(props.quietEnd, 7 * 60);
  const quietSpan = (quietTo - quietFrom + 1440) % 1440;
  const next = props.dots[0] ?? null;
  const marks = clusterMarks(props.dots.slice(1), nowMin);
  const passedEnd = Math.min(nowMin, end);
  const center = centerCopy(next, nowSec, props.snoozedUntilMs, props.clockMs);
  const nextPoint = next ? pointAt(next.minute, R, C, C) : null;
  const NextIcon = next ? kindLook[next.kind].icon : null;
  const nowPoint = pointAt(nowMin, R, C, C);
  const nowLabel = pointAt(nowMin, R - 26, C, C);
  const workLabel = pointAt((start + end) / 2, R - 50, C, C);
  const quietLabel = pointAt(quietFrom + quietSpan / 2, R - 42, C, C);
  const description = [
    `Work hours ${formatMinute(start)} to ${formatMinute(end % 1440)}.`,
    props.quietHours ? `Quiet hours ${formatMinute(quietFrom)} to ${formatMinute(quietTo)}.` : 'Quiet hours are off.',
    next ? `Next: ${next.label} at ${formatMinute(next.minute)}.` : 'No more reminders today.',
    props.dots.length > 1 ? `${props.dots.length - 1} more after that.` : '',
  ].join(' ');

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible" role="img" aria-labelledby="day-dial-title day-dial-desc">
        <title id="day-dial-title">Today&apos;s reminder dial</title>
        <desc id="day-dial-desc">{description}</desc>
        <defs>
          <linearGradient id="dial-passed" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#047857" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <radialGradient id="dial-halo">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <filter id="dial-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={C} cy={C} r={R} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={STROKE} />
        {props.quietHours && quietSpan > 0 ? (
          <path d={arcPath(quietFrom, quietTo, R, C, C)} fill="none" stroke="rgb(148 163 184 / 0.3)" strokeWidth={STROKE + 6} />
        ) : null}
        <path d={arcPath(start, end, R, C, C)} fill="none" stroke="rgb(5 150 105 / 0.38)" strokeWidth={STROKE} strokeLinecap="round" />
        {passedEnd > start ? (
          <path d={arcPath(start, passedEnd, R, C, C)} fill="none" stroke="url(#dial-passed)" strokeWidth={STROKE} strokeLinecap="round" filter="url(#dial-glow)" />
        ) : null}

        {Array.from({ length: 24 }, (_, hour) => {
          const major = hour % 6 === 0;
          const a = pointAt(hour * 60, R - STROKE / 2 - 5, C, C);
          const b = pointAt(hour * 60, R - STROKE / 2 - (major ? 14 : 9), C, C);
          return <line key={hour} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={major ? 'rgb(255 255 255 / 0.45)' : 'rgb(255 255 255 / 0.18)'} strokeWidth={major ? 2 : 1} strokeLinecap="round" />;
        })}
        {[
          [0, '12 AM', 26],
          [360, '6 AM', 34],
          [720, '12 PM', 26],
          [1080, '6 PM', 34],
        ].map(([minute, text, gap]) => {
          const p = pointAt(minute as number, R + (gap as number), C, C);
          return (
            <text key={text} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="500" fill="rgb(255 255 255 / 0.7)">
              {text}
            </text>
          );
        })}

        {props.quietHours && quietSpan > 0 ? (
          <g aria-hidden="true">
            <Moon x={quietLabel.x - 44} y={quietLabel.y - 7} width={14} height={14} color="rgb(203 213 225 / 0.75)" />
            <text x={quietLabel.x + 8} y={quietLabel.y} textAnchor="middle" dominantBaseline="middle" fontSize="11.5" fill="rgb(203 213 225 / 0.75)">
              Quiet hours
            </text>
          </g>
        ) : null}
        <text x={workLabel.x} y={workLabel.y} textAnchor="middle" dominantBaseline="middle" fontSize="11.5" fill="rgb(110 231 183 / 0.85)" aria-hidden="true">
          Workday {formatMinute(start).replace(':00', '')} to {formatMinute(end % 1440).replace(':00', '')}
        </text>

        {marks.map((mark) => {
          const p = pointAt(mark.minute, R, C, C);
          const color = kindLook[mark.kinds[0] ?? 'move'].dot;
          return (
            <g key={`${mark.minute}-${mark.kinds.join('')}`}>
              <title>{mark.label}</title>
              {mark.count > 1 ? (
                <circle cx={p.x} cy={p.y} r={mark.solo ? 5 : 4.5} fill={color} fillOpacity={mark.solo ? 1 : 0.55} stroke="rgb(255 255 255 / 0.6)" strokeWidth={1.2} />
              ) : (
                <circle cx={p.x} cy={p.y} r={mark.solo ? 4.5 : 3} fill={color} fillOpacity={mark.solo ? 1 : 0.5} />
              )}
            </g>
          );
        })}

        <circle cx={nowPoint.x} cy={nowPoint.y} r={6} fill="#ffffff" stroke="#0b1f17" strokeWidth={2} />
        <text x={nowLabel.x} y={nowLabel.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#ffffff" aria-hidden="true">
          Now
        </text>

        {next && nextPoint && NextIcon ? (
          <g>
            <title>{`${next.label} at ${formatMinute(next.minute)}`}</title>
            <circle cx={nextPoint.x} cy={nextPoint.y} r={30} fill="url(#dial-halo)" className="animate-pulse motion-reduce:animate-none" />
            <circle cx={nextPoint.x} cy={nextPoint.y} r={18} fill="#059669" stroke="#a7f3d0" strokeWidth={2.5} filter="url(#dial-glow)" />
            <NextIcon x={nextPoint.x - 9} y={nextPoint.y - 9} width={18} height={18} color="#ffffff" strokeWidth={2.25} aria-hidden="true" />
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="flex max-w-[11rem] flex-col items-center text-center" aria-live="polite">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">{center.eyebrow}</span>
          <span className="mt-1 text-2xl font-semibold leading-tight text-white sm:text-3xl">{center.title}</span>
          <span className="mt-1 text-base font-semibold tabular-nums text-outline">{center.detail}</span>
        </div>
      </div>
    </div>
  );
}

/** Center text: "NEXT UP / Move break / in 18 min", with seconds in the last 10 minutes. */
export function centerCopy(next: RhythmDot | null, nowSec: number, snoozedUntilMs: number | null, clockMs: number): { eyebrow: string; title: string; detail: string } {
  if (snoozedUntilMs !== null && snoozedUntilMs > clockMs) {
    const until = new Date(snoozedUntilMs);
    return { eyebrow: 'Snoozed', title: 'All reminders', detail: `until ${formatMinute(until.getHours() * 60 + until.getMinutes())}` };
  }
  if (!next) return { eyebrow: 'Next up', title: 'All clear', detail: 'Nothing else today' };
  const left = Math.max(0, Math.round(next.minute * 60 - nowSec));
  if (left === 0) return { eyebrow: 'Next up', title: next.label, detail: 'now' };
  if (left < 600) return { eyebrow: 'Next up', title: next.label, detail: `in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` };
  return { eyebrow: 'Next up', title: next.label, detail: `in ${inLabel(left / 60)}` };
}
