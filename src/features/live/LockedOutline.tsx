import { toGuideSpace } from '../../calibration/setupCheck';
import { headEllipse, type LockedPose } from '../../calibration/lockedPose';
import type { NormPoint } from '../../lib/posture/types';

/** Dashed emerald silhouette of the pose the user locked in. */
export function LockedOutline({
  pose,
  hot,
  reduced,
}: {
  pose: LockedPose;
  hot: 'none' | 'head' | 'shoulders' | 'good';
  reduced: boolean;
}) {
  const head = headEllipse(pose);
  const guide = (point: NormPoint) => {
    const xPx = (1 - point.x) * pose.videoWidth;
    const yPx = point.y * pose.videoHeight;
    return toGuideSpace(xPx, yPx, pose.videoWidth, pose.videoHeight);
  };
  const top = guide(pose.headTop ?? { x: pose.nose.x, y: head.cy - head.ry });
  const chin = guide(pose.chin ?? { x: pose.nose.x, y: head.cy + head.ry });
  const leftFace = guide(pose.leftFace ?? pose.leftEye);
  const rightFace = guide(pose.rightFace ?? pose.rightEye);
  const left = guide(pose.leftShoulder);
  const right = guide(pose.rightShoulder);
  const ear = guide(pose.leftEar ?? pose.rightEar ?? { x: head.cx, y: head.cy + head.ry * 0.8 });
  const cx = (leftFace.x + rightFace.x) / 2;
  const cy = (top.y + chin.y) / 2;
  const rx = Math.max(0.02, Math.abs(rightFace.x - leftFace.x) / 2);
  const ry = Math.max(0.02, Math.abs(chin.y - top.y) / 2);
  const neck = { x: cx, y: Math.max(ear.y, cy + ry * 0.7) };
  const glow = hot === 'good' && !reduced ? 'drop-shadow-[0_0_8px_var(--color-print)]' : '';
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" className={`pointer-events-none absolute inset-0 h-full w-full text-print ${glow}`} aria-hidden="true">
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="currentColor" strokeWidth="0.004" strokeDasharray="0.004 0.012" />
      <path
        d={`M ${neck.x} ${neck.y} L ${left.x} ${left.y} L ${Math.min(0.02, left.x - 0.08)} 1 M ${neck.x} ${neck.y} L ${right.x} ${right.y} L ${Math.max(0.98, right.x + 0.08)} 1`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.004"
        strokeLinecap="round"
        strokeDasharray="0.004 0.012"
        className={hot === 'shoulders' ? 'text-glow' : ''}
      />
      {hot === 'head' ? <ellipse cx={cx} cy={cy} rx={rx + 0.01} ry={ry + 0.01} fill="none" stroke="var(--color-glow)" strokeWidth="0.008" opacity="0.7" /> : null}
      <g transform={`translate(${Math.min(0.72, cx + rx + 0.02)} ${Math.max(0.08, cy - ry)})`}>
        <rect width="0.22" height="0.06" rx="0.03" fill="var(--color-print)" />
        <text x="0.11" y="0.04" textAnchor="middle" fill="white" fontSize="0.028" fontFamily="Inter, sans-serif">
          Your best posture
        </text>
      </g>
    </svg>
  );
}
