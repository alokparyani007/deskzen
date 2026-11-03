import type { WorkStyle } from '../../lib/settings/defaults';

const TILES: { id: WorkStyle; title: string; body: string }[] = [
  { id: 'sit', title: 'Sit only', body: 'I work at a regular desk' },
  { id: 'mixed', title: 'Sit and stand', body: 'I switch between sitting and standing' },
  { id: 'stand', title: 'Stand only', body: 'I work at a standing desk all day' },
];

export function WorkStylePicker({ value, onChange }: { value: WorkStyle; onChange: (style: WorkStyle) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TILES.map((tile) => {
        const selected = value === tile.id;
        return (
          <button
            key={tile.id}
            type="button"
            aria-pressed={selected}
            className={`rounded-2xl border px-4 py-4 text-left shadow-sm ${selected ? 'border-brand bg-brand-tint' : 'border-ink/10 bg-white'}`}
            onClick={() => onChange(tile.id)}
          >
            <span className="block font-semibold text-ink">{tile.title}</span>
            <span className="mt-1 block text-sm text-ink-muted">{tile.body}</span>
          </button>
        );
      })}
    </div>
  );
}
