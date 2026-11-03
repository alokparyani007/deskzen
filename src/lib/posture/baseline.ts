import { postureConfig } from './config';
import { dist, frameSignals } from './signals';
import type { Baseline, BaselineCode, BaselineResult, Landmark, Landmarks, NormPoint } from './types';

export function median(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const midIndex = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midIndex - 1]! + sorted[midIndex]!) / 2;
  }
  return sorted[midIndex]!;
}

function visible(point: Landmark | undefined): boolean {
  if (!point) return false;
  return point.visibility === undefined || point.visibility >= postureConfig.minVisibility;
}

export function isGoodCalibrationFrame(sample: Landmarks): boolean {
  if (sample.faceAmbiguous || sample.faceCount !== 1) return false;
  if (!visible(sample.nose) || !visible(sample.leftEye) || !visible(sample.rightEye)) return false;
  if (!visible(sample.leftShoulder) || !visible(sample.rightShoulder)) return false;
  const signals = frameSignals(sample);
  return (signals.ipdPx ?? 0) > 0;
}

function reject(code: BaselineCode, message: string): BaselineResult {
  return { ok: false, code, message };
}

export function computeBaseline(samples: Landmarks[]): BaselineResult {
  const { calibration, minVisibility } = postureConfig;
  if (samples.length < calibration.minSamples) {
    return reject('not-enough-frames', 'I did not get enough frames. Hold still for the full 3 seconds.');
  }

  const good = samples.filter(isGoodCalibrationFrame);
  const shoulderMisses = samples.filter(
    (sample) => !visible(sample.leftShoulder) || !visible(sample.rightShoulder),
  ).length;
  if (good.length / samples.length < calibration.minGoodFrameRatio) {
    if (shoulderMisses / samples.length > 0.3) {
      return reject(
        'cant-see-shoulders',
        "I can't see your shoulders. Sit back so both shoulders are in frame.",
      );
    }
    const visibilities = samples.flatMap((sample) =>
      [sample.nose, sample.leftEye, sample.rightEye, sample.leftShoulder, sample.rightShoulder]
        .map((point) => point?.visibility)
        .filter((value): value is number => typeof value === 'number'),
    );
    const meanVisibility =
      visibilities.length === 0 ? 0 : visibilities.reduce((sum, value) => sum + value, 0) / visibilities.length;
    if (meanVisibility < minVisibility) {
      return reject(
        'too-dark',
        "It's hard to see you. Turn toward a window or add a light, then try again.",
      );
    }
    return reject(
      'too-few-good-frames',
      "Let's try that again. Hold still where I can see your face and shoulders.",
    );
  }

  const signals = good.map((sample) => frameSignals(sample));
  const ipd = median(signals.map((item) => item.ipdPx).filter((value): value is number => value !== undefined));
  const noses = good.map((sample) => sample.nose).filter((point): point is Landmark => Boolean(point));
  const noseX = median(noses.map((point) => point.x));
  const noseY = median(noses.map((point) => point.y));
  const maxJitter = Math.max(...noses.map((point) => dist(point, { x: noseX, y: noseY })));
  if (!(ipd > 0) || maxJitter > calibration.maxNoseJitterIpd * ipd) {
    return reject('moved', 'You moved a little. Hold still and try again.');
  }

  const first = good[0]!;
  const pick = (values: Array<number | undefined>): number =>
    median(values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value)));

  const nose = medianPoint(good, (sample) => sample.nose);
  const leftEye = medianPoint(good, (sample) => sample.leftEye);
  const rightEye = medianPoint(good, (sample) => sample.rightEye);
  const leftShoulder = medianPoint(good, (sample) => sample.leftShoulder);
  const rightShoulder = medianPoint(good, (sample) => sample.rightShoulder);
  if (!nose || !leftEye || !rightEye || !leftShoulder || !rightShoulder) {
    return reject('too-few-good-frames', "Let's try that again. I lost part of you during the hold.");
  }

  const baseline: Baseline = {
    version: 1,
    createdAt: new Date().toISOString(),
    ipdPx: ipd,
    headDropNorm: pick(signals.map((item) => item.headDropNorm)),
    shrugNorm: pick(signals.map((item) => item.shrugNorm)),
    roundNorm: pick(signals.map((item) => item.roundNorm)),
    shoulderAngleDeg: pick(signals.map((item) => item.shoulderAngleDeg)),
    eyeAngleDeg: pick(signals.map((item) => item.eyeAngleDeg)),
    shoulderWidthPx: pick(signals.map((item) => item.shoulderWidthPx)),
    focalPx: pick(signals.map((item) => item.focalPx)),
    screenDistanceIn: pick(signals.map((item) => item.screenDistanceIn)),
    videoWidth: first.videoWidth,
    videoHeight: first.videoHeight,
    nose,
    leftEye,
    rightEye,
    leftEar: medianPoint(good, (sample) => sample.leftEar),
    rightEar: medianPoint(good, (sample) => sample.rightEar),
    leftShoulder,
    rightShoulder,
  };
  return { ok: true, baseline };
}

function medianPoint(
  samples: Landmarks[],
  pick: (sample: Landmarks) => Landmark | undefined,
): NormPoint | undefined {
  const points = samples
    .map((sample) => {
      const point = pick(sample);
      return point ? { point, sample } : undefined;
    })
    .filter((item): item is { point: Landmark; sample: Landmarks } => Boolean(item));
  if (points.length === 0) return undefined;
  return {
    x: median(points.map((item) => item.point.x / item.sample.videoWidth)),
    y: median(points.map((item) => item.point.y / item.sample.videoHeight)),
  };
}

export function ghostPoint(point: NormPoint, width: number, height: number): { x: number; y: number } {
  return { x: point.x * width, y: point.y * height };
}
