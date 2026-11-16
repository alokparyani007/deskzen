/**
 * Early trigger for local development: /live?feedback=1
 * Production builds constant-fold this to false, and unit tests cannot open it.
 */
export function feedbackPreviewFromSearch(search: string): boolean {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return false;
  const query = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(query).get('feedback') === '1';
}
