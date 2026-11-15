import { getDaily, getPractice, type Catalog } from './schedule.ts';
import type { Store } from './storage.ts';
import type { Mode, ResolvedScene, RunState } from './types.ts';

export type Session =
  | { status: 'ok'; run: RunState; scenes: ResolvedScene[]; puzzleKey: string; stale: boolean }
  | { status: 'none'; scenes: ResolvedScene[]; puzzleKey: string }
  | { status: 'problem' }
  | { status: 'unavailable' };

/** Load the saved run (if any) for a puzzle together with its content. */
export function loadSession(store: Store, c: Catalog, mode: Mode, date: string, today: string): Session {
  const content = mode === 'daily' ? getDaily(c, date, today) : getPractice(c);
  if (!content.ok) return { status: 'unavailable' };
  const loaded = store.loadRun(mode, date);
  if (!loaded.ok) {
    store.discardRun(mode, date);
    return { status: 'problem' };
  }
  if (!loaded.run) return { status: 'none', scenes: content.scenes, puzzleKey: content.puzzleKey };
  const run = loaded.run;
  const matches =
    run.puzzleKey === content.puzzleKey &&
    run.sceneRefs.length === content.scenes.length &&
    run.sceneRefs.every((r, i) => r === content.scenes[i].ref);
  if (!matches && !run.completed) {
    store.discardRun(mode, date);
    return { status: 'problem' };
  }
  return { status: 'ok', run, scenes: content.scenes, puzzleKey: content.puzzleKey, stale: !matches };
}

export type Resume =
  | { kind: 'none' }
  | { kind: 'problem' }
  | { kind: 'resume'; run: RunState; scenes: ResolvedScene[]; stale: boolean };

/**
 * What to show on load. An active run keeps the puzzle date it started with,
 * even if UTC midnight has passed since.
 */
export function resumeActive(store: Store, c: Catalog, today: string): Resume {
  const p = store.getActive();
  if (!p) return { kind: 'none' };
  const s = loadSession(store, c, p.mode, p.date, today);
  if (s.status === 'ok') return { kind: 'resume', run: s.run, scenes: s.scenes, stale: s.stale };
  store.setActive(null);
  return s.status === 'none' ? { kind: 'none' } : { kind: 'problem' };
}
