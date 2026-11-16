import { formatMm, largestDim, measured, measureWord, requiredExtent } from './geometry.ts';
import { SCORING_VERSION } from './scoring.ts';
import type { DailyManifest, GameObject, Issue, ResolvedScene, Scene } from './types.ts';
import { hasErrors, isDateKey, validateManifest, validateObject, validateScene } from './validate.ts';

export interface Catalog {
  objects: Record<string, GameObject>;
  scenes: Record<string, Scene>;
  manifests: DailyManifest[];
  epoch: string;
  tutorialId: string;
  demoSceneIds: string[];
}

const DAY = 86_400_000;

/** One worldwide daily: the key is the UTC calendar date. */
export function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
}

export function editionFor(date: string, epoch: string): number {
  return daysBetween(epoch, date) + 1;
}

/** The instant the next daily appears (next UTC midnight). */
export function nextRefresh(now: Date): Date {
  return new Date(Date.parse(`${addDays(utcDateKey(now), 1)}T00:00:00Z`));
}

/** The refresh instant in the player's own time zone, e.g. "Sun 7:00 PM". */
export function formatRefreshLocal(at: Date, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone }).format(at);
}

export function formatDateLabel(key: string, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${key}T00:00:00Z`),
  );
}

// --- deterministic PRNG (same on every device) ---
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function resolveScene(scene: Scene | undefined, objects: Record<string, GameObject>, refSuffix = ''): ResolvedScene | null {
  if (!scene) return null;
  const objs = scene.objectIds.map((id) => objects[id]);
  if (objs.some((o) => !o)) return null;
  return {
    ref: `${scene.id}@${scene.version}${refSuffix}`,
    id: scene.id,
    version: scene.version,
    title: scene.title,
    objects: objs,
    misfitId: scene.misfitId,
    distortion: scene.distortion,
    extentMm: scene.layout.extentMm,
    difficulty: scene.difficulty,
    explanation: scene.explanation,
  };
}

/** Distortions the generator may apply: all clearly wrong, all fixable well inside the slider. */
export const GEN_DISTORTIONS = [0.6, 0.66, 0.72, 0.78, 1.28, 1.36, 1.45, 1.55];
/** Generated rounds keep true sizes within 3:1 and never shrink the whole exhibit too far. */
const GEN_MAX_RATIO = 3;
const GEN_MAX_EXTENT = 2.4;
export const SEED_RE = /^[a-z0-9]{1,16}$/;
/** Reserved seed: the five hand-made demonstration scenes, in their edited order. */
export const DEMO_SEED = 'demo';

/**
 * Build one generated round, or null if this combination is not a fair, legible scene.
 * Only catalogue objects and their documented sizes are used: nothing is invented.
 */
export function buildRound(c: Catalog, ids: string[], misfitId: string, distortion: number, n = 1): Scene | null {
  const objs = ids.map((id) => c.objects[id]);
  if (objs.length !== 4 || objs.some((o) => !o)) return null;
  const dims = objs.map(largestDim);
  const biggest = Math.max(...dims);
  if (biggest / Math.min(...dims) > GEN_MAX_RATIO) return null;
  const need = requiredExtent(objs, misfitId, distortion);
  if (!(need <= biggest * GEN_MAX_EXTENT)) return null;
  const m = c.objects[misfitId];
  if (!m) return null;
  const scene: Scene = {
    id: `gen:${ids.join('+')}:${misfitId}:${distortion}`,
    version: 1,
    title: `Exhibit ${n}`,
    objectIds: ids as Scene['objectIds'],
    misfitId,
    distortion,
    layout: { extentMm: Math.ceil(need) },
    difficulty: Math.abs(Math.log(distortion)) > Math.log(1.4) ? 'easy' : 'medium',
    explanation: `The ${m.noun} was drawn at ${Math.round(distortion * 100)}% of its real size. A real one is ${formatMm(measured(m))} ${measureWord(m)}.`,
  };
  return hasErrors(validateScene(scene, c.objects)) ? null : scene;
}

/**
 * Five generated rounds from a seed. The same key gives the same game on every
 * device, which is what lets a friend link reproduce a player's exact rounds.
 * No object appears twice in a game: five rounds show twenty different objects.
 */
export function generateGame(c: Catalog, key: string): Scene[] | null {
  const rand = rng(key);
  const ids = Object.keys(c.objects).sort();
  const size = (id: string) => largestDim(c.objects[id]);
  const rounds: Scene[] = [];
  const used = new Set<string>();
  for (let attempt = 0; attempt < 400 && rounds.length < 5; attempt++) {
    const free = shuffle(
      ids.filter((id) => !used.has(id)),
      rand,
    );
    if (free.length < 4) return null;
    // Start from one object, then add others whose sizes keep the group within 3:1.
    const quad = [free[0]];
    let lo = size(free[0]);
    let hi = lo;
    for (const id of free.slice(1)) {
      const d = size(id);
      if (Math.max(hi, d) / Math.min(lo, d) > GEN_MAX_RATIO) continue;
      quad.push(id);
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
      if (quad.length === 4) break;
    }
    if (quad.length < 4) continue;
    const order = shuffle(quad, rand);
    const options = shuffle(
      order.flatMap((id) => GEN_DISTORTIONS.map((d) => ({ id, d }))),
      rand,
    );
    for (const { id, d } of options) {
      const scene = buildRound(c, order, id, d, rounds.length + 1);
      if (!scene) continue;
      rounds.push(scene);
      for (const q of order) used.add(q);
      break;
    }
  }
  return rounds.length === 5 ? rounds : null;
}

export type Daily =
  | { ok: true; seed: string; generated: boolean; scenes: ResolvedScene[]; puzzleKey: string }
  | { ok: false; reason: 'invalid-date' | 'invalid-seed' | 'not-published' | 'invalid-content'; issues: Issue[] };

/**
 * A day's game for one seed. Each player gets their own random seed per day;
 * the same date + seed always yields the same scenes, order and distortions.
 */
export function getDaily(c: Catalog, date: string, today: string, seed: string = DEMO_SEED): Daily {
  if (!isDateKey(date)) return { ok: false, reason: 'invalid-date', issues: [] };
  if (typeof seed !== 'string' || !SEED_RE.test(seed)) return { ok: false, reason: 'invalid-seed', issues: [] };
  if (date < c.epoch || date > today) return { ok: false, reason: 'not-published', issues: [] };
  const puzzleKey = `${date}:g${seed}:s${SCORING_VERSION}`;
  if (seed === DEMO_SEED) {
    const manifest = c.manifests[0];
    const issues = manifest ? validateManifest(manifest, c.scenes, c.objects) : [];
    if (!manifest || hasErrors(issues)) return { ok: false, reason: 'invalid-content', issues };
    const scenes = manifest.scenes.map((r) => resolveScene(c.scenes[r.id], c.objects));
    if (scenes.some((s) => !s)) return { ok: false, reason: 'invalid-content', issues };
    return { ok: true, seed, generated: false, scenes: scenes as ResolvedScene[], puzzleKey };
  }
  const objectIssues = Object.values(c.objects).flatMap(validateObject);
  if (hasErrors(objectIssues)) return { ok: false, reason: 'invalid-content', issues: objectIssues };
  const game = generateGame(c, `${date}:${seed}`);
  if (!game) return { ok: false, reason: 'invalid-content', issues: [] };
  const scenes = game.map((s) => resolveScene(s, c.objects));
  if (scenes.some((s) => !s)) return { ok: false, reason: 'invalid-content', issues: [] };
  return { ok: true, seed, generated: true, scenes: scenes as ResolvedScene[], puzzleKey };
}

export function getPractice(c: Catalog): { ok: true; scenes: ResolvedScene[]; puzzleKey: string } | { ok: false; issues: Issue[] } {
  const scene = c.scenes[c.tutorialId];
  const issues = scene ? validateScene(scene, c.objects) : [{ level: 'error' as const, code: 'scene.missing', ref: c.tutorialId, message: 'Tutorial scene missing' }];
  const resolved = scene && !hasErrors(issues) ? resolveScene(scene, c.objects) : null;
  if (!resolved) return { ok: false, issues };
  return { ok: true, scenes: [resolved], puzzleKey: `practice:${resolved.ref}` };
}
