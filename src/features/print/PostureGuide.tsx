/**
 * Frame-check target: a full head-and-shoulders silhouette covering the whole video,
 * placed where a well-framed person sits (head ~22-48% down, shoulders ~62%, open at the bottom).
 * Drawn in a 160x90 (16:9) box so it scales with the video, not a small floating badge.
 */
export function PostureGuide({ solid }: { solid: boolean }) {
  const dash = solid ? undefined : '2.2 1.8';
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: solid ? 3 : 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: dash,
    vectorEffect: 'non-scaling-stroke' as const,
  };
  return (
    <svg
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full text-outline transition-opacity duration-300"
      style={{ filter: solid ? 'drop-shadow(0 0 6px rgba(16,185,129,0.8))' : 'drop-shadow(0 0 2px rgba(0,0,0,0.6))' }}
      aria-hidden="true"
    >
      {/* head */}
      <ellipse cx="80" cy="31" rx="10.5" ry="13" {...common} />
      {/* neck, shoulders and upper arms, open at the bottom edge */}
      <path d="M73.5 42.5 C73.5 49 71 52.5 63 54.5 C51 57 43 60 40.5 68 L37.5 90" {...common} />
      <path d="M86.5 42.5 C86.5 49 89 52.5 97 54.5 C109 57 117 60 119.5 68 L122.5 90" {...common} />
    </svg>
  );
}