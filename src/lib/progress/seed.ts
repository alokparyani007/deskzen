import { localDayKey, type MinuteRecord } from './aggregate';

/** Sample numbers for the progress charts. Not camera data. */
export function seedMinutes(nowMs: number, timeZone: string): MinuteRecord[] {
  const records: MinuteRecord[] = [];
  const seen = new Set<string>();
  for (let hour = 0; seen.size < 14 && hour < 24 * 16; hour += 1) {
    const sample = nowMs - hour * 3_600_000;
    const date = localDayKey(sample, timeZone);
    if (seen.has(date)) continue;
    seen.add(date);
    const dayIndex = seen.size;
    const score = dayIndex === 5 ? 58 : 82;
    for (let minute = 0; minute < 40; minute += 1) {
      records.push({ minute: Math.floor(sample / 60_000) - minute, score });
    }
  }
  return records;
}
