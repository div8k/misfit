// Core data types. Nothing in src/engine or src/content imports React.

export type Measure = 'width' | 'height' | 'diameter';
export type VerificationStatus = 'verified' | 'unverified';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'daily' | 'practice';
/** A = identify then repair. B = resize a target that is already identified. */
export type Variant = 'A' | 'B';
export type Phase = 'identify' | 'repair' | 'reveal' | 'results';

export interface GameObject {
  id: string;
  /** Label displayed under the drawing. Names the exact model/standard. */
  label: string;
  /** Lower-case name used inside sentences, e.g. "AA battery". */
  noun: string;
  /** Inner SVG markup. Original artwork, authored in the viewBox below. */
  art: string;
  viewBox: [number, number, number, number];
  /** Fraction of the viewBox the object itself occupies (padding excluded). */
  bounds: { x: number; y: number; w: number; h: number };
  /** True size in millimetres. Units are normalised once, in the catalogue. */
  widthMm: number;
  heightMm: number;
  /** Which dimension is quoted to the player. */
  measure: Measure;
  definition: string;
  sourceShortName: string;
  sourceTitle: string;
  sourceUrl: string;
  /** ISO date the source was last checked, or null if it has not been. */
  retrieved: string | null;
  notes: string;
  artAuthor: string;
  artLicense: string;
  status: VerificationStatus;
}

export interface Scene {
  id: string;
  /** Immutable: change the content, bump the version. */
  version: number;
  title: string;
  /** Fixed display order: top-left, top-right, bottom-left, bottom-right. */
  objectIds: [string, string, string, string];
  misfitId: string;
  /** Displayed size / true size for the misfit. */
  distortion: number;
  /** Shared scale: width in mm that every one of the four cells represents. */
  layout: { extentMm: number };
  difficulty: Difficulty;
  explanation: string;
}

export interface SceneRef {
  id: string;
  version: number;
}

export interface DailyManifest {
  /** UTC date key, YYYY-MM-DD. */
  date: string;
  version: number;
  scenes: SceneRef[];
  scoringVersion: number;
  /** 'public' requires verified content. 'demo' is prototype-only. */
  status: 'demo' | 'public';
  /** True when produced by the seeded preview schedule, not hand-edited. */
  generated: boolean;
}

/** A scene joined with its objects and ready to render and score. */
export interface ResolvedScene {
  ref: string;
  id: string;
  version: number;
  title: string;
  objects: GameObject[];
  misfitId: string;
  distortion: number;
  extentMm: number;
  difficulty: Difficulty;
  explanation: string;
}

export interface RoundResult {
  sceneRef: string;
  pickedId: string | null;
  /** null in variant B, where nothing is identified. */
  identified: boolean | null;
  idPoints: number;
  t: number;
  /** submitted dimension / true dimension */
  ratio: number;
  repairPoints: number;
}

export interface RunState {
  v: 1;
  mode: Mode;
  variant: Variant;
  date: string;
  /** Seed of this player's game ('' for practice). Friend links carry it. */
  seed: string;
  /** date + seed + scoring version the run started with. */
  puzzleKey: string;
  sceneRefs: string[];
  round: number;
  phase: Phase;
  selectedId: string | null;
  pending: { pickedId: string | null; identified: boolean | null; idPoints: number } | null;
  t: number;
  results: RoundResult[];
  completed: boolean;
}

export interface Issue {
  level: 'error' | 'warn';
  code: string;
  ref: string;
  message: string;
}
