import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaults';
import { loadSettings, mergeSettings, migrateSettings, resetSettings, type SettingStorage } from './store';
import { greeting } from '../home/liveHome';
import { pickInsight } from '../progress/period';
import { applyWorkStyle, calibrationNeeded, featuresFor } from './visibility';

function memory(): SettingStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('work style', () => {
  it('hides standing and intervals for sit only', () => {
    expect(featuresFor('sit')).toMatchObject({
      standingSection: false,
      intervalSection: false,
      sittingBreaks: true,
      hipLean: false,
    });
  });

  it('shows both postures and intervals for sit and stand', () => {
    const features = featuresFor('mixed');
    expect(features.standingSection).toBe(true);
    expect(features.intervalSection).toBe(true);
    expect(features.sittingCalibration).toBe(true);
    expect(features.standingCalibration).toBe(true);
  });

  it('uses standing checks for a standing desk', () => {
    expect(featuresFor('stand')).toMatchObject({ hipLean: true, elbow: true, stillness: true, intervalSection: false });
  });

  it('asks only for a posture that is not saved yet', () => {
    expect(calibrationNeeded('sit', false, false)).toBe('sit');
    expect(calibrationNeeded('sit', true, false)).toBeNull();
    expect(calibrationNeeded('stand', true, false)).toBe('stand');
    expect(calibrationNeeded('mixed', true, false)).toBe('stand');
    expect(calibrationNeeded('mixed', false, true)).toBe('sit');
  });

  it('turns intervals and auto-detect on only for sit and stand', () => {
    expect(applyWorkStyle(defaultSettings, 'mixed')).toMatchObject({ intervalsOn: true, autoDetect: true });
    expect(applyWorkStyle({ ...defaultSettings, workStyle: 'mixed', intervalsOn: true }, 'sit').intervalsOn).toBe(false);
  });
});

describe('settings store', () => {
  it('saves and reloads the same choices', () => {
    const storage = memory();
    const saved = mergeSettings(defaultSettings, { sensitivity: 'gentle', water: true, workStyle: 'stand' });
    resetSettings(storage);
    storage.setItem('sitglow.settings', JSON.stringify(saved));
    const loaded = loadSettings(storage);
    expect(loaded.sensitivity).toBe('gentle');
    expect(loaded.water).toBe(true);
    expect('waterReminders' in loaded).toBe(false);
    expect(loaded.strictness).toBe(0);
  });
});

describe('settings migration', () => {
  const v1 = {
    name: 'Maya',
    sound: true,
    chime: true,
    waterReminders: true,
    showOverlay: false,
    showBestOutline: true,
    stretchMinutes: 45,
    quietHours: false,
    quietStart: '21:00',
    quietEnd: '07:00',
    spotQuiet: true,
    spotQuietStart: '18:30',
    spotQuietEnd: '08:00',
    breakMinutes: 50,
    waterMinutes: 1,
    workStyle: 'mixed',
    autoDetect: false,
  };

  it('merges spot-check quiet hours into the one quiet hours setting', () => {
    const storage = memory();
    storage.setItem('sitglow.settings', JSON.stringify(v1));
    const loaded = loadSettings(storage);
    expect(loaded.quietHours).toBe(true);
    expect(loaded.quietStart).toBe('18:30');
    expect(loaded.quietEnd).toBe('08:00');
  });

  it('keeps general quiet hours when they were already on', () => {
    const migrated = migrateSettings({ ...v1, quietHours: true, quietStart: '22:00', quietEnd: '06:30' } as never);
    expect(migrated).toMatchObject({ quietHours: true, quietStart: '22:00', quietEnd: '06:30' });
  });

  it('removes dead keys and keeps what they meant', () => {
    const storage = memory();
    storage.setItem('sitglow.settings', JSON.stringify(v1));
    const loaded = loadSettings(storage) as unknown as Record<string, unknown>;
    for (const key of ['stretchMinutes', 'showOverlay', 'showBestOutline', 'waterReminders', 'spotQuiet', 'spotQuietStart', 'spotQuietEnd']) {
      expect(key in loaded).toBe(false);
    }
    expect(loaded.water).toBe(true);
    expect(loaded.showLandmarks).toBe(false);
    expect(loaded.settingsVersion).toBe(2);
    saveRoundTrip(loaded);
  });

  it('snaps intervals to the shared options and drops the 1-min water value', () => {
    const storage = memory();
    storage.setItem('sitglow.settings', JSON.stringify(v1));
    const loaded = loadSettings(storage);
    expect(loaded.breakMinutes).toBe(45);
    expect(loaded.waterMinutes).toBe(45);
  });

  it('keeps auto-detect on for Sit and stand, and splits voice tips from the chime', () => {
    const loaded = loadSettings(withStored(v1));
    expect(loaded.autoDetect).toBe(true);
    const voiceOff = mergeSettings(loaded, { sound: false });
    expect(voiceOff.sound).toBe(false);
    expect(voiceOff.chime).toBe(true);
  });

  it('starts a new install on the current version without migrating', () => {
    const loaded = loadSettings(memory());
    expect(loaded.quietHours).toBe(false);
    expect(loaded.settingsVersion).toBe(2);
    expect(loaded.moveBreaks).toBe(true);
    expect(loaded.spotChecks).toBe(true);
  });
});

describe('name', () => {
  it('is used in the Home greeting and the Progress insight pill', () => {
    const settings = mergeSettings(defaultSettings, { name: '  Maya  ' });
    expect(greeting(9, settings.name)).toBe('Good morning, Maya');
    expect(pickInsight(['You sat tall more often than last week.'], 0, settings.name)).toBe('You sat tall more often than last week. Nice work, Maya!');
    expect(greeting(15, '')).toBe('Good afternoon');
  });
});

function withStored(value: object): SettingStorage {
  const storage = memory();
  storage.setItem('sitglow.settings', JSON.stringify(value));
  return storage;
}

function saveRoundTrip(value: Record<string, unknown>) {
  const storage = withStored(value);
  expect(loadSettings(storage).settingsVersion).toBe(2);
}
