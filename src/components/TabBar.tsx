import { Link, useLocation } from 'react-router-dom';
import { isNavActive, navHref, navItems } from '../app/nav';
import { usePoseMode } from './useSidebarStatus';

/** Phone nav (under 768px). Tablets and desktops use the Sidebar. */
export function TabBar() {
  const path = useLocation().pathname;
  const mode = usePoseMode();
  const items = navItems.filter((item) => item.tab);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0f261d] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(path, item);
          return (
            <li key={item.to}>
              <Link
                to={navHref(item, mode)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium leading-tight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-outline',
                  active ? 'text-outline' : 'text-white/70',
                ].join(' ')}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-outline/15' : ''}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="whitespace-nowrap">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
