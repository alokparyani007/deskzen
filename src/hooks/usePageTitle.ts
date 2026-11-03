import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title === 'Home' ? 'DeskZen' : `${title} · DeskZen`;
  }, [title]);
}
