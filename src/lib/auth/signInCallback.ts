/**
 * True when this page load is a successful sign-in redirect.
 * Looks only at the shape of the URL. The tokens themselves are never stored or forwarded.
 * Implicit links put access_token in the hash. PKCE links have a code plus a saved verifier.
 */
export function isSignInCallback(href: string, hasPkceVerifier = false): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const error = hash.get('error') || hash.get('error_code') || url.searchParams.get('error') || url.searchParams.get('error_code');
  if (error) return false;
  if (hash.get('access_token') && hash.get('refresh_token')) return true;
  return hasPkceVerifier && url.searchParams.has('code');
}
