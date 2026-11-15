/** Where Set my Zen goes once the outline is saved. */
export function destinationAfterZen(input: { signedIn: boolean; from: string | null }): '/live' | 'done' {
  // Guests who came from the public site (no in-app "from") go straight into Live view.
  if (!input.signedIn && !input.from) return '/live';
  return 'done';
}
