import type { LucideIcon } from 'lucide-react';
import { BarChart3, Bell, Camera, Home, Settings, Target } from 'lucide-react';
import type { PoseMode } from '../features/zen2/zenConfig';
import { isZenPath } from './zenPath';

export type NavItem = {
  to: string;
  label: string;
  /** Shorter label for the phone TabBar. */
  short: string;
  icon: LucideIcon;
  end?: boolean;
  /** Shown in the phone TabBar (5 tabs max). */
  tab: boolean;
};

/** Main nav, in order. The sidebar, the tablet rail, and the phone TabBar all read this. */
export const navItems: readonly NavItem[] = [
  { to: '/app', label: 'Home', short: 'Home', icon: Home, end: true, tab: true },
  { to: '/live', label: 'Live view', short: 'Live', icon: Camera, tab: true },
  { to: '/set-my-zen', label: 'Set my Zen', short: 'Set my Zen', icon: Target, tab: true },
  { to: '/progress', label: 'Progress', short: 'Progress', icon: BarChart3, tab: true },
  { to: '/reminders', label: 'Reminders', short: 'Reminders', icon: Bell, tab: true },
];

/** Settings sits at the bottom of the sidebar. On phones it is the gear in the Home header. */
export const settingsItem: NavItem = { to: '/settings', label: 'Settings', short: 'Settings', icon: Settings, tab: false };

/** True when the nav item should read as the current page. */
export function isNavActive(path: string, item: NavItem): boolean {
  if (item.to === '/set-my-zen') return isZenPath(path);
  if (item.end) return path === item.to;
  return path === item.to || path.startsWith(`${item.to}/`);
}

/** Full-screen camera flows hide the sidebar and the TabBar. */
export function isImmersivePath(path: string): boolean {
  return isZenPath(path) || path === '/live' || path.startsWith('/live/') || path.startsWith('/live-');
}

/** Set my Zen link for the current posture. "from=home" brings you back to Home when you leave. */
export function zenHref(mode: PoseMode): string {
  return `/set-my-zen?pose=${mode}&from=home`;
}

/** Where a nav item links to. Set my Zen carries the current posture. */
export function navHref(item: NavItem, mode: PoseMode): string {
  return item.to === '/set-my-zen' ? zenHref(mode) : item.to;
}
