import { migrateMinute, type DayCounts, type MinuteRecord } from '../progress/aggregate';
import { loadRecord, saveRecord } from './local-data';

const MINUTES_KEY = 'minutes';
const COUNTS_KEY = 'dayCounts';
const NECK_KEY = 'neckChecks';

export interface NeckCheck {
  at: string;
  up: number | null;
  down: number | null;
  left: number | null;
  right: number | null;
  level: number | null;
  baselineEyeDeg: number | null;
}

export async function loadMinutes(): Promise<MinuteRecord[]> {
  const value = await loadRecord(MINUTES_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isMinute).map(migrateMinute);
}

export async function saveMinute(record: MinuteRecord): Promise<void> {
  const existing = await loadMinutes();
  const cutoff = record.minute - 40 * 24 * 60;
  const next = existing.filter((item) => item.minute !== record.minute && item.minute >= cutoff).concat(record);
  await saveRecord(MINUTES_KEY, next);
}

export async function replaceMinutes(records: MinuteRecord[]): Promise<void> {
  await saveRecord(MINUTES_KEY, records);
}

export async function loadDayCounts(): Promise<DayCounts[]> {
  const value = await loadRecord(COUNTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isCounts);
}

export async function saveDayCounts(counts: DayCounts[]): Promise<void> {
  await saveRecord(COUNTS_KEY, counts);
}

export async function loadNeckChecks(): Promise<NeckCheck[]> {
  const value = await loadRecord(NECK_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter(isNeck);
}

export async function saveNeckCheck(check: NeckCheck): Promise<NeckCheck[]> {
  const existing = await loadNeckChecks();
  const next = [...existing, check].slice(-30);
  await saveRecord(NECK_KEY, next);
  return next;
}

function isMinute(value: unknown): value is MinuteRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<MinuteRecord>;
  return typeof record.minute === 'number' && typeof record.score === 'number';
}

function isCounts(value: unknown): value is DayCounts {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DayCounts>;
  return typeof record.date === 'string' && typeof record.breaks === 'number' && typeof record.water === 'number';
}

function isNeck(value: unknown): value is NeckCheck {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<NeckCheck>;
  return typeof record.at === 'string';
}
