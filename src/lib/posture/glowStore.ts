import { rememberBaseline, type GlowAttempt } from './glow';
import type { Baseline } from './types';

const HISTORY_KEY = 'sitglow.glowHistory';
const LOG_KEY = 'sitglow.glowLog';
const CHECK_KEY = 'sitglow.glowCheck';

export interface GlowHistory {
  sit: Baseline[];
  stand: Baseline[];
}

export function todayKey(now = new Date()): string {
  return now.toLocaleDateString('en-CA');
}

export function formatGlowDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function loadGlowHistory(): GlowHistory {
  return { sit: readList(rawHistory().sit), stand: readList(rawHistory().stand) };
}

export function pushGlowHistory(pose: 'sit' | 'stand', previous: Baseline | null): Baseline[] {
  const history = loadGlowHistory();
  const next = rememberBaseline(history[pose], previous);
  history[pose] = next;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return next;
}

export function replaceGlowHistory(pose: 'sit' | 'stand', items: Baseline[]): void {
  const history = loadGlowHistory();
  history[pose] = items.slice(0, 5);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearGlowHistory(): void {
  window.localStorage.removeItem(HISTORY_KEY);
}

export function loadGlowCheckDay(): string | null {
  return window.localStorage.getItem(CHECK_KEY);
}

export function saveGlowCheckDay(day: string): void {
  window.localStorage.setItem(CHECK_KEY, day);
}

const DISMISS_KEY = 'sitglow.alertDismiss';
const STRICT_KEY = 'sitglow.strictDay';
const OFFER_KEY = 'sitglow.glowOffer';

export function loadDismissTimes(): number[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISMISS_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is number => typeof item === 'number');
  } catch {
    return [];
  }
}

export function saveDismissTimes(times: number[]): void {
  window.localStorage.setItem(DISMISS_KEY, JSON.stringify(times.slice(-12)));
}

export function loadStrictDay(): string | null {
  return window.localStorage.getItem(STRICT_KEY);
}

export function saveStrictDay(day: string): void {
  window.localStorage.setItem(STRICT_KEY, day);
}

export function loadGlowOfferDay(): string | null {
  return window.localStorage.getItem(OFFER_KEY);
}

export function saveGlowOfferDay(day: string): void {
  window.localStorage.setItem(OFFER_KEY, day);
}

export function recordGlowAttempt(attempt: GlowAttempt): void {
  const current = readAttempts();
  const next = [...current, attempt].slice(-30);
  window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
}

function rawHistory(): { sit: unknown; stand: unknown } {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '{}') as { sit?: unknown; stand?: unknown };
    return { sit: parsed.sit, stand: parsed.stand };
  } catch {
    return { sit: [], stand: [] };
  }
}

function readList(value: unknown): Baseline[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStoredBaseline).slice(0, 5);
}

function readAttempts(): GlowAttempt[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOG_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAttempt);
  } catch {
    return [];
  }
}

function isStoredBaseline(value: unknown): value is Baseline {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Baseline>;
  return record.version === 1 && typeof record.ipdPx === 'number' && typeof record.createdAt === 'string';
}

function isAttempt(value: unknown): value is GlowAttempt {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<GlowAttempt>;
  return typeof record.startedAt === 'number' && typeof record.finishedAt === 'number' && typeof record.ok === 'boolean';
}
