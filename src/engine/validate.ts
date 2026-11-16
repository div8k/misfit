import { cellWidthPx, largestDim, MIN_LEGIBLE_PX, requiredExtent, smallestShownMm, VIEWPORTS } from './geometry.ts';
import { SCORING_VERSION, T_MAX } from './scoring.ts';
import type { DailyManifest, GameObject, Issue, ResolvedScene, Scene } from './types.ts';

const pos = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;
const text = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The misfit must be visibly wrong, and its fix must sit well inside the slider. */
export const MIN_LOG_DISTORTION = Math.log(1.15);
export const MAX_LOG_DISTORTION = T_MAX - Math.log(1.25);
export const MAX_SIZE_RATIO = 3.5;

export function isDateKey(s: unknown): s is string {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function validateObject(o: GameObject): Issue[] {
  const out: Issue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, ref: o?.id ?? '?', message });
  if (!o || !text(o.id)) return [{ level: 'error', code: 'object.id', ref: '?', message: 'Object has no id' }];
  if (!text(o.label) || !text(o.noun)) err('object.label', 'Missing label or noun');
  if (!text(o.art) || !/<(path|rect|circle|ellipse|polygon)\b/.test(o.art)) err('object.art', 'Artwork is blank');
  // Artwork is injected as SVG markup, so it may contain shapes only: no scripts, handlers, links or embeds.
  if (text(o.art) && /<\s*(script|foreignObject|iframe|image|use|a|style|animate|set)\b|\bon[a-z]+\s*=|javascript:|href\s*=|url\s*\(/i.test(o.art)) {
    err('object.artUnsafe', 'Artwork may only contain plain shapes');
  }
  if (!Array.isArray(o.viewBox) || o.viewBox.length !== 4 || !pos(o.viewBox[2]) || !pos(o.viewBox[3])) {
    err('object.viewBox', 'viewBox must have positive width and height');
  }
  const b = o.bounds;
  if (!b || !pos(b.w) || !pos(b.h) || b.x < 0 || b.y < 0 || b.x + b.w > 1 + 1e-9 || b.y + b.h > 1 + 1e-9) {
    err('object.bounds', 'Normalised bounds must lie inside the viewBox');
  }
  if (!pos(o.widthMm) || !pos(o.heightMm)) {
    err('object.dimensions', 'True width and height must be positive');
  } else {
    const aspect = o.widthMm / o.heightMm;
    if (aspect > 12 || aspect < 1 / 12) err('object.aspect', 'Aspect ratio outside 1:12 – 12:1');
    if (out.length === 0) {
      const artAspect = (o.viewBox[2] * b.w) / (o.viewBox[3] * b.h);
      if (Math.abs(artAspect / aspect - 1) > 0.01) err('object.artAspect', 'Artwork proportions do not match the true dimensions');
    }
  }
  if (!['width', 'height', 'diameter'].includes(o.measure)) err('object.measure', 'Unknown measured dimension');
  if (!text(o.definition)) err('object.definition', 'Missing model/standard definition');
  if (!text(o.sourceTitle) || !text(o.sourceShortName)) err('object.source', 'Missing source title');
  if (!text(o.sourceUrl) || !/^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/.test(o.sourceUrl)) err('object.sourceUrl', 'Missing or invalid source URL');
  if (!text(o.artAuthor) || !text(o.artLicense)) err('object.artMeta', 'Missing illustration author or licence');
  if (!/^#[0-9A-Fa-f]{6}$/.test(o.color ?? '') || (o.tone !== 'light' && o.tone !== 'dark')) err('object.color', 'Colour must be #RRGGBB with a light or dark tone');
  if (o.status !== 'verified' && o.status !== 'unverified') err('object.status', 'Unknown verification status');
  if (o.retrieved !== null && !isDateKey(o.retrieved)) err('object.retrieved', 'Retrieved date must be YYYY-MM-DD or null');
  if (o.status === 'verified' && o.retrieved === null) err('object.verified', 'Verified objects need a retrieved date');
  return out;
}

export function validateScene(scene: Scene, objects: Record<string, GameObject>): Issue[] {
  const ref = `${scene?.id ?? '?'}@${scene?.version ?? '?'}`;
  const out: Issue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, ref, message });
  if (!scene || !text(scene.id) || !Number.isInteger(scene.version) || scene.version < 1) {
    return [{ level: 'error', code: 'scene.id', ref, message: 'Scene needs an id and an integer version' }];
  }
  const ids = scene.objectIds;
  if (!Array.isArray(ids) || ids.length !== 4 || new Set(ids).size !== 4) {
    err('scene.objects', 'A scene needs exactly four distinct objects');
    return out;
  }
  const objs: GameObject[] = [];
  for (const id of ids) {
    const o = objects[id];
    if (!o) err('scene.missingObject', `Unknown object "${id}"`);
    else {
      objs.push(o);
      out.push(...validateObject(o));
    }
  }
  if (ids.filter((id) => id === scene.misfitId).length !== 1) err('scene.misfit', 'Exactly one of the four objects must be the misfit');
  if (!pos(scene.distortion)) err('scene.distortion', 'Distortion must be a positive number');
  if (!text(scene.explanation) || !text(scene.title)) err('scene.text', 'Missing title or explanation');
  if (!['easy', 'medium', 'hard'].includes(scene.difficulty)) err('scene.difficulty', 'Unknown difficulty');
  if (out.some((i) => i.level === 'error')) return out;

  const logD = Math.abs(Math.log(scene.distortion));
  if (logD < MIN_LOG_DISTORTION) err('scene.subtle', 'Distortion is too small to be a fair misfit');
  if (logD > MAX_LOG_DISTORTION) err('scene.unreachable', 'Correct size is not comfortably inside the slider range');

  const dims = objs.map(largestDim);
  const ratio = Math.max(...dims) / Math.min(...dims);
  if (ratio > MAX_SIZE_RATIO) err('scene.sizeRatio', `True sizes differ by ${ratio.toFixed(1)}:1 (limit about 3:1)`);
  else if (ratio > 3) out.push({ level: 'warn', code: 'scene.sizeRatio', ref, message: `True sizes differ by ${ratio.toFixed(1)}:1` });

  const need = requiredExtent(objs, scene.misfitId, scene.distortion);
  if (!pos(scene.layout?.extentMm) || scene.layout.extentMm < need - 1e-6) {
    err('scene.extent', `Shared scale too tight: the resized misfit would leave its cell (needs ≥ ${need.toFixed(1)} mm)`);
  } else {
    const small = smallestShownMm(objs, scene.misfitId, scene.distortion);
    for (const vp of VIEWPORTS) {
      const px = (small * cellWidthPx(vp)) / scene.layout.extentMm;
      if (px < MIN_LEGIBLE_PX) err('scene.legibility', `Smallest silhouette is ${px.toFixed(1)}px at ${vp}px wide (minimum ${MIN_LEGIBLE_PX}px)`);
    }
  }
  return out;
}

