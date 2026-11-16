import type { RoundResult, Variant } from './types.ts';

export const SCORING_VERSION = 2;
export const ID_POINTS = 40;
export const REPAIR_POINTS = 60;
/** Full credit inside the multiplicative interval [1/1.10, 1.10]. */
export const TOLERANCE = 1.1;
/** How quickly points fall away outside the tolerance (gentler than the original 3). */
export const DECAY = 2;

// Slider: multiplier = exp(t), t in [ln 0.4, ln 2.5], symmetric around 0.
export const T_MAX = Math.log(2.5);
export const T_MIN = -T_MAX;
export const SLIDER_STEPS = 184; // per side
export const T_STEP = T_MAX / SLIDER_STEPS; // about 0.5% per step

export function clampT(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.min(T_MAX, Math.max(T_MIN, t));
}

export function tToStep(t: number): number {
  return Math.round(clampT(t) / T_STEP);
}

export function stepToT(step: number): number {
  return clampT(Math.round(step) * T_STEP);
}

function assertPositive(n: number, name: string): void {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new RangeError(`${name} must be a positive finite number`);
  }
}

/** ratio = submitted / true. Throws on zero, negative or non-finite input. */
export function ratioOf(submitted: number, truth: number): number {
  assertPositive(submitted, 'submitted dimension');
  assertPositive(truth, 'true dimension');
  const r = submitted / truth;
  assertPositive(r, 'ratio');
  return r;
}

export function repairPointsForRatio(r: number): number {
  assertPositive(r, 'ratio');
  // Tiny epsilon so the interval ends themselves earn full credit despite float error.
  const e = Math.max(0, Math.abs(Math.log(r)) - Math.log(TOLERANCE) - 1e-12);
  const pts = Math.round(REPAIR_POINTS * Math.exp(-DECAY * e));
  return Math.min(REPAIR_POINTS, Math.max(0, pts));
}

export function repairPoints(submitted: number, truth: number): number {
  return repairPointsForRatio(ratioOf(submitted, truth));
}

export function identifyPoints(correct: boolean): number {
  return correct ? ID_POINTS : 0;
}

export function withinTolerance(r: number): boolean {
  return Math.abs(Math.log(r)) <= Math.log(TOLERANCE) + 1e-12;
}

export function maxRoundPoints(variant: Variant): number {
  return variant === 'A' ? ID_POINTS + REPAIR_POINTS : REPAIR_POINTS;
}

export function roundPoints(r: RoundResult): number {
  return r.idPoints + r.repairPoints;
}

export interface Summary {
  score: number;
  max: number;
  found: number;
  rounds: number;
  repair: number;
  repairMax: number;
}

export function summarize(results: RoundResult[], variant: Variant, rounds: number): Summary {
  return {
    score: results.reduce((s, r) => s + roundPoints(r), 0),
    max: rounds * maxRoundPoints(variant),
    found: results.filter((r) => r.identified === true).length,
    rounds,
    repair: results.reduce((s, r) => s + r.repairPoints, 0),
    repairMax: rounds * REPAIR_POINTS,
  };
}

export interface Career {
  played: number;
  /** Average and best as a percentage of the maximum, so variants A and B can sit together. */
  averagePercent: number;
  bestPercent: number;
}

export function career(runs: { results: RoundResult[]; variant: Variant; sceneRefs: string[] }[]): Career {
  const pcts = runs.map((r) => {
    const s = summarize(r.results, r.variant, r.sceneRefs.length);
    return (s.score / s.max) * 100;
  });
  return {
    played: pcts.length,
    averagePercent: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
    bestPercent: pcts.length ? Math.round(Math.max(...pcts)) : 0,
  };
}

export type Verdict = { kind: 'big' | 'small'; percent: number } | { kind: 'right' };

export function verdictFor(r: number): Verdict {
  if (withinTolerance(r)) return { kind: 'right' };
  if (r > 1) return { kind: 'big', percent: Math.max(1, Math.round((r - 1) * 100)) };
  return { kind: 'small', percent: Math.max(1, Math.round((1 - r) * 100)) };
}

export function verdictText(v: Verdict): string {
  if (v.kind === 'right') return 'Right on scale';
  return `${v.percent}% too ${v.kind}`;
}
