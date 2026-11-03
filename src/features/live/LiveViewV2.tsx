import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { playLockIn, speakCaption, stopSpeech } from '../calibrate/glowVoice';
import { CameraStage } from '../camera/CameraStage';
import { useCamera } from '../camera/camera-context';
import { CameraPausedBar } from '../print/CameraPausedBar';
import { PrivacyCard } from '../print/PrivacyCard';
import { OutlineSvg, useStageBox } from '../zen2/OutlineSvg';
import { StepPill, ZenStage } from '../zen2/ZenStage';
import { zenConfig } from '../zen2/zenConfig';
import { CoachLine, CornerMatchRing, TrackStatusPill } from './LiveChrome';
import { useLiveV2 } from './useLiveV2';

const MUTE_KEY = 'sitglow.glowMuted';

export function LiveViewV2() {
  usePageTitle('Live view');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const debugOn = params.get('debug') === '1';
  const camera = useCamera();
  const model = useLiveV2(debugOn);
  const stage = useStageBox();
  const [voice, setVoiceState] = useState(() => window.localStorage.getItem(MUTE_KEY) !== '1');

  const setVoice = (value: boolean) => {
    window.localStorage.setItem(MUTE_KEY, value ? '0' : '1');
    setVoiceState(value);
    if (!value) stopSpeech();
  };

  useEffect(() => {
    if (!voice || !model.spoken) return;
    speakCaption(model.spoken.text, false);
    if (model.spoken.text.startsWith('Nice')) playLockIn();
  }, [model.spoken, voice]);

  const leave = (path: string) => {
    camera.pause();
    navigate(path);
  };

  if (!model.live && camera.status !== 'paused') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stage p-6">
        <div className="rounded-3xl bg-white">
          <PrivacyCard status={camera.status} errorName={camera.errorName} onStart={() => void camera.start()} onLeave={() => navigate('/app')} />
        </div>
      </div>
    );
  }

  const needsZen = model.ready && !model.print?.zen;
  const oldPrint = Boolean(model.print && !model.print.zen);
  const videoW = model.landmarks?.videoWidth || camera.resolution?.width || 1280;
  const videoH = model.landmarks?.videoHeight || camera.resolution?.height || 720;
  const pose = model.mode === 'stand' ? 'Standing' : 'Sitting';

  return (
    <ZenStage
      center={<StepPill label={`Live view · ${pose}`} />}
      onClose={() => leave('/app')}
      voice={voice}
      onVoice={setVoice}
      showVoice
      debug={model.debug}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] px-[2%] pb-2">
        <div ref={stage.ref} className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-black">
          <CameraStage landmarks={model.landmarks} alignment={null} showGuides={false} showLandmarks={false} frame="fill" chrome="bare" />
          {model.outline ? (
            <OutlineSvg
              saved={model.outline}
              live={model.liveOutline}
              amber={model.drifting}
              arrow={model.arrow}
              marks={model.shoulders}
              videoWidth={videoW}
              videoHeight={videoH}
              viewWidth={stage.width}
              viewHeight={stage.height}
              bottomInset={zenConfig.live.bottomInset}
            />
          ) : null}
          {model.print?.zen ? (
            <>
              <CornerMatchRing percent={model.fit} drifting={model.drifting} />
              {model.statusLabel ? <TrackStatusPill label={model.statusLabel} drifting={model.drifting} /> : null}
            </>
          ) : null}
          {model.framing ? <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-sm backdrop-blur-md">{model.framing}</p> : null}
          {needsZen ? (
            <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6">
              <div className="w-full max-w-md rounded-2xl bg-dock p-5 text-white backdrop-blur-md">
                <h2 className="text-2xl font-semibold">{oldPrint ? 'Set your Zen again' : 'Set your Zen first'}</h2>
                <p className="mt-1 text-base text-white/80">{oldPrint ? 'DeskZen has a new, more accurate outline.' : 'It takes about 30 seconds so I know your best posture.'}</p>
                <button type="button" className="mt-4 inline-flex h-12 items-center rounded-full bg-print px-5 text-lg font-semibold" onClick={() => navigate(`/set-my-zen?pose=${model.mode}&from=live`)}>
                  Set my Zen
                </button>
              </div>
            </div>
          ) : null}
          {!needsZen && model.caption ? <CoachLine text={model.caption} loud={model.captionLoud} /> : null}
        </div>
      </div>
      <CameraPausedBar live={model.live} video={camera.videoElement} lastLandmarkMs={model.wallMs} />
    </ZenStage>
  );
}
