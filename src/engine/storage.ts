import { addDays } from './schedule.ts';
import { T_MAX, T_MIN } from './scoring.ts';
import type { Mode, RunState, Variant } from './types.ts';
import { isDateKey } from './validate.ts';

// Versioned localStorage records. Everything lives on this device only.
export const PREFIX = 'misfit:v1:';
const RUN = `${PREFIX}run:`;
const ACTIVE = `${PREFIX}active`;
const SETTINGS = `${PREFIX}settings`;

export interface StorageLike {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export interface Settings {
  sound: boolean;
  reduceMotion: boolean;
  variant: Variant;
}
export const DEFAULT_SETTINGS: Settings = { sound: false, reduceMotion: false, variant: 'A' };

export interface ActivePointer {
  mode: Mode;
  date: string;
}

export type LoadResult = { ok: true; run: RunState | null } | { ok: false };

export function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    key: (i) => Array.from(m.keys())[i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Structural check of a saved run; anything odd is treated as corrupted. */
export function isRunState(x: unknown): x is RunState {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (r.v !== 1) return false;
  if (r.mode !== 'daily' && r.mode !== 'practice') return false;
  if (r.variant !== 'A' && r.variant !== 'B') return false;
  if (!isDateKey(r.date) || typeof r.puzzleKey !== 'string') return false;
  if (!Array.isArray(r.sceneRefs) || r.sceneRefs.length < 1 || !r.sceneRefs.every((s) => typeof s === 'string')) return false;
  if (!Number.isInteger(r.round) || (r.round as number) < 0 || (r.round as number) >= r.sceneRefs.length) return false;
  if (!['identify', 'repair', 'reveal', 'results'].includes(r.phase as string)) return false;
  if (r.selectedId !== null && typeof r.selectedId !== 'string') return false;
  if (!isNum(r.t) || r.t < T_MIN - 1e-9 || r.t > T_MAX + 1e-9) return false;
  if (typeof r.completed !== 'boolean' || !Array.isArray(r.results)) return false;
  for (const q of r.results as Record<string, unknown>[]) {
    if (!q || typeof q !== 'object') return false;
    if (!isNum(q.idPoints) || !isNum(q.repairPoints) || !isNum(q.ratio) || !isNum(q.t) || q.ratio <= 0) return false;
    if (q.idPoints < 0 || q.idPoints > 40 || q.repairPoints < 0 || q.repairPoints > 60) return false;
    if (q.identified !== null && typeof q.identified !== 'boolean') return false;
  }
  const expected = r.phase === 'reveal' || r.phase === 'results' ? (r.round as number) + 1 : (r.round as number);
  if (r.results.length !== expected) return false;
  if (r.completed !== (r.phase === 'results')) return false;
  if (r.phase === 'repair' && (!r.pending || typeof r.pending !== 'object')) return false;
  if (r.phase === 'identify' && r.pending) return false;
  return true;
}

export function createStore(backend: StorageLike | null, onError: (op: string) => void = () => {}) {
  // If localStorage is unavailable the game still works for this page view.
  let s: StorageLike = backend ?? memoryStorage();
  const persistent = backend !== null;

  const read = (k: string): string | null => {
    try {
      return s.getItem(k);
    } catch {
      onError('read');
      return null;
    }
  };
  const write = (k: string, v: string): boolean => {
    try {
      s.setItem(k, v);
      return true;
    } catch {
      onError('write');
      s = memoryStorage();
      try {
        s.setItem(k, v);
      } catch {
        /* nothing more to do */
      }
      return false;
    }
  };
  const remove = (k: string) => {
    try {
      s.removeItem(k);
    } catch {
      onError('remove');
    }
  };
  const keys = (): string[] => {
    const out: string[] = [];
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k && k.startsWith(PREFIX)) out.push(k);
      }
    } catch {
      onError('keys');
    }
    return out;
  };
  const runKey = (mode: Mode, date: string) => (mode === 'daily' ? `${RUN}daily:${date}` : `${RUN}practice`);

  function loadRun(mode: Mode, date: string): LoadResult {
    const raw = read(runKey(mode, date));
    if (raw === null) return { ok: true, run: null };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRunState(parsed) || parsed.mode !== mode || (mode === 'daily' && parsed.date !== date)) return { ok: false };
      return { ok: true, run: parsed };
    } catch {
      return { ok: false };
    }
  }

  return {
    persistent,
    loadRun,
    /** Never overwrites a completed result with anything else. */
    saveRun(run: RunState): boolean {
      const existing = loadRun(run.mode, run.date);
      if (existing.ok && existing.run?.completed && run.mode === 'daily') return false;
      return write(runKey(run.mode, run.date), JSON.stringify(run));
    },
    /** Drops an unreadable or abandoned run. Completed daily results are kept. */
    discardRun(mode: Mode, date: string) {
      const existing = loadRun(mode, date);
      if (existing.ok && existing.run?.completed && mode === 'daily') return;
      remove(runKey(mode, date));
    },
    getActive(): ActivePointer | null {
      const raw = read(ACTIVE);
      if (!raw) return null;
      try {
        const p = JSON.parse(raw) as ActivePointer;
        if ((p.mode === 'daily' || p.mode === 'practice') && isDateKey(p.date)) return { mode: p.mode, date: p.date };
      } catch {
        /* fall through */
      }
      remove(ACTIVE);
      return null;
    },
    setActive(p: ActivePointer | null) {
      if (p) write(ACTIVE, JSON.stringify(p));
      else remove(ACTIVE);
    },
    completedDates(): string[] {
      const out: string[] = [];
      for (const k of keys()) {
        if (!k.startsWith(`${RUN}daily:`)) continue;
        const date = k.slice(`${RUN}daily:`.length);
        const r = loadRun('daily', date);
        if (r.ok && r.run?.completed) out.push(date);
      }
      return out.sort();
    },
    getSettings(): Settings {
      try {
        const raw = read(SETTINGS);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const p = JSON.parse(raw) as Partial<Settings>;
        return {
          sound: p.sound === true,
          reduceMotion: p.reduceMotion === true,
          variant: p.variant === 'B' ? 'B' : 'A',
        };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },
    setSettings(v: Settings) {
      write(SETTINGS, JSON.stringify(v));
    },
    resetAll() {
      for (const k of keys()) remove(k);
    },
  };
}

export type Store = ReturnType<typeof createStore>;

/** Consecutive completed daily dates ending today (or yesterday, if today is not played yet). */
export function computeStreak(completed: string[], today: string): number {
  const set = new Set(completed);
  let day = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
