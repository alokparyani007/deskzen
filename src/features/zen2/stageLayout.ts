/** Phone layout for Set my Zen. Scoring thresholds stay in zenConfig. */

/** How long Fit and hold waits before offering a way out. Not a posture score. */
export const FIT_SAVE_ANYWAY_MS = 15_000;

export function fitSaveAnywayReady(elapsedMs: number): boolean {
  return Number.isFinite(elapsedMs) && elapsedMs >= FIT_SAVE_ANYWAY_MS;
}

/**
 * Load Live view as a new document.
 * Client-side navigate can change the address to /live and leave Fit and hold painted,
 * because this screen keeps updating while the save is in flight.
 */
export function openLiveView(replace: (url: string) => void = defaultReplace): void {
  replace('/live');
}

function defaultReplace(url: string): void {
  window.location.replace(url);
}

/** One column on phones. The reference picture sits under the camera from the md breakpoint up. */
export const zenSnapGridClass =
  'grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-2 px-[2%] md:grid-cols-[minmax(0,68fr)_minmax(240px,30fr)] md:grid-rows-[minmax(0,1fr)] md:gap-[2%]';

export const zenSingleGridClass =
  'grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-[2%] px-[2%]';

/** Wraps onto a second row on phones so the step pill cannot cover the wordmark. */
export const zenHeaderClass =
  'flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-2 sm:h-16 sm:flex-nowrap sm:gap-3 sm:px-4';

export const zenHeaderCenterClass =
  'order-last flex min-w-0 basis-full justify-center sm:order-none sm:min-w-0 sm:flex-1 sm:basis-auto';

export const stepPillClass =
  'max-w-full truncate whitespace-nowrap rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-xs font-medium backdrop-blur-md sm:px-4 sm:py-1.5 sm:text-sm';

/** Coach copy on its own row, actions in a row under it, so the words cannot sit on the buttons. */
export const zenDockClass =
  'mx-[2%] mb-2 flex shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-dock px-3 py-3 text-white backdrop-blur-md md:mb-3 md:flex-row md:items-center md:gap-4 md:px-4';

export const zenDockActionsClass = 'flex shrink-0 flex-wrap items-center justify-end gap-2';
