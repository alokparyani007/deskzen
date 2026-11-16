import { useEffect, useRef } from 'react';
import { noteLive, type LiveClock } from '../../lib/feedback/prompt';

/**
 * Reports how long the camera stayed on when a Live session stops.
 * Call the returned function before leaving the page, because unmount and
 * pause can land in the same render and the effect would not see the stop.
 */
export function useLiveSessionEnd(
  live: boolean,
  onEnd: (durationMs: number) => void,
): () => void {
  const clock = useRef<LiveClock>({ startedAt: null });
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const next = noteLive(clock.current, live, Date.now());
    clock.current = next.clock;
    if (next.endedMs !== null) onEndRef.current(next.endedMs);
  }, [live]);

  return () => {
    const next = noteLive(clock.current, false, Date.now());
    clock.current = next.clock;
    if (next.endedMs !== null) onEndRef.current(next.endedMs);
  };
}
