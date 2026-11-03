import { useEffect, useRef, useState } from 'react';
import { postureConfig } from '../../lib/posture/config';

export function useDebouncedCue(cue: string): string {
  const [shown, setShown] = useState(cue);
  const latest = useRef(cue);
  useEffect(() => {
    latest.current = cue;
  }, [cue]);
  useEffect(() => {
    const id = window.setInterval(() => {
      setShown((current) => (latest.current === current ? current : latest.current));
    }, postureConfig.calibration.coachingDebounceMs);
    return () => window.clearInterval(id);
  }, []);
  return shown;
}
