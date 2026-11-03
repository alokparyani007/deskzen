import { loadRecord, saveRecord } from '../lib/storage/local-data';
import { silhouetteIsUsable } from '../lib/posture/silhouette';
import type { Baseline } from '../lib/posture/types';
import { emptyLibrary, isPrintLibrary, migrateBaselines, PRINTS_RECORD_KEY, type PrintLibrary } from './print';

export async function loadPrintLibrary(): Promise<PrintLibrary> {
  const stored = await loadRecord(PRINTS_RECORD_KEY);
  if (!isPrintLibrary(stored)) return emptyLibrary();
  const cleaned = dropBadSilhouettes(stored);
  if (cleaned.changed) await saveRecord(PRINTS_RECORD_KEY, cleaned.library);
  return cleaned.library;
}

/** A background trace saved before the outline fix is dropped so Live view can ask for a fresh one. */
export function dropBadSilhouettes(library: PrintLibrary): { library: PrintLibrary; changed: boolean } {
  let changed = false;
  const prints = library.prints.map((print) => {
    const dropBest = print.silhouette !== undefined && !silhouetteIsUsable(print.silhouette);
    const dropSlouch = print.slouchSilhouette !== undefined && !silhouetteIsUsable(print.slouchSilhouette);
    if (!dropBest && !dropSlouch) return print;
    changed = true;
    return {
      ...print,
      silhouette: dropBest ? undefined : print.silhouette,
      slouchSilhouette: dropSlouch ? undefined : print.slouchSilhouette,
    };
  });
  return { library: changed ? { ...library, prints } : library, changed };
}

/** Adds low-confidence prints for baselines that do not have one yet. Existing baseline keys stay put. */
export async function rememberBaselinesAsPrints(
  sit: Baseline | null,
  stand: Baseline | null,
  deskProfileId: string,
): Promise<void> {
  const current = await loadPrintLibrary();
  const next = migrateBaselines(current, { deskProfileId, sit, stand });
  if (!next.migrated) return;
  await saveRecord(PRINTS_RECORD_KEY, next.library);
}
