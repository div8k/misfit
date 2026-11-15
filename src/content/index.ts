import type { Catalog } from '../engine/schedule.ts';
import { OBJECTS } from './objects.ts';
import { DEMO_SCENE_IDS, EPOCH, MANIFESTS, SCENES, TUTORIAL_ID } from './scenes.ts';

export const CATALOG: Catalog = {
  objects: OBJECTS,
  scenes: SCENES,
  manifests: MANIFESTS,
  epoch: EPOCH,
  tutorialId: TUTORIAL_ID,
  demoSceneIds: DEMO_SCENE_IDS,
};
