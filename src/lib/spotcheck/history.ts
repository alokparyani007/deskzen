import type { SpotIssue, SpotOutcome } from './verdict';

export interface SpotRecord {
  at: number;
  posture: 'sitting' | 'standing';
  score: number | null;
  issue: SpotIssue | null;
  outcome: SpotOutcome;
}

const KEY = 'sitglow.spotHistory';

export function appendSpot(records: SpotRecord[], record: SpotRecord, limit = 60): SpotRecord[] {
  return [...records, record].slice(-limit);
}

export function dailySummary(records: SpotRecord[], nowMs: number): { checks: number; good: number } {
  const day = new Date(nowMs).toDateString();
  const today = records.filter((record) => new Date(record.at).toDateString() === day);
  return { checks: today.length, good: today.filter((record) => record.outcome === 'good').length };
}

export function summaryLine(summary: { checks: number; good: number }): string {
  return `${summary.checks} checks, ${summary.good} good`;
}

/** Three scored checks in a row with the same issue. */
export function repeatedIssue(records: SpotRecord[]): SpotIssue | null {
  const scored = records.filter((record) => record.outcome === 'good' || record.outcome === 'fix');
  const last = scored.slice(-3);
  const issue = last[0]?.issue;
  if (last.length < 3 || !issue) return null;
  if (last.every((record) => record.outcome === 'fix' && record.issue === issue)) return issue;
  return null;
}

export function stretchForIssue(issue: SpotIssue): string {
  if (issue === 'headDrop') return 'neck-side';
  if (issue === 'shoulders') return 'shoulder-open';
  if (issue === 'distance') return 'eye-soft';
  if (issue === 'hipLean') return 'leg-stand';
  return 'back-reach';
}

export function loadSpotHistory(): SpotRecord[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecord).slice(-60);
  } catch {
    return [];
  }
}

export function saveSpotHistory(records: SpotRecord[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(records.slice(-60)));
}

function isRecord(value: unknown): value is SpotRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<SpotRecord>;
  return typeof record.at === 'number' && (record.outcome === 'good' || record.outcome === 'fix' || record.outcome === 'away');
}
