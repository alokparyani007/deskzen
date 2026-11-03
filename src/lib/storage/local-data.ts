import type { Baseline } from '../posture/types';

const DB_NAME = 'sitglow';
const STORE = 'records';
const BASELINE_KEY = 'baseline';
const STANDING_KEY = 'baseline-stand';
const ONBOARDING_KEY = 'sitglow.onboarding';
const SKIPPED_KEY = 'sitglow.cameraSkipped';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed'));
  });
}

export async function loadBaseline(): Promise<Baseline | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const value = await requestToPromise(tx.objectStore(STORE).get(BASELINE_KEY));
    return isBaseline(value) ? value : null;
  } finally {
    db.close();
  }
}

export async function saveBaseline(baseline: Baseline): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...baseline, pose: baseline.pose ?? 'sit' }, BASELINE_KEY);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function loadRecord(key: string): Promise<unknown> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    return await requestToPromise(tx.objectStore(STORE).get(key));
  } finally {
    db.close();
  }
}

export async function saveRecord(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function loadStandingBaseline(): Promise<Baseline | null> {
  return loadKeyed(STANDING_KEY);
}

export async function saveStandingBaseline(baseline: Baseline): Promise<void> {
  await saveKeyed(STANDING_KEY, { ...baseline, pose: 'stand' });
}

async function loadKeyed(key: string): Promise<Baseline | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const value = await requestToPromise(tx.objectStore(STORE).get(key));
    return isBaseline(value) ? value : null;
  } finally {
    db.close();
  }
}

async function saveKeyed(key: string, value: Baseline): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteSittingBaseline(): Promise<void> {
  await deleteKeyed(BASELINE_KEY);
}

export async function deleteStandingBaseline(): Promise<void> {
  await deleteKeyed(STANDING_KEY);
}

async function deleteKeyed(key: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteStoredBaseline(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(BASELINE_KEY);
    tx.objectStore(STORE).delete(STANDING_KEY);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not save baseline'));
    tx.onabort = () => reject(tx.error ?? new Error('Baseline save was aborted'));
  });
}

function isBaseline(value: unknown): value is Baseline {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Baseline>;
  return record.version === 1 && typeof record.ipdPx === 'number' && typeof record.createdAt === 'string';
}

export function isOnboardingDone(): boolean {
  return window.localStorage.getItem(ONBOARDING_KEY) === 'done';
}

export function cameraWasSkipped(): boolean {
  return window.localStorage.getItem(SKIPPED_KEY) === '1';
}

export function markOnboardingDone(skippedCamera: boolean): void {
  window.localStorage.setItem(ONBOARDING_KEY, 'done');
  if (skippedCamera) {
    window.localStorage.setItem(SKIPPED_KEY, '1');
  } else {
    window.localStorage.removeItem(SKIPPED_KEY);
  }
}

export async function deleteAllLocalData(): Promise<void> {
  window.localStorage.clear();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not delete local data'));
    request.onblocked = () => resolve();
  });
}
