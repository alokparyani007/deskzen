function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function miniMirrorKind(
  host: { documentPictureInPicture?: unknown },
  pipEnabled: boolean,
  canCapture: boolean,
): 'document' | 'video' | 'none' {
  if (host.documentPictureInPicture) return 'document';
  if (pipEnabled && canCapture) return 'video';
  return 'none';
}

export async function openScoreWidget(
  video: HTMLVideoElement,
  readLabel: () => string,
  readPosture: () => 'sitting' | 'standing' = () => 'sitting',
): Promise<'open' | 'unsupported'> {
  const host = window as Window & {
    documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> };
  };
  const kind = miniMirrorKind(host, document.pictureInPictureEnabled, typeof HTMLCanvasElement.prototype.captureStream === 'function');
  if (kind === 'document' && host.documentPictureInPicture) {
    const pip = await host.documentPictureInPicture.requestWindow({ width: 280, height: 180 });
    paintLoop(pip, video, readLabel, readPosture);
    return 'open';
  }
  if (kind !== 'video') return 'unsupported';
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const stream = canvas.captureStream(5);
  const pipVideo = document.createElement('video');
  pipVideo.srcObject = stream;
  pipVideo.muted = true;
  await pipVideo.play();
  await pipVideo.requestPictureInPicture();
  const ctx = canvas.getContext('2d');
  let frame = 0;
  const draw = () => {
    if (!ctx || document.pictureInPictureElement !== pipVideo) return;
    drawFrame(ctx, canvas.width, canvas.height, video, readLabel, readPosture);
    frame = window.requestAnimationFrame(draw);
  };
  draw();
  pipVideo.addEventListener('leavepictureinpicture', () => window.cancelAnimationFrame(frame), { once: true });
  return 'open';
}

function paintLoop(
  pip: Window,
  video: HTMLVideoElement,
  readLabel: () => string,
  readPosture: () => 'sitting' | 'standing',
): void {
  const canvas = pip.document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 180;
  pip.document.body.style.margin = '0';
  pip.document.body.style.position = 'relative';
  pip.document.body.style.fontFamily = 'sans-serif';
  pip.document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const draw = () => {
    if (!ctx || pip.closed) return;
    drawFrame(ctx, canvas.width, canvas.height, video, readLabel, readPosture);
    pip.requestAnimationFrame(draw);
  };
  draw();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  video: HTMLVideoElement,
  readLabel: () => string,
  readPosture: () => 'sitting' | 'standing',
): void {
  const ink = cssColor('--color-ink', 'CanvasText');
  const surface = cssColor('--color-surface', 'Canvas');
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, width, height);
  if (video.videoWidth > 0) {
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  }
  const standing = readPosture() === 'standing';
  ctx.fillStyle = ink;
  ctx.font = '600 28px sans-serif';
  ctx.fillText(readLabel(), 16, 36);
  ctx.font = '600 16px sans-serif';
  ctx.fillStyle = cssColor(standing ? '--color-sky-brand' : '--color-brand', standing ? '#38bdf8' : '#047857');
  ctx.fillText(standing ? 'Standing' : 'Sitting', 16, height - 18);
}
