import { T_MAX, T_MIN } from './scoring.ts';
import type { GameObject } from './types.ts';

// One layout for every cell of every scene. A cell's drawing area represents
// extentMm × (extentMm × ASPECT) millimetres; all four cells share extentMm,
// so all four objects share exactly one pixels-per-millimetre multiplier.
export const ASPECT = 0.82; // drawing-area height / width
export const BASELINE = 0.93; // baseline position as a fraction of height
export const FIT_W = 0.9; // usable fraction of width
export const FIT_H = 0.88; // usable fraction of height (above the baseline)

export const VIEWPORTS = [320, 390, 768, 1440];
export const PAGE_MAX = 640;
export const BOARD_MAX = 520;
export const GUTTER = 16;
export const CELL_GAP = 10;
/** Smallest allowed on-screen size (px) of any object's larger dimension. */
export const MIN_LEGIBLE_PX = 12;

export function cellWidthPx(viewport: number): number {
  const page = Math.min(viewport - 2 * GUTTER, PAGE_MAX, BOARD_MAX);
  return (page - CELL_GAP) / 2;
}

export function measured(o: GameObject): number {
  return o.measure === 'height' ? o.heightMm : o.widthMm;
}

export function largestDim(o: GameObject): number {
  return Math.max(o.widthMm, o.heightMm);
}

/** Smallest extentMm that keeps every object inside its cell for the whole slider range. */
export function requiredExtent(objects: GameObject[], misfitId: string, distortion: number): number {
  let maxW = 0;
  let maxH = 0;
  for (const o of objects) {
    const k = o.id === misfitId ? distortion * Math.exp(T_MAX) : 1;
    maxW = Math.max(maxW, o.widthMm * k);
    maxH = Math.max(maxH, o.heightMm * k);
  }
  return Math.max(maxW / FIT_W, maxH / (FIT_H * ASPECT));
}

/** Smallest larger-dimension (mm) any object reaches, including the misfit at the slider minimum. */
export function smallestShownMm(objects: GameObject[], misfitId: string, distortion: number): number {
  let min = Infinity;
  for (const o of objects) {
    const k = o.id === misfitId ? distortion * Math.exp(T_MIN) : 1;
    min = Math.min(min, largestDim(o) * k);
  }
  return min;
}

export interface Placement {
  /** SVG transform for the art group, in a viewBox of extentMm × extentMm·ASPECT. */
  transform: string;
  widthMm: number;
  heightMm: number;
}

/** Place an object bottom-centre on the shared baseline at `scale` × its true size. */
export function place(o: GameObject, extentMm: number, scale: number): Placement {
  const [vx, vy, vw, vh] = o.viewBox;
  const artW = vw * o.bounds.w;
  const artH = vh * o.bounds.h;
  // Uniform scale on both axes: art units → millimetres.
  const s = (o.widthMm * scale) / artW;
  const w = artW * s;
  const h = artH * s;
  const left = extentMm / 2 - w / 2;
  const top = extentMm * ASPECT * BASELINE - h;
  const tx = left - (vx + vw * o.bounds.x) * s;
  const ty = top - (vy + vh * o.bounds.y) * s;
  return { transform: `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})`, widthMm: w, heightMm: h };
}

export function formatMm(mm: number): string {
  if (!Number.isFinite(mm) || mm <= 0) return '—';
  if (mm < 100) return `${mm.toFixed(1)} mm`;
  return `${(mm / 10).toFixed(1)} cm`;
}

export function measureWord(o: GameObject): string {
  return o.measure === 'diameter' ? 'across' : o.measure === 'height' ? 'tall' : 'wide';
}
