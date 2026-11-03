export type ReminderCardKind = 'water' | 'posture' | 'eye' | 'move' | 'stand';

export function ReminderCard({
  kind,
  title,
  detail,
  primary,
  secondary,
  onPrimary,
  onSecondary,
  reduced,
}: {
  kind: ReminderCardKind;
  title: string;
  detail: string;
  primary: string;
  secondary: string;
  onPrimary: () => void;
  onSecondary: () => void;
  reduced: boolean;
}) {
  const tone = kind === 'water' ? 'text-sky-brand' : kind === 'eye' ? 'text-eye' : kind === 'stand' ? 'text-glow' : 'text-print';
  return (
    <article className={`fixed bottom-24 right-4 z-40 w-80 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-ink/10 ${reduced ? '' : 'reminder-card'}`} role="dialog" aria-label={title}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{kind === 'eye' ? 'Eye break' : kind}</p>
      <img src={illustration(kind)} alt="" className="mx-auto mt-2 h-24 w-24" />
      <h2 className="mt-2 text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{detail}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" className="min-h-11 flex-1 rounded-xl bg-print text-sm font-semibold text-white" onClick={onPrimary}>{primary}</button>
        <button type="button" className="min-h-11 flex-1 rounded-xl border border-ink/15 text-sm font-semibold text-ink" onClick={onSecondary}>{secondary}</button>
      </div>
    </article>
  );
}

function illustration(kind: ReminderCardKind): string {
  if (kind === 'water') return '/media/reminders/water-glass.svg';
  if (kind === 'eye') return '/media/reminders/eye-break.svg';
  if (kind === 'stand') return '/media/reminders/stand.svg';
  return '/media/reminders/stretch.svg';
}
