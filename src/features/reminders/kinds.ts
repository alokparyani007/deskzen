import { ArrowUpDown, Droplet, Eye, Footprints, PersonStanding, ScanFace, type LucideIcon } from 'lucide-react';
import type { ReminderKind } from '../../lib/wellness/rhythm';

/** Icon and colors for each reminder type. Amber stays reserved for drift and slouch. */
export const kindLook: Record<ReminderKind, { icon: LucideIcon; dot: string; chip: string }> = {
  posture: { icon: PersonStanding, dot: '#34d399', chip: 'bg-print/25 text-outline' },
  move: { icon: Footprints, dot: '#34d399', chip: 'bg-print/25 text-outline' },
  stand: { icon: ArrowUpDown, dot: '#10b981', chip: 'bg-print/25 text-outline' },
  water: { icon: Droplet, dot: '#38bdf8', chip: 'bg-sky-brand/20 text-sky-brand' },
  eye: { icon: Eye, dot: '#5eead4', chip: 'bg-teal-300/15 text-teal-200' },
  spot: { icon: ScanFace, dot: '#a7f3d0', chip: 'bg-emerald-200/15 text-emerald-200' },
};
