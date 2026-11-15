import { maxRoundPoints, roundPoints, summarize } from './scoring.ts';
import type { RunState } from './types.ts';
import { isDateKey } from './validate.ts';

export const TAGLINE = 'Four objects. One wrong size.';

/** Transparent score bands, documented in Help. Percent of the round's maximum. */
export const BANDS = [
  { min: 90, symbol: '🟦', name: 'Spot on', range: '90–100' },
  { min: 70, symbol: '🟩', name: 'Close', range: '70–89' },
  { min: 40, symbol: '🟨', name: 'Partly', range: '40–69' },
  { min: 0, symbol: '⬜', name: 'Way off', range: '0–39' },
] as const;

export function bandIndex(percent: number): number {
  const i = BANDS.findIndex((b) => percent >= b.min);
  return i < 0 ? BANDS.length - 1 : i;
}

export function roundPercents(run: RunState): number[] {
  const max = maxRoundPoints(run.variant);
  return run.results.map((r) => Math.round((roundPoints(r) / max) * 100));
}

export function buildChallengeUrl(base: string, date: string, claimedScore?: number): string {
  const root = base.replace(/[/?#]+$/, '');
  const frag = typeof claimedScore === 'number' && Number.isFinite(claimedScore) ? `#s=${Math.round(claimedScore)}` : '';
  return `${root}/?d=${date}${frag}`;
}

export interface Challenge {
  date: string | null;
  /** A friend's claimed score. Client-supplied, so always treated as unverified. */
  claimed: number | null;
}

export function parseChallenge(search: string, hash: string): Challenge {
  const d = new URLSearchParams(search).get('d');
  const m = /^#s=(\d{1,3})$/.exec(hash);
  const claimed = m ? Number(m[1]) : null;
  return {
    date: isDateKey(d) ? d : null,
    claimed: claimed !== null && claimed >= 0 && claimed <= 500 ? claimed : null,
  };
}

/**
 * Spoiler-free by construction: only the edition, totals and band symbols go in.
 * No object names, measurements or answers are ever passed to this function.
 */
export function buildShareText(run: RunState, edition: number, url: string): string {
  const s = summarize(run.results, run.variant, run.sceneRefs.length);
  const line2 = run.variant === 'A' ? `${s.score}/${s.max} · ${s.found}/${s.rounds} spotted` : `${s.score}/${s.max} · resize-only playtest`;
  const symbols = roundPercents(run)
    .map((p) => BANDS[bandIndex(p)].symbol)
    .join('');
  return [`MISFIT #${edition}`, line2, symbols, TAGLINE, url].join('\n');
}