export function sceneIsVerified(scene: Scene | ResolvedScene, objects: Record<string, GameObject>): boolean {
  const ids = 'objectIds' in scene ? scene.objectIds : scene.objects.map((o) => o.id);
  return ids.every((id) => objects[id]?.status === 'verified');
}

export function validateManifest(
  m: DailyManifest,
  scenes: Record<string, Scene>,
  objects: Record<string, GameObject>,
  mode: 'demo' | 'public' = m?.status ?? 'demo',
): Issue[] {
  const ref = `manifest ${m?.date ?? '?'}`;
  const out: Issue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, ref, message });
  if (!m || !isDateKey(m.date)) return [{ level: 'error', code: 'manifest.date', ref, message: 'Manifest needs a valid UTC date' }];
  if (m.scoringVersion !== SCORING_VERSION) err('manifest.scoring', 'Unknown scoring version');
  if (!Array.isArray(m.scenes) || m.scenes.length !== 5) {
    err('manifest.count', 'A daily manifest needs exactly five scenes');
    return out;
  }
  if (new Set(m.scenes.map((s) => s.id)).size !== 5) err('manifest.duplicate', 'Scenes must be distinct');
  for (const r of m.scenes) {
    const s = scenes[r.id];
    if (!s) err('manifest.missingScene', `Unknown scene "${r.id}"`);
    else if (s.version !== r.version) err('manifest.version', `Scene "${r.id}" is v${s.version}, manifest wants v${r.version}`);
    else {
      out.push(...validateScene(s, objects));
      if (mode === 'public' && !sceneIsVerified(s, objects)) {
        err('manifest.unverified', `Scene "${r.id}" uses unverified measurements and cannot be published`);
      }
    }
  }
  if (mode === 'public' && m.generated) err('manifest.generated', 'Seeded preview manifests cannot be published');
  return out;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === 'error');
