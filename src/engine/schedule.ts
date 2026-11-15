import { largestDim, requiredExtent } from './geometry.ts';
import { SCORING_VERSION } from './scoring.ts';
import type { DailyManifest, GameObject, Issue, ResolvedScene, Scene } from './types.ts';
import { hasErrors, isDateKey, validateManifest, validateScene } from './validate.ts';

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

export function resolveScene(scene: Scene, objects: Record<string, GameObject>, refSuffix = ''): ResolvedScene | null {
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

const REMIX_DISTORTIONS = [0.62, 0.7, 0.78, 1.3, 1.42, 1.55];

/**
 * Development preview only: re-uses a demo fixture with a different, seeded
 * misfit and distortion so repeat playtests are not identical. This is fixture
 * repetition, not fresh hand-edited content, and it can never be published.
 */
export function remixScene(scene: Scene, objects: Record<string, GameObject>, seed: string): Scene {
  const rand = rng(`${seed}:${scene.id}`);
  const objs = scene.objectIds.map((id) => objects[id]).filter(Boolean);
  if (objs.length !== 4) return scene;
  const biggest = Math.max(...objs.map(largestDim));
  const options = shuffle(
    scene.objectIds.flatMap((id) => REMIX_DISTORTIONS.map((d) => ({ id, d }))),
    rand,
  );
  for (const { id, d } of options) {
    const need = requiredExtent(objs, id, d);
    if (need > biggest * 2.4) continue; // would make the whole exhibit tiny
    const pct = Math.round(d * 100);
    const candidate: Scene = {
      ...scene,
      misfitId: id,
      distortion: d,
      layout: { extentMm: Math.ceil(need) },
      explanation: `In this preview remix the ${objects[id].noun} was drawn at ${pct}% of its real size.`,
    };
    if (!hasErrors(validateScene(candidate, objects))) return candidate;
  }
  return scene;
}

export function previewManifest(c: Catalog, date: string): DailyManifest {
  const order = shuffle(c.demoSceneIds, rng(`order:${date}`)).slice(0, 5);
  return {
    date,
    version: 1,
    scenes: order.map((id) => ({ id, version: c.scenes[id]?.version ?? 0 })),
    scoringVersion: SCORING_VERSION,
    status: 'demo',
    generated: true,
  };
}

export type Daily =
  | { ok: true; manifest: DailyManifest; scenes: ResolvedScene[]; puzzleKey: string }
  | { ok: false; reason: 'invalid-date' | 'not-published' | 'invalid-content'; issues: Issue[] };

/** The same date always yields the same scenes, order and distortions, on every device. */
export function getDaily(c: Catalog, date: string, today: string): Daily {
  if (!isDateKey(date)) return { ok: false, reason: 'invalid-date', issues: [] };
  if (date < c.epoch || date > today) return { ok: false, reason: 'not-published', issues: [] };
  const authored = c.manifests.find((m) => m.date === date);
  const manifest = authored ?? previewManifest(c, date);
  const issues = validateManifest(manifest, c.scenes, c.objects);
  if (hasErrors(issues)) return { ok: false, reason: 'invalid-content', issues };
  const scenes: ResolvedScene[] = [];
  for (const r of manifest.scenes) {
    const base = c.scenes[r.id];
    const scene = manifest.generated ? remixScene(base, c.objects, date) : base;
    const resolved = resolveScene(scene, c.objects, manifest.generated ? `~${date}` : '');
    if (!resolved) return { ok: false, reason: 'invalid-content', issues };
    scenes.push(resolved);
  }
  return { ok: true, manifest, scenes, puzzleKey: `${date}:m${manifest.version}:s${manifest.scoringVersion}` };
}

export function getPractice(c: Catalog): { ok: true; scenes: ResolvedScene[]; puzzleKey: string } | { ok: false; issues: Issue[] } {
  const scene = c.scenes[c.tutorialId];
  const issues = scene ? validateScene(scene, c.objects) : [{ level: 'error' as const, code: 'scene.missing', ref: c.tutorialId, message: 'Tutorial scene missing' }];
  const resolved = scene && !hasErrors(issues) ? resolveScene(scene, c.objects) : null;
  if (!resolved) return { ok: false, issues };
  return { ok: true, scenes: [resolved], puzzleKey: `practice:${resolved.ref}` };
}
