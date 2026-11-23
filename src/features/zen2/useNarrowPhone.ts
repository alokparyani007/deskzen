import { useEffect, useState } from 'react';

const QUERY = '(max-width: 599px)';

/** True below 600px. Starts false during server render so a laptop paint is unchanged. */
export function useNarrowPhone(): boolean {
  const [narrow, setNarrow] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches));

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return narrow;
}
