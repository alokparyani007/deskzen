import type { DeskId, DeskProfile } from '../../lib/posture/profiles';

export function DeskProfileBar({
  profiles,
  activeId,
  onSelect,
}: {
  profiles: DeskProfile[];
  activeId: DeskId;
  onSelect: (id: DeskId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Desk profile">
      {profiles.map((profile) => {
        const selected = profile.id === activeId;
        return (
          <button
            key={profile.id}
            type="button"
            aria-pressed={selected}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${selected ? 'bg-brand text-white' : 'bg-surface text-ink'}`}
            onClick={() => onSelect(profile.id)}
          >
            {profile.name}
          </button>
        );
      })}
    </div>
  );
}
