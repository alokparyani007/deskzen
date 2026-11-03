import { useEffect, useState } from 'react';
import type { PosturePrint } from '../calibration/print';
import { sidebarStatus, type SidebarStatus } from '../app/sidebarStatus';
import { useCamera } from '../features/camera/camera-context';
import { useHomeMatch } from '../features/home/useHomeMatch';
import { useBaseline } from '../features/posture/baseline-context';
import { useSession } from '../features/session/session-context';
import { loadZenPrint } from '../features/zen2/zenPrint';
import type { PoseMode } from '../features/zen2/zenConfig';

/** Sitting or standing, the same way Home picks it. */
export function usePoseMode(): PoseMode {
  const { posture, chosenPosture, postureManual } = useSession();
  const shown = postureManual ? chosenPosture : posture;
  return shown === 'standing' ? 'stand' : 'sit';
}

/** Live status for the sidebar: the saved Posture Print plus the same match score Home shows. */
export function useSidebarStatus(): SidebarStatus | null {
  const camera = useCamera();
  const { landmarks, postureManual } = useSession();
  const { activeProfileId } = useBaseline();
  const mode = usePoseMode();
  const [print, setPrint] = useState<PosturePrint | null | undefined>(undefined);
  const live = camera.status === 'live';
  const { match, drifting } = useHomeMatch(print ?? null, landmarks, live, mode);

  useEffect(() => {
    let active = true;
    setPrint(undefined);
    void loadZenPrint(mode, activeProfileId, !postureManual).then((found) => {
      if (active) setPrint(found);
    });
    return () => {
      active = false;
    };
  }, [activeProfileId, mode, postureManual]);

  const kind = print === undefined ? 'loading' : !print ? 'none' : print.zen ? 'zen' : 'old';
  return sidebarStatus({ print: kind, live, match, drifting, mode });
}
