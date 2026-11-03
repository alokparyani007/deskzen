import type { Landmark, Landmarks, Point2D } from '../posture/types';
import { pitchDegFromMatrix, yawDegFromMatrix } from './pitch';

export interface RawLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export const POSE_INDEX = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
} as const;

const RIGHT_IRIS = [468, 469, 470, 471, 472];
const LEFT_IRIS = [473, 474, 475, 476, 477];

export interface RawFrame {
  pose?: RawLandmark[];
  faces?: RawLandmark[][];
  /** One column-major 4x4 matrix per face, same order as faces. */
  facialMatrices?: ArrayLike<number>[];
  timestampMs: number;
  videoWidth: number;
  videoHeight: number;
}

function toPixel(point: RawLandmark, width: number, height: number): Landmark {
  return {
    x: point.x * width,
    y: point.y * height,
    z: point.z,
    visibility: point.visibility,
  };
}

function at(
  landmarks: RawLandmark[] | undefined,
  index: number,
  width: number,
  height: number,
): Landmark | undefined {
  const point = landmarks?.[index];
  if (!point) return undefined;
  return toPixel(point, width, height);
}

function faceBoxArea(face: RawLandmark[]): number {
  const xs = face.map((point) => point.x);
  const ys = face.map((point) => point.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function horizontalDiameterPx(face: RawLandmark[], indexes: number[], width: number): number | undefined {
  const xs = indexes
    .map((index) => face[index]?.x)
    .filter((value): value is number => typeof value === 'number');
  if (xs.length < 2) return undefined;
  return (Math.max(...xs) - Math.min(...xs)) * width;
}

function irisCenter(face: RawLandmark[], indexes: number[], width: number, height: number): Point2D | undefined {
  const center = face[indexes[0]!];
  if (!center) return undefined;
  return { x: center.x * width, y: center.y * height };
}

export function extractLandmarks(frame: RawFrame): Landmarks {
  const { videoWidth, videoHeight } = frame;
  const faces = frame.faces ?? [];
  const areas = faces.map(faceBoxArea);
  let chosen: RawLandmark[] | undefined = faces[0];
  let chosenIndex = faces.length === 1 ? 0 : -1;
  let faceAmbiguous = false;
  if (faces.length > 1) {
    const ranked = areas
      .map((area, index) => ({ area, index }))
      .sort((a, b) => b.area - a.area);
    const largest = ranked[0]!;
    const second = ranked[1]!;
    faceAmbiguous = second.area > largest.area * 0.8;
    chosen = faceAmbiguous ? undefined : faces[largest.index];
    chosenIndex = faceAmbiguous ? -1 : largest.index;
  }
  const span = faceSpan(chosen, videoHeight);

  return {
    timestampMs: frame.timestampMs,
    videoWidth,
    videoHeight,
    faceCount: faces.length,
    faceAmbiguous,
    poseCount: frame.pose?.length ?? 0,
    nose: at(frame.pose, POSE_INDEX.nose, videoWidth, videoHeight),
    leftEye: at(frame.pose, POSE_INDEX.leftEye, videoWidth, videoHeight),
    rightEye: at(frame.pose, POSE_INDEX.rightEye, videoWidth, videoHeight),
    leftEar: at(frame.pose, POSE_INDEX.leftEar, videoWidth, videoHeight),
    rightEar: at(frame.pose, POSE_INDEX.rightEar, videoWidth, videoHeight),
    leftShoulder: at(frame.pose, POSE_INDEX.leftShoulder, videoWidth, videoHeight),
    rightShoulder: at(frame.pose, POSE_INDEX.rightShoulder, videoWidth, videoHeight),
    leftElbow: at(frame.pose, POSE_INDEX.leftElbow, videoWidth, videoHeight),
    rightElbow: at(frame.pose, POSE_INDEX.rightElbow, videoWidth, videoHeight),
    leftWrist: at(frame.pose, POSE_INDEX.leftWrist, videoWidth, videoHeight),
    rightWrist: at(frame.pose, POSE_INDEX.rightWrist, videoWidth, videoHeight),
    leftHip: at(frame.pose, POSE_INDEX.leftHip, videoWidth, videoHeight),
    rightHip: at(frame.pose, POSE_INDEX.rightHip, videoWidth, videoHeight),
    chin: chosen ? at(chosen, 152, videoWidth, videoHeight) : undefined,
    headTop: chosen ? at(chosen, 10, videoWidth, videoHeight) : undefined,
    leftFace: chosen ? at(chosen, 234, videoWidth, videoHeight) : undefined,
    rightFace: chosen ? at(chosen, 454, videoWidth, videoHeight) : undefined,
    leftIrisCenter: chosen ? irisCenter(chosen, LEFT_IRIS, videoWidth, videoHeight) : undefined,
    rightIrisCenter: chosen ? irisCenter(chosen, RIGHT_IRIS, videoWidth, videoHeight) : undefined,
    leftIrisDiameterPx: chosen ? horizontalDiameterPx(chosen, LEFT_IRIS, videoWidth) : undefined,
    rightIrisDiameterPx: chosen ? horizontalDiameterPx(chosen, RIGHT_IRIS, videoWidth) : undefined,
    faceTopPx: span.faceTopPx,
    faceHeightPx: span.faceHeightPx,
    faceBox: span.faceBox,
    pitchDeg: chosenIndex >= 0 ? pitchDegFromMatrix(frame.facialMatrices?.[chosenIndex]) : undefined,
    yawDeg: chosenIndex >= 0 ? yawDegFromMatrix(frame.facialMatrices?.[chosenIndex]) : undefined,
  };
}

function faceSpan(face: RawLandmark[] | undefined, height: number): Pick<Landmarks, 'faceTopPx' | 'faceHeightPx' | 'faceBox'> {
  if (!face || face.length === 0) return {};
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const point of face) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  return {
    faceTopPx: minY * height,
    faceHeightPx: (maxY - minY) * height,
    faceBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
  };
}
