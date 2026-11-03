import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearGlowHistory, loadGlowHistory, pushGlowHistory, replaceGlowHistory, type GlowHistory } from '../../lib/posture/glowStore';
import {
  assignProfile,
  hydrateProfiles,
  loadActiveDesk,
  loadDeskProfiles,
  saveActiveDesk,
  saveDeskProfiles,
  type DeskId,
  type DeskProfile,
} from '../../lib/posture/profiles';
import { rememberBaselinesAsPrints } from '../../calibration/store';
import type { Baseline } from '../../lib/posture/types';
import {
  deleteSittingBaseline,
  deleteStandingBaseline,
  deleteStoredBaseline,
  loadBaseline,
  loadStandingBaseline,
  saveBaseline,
  saveStandingBaseline,
} from '../../lib/storage/local-data';

interface BaselineContextValue {
  baseline: Baseline | null;
  standing: Baseline | null;
  history: GlowHistory;
  profiles: DeskProfile[];
  activeProfileId: DeskId;
  ready: boolean;
  save: (baseline: Baseline) => Promise<void>;
  saveStanding: (baseline: Baseline) => Promise<void>;
  restore: (pose: 'sit' | 'stand', createdAt: string) => Promise<void>;
  selectProfile: (id: DeskId) => Promise<void>;
  clear: () => Promise<void>;
}

const BaselineContext = createContext<BaselineContextValue | null>(null);

export function BaselineProvider({ children }: { children: ReactNode }) {
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [standing, setStanding] = useState<Baseline | null>(null);
  const [history, setHistory] = useState<GlowHistory>({ sit: [], stand: [] });
  const [profiles, setProfiles] = useState<DeskProfile[]>(() => hydrateProfiles(null, null, null));
  const [activeProfileId, setActiveProfileId] = useState<DeskId>('home');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([loadBaseline(), loadStandingBaseline()])
      .then(([stored, storedStanding]) => {
        if (!active) return;
        setBaseline(stored);
        setStanding(storedStanding);
        setHistory(loadGlowHistory());
        const nextProfiles = hydrateProfiles(loadDeskProfiles(), stored, storedStanding);
        setProfiles(nextProfiles);
        saveDeskProfiles(nextProfiles);
        const deskId = loadActiveDesk();
        setActiveProfileId(deskId);
        void rememberBaselinesAsPrints(stored, storedStanding, deskId);
      })
      .catch(() => {
        if (!active) return;
        setBaseline(null);
        setStanding(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const remember = useCallback((pose: 'sit' | 'stand', next: Baseline) => {
    setProfiles((current) => {
      const stored = assignProfile(current, activeProfileId, pose, next);
      saveDeskProfiles(stored);
      return stored;
    });
  }, [activeProfileId]);

  const save = useCallback(async (next: Baseline) => {
    const previous = await loadBaseline();
    const sit = pushGlowHistory('sit', previous);
    await saveBaseline(next);
    setHistory((current) => ({ ...current, sit }));
    setBaseline(next);
    remember('sit', next);
  }, [remember]);

  const saveStanding = useCallback(async (next: Baseline) => {
    const previous = await loadStandingBaseline();
    const stand = pushGlowHistory('stand', previous);
    const record = { ...next, pose: 'stand' as const };
    await saveStandingBaseline(record);
    setHistory((current) => ({ ...current, stand }));
    setStanding(record);
    remember('stand', record);
  }, [remember]);

  const restore = useCallback(async (pose: 'sit' | 'stand', createdAt: string) => {
    const list = loadGlowHistory()[pose];
    const chosen = list.find((item) => item.createdAt === createdAt);
    if (!chosen) return;
    const previous = pose === 'stand' ? await loadStandingBaseline() : await loadBaseline();
    const nextHistory = pushGlowHistory(pose, previous).filter((item) => item.createdAt !== chosen.createdAt);
    replaceGlowHistory(pose, nextHistory);
    if (pose === 'stand') {
      const record = { ...chosen, pose: 'stand' as const };
      await saveStandingBaseline(record);
      setStanding(record);
    } else {
      await saveBaseline(chosen);
      setBaseline(chosen);
    }
    setHistory(loadGlowHistory());
    remember(pose, pose === 'stand' ? { ...chosen, pose: 'stand' } : chosen);
  }, [remember]);

  const selectProfile = useCallback(async (id: DeskId) => {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return;
    saveActiveDesk(id);
    setActiveProfileId(id);
    if (profile.sit) {
      await saveBaseline(profile.sit);
      setBaseline(profile.sit);
    } else {
      await deleteSittingBaseline();
      setBaseline(null);
    }
    if (profile.stand) {
      await saveStandingBaseline(profile.stand);
      setStanding(profile.stand);
    } else {
      await deleteStandingBaseline();
      setStanding(null);
    }
  }, [profiles]);

  const clear = useCallback(async () => {
    await deleteStoredBaseline();
    clearGlowHistory();
    const empty = hydrateProfiles(null, null, null);
    saveDeskProfiles(empty);
    setBaseline(null);
    setStanding(null);
    setHistory({ sit: [], stand: [] });
    setProfiles(empty);
    setActiveProfileId('home');
  }, []);

  const value = useMemo(
    () => ({ baseline, standing, history, profiles, activeProfileId, ready, save, saveStanding, restore, selectProfile, clear }),
    [baseline, standing, history, profiles, activeProfileId, ready, save, saveStanding, restore, selectProfile, clear],
  );
  return <BaselineContext.Provider value={value}>{children}</BaselineContext.Provider>;
}

export function useBaseline(): BaselineContextValue {
  const value = useContext(BaselineContext);
  if (!value) throw new Error('useBaseline must be used inside BaselineProvider');
  return value;
}
