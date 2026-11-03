import type { Baseline } from './types';
import { postureConfig } from './config';

export type DeskId = 'home' | 'office' | 'kitchen';

export interface DeskView {
  ipdPx: number;
  noseX: number;
  noseY: number;
}

export interface DeskProfile {
  id: DeskId;
  name: string;
  sit: Baseline | null;
  stand: Baseline | null;
  view: DeskView | null;
}

export interface ProfilePick {
  id: DeskId | null;
  sinceMs: number;
}

const NAMES: Record<DeskId, string> = {
  home: 'Home desk',
  office: 'Office',
  kitchen: 'Kitchen table',
};

export function defaultProfiles(): DeskProfile[] {
  return (Object.keys(NAMES) as DeskId[]).map((id) => ({ id, name: NAMES[id], sit: null, stand: null, view: null }));
}

export function viewFromBaseline(baseline: Baseline): DeskView | null {
  if (!(baseline.ipdPx > 0)) return null;
  return { ipdPx: baseline.ipdPx, noseX: baseline.nose.x, noseY: baseline.nose.y };
}

export function matchProfile(
  profiles: DeskProfile[],
  view: DeskView,
  limits = { ipdRatio: postureConfig.glow.profileIpdRatio, pos: postureConfig.glow.profilePos },
): DeskId | null {
  let best: { id: DeskId; score: number } | null = null;
  for (const profile of profiles) {
    if (!profile.view || !(profile.view.ipdPx > 0) || !(view.ipdPx > 0)) continue;
    const ipd = Math.abs(view.ipdPx / profile.view.ipdPx - 1);
    const pos = Math.hypot(view.noseX - profile.view.noseX, view.noseY - profile.view.noseY);
    if (ipd > limits.ipdRatio || pos > limits.pos) continue;
    const score = ipd + pos;
    if (!best || score < best.score) best = { id: profile.id, score };
  }
  return best?.id ?? null;
}

export function stepProfilePick(state: ProfilePick, match: DeskId | null, nowMs: number, activeId: DeskId, holdMs = postureConfig.glow.profileHoldMs): {
  state: ProfilePick;
  switchTo: DeskId | null;
} {
  if (match === null || match === activeId) return { state: { id: null, sinceMs: 0 }, switchTo: null };
  const sinceMs = state.id === match ? state.sinceMs : nowMs;
  const next = { id: match, sinceMs };
  if (nowMs - sinceMs >= holdMs) return { state: { id: null, sinceMs: 0 }, switchTo: match };
  return { state: next, switchTo: null };
}

export function assignProfile(profiles: DeskProfile[], id: DeskId, pose: 'sit' | 'stand', baseline: Baseline): DeskProfile[] {
  return profiles.map((profile) => {
    if (profile.id !== id) return profile;
    const view = viewFromBaseline(baseline) ?? profile.view;
    return pose === 'stand' ? { ...profile, stand: baseline, view: profile.view ?? view } : { ...profile, sit: baseline, view };
  });
}

const PROFILES_KEY = 'sitglow.deskProfiles';
const ACTIVE_KEY = 'sitglow.deskActive';

export function loadDeskProfiles(): DeskProfile[] | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFILES_KEY) ?? 'null') as unknown;
    if (!Array.isArray(parsed)) return null;
    const profiles = parsed.filter(isProfile);
    return profiles.length === 3 ? profiles : null;
  } catch {
    return null;
  }
}

export function saveDeskProfiles(profiles: DeskProfile[]): void {
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadActiveDesk(): DeskId {
  const stored = window.localStorage.getItem(ACTIVE_KEY);
  return stored === 'office' || stored === 'kitchen' || stored === 'home' ? stored : 'home';
}

export function saveActiveDesk(id: DeskId): void {
  window.localStorage.setItem(ACTIVE_KEY, id);
}

function isProfile(value: unknown): value is DeskProfile {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DeskProfile>;
  return record.id === 'home' || record.id === 'office' || record.id === 'kitchen';
}

export function hydrateProfiles(stored: DeskProfile[] | null, sit: Baseline | null, stand: Baseline | null): DeskProfile[] {
  const profiles = stored && stored.length === 3 ? stored : defaultProfiles();
  const home = profiles.find((item) => item.id === 'home');
  if (!home || home.sit || home.stand) return profiles;
  let next = profiles;
  if (sit) next = assignProfile(next, 'home', 'sit', sit);
  if (stand) next = assignProfile(next, 'home', 'stand', stand);
  return next;
}
