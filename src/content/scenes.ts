import type { DailyManifest, Scene } from '../engine/types.ts';

// Five handcrafted demonstration scenes plus one tutorial scene.
// `distortion` is displayed size ÷ true size of the misfit.
// `layout.extentMm` is the shared scale: the width, in millimetres, that every
// cell of the scene represents. The validator checks it is large enough for the
// misfit to be resized across the whole slider without leaving its cell.

export const TUTORIAL_ID = 'tutorial-pocket';

const list: Scene[] = [
  {
    id: TUTORIAL_ID,
    version: 1,
    title: 'Pocket exhibit',
    objectIds: ['credit-card', 'golf-ball', 'aa-battery', 'tt-ball'],
    misfitId: 'aa-battery',
    distortion: 0.6,
    layout: { extentMm: 108 },
    difficulty: 'easy',
    explanation: 'An AA battery is taller than a golf ball is wide, and almost as long as a payment card is tall. This one was drawn at 60% of its real size.',
  },
  {
    id: 'desk-drawer',
    version: 1,
    title: 'Desk drawer',
    objectIds: ['credit-card', 'sd-card', 'aa-battery', 'nine-volt'],
    misfitId: 'sd-card',
    distortion: 1.45,
    layout: { extentMm: 162 },
    difficulty: 'easy',
    explanation: 'A full-size SD card is only 32 mm tall, far shorter than either battery. It was drawn 45% too large, nearly the height of the 9-volt.',
  },
  {
    id: 'media-shelf',
    version: 1,
    title: 'Media shelf',
    objectIds: ['cd', 'floppy', 'cassette', 'vhs'],
    misfitId: 'cassette',
    distortion: 0.7,
    layout: { extentMm: 208 },
    difficulty: 'medium',
    explanation: 'An audio cassette is wider than a 3½-inch floppy disk: about 100 mm against 90 mm. It was drawn at 70% of its real size.',
  },
  {
    id: 'wallet',
    version: 1,
    title: 'Travel wallet',
    objectIds: ['dollar-bill', 'credit-card', 'passport', 'cd'],
    misfitId: 'credit-card',
    distortion: 0.7,
    layout: { extentMm: 175 },
    difficulty: 'medium',
    explanation: 'A payment card is almost exactly as wide as a closed passport (85.6 mm against 88 mm). It was drawn at 70% of its real size.',
  },
  {
    id: 'games-cupboard',
    version: 1,
    title: 'Games cupboard',
    objectIds: ['bowling-pin', 'basketball', 'flying-disc', 'vinyl-lp'],
    misfitId: 'basketball',
    distortion: 0.78,
    layout: { extentMm: 655 },
    difficulty: 'medium',
    explanation: 'A size 7 basketball is about 24 cm across: not far short of an Ultimate disc, and nearly two-thirds the height of a bowling pin. It was drawn at 78% of its real size.',
  },
  {
    id: 'ball-bag',
    version: 1,
    title: 'Ball bag',
    objectIds: ['tennis-ball', 'golf-ball', 'baseball', 'pool-ball'],
    misfitId: 'golf-ball',
    distortion: 1.35,
    layout: { extentMm: 200 },
    difficulty: 'hard',
    explanation: 'A golf ball is the smallest ball here by a clear margin, at under 43 mm. It was drawn 35% too large, about the size of the pool ball.',
  },
];

export const SCENES: Record<string, Scene> = Object.fromEntries(list.map((s) => [s.id, s]));

/** The five daily-capable demo scenes (the tutorial is never in a daily). */
export const DEMO_SCENE_IDS = list.filter((s) => s.id !== TUTORIAL_ID).map((s) => s.id);

/** First edition date. Edition #1. */
export const EPOCH = '2026-11-15';

/** Hand-edited manifests. Every other date falls back to the seeded preview schedule. */
export const MANIFESTS: DailyManifest[] = [
  {
    date: EPOCH,
    version: 1,
    scenes: DEMO_SCENE_IDS.map((id) => ({ id, version: SCENES[id].version })),
    scoringVersion: 1,
    status: 'demo',
    generated: false,
  },
];
