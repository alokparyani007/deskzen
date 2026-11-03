import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Shield, Target } from 'lucide-react';
import { isNavActive, navHref, navItems, settingsItem, zenHref, type NavItem } from '../app/nav';
import { upcomingLabel, type SidebarStatus, type StatusTone } from '../app/sidebarStatus';
import { useReminderPlan } from '../features/reminders/useReminderPlan';
import { usePoseMode, useSidebarStatus } from './useSidebarStatus';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

/** Dark sidebar: a 76px icon rail from 768px, the full 240px panel from 1024px. Phones use the TabBar. */
export function Sidebar() {
  const path = useLocation().pathname;
  const mode = usePoseMode();
  const status = useSidebarStatus();
  return (
    <aside className="hidden w-[76px] shrink-0 border-r border-white/10 bg-[#0f261d] text-white md:block lg:w-60">
      <div className="sticky top-0 flex h-dvh flex-col px-3 py-5 lg:overflow-y-auto">
        <Link to="/app" className={`flex items-center justify-center gap-2 rounded-xl py-1 lg:justify-start lg:px-2 ${focus}`} aria-label="DeskZen home">
          <img src="/brand/deskzen-icon.svg" alt="" className="size-10 shrink-0" />
          <span className="hidden text-lg font-semibold tracking-tight lg:inline" aria-hidden="true">
            <span className="text-white">Desk</span>
            <span className="text-outline">Zen</span>
          </span>
        </Link>
        <StatusBlock status={status} href={zenHref(mode)} />
        <nav className="mt-5 flex flex-col gap-1" aria-label="Primary">
          {navItems.map((item) => (
            <SideLink key={item.to} item={item} href={navHref(item, mode)} active={isNavActive(path, item)} />
          ))}
        </nav>
        <div className="min-h-4 flex-1" />
        <NextReminderCard />
        <div className="mt-3 border-t border-white/10 pt-3">
          <PrivacyNote />
          <SideLink item={settingsItem} href={settingsItem.to} active={isNavActive(path, settingsItem)} />
        </div>
      </div>
    </aside>
  );
}

function SideLink({ item, href, active }: { item: NavItem; href: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative flex h-11 items-center justify-center gap-3 rounded-xl text-sm font-medium transition-colors lg:justify-start lg:px-3',
        focus,
        active ? 'bg-outline/15 text-white shadow-[inset_3px_0_0_var(--color-outline)]' : 'text-white/70 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <Icon className={`size-5 shrink-0 ${active ? 'text-outline' : ''}`} aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">{item.label}</span>
      <Tip>{item.label}</Tip>
    </Link>
  );
}

/** Tooltip for the icon rail. Hidden on the full sidebar, where the label shows. */
function Tip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:hidden"
    >
      {children}
    </span>
  );
}

function StatusBlock({ status, href }: { status: SidebarStatus | null; href: string }) {
  if (!status) return <div className="mt-5 h-14 rounded-2xl bg-white/5 motion-safe:animate-pulse lg:h-[76px]" aria-hidden="true" />;
  const body = (
    <>
      <Ring value={status.ring} tone={status.tone} setZen={status.setZen} />
      <span className="sr-only lg:not-sr-only lg:block lg:min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-semibold leading-snug text-white">
          {status.title}
          {status.tone === 'calm' ? null : <span className={`size-1.5 rounded-full ${status.tone === 'drift' ? 'bg-glow' : 'bg-outline'}`} aria-hidden="true" />}
        </span>
        <span className="block text-xs leading-snug text-white/60">{status.detail}</span>
        {status.ring === null ? null : <span className="sr-only">, {status.ring}% match</span>}
      </span>
      <Tip>{status.ring === null ? status.title : `${status.title} \u00b7 ${status.ring}%`}</Tip>
    </>
  );
  const box = `group relative mt-5 flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-2 lg:justify-start lg:p-3 ${focus}`;
  if (status.setZen) {
    return (
      <Link to={href} className={`${box} transition-colors hover:bg-white/[0.08]`}>
        {body}
      </Link>
    );
  }
  return <div className={box}>{body}</div>;
}

function Ring({ value, tone, setZen }: { value: number | null; tone: StatusTone; setZen: boolean }) {
  const radius = 20;
  const length = 2 * Math.PI * radius;
  const share = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const stroke = tone === 'drift' ? 'var(--color-glow)' : 'var(--color-brand-light)';
  return (
    <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" />
        {value === null ? null : (
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={length * (1 - share)}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
          />
        )}
      </svg>
      {value !== null ? (
        <span className="text-[11px] font-semibold text-white">{value}%</span>
      ) : setZen ? (
        <Target className="size-5 text-outline" />
      ) : (
        <span className="text-xs text-white/50">{'\u2013'}</span>
      )}
    </span>
  );
}

function NextReminderCard() {
  const plan = useReminderPlan();
  const next = plan.snoozedUntilMs !== null ? null : upcomingLabel(plan.next, plan.nowMin);
  if (!next) return null;
  return (
    <Link
      to="/reminders"
      className={`hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:bg-white/[0.08] lg:flex ${focus}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-outline/15">
        <Bell className="size-4 text-outline" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-white/60">Next reminder</span>
        <span className="block truncate text-sm font-semibold text-white">
          {next.name} {'\u00b7'} {next.when}
        </span>
      </span>
    </Link>
  );
}

function PrivacyNote() {
  return (
    <Link
      to="/privacy"
      className={`group relative mb-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs text-white/50 transition-colors hover:text-white/80 lg:justify-start lg:px-3 ${focus}`}
    >
      <Shield className="size-4 shrink-0 text-outline/70" aria-hidden="true" />
      <span className="sr-only lg:not-sr-only">
        <span className="block font-medium text-white/70">On-device only</span>
        <span className="block">Your data stays private</span>
      </span>
      <Tip>On-device only</Tip>
    </Link>
  );
}
