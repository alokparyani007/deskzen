/** Great at 85 and above, Good from 70, otherwise Fair. Same bands as the match score. */
export function outlineAccuracyLabel(score: number): 'Great' | 'Good' | 'Fair' {
  if (!Number.isFinite(score) || score < 70) return 'Fair';
  if (score >= 85) return 'Great';
  return 'Good';
}

/** A landmark fallback never claims Great, even when the lock score is high. */
export function shownOutlineAccuracy(score: number, fallback: boolean): 'Great' | 'Good' | 'Fair' {
  const label = outlineAccuracyLabel(score);
  return fallback && label === 'Great' ? 'Good' : label;
}

export const ZEN_SET_VOICE = "Your Zen is set. I'll help you get back to it.";
