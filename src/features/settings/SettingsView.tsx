import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Camera, Info, RotateCcw, ShieldCheck, User, Volume2, type LucideIcon } from 'lucide-react';
import type { AppSettings, CameraMode, Sensitivity, WorkStyle } from '../../lib/settings/defaults';
import { featuresFor, styleChangeCopy } from '../../lib/settings/visibility';
import { Switch } from '../reminders/RemindersView';

const card = 'rounded-2xl border border-white/10 bg-white/[0.04]';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';
export type ConfirmKind = 'reset' | 'delete';

export interface SettingsViewProps {
  settings: AppSettings;
  onUpdate: (patch: Partial<AppSettings>) => void;
  /** Called after the person confirms a new work style. */
  onConfirmStyle: (style: WorkStyle) => void;
  cameras: { deviceId: string; label: string }[];
  cameraId: string;
  onSelectCamera: (deviceId: string) => void;
  sittingSaved: boolean;
  standingSaved: boolean;
  profiles: { id: string; name: string }[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  notification: NotificationStatus;
  onToggleNotifications: (on: boolean) => void;
  onPlaySample: () => void;
  onExport: () => void;
  onDeleteAll: () => void;
  onReset: () => void;
  version: string;
  /** Opens a confirm dialog on first render (for tests). */
  initialConfirm?: ConfirmKind | null;
}

const CAMERA_MODES: Array<[CameraMode, string, string]> = [
  ['spot', 'Spot check', 'Turns the camera on for a few seconds, then off. Recommended.'],
  ['always', 'Always on', 'Keeps the camera on while you work, for posture nudges.'],
  ['off', 'Off', 'Reminders only. The camera stays off.'],
];

/** Settings S1: grouped dark sections, a privacy card, and a calm reset area. */
export function SettingsView(props: SettingsViewProps) {
  const { settings, onUpdate } = props;
  const features = featuresFor(settings.workStyle);
  const [pending, setPending] = useState<WorkStyle | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(props.initialConfirm ?? null);
  const mode = CAMERA_MODES.find(([id]) => id === settings.cameraMode) ?? CAMERA_MODES[0]!;

  return (
    <section className="min-h-dvh bg-stage px-4 pb-8 pt-6 text-white lg:px-8" aria-labelledby="settings-title">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <h1 id="settings-title" className="text-3xl font-semibold">
          Settings
        </h1>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Section icon={User} title="You">
              <Row label="Name" htmlFor="settings-name" hint="Used in your greeting and progress notes">
                <input
                  id="settings-name"
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  placeholder="Your first name"
                  value={settings.name}
                  className={`w-full max-w-[14rem] rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/35 ${focus}`}
                  onChange={(event) => onUpdate({ name: event.target.value })}
                />
              </Row>
              <Row label="How you work" stack>
                <Segmented<WorkStyle>
                  label="How you work"
                  value={pending ?? settings.workStyle}
                  options={[
                    ['sit', 'Sit only'],
                    ['mixed', 'Sit and stand'],
                    ['stand', 'Stand only'],
                  ]}
                  onChange={(style) => setPending(style === settings.workStyle ? null : style)}
                />
              </Row>
              {pending ? (
                <div className="rounded-xl border border-outline/30 bg-print/10 p-3" role="status">
                  <p className="text-sm">{styleChangeCopy(pending)}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className={`rounded-xl bg-print px-3 py-2 text-sm font-semibold text-white ${focus}`}
                      onClick={() => {
                        props.onConfirmStyle(pending);
                        setPending(null);
                      }}
                    >
                      Switch
                    </button>
                    <button type="button" className={`rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 ${focus}`} onClick={() => setPending(null)}>
                      Keep this
                    </button>
                  </div>
                </div>
              ) : null}
              {settings.workStyle === 'mixed' ? (
                <ToggleRow label="Auto-detect sitting or standing" hint="DeskZen notices when you stand or sit" checked={settings.autoDetect} onChange={(autoDetect) => onUpdate({ autoDetect })} />
              ) : null}
            </Section>

            <Section icon={Camera} title="Camera and posture">
              <Row label="Camera mode" column hint={mode[2]}>
                <Segmented<CameraMode>
                  label="Camera mode"
                  value={settings.cameraMode}
                  options={CAMERA_MODES.map(([id, name]) => [id, name])}
                  onChange={(cameraMode) => onUpdate(cameraMode === 'always' ? { cameraMode, tracking: true } : { cameraMode })}
                />
              </Row>
              <Row label="Camera" htmlFor="settings-camera" hint={props.cameras.length === 0 ? 'Turn the camera on once to see your cameras' : undefined}>
                <select
                  id="settings-camera"
                  value={props.cameraId}
                  className={`w-full max-w-[14rem] rounded-xl border border-white/10 bg-[#13261e] px-3 py-2 text-sm text-white ${focus}`}
                  onChange={(event) => props.onSelectCamera(event.target.value)}
                >
                  <option value="">Default camera</option>
                  {props.cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Sensitivity" stack>
                <Segmented<Sensitivity>
                  label="Sensitivity"
                  value={settings.sensitivity}
                  options={[
                    ['gentle', 'Gentle'],
                    ['balanced', 'Balanced'],
                    ['strict', 'Strict'],
                  ]}
                  onChange={(sensitivity) => onUpdate({ sensitivity })}
                />
              </Row>
              {features.sittingCalibration ? <ZenRow pose="sit" saved={props.sittingSaved} /> : null}
              {features.standingCalibration ? <ZenRow pose="stand" saved={props.standingSaved} /> : null}
              {props.profiles.length > 1 ? (
                <Row label="Desk profile" stack>
                  <Segmented<string> label="Desk profile" value={props.activeProfileId} options={props.profiles.map((profile) => [profile.id, profile.name])} onChange={props.onSelectProfile} />
                </Row>
              ) : null}
              <ToggleRow label="Guide me back automatically" hint="After 30 seconds away from your Zen in Live view" checked={settings.autoGuideBack} onChange={(autoGuideBack) => onUpdate({ autoGuideBack })} />
              <ToggleRow label="Landmark lines" hint="Show the tracking points on the camera view" checked={settings.showLandmarks} onChange={(showLandmarks) => onUpdate({ showLandmarks })} />
              <ToggleRow label="Screen distance alerts" hint="A tip when you lean in close to the screen" checked={settings.distanceAlerts} onChange={(distanceAlerts) => onUpdate({ distanceAlerts })} />
              {features.standingSection ? (
                <ToggleRow label="Desk height tips" hint="Tips for your standing desk height" checked={settings.deskHeightTips} onChange={(deskHeightTips) => onUpdate({ deskHeightTips })} />
              ) : null}
            </Section>

            <Section icon={Volume2} title="Coaching voice and sound">
              <ToggleRow label="Voice tips" hint="Spoken coaching, one tip at a time" checked={settings.sound} onChange={(sound) => onUpdate({ sound })} />
              <ToggleRow label="Gentle chime" hint="A soft chime with posture nudges" checked={settings.chime} onChange={(chime) => onUpdate({ chime })} />
              <ToggleRow label="Gentle sound" hint="A soft sound when a spot check needs a small fix" checked={settings.spotSound} onChange={(spotSound) => onUpdate({ spotSound })} />
              <div className="flex justify-end pt-1">
                <button type="button" className={`rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.06] ${focus}`} onClick={props.onPlaySample}>
                  Play sample
                </button>
              </div>
            </Section>
          </div>

          <div className="flex flex-col gap-4">
            <Section icon={Bell} title="Notifications">
              <ToggleRow
                label="Desktop notifications"
                hint={notificationHint(props.notification)}
                checked={settings.notifications && props.notification === 'granted'}
                disabled={props.notification === 'unsupported'}
                onChange={props.onToggleNotifications}
              />
              <ToggleRow label="Delay while busy" hint="Hold sit-stand reminders while you type or focus" checked={settings.delayWhileBusy} onChange={(delayWhileBusy) => onUpdate({ delayWhileBusy })} />
              <ToggleRow label="Quiet hours" hint="Nothing fires then, spot checks included" checked={settings.quietHours} onChange={(quietHours) => onUpdate({ quietHours })} />
              {settings.quietHours ? (
                <div className="flex flex-wrap gap-4 px-1 pb-1">
                  <TimeField label="From" value={settings.quietStart} onChange={(quietStart) => onUpdate({ quietStart })} />
                  <TimeField label="To" value={settings.quietEnd} onChange={(quietEnd) => onUpdate({ quietEnd })} />
                </div>
              ) : null}
            </Section>

            <section
              className="relative overflow-hidden rounded-2xl border border-outline/35 bg-gradient-to-br from-print/25 via-print/10 to-transparent p-5 shadow-[0_0_40px_-12px_rgb(52_211_153_/_0.55)] sm:p-6"
              aria-labelledby="privacy-title"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Privacy and data</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <ShieldCheck className="size-14 shrink-0 text-outline" strokeWidth={1.5} aria-hidden="true" />
                <div className="min-w-0">
                  <h2 id="privacy-title" className="text-lg font-semibold">
                    Your camera stays on this device
                  </h2>
                  <p className="mt-1 text-sm text-white/75">Photos and video are never saved or uploaded. DeskZen keeps only simple numbers, here in this browser.</p>
                  <Link to="/privacy" className={`mt-2 inline-block rounded text-sm font-semibold text-outline hover:text-white ${focus}`}>
                    Privacy details
                  </Link>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={`rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08] ${focus}`} onClick={props.onExport}>
                  Export my progress
                </button>
                <button type="button" className={`rounded-xl border border-rose-300/25 px-4 py-2 text-sm font-semibold text-rose-200/90 hover:bg-rose-300/10 ${focus}`} onClick={() => setConfirm('delete')}>
                  Delete all my data
                </button>
              </div>
            </section>

            <section className={`${card} p-5`} aria-labelledby="reset-title">
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 size-5 shrink-0 text-white/60" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 id="reset-title" className="font-semibold">
                    Reset
                  </h2>
                  <p className="mt-1 text-sm text-white/60">Put every setting back to how DeskZen started. Your progress and Posture Print stay.</p>
                </div>
              </div>
              <button type="button" className={`mt-4 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.06] ${focus}`} onClick={() => setConfirm('reset')}>
                Reset settings
              </button>
            </section>

            <p className="flex items-center gap-2 px-1 text-xs text-white/50">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-semibold uppercase tracking-wide">About</span> {'\u00b7'} DeskZen {props.version} {'\u00b7'} DeskZen is a wellness tool, not a medical device.
              </span>
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Reset all settings?"
        body="Every setting goes back to its starting value. Your progress, name and Posture Print stay. You can't undo this."
        action="Reset settings"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onReset();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete all your data?"
        body="This removes your progress, settings and Posture Print from this browser. You can't undo this."
        action="Delete all my data"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onDeleteAll();
        }}
      />
    </section>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  const id = `settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section className={`${card} p-5`} aria-labelledby={id}>
      <h2 id={id} className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
        <Icon className="size-4 text-outline" aria-hidden="true" />
        {title}
      </h2>
      <div className="divide-y divide-white/[0.06]">{children}</div>
    </section>
  );
}

function Row({ label, hint, htmlFor, stack, column, children }: { label: string; hint?: string; htmlFor?: string; stack?: boolean; column?: boolean; children: ReactNode }) {
  const name = htmlFor ? (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {label}
    </label>
  ) : (
    <p className="text-sm font-medium">{label}</p>
  );
  return (
    <div className={`py-3 ${column ? 'flex flex-col gap-2' : stack ? 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4' : 'flex items-center justify-between gap-4'}`}>
      <div className="min-w-0">
        {name}
        {hint ? <p className="text-xs text-white/55">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-white/55">{hint}</p> : null}
      </div>
      <Switch checked={checked} label={label} onChange={() => !disabled && onChange(!checked)} />
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<[T, string]>; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl border border-white/10 bg-white/[0.04] p-1" role="group" aria-label={label}>
      {options.map(([id, name]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${focus} ${value === id ? 'bg-print text-white' : 'text-white/70 hover:text-white'}`}
          onClick={() => onChange(id)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function ZenRow({ pose, saved }: { pose: 'sit' | 'stand'; saved: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">Set my Zen {'\u00b7'} {pose === 'sit' ? 'sitting' : 'standing'}</p>
        <p className="text-xs text-white/55">{saved ? 'Posture Print saved' : 'Not set up yet'}</p>
      </div>
      <Link to={`/set-my-zen?pose=${pose}&from=settings`} className={`shrink-0 rounded-xl bg-print px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light ${focus}`}>
        {saved ? 'Update' : 'Set up'}
      </Link>
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

function ConfirmDialog(props: { open: boolean; title: string; body: string; action: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (props.open && !dialog.open) dialog.showModal();
    if (!props.open && dialog.open) dialog.close();
  }, [props.open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-[#10241c] p-6 text-white shadow-2xl backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault();
        props.onCancel();
      }}
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {props.title}
      </h2>
      <p className="mt-2 text-sm text-white/70">{props.body}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" autoFocus className={`rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 ${focus}`} onClick={props.onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${focus} ${props.danger ? 'border border-rose-300/40 bg-rose-400/15 text-rose-100 hover:bg-rose-400/25' : 'bg-print text-white hover:bg-brand-light'}`}
          onClick={props.onConfirm}
        >
          {props.action}
        </button>
      </div>
    </dialog>
  );
}

function notificationHint(status: NotificationStatus): string {
  if (status === 'granted') return 'Allowed in this browser';
  if (status === 'denied') return 'Blocked. Allow DeskZen in your browser settings.';
  if (status === 'unsupported') return 'Not supported in this browser';
  return 'Your browser will ask first';
}
