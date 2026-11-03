/**
 * Pitch from a Face Landmarker 4x4 matrix.
 * MediaPipe stores the matrix column-major, the same order WebGL consumes.
 * Positive pitch means the face is tilted up.
 */
export function pitchDegFromMatrix(data: ArrayLike<number> | undefined): number | undefined {
  if (!data || data.length < 11) return undefined;
  const pitch = Math.atan2(-data[9]!, data[10]!);
  const deg = (pitch * 180) / Math.PI;
  return Number.isFinite(deg) ? deg : undefined;
}

/** Yaw from the same column-major face matrix. Positive yaw turns the face to the side. */
export function yawDegFromMatrix(data: ArrayLike<number> | undefined): number | undefined {
  if (!data || data.length < 11) return undefined;
  const yaw = Math.atan2(data[8]!, data[0]!);
  const deg = (yaw * 180) / Math.PI;
  return Number.isFinite(deg) ? deg : undefined;
}
