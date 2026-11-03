import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';

export type ZenIcon = 'check' | 'person' | 'lock' | 'slouch' | 'shoulders' | 'neck' | 'chin' | 'breath';

export interface ZenChrome {
  title: string;
  helper: string;
  countdown: number | null;
  holdFraction: number;
  nextLabel: string;
  backLabel: string;
  skipLabel?: string | null;
  showCard: boolean;
  showNav: boolean;
  locking: boolean;
  pulseNext?: boolean;
  match?: number | null;
  kicker?: string | null;
  chips?: { label: string; met: boolean }[] | null;
  nextDisabled?: boolean;
  icon?: ZenIcon;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
}

const EMPTY: ZenChrome = {
  title: '',
  helper: '',
  countdown: null,
  holdFraction: 0,
  nextLabel: 'Next',
  backLabel: 'Back',
  showCard: false,
  showNav: false,
  locking: false,
  onBack: () => {},
  onNext: () => {},
};

interface ZenContextValue {
  setChrome: (chrome: ZenChrome) => void;
}

const ZenContext = createContext<ZenContextValue | null>(null);

interface ZenVoiceValue {
  voice: boolean;
  setVoice: (value: boolean) => void;
}

const VoiceContext = createContext<ZenVoiceValue>({ voice: true, setVoice: () => undefined });

export function ZenVoiceProvider({ voice, setVoice, children }: { voice: boolean; setVoice: (value: boolean) => void; children: ReactNode }) {
  const value = useMemo(() => ({ voice, setVoice }), [voice, setVoice]);
  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useZenVoice(): ZenVoiceValue {
  return useContext(VoiceContext);
}

export function ZenChromeProvider({ children, chrome, setChrome }: { children: ReactNode; chrome: ZenChrome; setChrome: (chrome: ZenChrome) => void }) {
  const api = useMemo(() => ({ setChrome }), [setChrome]);
  return (
    <ZenContext.Provider value={api}>
      <ZenChromeState.Provider value={chrome}>{children}</ZenChromeState.Provider>
    </ZenContext.Provider>
  );
}

const ZenChromeState = createContext<ZenChrome>(EMPTY);

export function useZenChrome(chrome: ZenChrome): void {
  const context = useContext(ZenContext);
  const latest = useRef(chrome);
  latest.current = chrome;
  const signature = [
    chrome.title,
    chrome.helper,
    chrome.countdown,
    chrome.holdFraction,
    chrome.nextLabel,
    chrome.backLabel,
    chrome.showCard,
    chrome.showNav,
    chrome.locking,
    chrome.skipLabel,
    chrome.pulseNext,
    chrome.match,
    chrome.kicker,
    chrome.icon,
    chrome.nextDisabled,
    chrome.chips?.map((chip) => `${chip.label}:${chip.met ? 1 : 0}`).join(','),
  ].join('|');
  useLayoutEffect(() => {
    const current = latest.current;
    context?.setChrome({
      ...current,
      onBack: () => latest.current.onBack(),
      onNext: () => latest.current.onNext(),
      onSkip: () => latest.current.onSkip?.(),
    });
  }, [context, signature]);
}

export function useZenChromeState(): ZenChrome {
  return useContext(ZenChromeState);
}
