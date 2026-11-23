/**
 * Phone camera box. Desktop passes narrow=false and gets no inline style,
 * so the 1440 layout stays on its existing classes.
 * The box uses the camera's own aspect, so object-cover shows the whole frame
 * and the outline stays in the same mapping.
 */
export function phoneFrameStyle(narrow: boolean, width: number, height: number): { aspectRatio: string } | undefined {
  if (!narrow) return undefined;
  const w = width > 0 ? width : 4;
  const h = height > 0 ? height : 3;
  return { aspectRatio: `${w} / ${h}` };
}
