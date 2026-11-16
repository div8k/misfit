import type { GameObject, Measure } from '../engine/types.ts';

// Shared helpers for the object catalogue. Sizes are normalised to millimetres here, once.

export const CHECKED = '2026-11-15';
export const inch = (n: number) => n * 25.4;
const ART_AUTHOR = 'Original drawing made for MISFIT';
const ART_LICENSE = 'Project-owned original artwork';

export type Spec = Omit<GameObject, 'viewBox' | 'bounds' | 'artAuthor' | 'artLicense' | 'status' | 'retrieved' | 'measure'> & {
  measure?: Measure;
};

export function make(s: Spec): GameObject {
  return {
    ...s,
    measure: s.measure ?? 'width',
    viewBox: [0, 0, s.widthMm, s.heightMm],
    bounds: { x: 0, y: 0, w: 1, h: 1 },
    artAuthor: ART_AUTHOR,
    artLicense: ART_LICENSE,
    status: 'verified',
    retrieved: CHECKED,
  };
}

export function ball(d: number, details: string): string {
  const r = d / 2;
  return `<circle cx="${r}" cy="${r}" r="${r}"/>${details}`;
}
