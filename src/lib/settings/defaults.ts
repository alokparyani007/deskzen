export type WorkStyle = 'sit' | 'mixed' | 'stand';
export type Sensitivity = 'gentle' | 'balanced' | 'strict';
export type NudgeDelaySeconds = 15 | 30 | 60;
export type StillnessChoice = 0 | 30 | 45 | 60;
export type IntervalPreset = 'balanced' | 'easy' | 'focus' | 'custom';
export type CameraMode = 'always' | 'spot' | 'off';
export type SpotEveryMin = 1 | 5 | 10 | 15 | 30 | 60;
export type SpotLengthSec = 10 | 15 | 20;

/** One store for every DeskZen preference. Saved on this device only. */
export interface AppSettings {
  name: string;
  workStyle: WorkStyle;
  tracking: boolean;
  sensitivity: Sensitivity;
  nudgeDelaySeconds: NudgeDelaySeconds;
  showLandmarks: boolean;
  /** Sit and stand: DeskZen notices when you stand or sit and follows along. */
  autoDetect: boolean;
  deskHeightTips: boolean;
  stillnessMinutes: StillnessChoice;
  intervalsOn: boolean;
  intervalPreset: IntervalPreset;
  customSitMin: number;
  customStandMin: number;
  customMoveMin: number;
  noStandingDesk: boolean;
  dailySwitchGoal: number;
  eyeRest: boolean;
  eyeRestMinutes: number;
  water: boolean;
  waterMinutes: number;
  stretchSuggestions: boolean;
  notifications: boolean;
  /** Voice tips (spoken coaching). On for a new DeskZen. Shown as "Voice tips" everywhere. */
  sound: boolean;
  miniWidget: boolean;
  delayWhileBusy: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
  breakMinutes: number;
  standBreakMinutes: number;
  devSpeed10x: boolean;
  /** Kept in sync with sensitivity so older session code keeps working. */
  strictness: number | null;
  /** A soft chime with posture nudges. Separate from voice tips. */
  chime: boolean;
  distanceAlerts: boolean;
  cameraMode: CameraMode;
  spotEveryMin: SpotEveryMin;
  spotLengthSec: SpotLengthSec;
  /** Date.getDay() values. 1–5 is Monday through Friday. */
  spotWorkDays: number[];
  spotSkipFocus: boolean;
  spotSound: boolean;
  /** Last camera the user picked. Empty uses the browser default. */
  cameraDeviceId: string;
  /** Live view starts Guide me back after 30 seconds away from your Zen. */
  autoGuideBack: boolean;
  /** Move breaks can be turned off. */
  moveBreaks: boolean;
  /** Spot checks can be turned off while the camera mode stays Spot check. */
  spotChecks: boolean;
  /** Work hours for the day dial and reminders (24-hour "HH:MM"). */
  workStart: string;
  workEnd: string;
  /** Bumped when saved settings need a one-time migration. */
  settingsVersion: number;
}

export const defaultSettings: AppSettings = {
  name: '',
  workStyle: 'sit',
  tracking: true,
  sensitivity: 'balanced',
  nudgeDelaySeconds: 30,
  showLandmarks: true,
  autoDetect: true,
  deskHeightTips: true,
  stillnessMinutes: 0,
  intervalsOn: false,
  intervalPreset: 'easy',
  customSitMin: 45,
  customStandMin: 15,
  customMoveMin: 2,
  noStandingDesk: false,
  dailySwitchGoal: 6,
  eyeRest: false,
  eyeRestMinutes: 20,
  water: false,
  waterMinutes: 60,
  stretchSuggestions: true,
  notifications: false,
  sound: true,
  miniWidget: true,
  delayWhileBusy: true,
  quietHours: false,
  quietStart: '21:00',
  quietEnd: '07:00',
  breakMinutes: 45,
  standBreakMinutes: 40,
  devSpeed10x: false,
  strictness: 60,
  chime: false,
  distanceAlerts: true,
  cameraMode: 'spot',
  spotEveryMin: 15,
  spotLengthSec: 10,
  spotWorkDays: [1, 2, 3, 4, 5],
  spotSkipFocus: true,
  spotSound: false,
  cameraDeviceId: '',
  autoGuideBack: true,
  moveBreaks: true,
  spotChecks: true,
  workStart: '09:00',
  workEnd: '18:00',
  settingsVersion: 2,
};

export function strictnessFor(sensitivity: Sensitivity): number {
  if (sensitivity === 'gentle') return 0;
  if (sensitivity === 'strict') return 100;
  return 60;
}
