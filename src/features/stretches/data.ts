export type StretchCategory = 'Neck' | 'Shoulders' | 'Back' | 'Wrists' | 'Eyes' | 'Legs';

export interface Stretch {
  id: string;
  name: string;
  category: StretchCategory;
  durationSeconds: number;
  steps: readonly string[];
  note: string;
  image?: string;
}

export interface Routine {
  id: string;
  name: string;
  stretchIds: readonly string[];
}

export const stretchCategories: readonly StretchCategory[] = ['Neck', 'Shoulders', 'Back', 'Wrists', 'Eyes', 'Legs'];

export const stretches: readonly Stretch[] = [
  {
    id: 'neck-nod',
    name: 'Easy neck nods',
    category: 'Neck',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/neck-nod.jpg',
    steps: ['Sit tall with both feet on the floor.', 'Look down gently, then back to level.', 'Move slowly. Stop if it feels sharp.', 'Return your gaze to the screen.'],
  },
  {
    id: 'neck-turn',
    name: 'Look left and right',
    category: 'Neck',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/neck-turn.jpg',
    steps: ['Keep your shoulders quiet.', 'Turn your head to the left and pause.', 'Come back to center, then turn right.', 'Finish looking straight ahead.'],
  },
  {
    id: 'neck-side',
    name: 'Side neck stretch',
    category: 'Neck',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/neck-side-stretch.jpg',
    steps: ['Sit tall and relax your shoulders.', 'Gently tilt your ear toward your shoulder.', 'Hold and breathe slowly.', 'Switch sides.'],
  },
  {
    id: 'shoulder-rolls',
    name: 'Shoulder rolls',
    category: 'Shoulders',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    steps: ['Let your arms hang heavy.', 'Roll both shoulders up, back, and down.', 'Make five slow circles.', 'Let them rest away from your ears.'],
  },
  {
    id: 'shoulder-open',
    name: 'Open the chest',
    category: 'Shoulders',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/shoulder-open.jpg',
    steps: ['Clasp your hands behind your back if that is easy.', 'Draw your shoulders back slightly.', 'Lift your chest and breathe.', 'Release and sit tall.'],
  },
  {
    id: 'back-reach',
    name: 'Seated reach',
    category: 'Back',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/seated-twist.jpg',
    steps: ['Sit toward the front of the chair.', 'Reach both arms overhead.', 'Lengthen your side as you breathe out.', 'Lower your arms slowly.'],
  },
  {
    id: 'back-fold',
    name: 'Easy forward fold',
    category: 'Back',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    steps: ['Scoot to the edge of the chair.', 'Hinge forward and let your hands rest on your legs.', 'Soften your neck.', 'Roll back up one vertebra at a time.'],
  },
  {
    id: 'seated-twist',
    name: 'Seated twist',
    category: 'Back',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    image: '/media/stretches/seated-twist.jpg',
    steps: ['Sit tall with both feet on the floor.', 'Gently turn your chest to one side.', 'Come back to center, then turn the other way.', 'Finish facing the screen.'],
  },
  {
    id: 'wrist-circles',
    name: 'Wrist circles',
    category: 'Wrists',
    durationSeconds: 20,
    note: 'May help you feel looser.',
    steps: ['Hold your forearms in front of you.', 'Circle both wrists one way.', 'Reverse the circles.', 'Shake your hands out.'],
  },
  {
    id: 'wrist-prayer',
    name: 'Palm press',
    category: 'Wrists',
    durationSeconds: 20,
    note: 'May help you feel looser.',
    steps: ['Press your palms together at your chest.', 'Lower the hands until you feel a gentle stretch.', 'Hold and breathe.', 'Shake your wrists loose.'],
    image: '/media/stretches/wrist-stretch.jpg',
  },
  {
    id: 'eye-soft',
    name: 'Soft gaze',
    category: 'Eyes',
    durationSeconds: 20,
    note: 'May help you feel looser.',
    image: '/media/stretches/eye-rest.jpg',
    steps: ['Look away from the screen at something far away.', 'Blink a few easy blinks.', 'Then look near, then far again.', 'Return when you are ready.'],
  },
  {
    id: 'eye-palms',
    name: 'Palm rest',
    category: 'Eyes',
    durationSeconds: 20,
    note: 'May help you feel looser.',
    steps: ['Rub your palms until they feel warm.', 'Cup them lightly over closed eyes.', 'Breathe slowly.', 'Open your eyes toward the room, then the screen.'],
  },
  {
    id: 'leg-ankles',
    name: 'Ankle circles',
    category: 'Legs',
    durationSeconds: 20,
    note: 'May help you feel looser.',
    steps: ['Keep one foot on the floor.', 'Lift the other foot and circle the ankle.', 'Switch feet.', 'Place both feet flat again.'],
  },
  {
    id: 'leg-stand',
    name: 'Stand and shift',
    category: 'Legs',
    durationSeconds: 30,
    note: 'May help you feel looser.',
    steps: ['Stand up beside your chair.', 'Shift your weight from one foot to the other.', 'Take one slow breath here.', 'Sit back down with both feet flat.'],
    image: '/media/stretches/standing-calf-stretch.jpg',
  },
];

export const routines: readonly Routine[] = [
  { id: 'reset-2', name: '2 minute reset', stretchIds: ['shoulder-rolls', 'neck-turn', 'wrist-circles', 'eye-soft', 'leg-stand'] },
  { id: 'reset-3', name: '3 minute reset', stretchIds: ['neck-nod', 'shoulder-open', 'back-reach', 'wrist-prayer', 'eye-palms', 'leg-ankles'] },
];

export function routineDuration(routine: Routine, catalog: readonly Stretch[] = stretches): number {
  return routine.stretchIds.reduce((sum, id) => sum + (catalog.find((item) => item.id === id)?.durationSeconds ?? 0), 0);
}

export function stretchById(id: string): Stretch | undefined {
  return stretches.find((item) => item.id === id);
}

export function stretchesIn(routine: Routine): Stretch[] {
  return routine.stretchIds
    .map((id) => stretches.find((item) => item.id === id))
    .filter((item): item is Stretch => item !== undefined);
}
