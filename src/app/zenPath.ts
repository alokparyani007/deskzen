/** The Set my Zen flow. /calibrate stays so older links keep working. */
export function isZenPath(path: string): boolean {
  return path === '/calibrate' || path.startsWith('/calibrate/') || path.startsWith('/set-my-zen');
}
