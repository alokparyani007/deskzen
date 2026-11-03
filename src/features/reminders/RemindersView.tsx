import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Check, Clock, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { reminderOptions, reminderTiming } from '../../lib/reminders/config';
import { reminderName } from '../../lib/reminders/plan';
import type { AppSettings, IntervalPreset } from '../../lib/settings/defaults';
import { featuresFor } from '../../lib/settings/visibility';
import { formatMinute, type ReminderKind, type RhythmDot } from '../../lib/wellness/rhythm';
import { DayDial } from './DayDial';
import { kindLook } from './kinds';

const card = 'rounded-2xl border border-white/10 bg-white/[0.04]';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';
const DAYS: Array<[number, string]> = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
];

type Editor = 'posture' | 'move' | 'water' | 'eye' | 'spot' | 'schedule' | 'sitstand';

export interface RemindersViewProps {
  /** Wall clock, ticking every second. */
  clockMs: number;
  dots: readonly RhythmDot[];
  settings: AppSettings;
  snoozedUntilMs: number | null;
  focusEndsAt: number | null;
  message: string | null;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onDone: (dot: RhythmDot) => void;
  onSnooze: (dot: RhythmDot) => void;
  onSnoozeAll: () => void;
  onResume: () => void;
  onStartFocus: (minutes: number) => void;
  onToggleVoice: () => void;
  /** Opens one editor on first render (for tests and deep links). */
  initialEditor?: Editor | null;
}

