import { describe, expect, it } from 'vitest';
import { isImmersivePath, isNavActive, navHref, navItems, settingsItem, zenHref } from './nav';

const labels = navItems.map((item) => item.label);
const activeOn = (path: string) => [...navItems, settingsItem].filter((item) => isNavActive(path, item)).map((item) => item.label);

describe('sidebar nav', () => {
  it('lists the real pages in order', () => {
    expect(labels).toEqual(['Home', 'Live view', 'Set my Zen', 'Progress', 'Reminders']);
    expect(navItems.map((item) => item.to)).toEqual(['/app', '/live', '/set-my-zen', '/progress', '/reminders']);
    expect(new Set(navItems.map((item) => item.to)).size).toBe(navItems.length);
    expect(settingsItem.to).toBe('/settings');
  });

  it('keeps the phone TabBar to 5 tabs, without Settings', () => {
    const tabs = navItems.filter((item) => item.tab);
    expect(tabs.length).toBeLessThanOrEqual(5);
    expect(tabs.map((item) => item.short)).toEqual(['Home', 'Live', 'Set my Zen', 'Progress', 'Reminders']);
    expect(settingsItem.tab).toBe(false);
  });

  it('marks exactly the current page active', () => {
    expect(activeOn('/app')).toEqual(['Home']);
    expect(activeOn('/live')).toEqual(['Live view']);
    expect(activeOn('/set-my-zen')).toEqual(['Set my Zen']);
    expect(activeOn('/calibrate')).toEqual(['Set my Zen']);
    expect(activeOn('/progress')).toEqual(['Progress']);
    expect(activeOn('/reminders')).toEqual(['Reminders']);
    expect(activeOn('/settings')).toEqual(['Settings']);
    expect(activeOn('/stretches')).toEqual([]);
    expect(activeOn('/app/extra')).toEqual([]);
  });

  it('hides the sidebar on full-screen camera flows by prefix', () => {
    for (const path of ['/set-my-zen', '/set-my-zen-legacy', '/calibrate', '/calibrate/step', '/live', '/live-legacy']) {
      expect(isImmersivePath(path)).toBe(true);
    }
    for (const path of ['/app', '/progress', '/reminders', '/settings', '/privacy', '/stretches']) {
      expect(isImmersivePath(path)).toBe(false);
    }
  });

  it('opens Set my Zen for the current posture and returns to Home', () => {
    expect(zenHref('sit')).toBe('/set-my-zen?pose=sit&from=home');
    expect(navHref(navItems[2]!, 'stand')).toBe('/set-my-zen?pose=stand&from=home');
    expect(navHref(navItems[0]!, 'stand')).toBe('/app');
  });
});
