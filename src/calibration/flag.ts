import { calibrationConfig } from './config';

export interface FlagEnv {
  dev: boolean;
  stored: string | null;
}

/** On while developing, unless storage says "0". Off in production until storage says "1". */
export function posturePrintV2Enabled(env: FlagEnv = browserFlagEnv()): boolean {
  if (env.dev) return env.stored !== '0';
  return env.stored === '1';
}

function browserFlagEnv(): FlagEnv {
  const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(calibrationConfig.flagKey);
  return { dev: import.meta.env.DEV, stored };
}