/** Reminders "Day rhythm": a live 24-hour dial, today's list, and tap-to-edit cards. */
export function RemindersView(props: RemindersViewProps) {
  const { settings, dots } = props;
  const [editor, setEditor] = useState<Editor | null>(props.initialEditor ?? null);
  const editorId = useId();
  const next = dots[0] ?? null;
  const snoozed = props.snoozedUntilMs !== null;
  const features = featuresFor(settings.workStyle);
  const toggle = (id: Editor) => setEditor((current) => (current === id ? null : id));

  const types: Array<{ id: Editor; kind: ReminderKind; title: string; detail: string; on: boolean; patch: (on: boolean) => Partial<AppSettings> }> = [
    { id: 'posture', kind: 'posture', title: 'Posture nudges', detail: `When you drift for ${settings.nudgeDelaySeconds} sec`, on: settings.tracking, patch: (on) => ({ tracking: on }) },
    {
      id: 'move',
      kind: 'move',
      title: settings.workStyle === 'stand' ? 'Shift breaks' : 'Move breaks',
      detail: `Every ${settings.workStyle === 'stand' ? settings.standBreakMinutes : settings.breakMinutes} min`,
      on: settings.moveBreaks,
      patch: (on) => ({ moveBreaks: on }),
    },
    { id: 'water', kind: 'water', title: 'Water', detail: `Every ${settings.waterMinutes} min`, on: settings.water, patch: (on) => ({ water: on }) },
    { id: 'eye', kind: 'eye', title: 'Eye breaks', detail: `Every ${settings.eyeRestMinutes} min`, on: settings.eyeRest, patch: (on) => ({ eyeRest: on }) },
  ];
  if (settings.cameraMode === 'spot') {
    types.push({ id: 'spot', kind: 'spot', title: 'Spot check', detail: `Every ${settings.spotEveryMin} min`, on: settings.spotChecks, patch: (on) => ({ spotChecks: on }) });
  }
  const openType = types.find((type) => type.id === editor);

  return (
    <section className="min-h-dvh bg-stage px-4 pb-8 pt-6 text-white lg:px-8" aria-labelledby="reminders-title">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 id="reminders-title" className="text-3xl font-semibold">
              Reminders
            </h1>
            <p className="mt-1 text-sm text-white/65">Gentle nudges that fit your day.</p>
          </div>
          {snoozed ? (
            <button type="button" className={`rounded-full border border-outline/50 bg-print/15 px-4 py-2 text-sm font-semibold text-white ${focus}`} onClick={props.onResume}>
              Snoozed until {clockLabel(props.snoozedUntilMs!)} {'\u00b7'} Resume
            </button>
          ) : (
            <button type="button" className={`rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08] ${focus}`} onClick={props.onSnoozeAll}>
              Snooze all {reminderTiming.snoozeAllMin} min
            </button>
          )}
        </header>

        <article className={`${card} grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_1fr] lg:gap-0 lg:p-0`}>
          <div className="lg:p-8">
            <DayDial
              clockMs={props.clockMs}
              dots={dots}
              workStart={settings.workStart}
              workEnd={settings.workEnd}
              quietHours={settings.quietHours}
              quietStart={settings.quietStart}
              quietEnd={settings.quietEnd}
              snoozedUntilMs={props.snoozedUntilMs}
            />
          </div>
          <div className="flex flex-col gap-4 border-white/10 lg:border-l lg:p-8">
            <h2 className="text-lg font-semibold">Today</h2>
            {dots.length === 0 ? (
              <p className="text-sm text-white/65">You&apos;re all set for today. Reminders pick up again at {clockLabelFromMinute(settings.workStart)}.</p>
            ) : (
              <ol className="divide-y divide-white/10" aria-label="Upcoming reminders">
                {dots.slice(0, 5).map((dot, index) => {
                  const Icon = kindLook[dot.kind].icon;
                  return (
                    <li key={`${dot.kind}-${dot.minute}`} className={`flex items-center gap-3 py-2.5 ${index === 0 ? 'text-white' : 'text-white/80'}`}>
                      <span className="w-20 shrink-0 text-sm tabular-nums text-white/70">{formatMinute(dot.minute)}</span>
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${kindLook[dot.kind].chip}`}>
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <span className={`min-w-0 truncate text-sm ${index === 0 ? 'font-semibold' : ''}`}>{dot.label}</span>
                      {index === 0 ? <span className="ml-auto shrink-0 text-xs font-semibold text-outline">Next</span> : null}
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!next}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-print px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40 ${focus}`}
                onClick={() => next && props.onDone(next)}
              >
                <Check className="size-4" aria-hidden="true" />
                Done
              </button>
              <button
                type="button"
                disabled={!next}
                className={`rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.06] disabled:opacity-40 ${focus}`}
                onClick={() => next && props.onSnooze(next)}
              >
                Snooze {reminderTiming.snoozeOneMin} min
              </button>
            </div>
            <p className="min-h-5 text-sm text-outline" role="status" aria-live="polite">
              {props.message ?? ''}
            </p>
            <div className="mt-auto flex items-center gap-2 text-sm text-white/65">
              <span>One tip at a time. Voice tips are {settings.sound ? 'on' : 'off'}.</span>
              <button
                type="button"
                aria-pressed={settings.sound}
                aria-label="Voice tips"
                className={`grid size-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white ${focus}`}
                onClick={props.onToggleVoice}
              >
                {settings.sound ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </article>

        <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${types.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
          {types.map((type) => (
            <TypeCard
              key={type.id}
              kind={type.kind}
              title={type.title}
              detail={type.detail}
              on={type.on}
              open={editor === type.id}
              editorId={editorId}
              onOpen={() => toggle(type.id)}
              onToggle={() => props.onUpdate(type.patch(!type.on))}
            />
          ))}
        </div>

        {editor && openType ? (
          <section id={editorId} className={`${card} p-5 sm:p-6`} aria-label={`${editorTitle(editor, openType?.title)} settings`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editorTitle(editor, openType?.title)}</h2>
              <button type="button" aria-label="Close editor" className={`grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white ${focus}`} onClick={() => setEditor(null)}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <EditorBody editor={editor} settings={settings} onUpdate={props.onUpdate} features={features} />
          </section>
        ) : null}

        <div className={`grid gap-3 ${settings.workStyle === 'sit' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <SettingCard
            icon={Clock}
            title="Schedule"
            detail={`Work ${clockLabelFromMinute(settings.workStart)} to ${clockLabelFromMinute(settings.workEnd)} \u00b7 ${settings.quietHours ? `Quiet ${clockLabelFromMinute(settings.quietStart)} to ${clockLabelFromMinute(settings.quietEnd)}` : 'Quiet hours off'}`}
            open={editor === 'schedule'}
            editorId={editorId}
            onOpen={() => toggle('schedule')}
          />
          {settings.workStyle !== 'sit' ? (
            <SettingCard
              icon={ArrowUpDown}
              title="Sit and stand"
              detail={sitStandSummary(settings)}
              open={editor === 'sitstand'}
              editorId={editorId}
              onOpen={() => toggle('sitstand')}
            />
          ) : null}
          <article className={`${card} flex flex-col gap-3 p-4`}>
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-print/25 text-outline">
                <Timer className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Focus mode</h2>
                <p className="text-xs text-white/60">
                  {props.focusEndsAt !== null && props.focusEndsAt > props.clockMs ? `On until ${clockLabel(props.focusEndsAt)}` : 'Fewer interruptions while you focus'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Start focus mode">
              {reminderOptions.focus.map((minutes) => (
                <button key={minutes} type="button" className={`rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.08] ${focus}`} onClick={() => props.onStartFocus(minutes)}>
                  {minutes} min
                </button>
              ))}
            </div>
          </article>
        </div>

        {editor && !openType ? (
          <section id={editorId} className={`${card} p-5 sm:p-6`} aria-label={`${editorTitle(editor)} settings`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{editorTitle(editor)}</h2>
              <button type="button" aria-label="Close editor" className={`grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white ${focus}`} onClick={() => setEditor(null)}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <EditorBody editor={editor} settings={settings} onUpdate={props.onUpdate} features={features} />
          </section>
        ) : null}

        <footer className="mt-2 flex flex-col items-center gap-2 text-center text-xs text-white/50">
          <div className="flex gap-4 text-sm">
            <Link className={`rounded font-semibold text-outline hover:text-white ${focus}`} to="/stretches">
              Stretch library
            </Link>
            <Link className={`rounded font-semibold text-outline hover:text-white ${focus}`} to="/neck">
              Neck check-in
            </Link>
          </div>
          <p>DeskZen is a wellness tool, not a medical device.</p>
        </footer>
      </div>
    </section>
  );
}

function TypeCard(props: { kind: ReminderKind; title: string; detail: string; on: boolean; open: boolean; editorId: string; onOpen: () => void; onToggle: () => void }) {
  const Icon = kindLook[props.kind].icon;
  return (
    <article className={`${card} flex flex-col gap-3 p-4 transition-colors ${props.open ? 'border-outline/60 bg-print/10' : 'hover:bg-white/[0.06]'} ${props.on ? '' : 'opacity-80'}`}>
      <button type="button" aria-expanded={props.open} aria-controls={props.editorId} className={`flex items-start gap-3 rounded-xl text-left ${focus}`} onClick={props.onOpen}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${kindLook[props.kind].chip}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold">{props.title}</span>
          <span className="block text-xs text-white/60">{props.on ? props.detail : 'Off'}</span>
        </span>
      </button>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs font-semibold text-white/50">{props.open ? 'Editing' : 'Tap to edit'}</span>
        <Switch checked={props.on} label={props.title} onChange={props.onToggle} />
      </div>
    </article>
  );
}

function SettingCard(props: { icon: typeof Clock; title: string; detail: string; open: boolean; editorId: string; onOpen: () => void }) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      aria-expanded={props.open}
      aria-controls={props.editorId}
      className={`${card} flex items-center gap-3 p-4 text-left transition-colors ${props.open ? 'border-outline/60 bg-print/10' : 'hover:bg-white/[0.06]'} ${focus}`}
      onClick={props.onOpen}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-print/25 text-outline">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{props.title}</span>
        <span className="block text-xs text-white/60">{props.detail}</span>
      </span>
    </button>
  );
}

export function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-print' : 'bg-white/20'} ${focus}`}
      onClick={onChange}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] motion-reduce:transition-none ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  );
}

function Chips<T extends string | number>({ label, options, value, format, onChange }: { label: string; options: readonly T[]; value: NoInfer<T>; format?: (value: T) => string; onChange: (value: T) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-white/80">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={option === value}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${focus} ${option === value ? 'bg-print text-white' : 'border border-white/10 bg-white/[0.04] text-white/80 hover:text-white'}`}
            onClick={() => onChange(option)}
          >
            {format ? format(option) : String(option)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-white/55">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-white/80">
      {label}
      <input
        type="time"
        value={value}
        className={`rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-white [color-scheme:dark] ${focus}`}
        onChange={(event) => event.target.value && onChange(event.target.value)}
      />
    </label>
  );
}

const minutes = (value: number) => `${value} min`;

function EditorBody({ editor, settings, onUpdate, features }: { editor: Editor; settings: AppSettings; onUpdate: (patch: Partial<AppSettings>) => void; features: ReturnType<typeof featuresFor> }) {
  if (editor === 'posture') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Chips label="Nudge me after drifting for" options={reminderOptions.nudgeDelay} value={settings.nudgeDelaySeconds} format={(value) => `${value} sec`} onChange={(value) => onUpdate({ nudgeDelaySeconds: value as AppSettings['nudgeDelaySeconds'] })} />
        <p className="text-sm text-white/60">
          {settings.cameraMode === 'always'
            ? 'Nudges come while the camera is on. One tip at a time.'
            : 'Posture nudges run when the camera mode is Always on. You can change it in Settings.'}
        </p>
      </div>
    );
  }
  if (editor === 'move') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {settings.workStyle === 'stand' ? (
          <Chips label="Shift or sit every" options={reminderOptions.standBreak} value={settings.standBreakMinutes} format={minutes} onChange={(value) => onUpdate({ standBreakMinutes: value })} />
        ) : (
          <Chips label="Move every" options={reminderOptions.move} value={settings.breakMinutes} format={minutes} onChange={(value) => onUpdate({ breakMinutes: value })} />
        )}
        <Row label="Suggest a stretch" hint="Offer a quick stretch with your break">
          <Switch checked={settings.stretchSuggestions} label="Suggest a stretch" onChange={() => onUpdate({ stretchSuggestions: !settings.stretchSuggestions })} />
        </Row>
      </div>
    );
  }
  if (editor === 'water') {
    return <Chips label="Remind me every" options={reminderOptions.water} value={settings.waterMinutes} format={minutes} onChange={(value) => onUpdate({ waterMinutes: value })} />;
  }
  if (editor === 'eye') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Chips label="Remind me every" options={reminderOptions.eye} value={settings.eyeRestMinutes} format={minutes} onChange={(value) => onUpdate({ eyeRestMinutes: value })} />
        <p className="text-sm text-white/60">Look about 20 feet away for 20 seconds.</p>
      </div>
    );
  }
  if (editor === 'spot') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Chips label="Check every" options={reminderOptions.spotEvery} value={settings.spotEveryMin} format={minutes} onChange={(value) => onUpdate({ spotEveryMin: value as AppSettings['spotEveryMin'] })} />
        <Chips label="Check length" options={reminderOptions.spotLength} value={settings.spotLengthSec} format={(value) => `${value} sec`} onChange={(value) => onUpdate({ spotLengthSec: value as AppSettings['spotLengthSec'] })} />
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/80">Work days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(([day, label]) => {
              const on = settings.spotWorkDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${focus} ${on ? 'bg-print text-white' : 'border border-white/10 bg-white/[0.04] text-white/80'}`}
                  onClick={() => onUpdate({ spotWorkDays: on ? settings.spotWorkDays.filter((item) => item !== day) : [...settings.spotWorkDays, day] })}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Row label="Skip checks during Focus mode">
          <Switch checked={settings.spotSkipFocus} label="Skip checks during Focus mode" onChange={() => onUpdate({ spotSkipFocus: !settings.spotSkipFocus })} />
        </Row>
        <p className="text-xs text-white/55 md:col-span-2">The camera turns on for a few seconds, then off. Nothing is recorded, and it stays on this device.</p>
      </div>
    );
  }
  if (editor === 'schedule') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Work hours</p>
          <div className="flex flex-wrap gap-4">
            <TimeField label="From" value={settings.workStart} onChange={(workStart) => onUpdate({ workStart })} />
            <TimeField label="To" value={settings.workEnd} onChange={(workEnd) => onUpdate({ workEnd })} />
          </div>
          <p className="text-xs text-white/55">Reminders are placed inside your work hours.</p>
        </div>
        <div className="space-y-2">
          <Row label="Quiet hours" hint="Nothing fires then, spot checks included">
            <Switch checked={settings.quietHours} label="Quiet hours" onChange={() => onUpdate({ quietHours: !settings.quietHours })} />
          </Row>
          {settings.quietHours ? (
            <div className="flex flex-wrap gap-4 px-1">
              <TimeField label="From" value={settings.quietStart} onChange={(quietStart) => onUpdate({ quietStart })} />
              <TimeField label="To" value={settings.quietEnd} onChange={(quietEnd) => onUpdate({ quietEnd })} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  // Sit and stand
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {features.intervalSection ? (
        <>
          <Row label="Sit-stand intervals" hint="The timer follows the posture it sees, not a button">
            <Switch checked={settings.intervalsOn} label="Sit-stand intervals" onChange={() => onUpdate({ intervalsOn: !settings.intervalsOn })} />
          </Row>
          <Chips<IntervalPreset>
            label="Preset"
            options={['balanced', 'easy', 'focus', 'custom']}
            value={settings.intervalPreset}
            format={presetLabel}
            onChange={(intervalPreset) => onUpdate({ intervalPreset })}
          />
          {settings.intervalPreset === 'custom' ? (
            <div className="space-y-3 md:col-span-2">
              <Slider label={`Sit ${settings.customSitMin} min`} min={10} max={90} value={settings.customSitMin} onChange={(customSitMin) => onUpdate({ customSitMin })} />
              <Slider label={`Stand ${settings.customStandMin} min`} min={5} max={45} value={settings.customStandMin} onChange={(customStandMin) => onUpdate({ customStandMin })} />
              <Slider label={`Move ${settings.customMoveMin} min`} min={0} max={15} value={settings.customMoveMin} onChange={(customMoveMin) => onUpdate({ customMoveMin })} />
            </div>
          ) : null}
          <Row label="I don't have a standing desk" hint="Swap standing time for a short walk">
            <Switch checked={settings.noStandingDesk} label="I don't have a standing desk" onChange={() => onUpdate({ noStandingDesk: !settings.noStandingDesk })} />
          </Row>
          <Slider label={`Daily switch goal: ${settings.dailySwitchGoal}`} min={1} max={16} value={settings.dailySwitchGoal} onChange={(dailySwitchGoal) => onUpdate({ dailySwitchGoal })} />
        </>
      ) : null}
      {features.stillness ? (
        <Chips label="Stillness reminder while standing" options={reminderOptions.stillness} value={settings.stillnessMinutes} format={(value) => (value === 0 ? 'Off' : `${value} min`)} onChange={(value) => onUpdate({ stillnessMinutes: value as AppSettings['stillnessMinutes'] })} />
      ) : null}
      {import.meta.env.DEV && features.intervalSection ? (
        <Row label="Dev only: 10x timer">
          <Switch checked={settings.devSpeed10x} label="Dev only: 10x timer" onChange={() => onUpdate({ devSpeed10x: !settings.devSpeed10x })} />
        </Row>
      ) : null}
    </div>
  );
}

function Slider({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-medium text-white/80">
      {label}
      <input className="mt-2 w-full accent-[#059669]" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function presetLabel(preset: IntervalPreset): string {
  if (preset === 'balanced') return 'Balanced 20-8-2';
  if (preset === 'easy') return 'Easy start 45-15';
  if (preset === 'focus') return 'Focus blocks 50-10';
  return 'Custom';
}

function sitStandSummary(settings: AppSettings): string {
  if (settings.workStyle === 'stand') return settings.stillnessMinutes > 0 ? `Stillness reminder ${settings.stillnessMinutes} min` : 'Stillness reminder off';
  const preset = settings.intervalsOn ? presetLabel(settings.intervalPreset) : 'Intervals off';
  return `${preset} \u00b7 Auto-detect ${settings.autoDetect ? 'on' : 'off'}`;
}

function editorTitle(editor: Editor, typeTitle?: string): string {
  if (editor === 'schedule') return 'Schedule';
  if (editor === 'sitstand') return 'Sit and stand';
  return typeTitle ?? reminderName(editor);
}

function clockLabel(ms: number): string {
  const date = new Date(ms);
  return formatMinute(date.getHours() * 60 + date.getMinutes());
}

function clockLabelFromMinute(value: string): string {
  const [hour, minute] = value.split(':').map(Number);
  return formatMinute((hour ?? 0) * 60 + (minute ?? 0)).replace(':00', '');
}


