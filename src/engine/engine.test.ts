import { describe, expect, it } from 'vitest';
import { CATALOG } from '../content/index.ts';
import { newRun, reduce, type Action } from './game.ts';
import { ASPECT, cellWidthPx, FIT_H, FIT_W, measured, place, VIEWPORTS } from './geometry.ts';
import { addDays, buildRound, editionFor, formatRefreshLocal, GEN_DISTORTIONS, getDaily, getPractice, nextRefresh, rng, utcDateKey, type Catalog } from './schedule.ts';
import {
  repairPoints,
  repairPointsForRatio,
  SLIDER_STEPS,
  stepToT,
  summarize,
  T_MAX,
  T_MIN,
  T_STEP,
  TOLERANCE,
  verdictFor,
  verdictText,
} from './scoring.ts';
import { loadSession, resumeActive } from './session.ts';
import { BANDS, bandIndex, buildChallengeUrl, buildShareText, parseChallenge } from './share.ts';
import { computeStreak, createStore, memoryStorage, type StorageLike } from './storage.ts';
import type { GameObject, ResolvedScene, RunState } from './types.ts';
import { hasErrors, validateManifest, validateObject, validateScene } from './validate.ts';

const TODAY = '2026-11-15';

function daily(date = TODAY, today = date, seed = 'demo') {
  const d = getDaily(CATALOG, date, today, seed);
  if (!d.ok) throw new Error(`no daily for ${date}`);
  return d;
}

function start(date = TODAY, variant: 'A' | 'B' = 'A', seed = 'demo') {
  const d = daily(date, date, seed);
  const run = newRun({ mode: 'daily', variant, date, seed: d.seed, puzzleKey: d.puzzleKey, sceneRefs: d.scenes.map((s) => s.ref) });
  return { run, scenes: d.scenes };
}

function apply(run: RunState, scenes: ResolvedScene[], actions: Action[]): RunState {
  return actions.reduce((s, a) => reduce(s, a, scenes), run);
}

/** Play one round. `pick` chooses right or wrong; `t` is the slider value locked in. */
function playRound(run: RunState, scenes: ResolvedScene[], pick: 'right' | 'wrong', t: number): RunState {
  const scene = scenes[run.round];
  const id = pick === 'right' ? scene.misfitId : scene.objects.find((o) => o.id !== scene.misfitId)!.id;
  return apply(run, scenes, [{ type: 'select', id }, { type: 'confirm' }, { type: 'setT', t }, { type: 'lock' }, { type: 'next' }]);
}

describe('1. scoring', () => {
  it('matches the worked examples', () => {
    expect(repairPoints(10, 10)).toBe(60);
    expect(40 + repairPoints(10, 10)).toBe(100);
    expect(repairPointsForRatio(2)).toBe(repairPointsForRatio(0.5));
  });

  it('stays within 0–60 and declines monotonically with absolute log error', () => {
    let last = 60;
    for (let e = 0; e <= 3; e += 0.01) {
      const up = repairPointsForRatio(Math.exp(e));
      const down = repairPointsForRatio(Math.exp(-e));
      expect(up).toBe(down); // reciprocal symmetry
      expect(up).toBeGreaterThanOrEqual(0);
      expect(up).toBeLessThanOrEqual(60);
      expect(up).toBeLessThanOrEqual(last);
      last = up;
    }
    expect(repairPointsForRatio(1000)).toBe(0);
  });

  it('gives full credit exactly on the multiplicative interval [1/1.05, 1.05]', () => {
    expect(repairPointsForRatio(TOLERANCE)).toBe(60);
    expect(repairPointsForRatio(1 / TOLERANCE)).toBe(60);
    expect(repairPointsForRatio(1.0499)).toBe(60);
    // Just outside the interval the score has started to fall (visible once rounding allows).
    expect(repairPointsForRatio(1.07)).toBeLessThan(60);
    expect(repairPointsForRatio(1 / 1.07)).toBeLessThan(60);
    expect(verdictText(verdictFor(1.05))).toBe('Right on scale');
    expect(verdictText(verdictFor(1.5))).toBe('50% too big');
    expect(verdictText(verdictFor(0.75))).toBe('25% too small');
  });

  it('rejects zero, negative and non-finite input before scoring', () => {
    for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
      expect(() => repairPoints(bad, 10)).toThrow(RangeError);
      expect(() => repairPoints(10, bad)).toThrow(RangeError);
      expect(() => repairPointsForRatio(bad)).toThrow(RangeError);
    }
  });

  it('slider covers 0.4×–2.5× in steps of at most 1%', () => {
    expect(Math.exp(stepToT(SLIDER_STEPS))).toBeCloseTo(2.5, 10);
    expect(Math.exp(stepToT(-SLIDER_STEPS))).toBeCloseTo(0.4, 10);
    expect(Math.exp(T_STEP) - 1).toBeLessThanOrEqual(0.01);
    expect(stepToT(0)).toBe(0); // starts at multiplier 1, never at the answer
  });
});

describe('2. schedule is deterministic', () => {
  it('gives the same order and distortion for the same date and seed', () => {
    for (const date of [TODAY, '2026-11-16', '2026-12-25', '2028-02-29']) {
      for (const seed of ['demo', 'abc', 'z9k2']) {
        const a = getDaily(CATALOG, date, '2030-01-01', seed);
        const b = getDaily(structuredClone(CATALOG), date, '2031-06-01', seed);
        expect(a.ok).toBe(true);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });

  it('gives different players different games, and friends with the same seed the same game', () => {
    expect(daily(TODAY, TODAY, 'demo').generated).toBe(false);
    const games = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const g = daily(TODAY, TODAY, `p${i}`);
      expect(g.generated).toBe(true);
      expect(g.scenes).toHaveLength(5);
      games.add(g.scenes.map((s) => s.ref).join('|'));
      // variety inside one game: five different misfits, no object shown more than twice
      expect(new Set(g.scenes.map((s) => s.misfitId)).size).toBe(5);
      const uses = new Map<string, number>();
      for (const s of g.scenes) for (const o of s.objects) uses.set(o.id, (uses.get(o.id) ?? 0) + 1);
      expect(Math.max(...uses.values())).toBeLessThanOrEqual(2);
    }
    expect(games.size).toBe(200);
    // same seed on a different day is a different game
    expect(daily('2026-11-16', '2026-11-16', 'p1').scenes.map((s) => s.ref)).not.toEqual(daily(TODAY, TODAY, 'p1').scenes.map((s) => s.ref));
    for (const bad of ['', 'UPPER', 'a b', '../x', 'a'.repeat(17), '<script>']) {
      expect(getDaily(CATALOG, TODAY, TODAY, bad)).toMatchObject({ ok: false, reason: 'invalid-seed' });
    }
  });

  it('has well over 1,000 distinct valid rounds to draw from', () => {
    const ids = Object.keys(CATALOG.objects).sort();
    let rounds = 0;
    for (let a = 0; a < ids.length; a++)
      for (let b = a + 1; b < ids.length; b++)
        for (let c = b + 1; c < ids.length; c++)
          for (let d = c + 1; d < ids.length; d++)
            for (const m of [ids[a], ids[b], ids[c], ids[d]])
              for (const k of GEN_DISTORTIONS) if (buildRound(CATALOG, [ids[a], ids[b], ids[c], ids[d]], m, k)) rounds++;
    expect(rounds).toBeGreaterThan(1000);
  });

  it('refuses dates that are invalid, before the first edition, or not yet published', () => {
    expect(getDaily(CATALOG, '2026-02-30', '2027-01-01').ok).toBe(false);
    expect(getDaily(CATALOG, '2026-11-14', '2027-01-01').ok).toBe(false);
    expect(getDaily(CATALOG, '2026-11-17', '2026-11-16').ok).toBe(false);
  });

  it('handles UTC keys, leap days and editions', () => {
    expect(utcDateKey(new Date('2026-11-15T23:59:59.999Z'))).toBe('2026-11-15');
    expect(utcDateKey(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(editionFor(TODAY, CATALOG.epoch)).toBe(1);
    expect(editionFor('2028-02-29', CATALOG.epoch)).toBe(472);
    expect(nextRefresh(new Date('2028-02-28T10:00:00Z')).toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('shows the refresh in local time across a DST change', () => {
    // New York leaves daylight time on 1 Nov 2026: the same UTC midnight moves from 8 PM to 7 PM.
    const before = formatRefreshLocal(new Date('2026-10-31T00:00:00Z'), 'en-US', 'America/New_York');
    const after = formatRefreshLocal(new Date('2026-11-03T00:00:00Z'), 'en-US', 'America/New_York');
    expect(before).toMatch(/8:00\sPM/);
    expect(after).toMatch(/7:00\sPM/);
    expect(formatRefreshLocal(new Date('2026-11-16T00:00:00Z'), 'en-GB', 'Asia/Kolkata')).toMatch(/05:30/);
  });
});

describe('3. state machine', () => {
  it('walks identify → repair → reveal → next and totals 500 for a perfect game', () => {
    let { run, scenes } = start();
    for (const scene of scenes) {
      expect(run.phase).toBe('identify');
      run = playRound(run, scenes, 'right', -Math.log(scene.distortion));
    }
    expect(run.completed).toBe(true);
    const s = summarize(run.results, 'A', 5);
    expect(s).toMatchObject({ score: 500, max: 500, found: 5, repair: 300 });
  });

  it('never scores twice, and committed decisions cannot be undone', () => {
    const { run, scenes } = start();
    const wrong = scenes[0].objects.find((o) => o.id !== scenes[0].misfitId)!.id;
    const picked = apply(run, scenes, [{ type: 'select', id: wrong }, { type: 'confirm' }]);
    // repeat confirm / late select are ignored
    expect(reduce(picked, { type: 'confirm' }, scenes)).toBe(picked);
    expect(reduce(picked, { type: 'select', id: scenes[0].misfitId }, scenes)).toBe(picked);
    expect(picked.pending).toMatchObject({ identified: false, idPoints: 0 });

    const locked = reduce(picked, { type: 'lock' }, scenes);
    expect(locked.results).toHaveLength(1);
    expect(reduce(locked, { type: 'lock' }, scenes)).toBe(locked); // double click
    expect(reduce(locked, { type: 'setT', t: 0.3 }, scenes)).toBe(locked); // cannot be rescored
    expect(reduce(locked, { type: 'confirm' }, scenes)).toBe(locked);

    const next = reduce(locked, { type: 'next' }, scenes);
    expect(next.round).toBe(1);
    expect(next.results).toHaveLength(1);
  });

  it('cannot confirm without a selection or select an object from another scene', () => {
    const { run, scenes } = start();
    expect(reduce(run, { type: 'confirm' }, scenes)).toBe(run);
    expect(reduce(run, { type: 'select', id: 'not-here' }, scenes)).toBe(run);
    expect(reduce(run, { type: 'lock' }, scenes)).toBe(run);
    expect(reduce(run, { type: 'next' }, scenes)).toBe(run);
  });

  it('a wrong identification still proceeds to repairing the real misfit', () => {
    const { run, scenes } = start();
    const after = playRound(run, scenes, 'wrong', -Math.log(scenes[0].distortion));
    expect(after.results[0]).toMatchObject({ identified: false, idPoints: 0, repairPoints: 60 });
  });

  it('variant B skips identification and is scored out of 300', () => {
    let { run, scenes } = start(TODAY, 'B');
    expect(run.phase).toBe('repair');
    for (const scene of scenes) {
      run = apply(run, scenes, [{ type: 'setT', t: -Math.log(scene.distortion) }, { type: 'lock' }, { type: 'next' }]);
    }
    expect(summarize(run.results, 'B', 5)).toMatchObject({ score: 300, max: 300, found: 0 });
  });

  it('survives a reload at every phase and keeps its date across midnight', () => {
    const backend = memoryStorage();
    const store = createStore(backend);
    let { run, scenes } = start();
    run = playRound(run, scenes, 'right', 0.1);
    run = apply(run, scenes, [{ type: 'select', id: scenes[1].misfitId }, { type: 'confirm' }, { type: 'setT', t: -0.2 }]);
    store.saveRun(run);
    store.setActive({ mode: 'daily', date: TODAY });

    // "Reload" the next UTC day with a fresh store over the same backend.
    const later = createStore(backend);
    const resumed = resumeActive(later, CATALOG, '2026-11-16');
    expect(resumed.kind).toBe('resume');
    if (resumed.kind !== 'resume') return;
    expect(resumed.run).toEqual(run);
    expect(resumed.run.date).toBe(TODAY);
    expect(resumed.scenes.map((s) => s.ref)).toEqual(scenes.map((s) => s.ref));
    // A new run started now would use the new day's manifest.
    expect(daily('2026-11-16').puzzleKey).not.toBe(run.puzzleKey);
  });
});

describe('5. fixtures and shared scale', () => {
  const allScenes = Object.values(CATALOG.scenes);

  it('has five demo scenes plus a tutorial, all valid for demo use', () => {
    expect(CATALOG.demoSceneIds).toHaveLength(5);
    expect(getPractice(CATALOG).ok).toBe(true);
    for (const s of allScenes) expect(validateScene(s, CATALOG.objects).filter((i) => i.level === 'error')).toEqual([]);
    for (const o of Object.values(CATALOG.objects)) expect(validateObject(o)).toEqual([]);
    expect(hasErrors(validateManifest(CATALOG.manifests[0], CATALOG.scenes, CATALOG.objects))).toBe(false);
  });

  it('every correct answer is reachable, strictly inside the slider and not at the start', () => {
    const check = (distortion: number) => {
      const t = -Math.log(distortion);
      expect(t).toBeGreaterThan(T_MIN + Math.log(1.2));
      expect(t).toBeLessThan(T_MAX - Math.log(1.2));
      expect(Math.abs(t)).toBeGreaterThan(Math.log(1.1));
      // the nearest slider step earns full credit
      expect(repairPointsForRatio(distortion * Math.exp(stepToT(Math.round(t / T_STEP))))).toBe(60);
    };
    for (const s of allScenes) check(s.distortion);
    for (let i = 0; i < 300; i++) for (const s of daily(TODAY, TODAY, `k${i}`).scenes) check(s.distortion);
  });

  it('draws all four objects at one millimetres-to-viewBox scale, with no per-object fitting', () => {
    for (let i = 0; i < 100; i++) {
      for (const scene of daily(TODAY, TODAY, `k${i}`).scenes) {
        for (const o of scene.objects) {
          const p = place(o, scene.extentMm, 1);
          // 1 viewBox unit = 1 mm for every object in the scene
          expect(p.widthMm).toBeCloseTo(o.widthMm, 6);
          expect(p.heightMm).toBeCloseTo(o.heightMm, 6);
          const scale = Number(/scale\(([\d.]+)\)/.exec(p.transform)![1]);
          expect(scale * o.viewBox[2] * o.bounds.w).toBeCloseTo(o.widthMm, 2);
        }
      }
    }
  });

  it('keeps the resized misfit inside its cell and legible at every supported width', () => {
    for (let i = 0; i < 300; i++) {
      for (const scene of [...daily(TODAY, TODAY, `k${i}`).scenes, ...daily().scenes]) {
        const W = scene.extentMm;
        for (const o of scene.objects) {
          const scales = o.id === scene.misfitId ? [scene.distortion * 0.4, scene.distortion, scene.distortion * 2.5] : [1];
          for (const k of scales) {
            expect(o.widthMm * k).toBeLessThanOrEqual(W * FIT_W + 1e-6);
            expect(o.heightMm * k).toBeLessThanOrEqual(W * ASPECT * FIT_H + 1e-6);
            for (const vp of VIEWPORTS) {
              const px = (Math.max(o.widthMm, o.heightMm) * k * cellWidthPx(vp)) / W;
              expect(px).toBeGreaterThanOrEqual(12);
            }
          }
        }
      }
    }
  });

  it('gives every cell a hit area of at least 48px', () => {
    for (const vp of VIEWPORTS) {
      expect(cellWidthPx(vp)).toBeGreaterThanOrEqual(48);
      expect(cellWidthPx(vp) * ASPECT).toBeGreaterThanOrEqual(48);
    }
  });
});

describe('7. sharing is spoiler-free', () => {
  it('share text has the documented shape and no answers', () => {
    let { run, scenes } = start();
    scenes.forEach((_, i) => (run = playRound(run, scenes, i % 2 ? 'wrong' : 'right', 0.2 * i)));
    const url = buildChallengeUrl('https://example.test/play/', TODAY, 'demo', 321);
    const text = buildShareText(run, 1, url);
    const lines = text.split('\n');
    expect(lines[0]).toBe('MISFIT #1');
    expect(lines[1]).toMatch(/^\d{1,3}\/500 · \d\/5 spotted$/);
    expect(Array.from(lines[2])).toHaveLength(5);
    expect(lines[3]).toBe('Four objects. One wrong size.');
    expect(lines[4]).toBe('https://example.test/play/?d=2026-11-15&g=demo#s=321');
    const lower = text.toLowerCase();
    for (const o of Object.values(CATALOG.objects)) {
      expect(lower).not.toContain(o.label.toLowerCase());
      expect(lower).not.toContain(o.noun.toLowerCase());
      expect(lower).not.toContain(o.id);
    }
    for (const s of scenes) expect(lower).not.toContain(s.title.toLowerCase());
    expect(text).not.toMatch(/\d\s?(mm|cm)\b/);
  });

  it('bands and friend links round-trip', () => {
    expect([100, 90, 89, 70, 69, 40, 39, 0].map(bandIndex)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(BANDS).toHaveLength(4);
    expect(parseChallenge('?d=2026-11-15&g=ab12', '#s=321')).toEqual({ date: TODAY, seed: 'ab12', claimed: 321 });
    expect(parseChallenge('?d=2026-13-40&g=../../etc', '#s=9999')).toEqual({ date: null, seed: null, claimed: null });
    expect(parseChallenge('?g=%3Cscript%3E', '#s=<script>')).toEqual({ date: null, seed: null, claimed: null });
  });
});

describe('8. invalid content and storage problems', () => {
  const broken = (patch: Partial<GameObject>): Catalog => ({
    ...CATALOG,
    objects: { ...CATALOG.objects, 'sd-card': { ...CATALOG.objects['sd-card'], ...patch } },
  });

  it('rejects NaN, zero or negative dimensions, blank art and missing sources', () => {
    const o = CATALOG.objects['cd'];
    for (const patch of [{ widthMm: NaN }, { heightMm: 0 }, { widthMm: -5 }, { art: '  ' }, { sourceUrl: '' }, { sourceUrl: 'not a url' }, { artLicense: '' }] as Partial<GameObject>[]) {
      expect(hasErrors(validateObject({ ...o, ...patch }))).toBe(true);
    }
    expect(hasErrors(validateObject({ ...o, widthMm: 200 }))).toBe(true); // art no longer matches true proportions
  });

  it('rejects malformed scenes', () => {
    const s = CATALOG.scenes['desk-drawer'];
    const bad = [
      { ...s, objectIds: ['credit-card', 'credit-card', 'aa-battery', 'nine-volt'] },
      { ...s, misfitId: 'cd' },
      { ...s, distortion: 1.02 },
      { ...s, distortion: 2.4 },
      { ...s, distortion: NaN },
      { ...s, layout: { extentMm: 60 } },
      { ...s, objectIds: ['credit-card', 'sd-card', 'aa-battery', 'vinyl-lp'] },
    ];
    for (const scene of bad) expect(hasErrors(validateScene(scene as typeof s, CATALOG.objects))).toBe(true);
  });

  it('never lets unverified content into a public manifest', () => {
    const m = { ...CATALOG.manifests[0], status: 'public' as const };
    // every object has been checked against its source, so the real catalogue is publishable
    expect(hasErrors(validateManifest(m, CATALOG.scenes, CATALOG.objects))).toBe(false);
    expect(Object.values(CATALOG.objects).every((o) => o.status === 'verified' && o.retrieved === '2026-11-15')).toBe(true);
    // one unverified object is enough to block every scene that uses it
    const objects = { ...CATALOG.objects, cd: { ...CATALOG.objects.cd, status: 'unverified' as const, retrieved: null } };
    const issues = validateManifest(m, CATALOG.scenes, objects);
    expect(issues.filter((i) => i.code === 'manifest.unverified')).toHaveLength(2);
    expect(getDaily({ ...CATALOG, objects, manifests: [m] }, TODAY, TODAY).ok).toBe(false);
    // a "verified" claim without a check date is refused
    expect(hasErrors(validateObject({ ...CATALOG.objects.cd, retrieved: null }))).toBe(true);
  });

  it('broken content yields an explicit failure, not NaN or a silent success', () => {
    const c = broken({ widthMm: NaN });
    expect(getDaily(c, TODAY, TODAY)).toMatchObject({ ok: false, reason: 'invalid-content' });
    expect(getDaily(c, TODAY, TODAY, 'abc')).toMatchObject({ ok: false, reason: 'invalid-content' });
    const store = createStore(memoryStorage());
    expect(loadSession(store, c, 'daily', TODAY, TODAY).status).toBe('unavailable');
    // Even if such a scene reached the reducer, it would not award points.
    const { run, scenes } = start();
    const poisoned = scenes.map((s) => ({ ...s, distortion: NaN }));
    const ready = apply(run, scenes, [{ type: 'select', id: scenes[0].misfitId }, { type: 'confirm' }]);
    expect(reduce(ready, { type: 'lock' }, poisoned)).toBe(ready);
  });

  it('treats corrupted records as a restore problem and keeps completed scores', () => {
    const backend = memoryStorage();
    const store = createStore(backend);
    let { run, scenes } = start();
    for (const s of scenes) run = playRound(run, scenes, 'right', -Math.log(s.distortion));
    expect(store.saveRun(run)).toBe(true);

    backend.setItem('misfit:v1:run:daily:2026-11-16', '{"v":1,"mode":"daily","t":"NaN"');
    store.setActive({ mode: 'daily', date: '2026-11-16' });
    expect(resumeActive(store, CATALOG, '2026-11-16').kind).toBe('problem');
    expect(store.getActive()).toBeNull();
    expect(store.completedDates()).toEqual([TODAY]);

    // tampered values are refused too
    const tampered = { ...run, results: run.results.map((r) => ({ ...r, repairPoints: 9999 })) };
    backend.setItem('misfit:v1:run:daily:2026-11-17', JSON.stringify({ ...tampered, date: '2026-11-17' }));
    expect(store.loadRun('daily', '2026-11-17').ok).toBe(false);
  });

  it('does not overwrite a completed result', () => {
    const store = createStore(memoryStorage());
    let { run, scenes } = start();
    const fresh = run;
    for (const s of scenes) run = playRound(run, scenes, 'right', -Math.log(s.distortion));
    store.saveRun(run);
    expect(store.saveRun(fresh)).toBe(false);
    store.discardRun('daily', TODAY);
    const again = store.loadRun('daily', TODAY);
    expect(again.ok && again.run?.completed).toBe(true);
  });

  it('keeps working when storage throws or is missing', () => {
    const errors: string[] = [];
    const throwing: StorageLike = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const store = createStore(throwing, (op) => errors.push(op));
    const { run } = start();
    expect(() => store.saveRun(run)).not.toThrow();
    expect(store.getSettings()).toEqual({ sound: false, reduceMotion: false, variant: 'A' });
    expect(errors.length).toBeGreaterThan(0);
    expect(createStore(null).persistent).toBe(false);
  });

  it('streaks count consecutive completed dates, not wins', () => {
    expect(computeStreak([], TODAY)).toBe(0);
    expect(computeStreak([TODAY], TODAY)).toBe(1);
    expect(computeStreak(['2026-11-13', '2026-11-14'], TODAY)).toBe(2); // today not played yet
    expect(computeStreak(['2026-11-12', '2026-11-14', TODAY], TODAY)).toBe(2);
    expect(computeStreak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01')).toBe(3);
  });
});

describe('security and robustness fuzzing', () => {
  it('artwork may only contain plain shapes', () => {
    const o = CATALOG.objects['cd'];
    const attacks = [
      '<circle r="5"/><script>alert(1)</script>',
      '<circle r="5" onload="alert(1)"/>',
      '<a href="javascript:alert(1)"><circle r="5"/></a>',
      '<foreignObject><iframe src="https://evil.example"/></foreignObject><rect/>',
      '<image href="https://evil.example/x.png"/><rect/>',
      '<rect style="background:url(https://evil.example)"/>',
      '<use href="#x"/><rect/>',
    ];
    for (const art of attacks) expect(validateObject({ ...o, art }).some((i) => i.code === 'object.artUnsafe')).toBe(true);
    for (const obj of Object.values(CATALOG.objects)) expect(validateObject(obj)).toEqual([]);
  });

  it('source links must be plain http(s) URLs', () => {
    const o = CATALOG.objects['cd'];
    for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,<script>', '//evil.example', 'https://a.b/"onmouseover="x', 'https://a.b/ x']) {
      expect(hasErrors(validateObject({ ...o, sourceUrl }))).toBe(true);
    }
  });

  it('random action sequences never break the invariants', () => {
    const rand = rng('fuzz-actions');
    const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    for (let game = 0; game < 400; game++) {
      const variant = game % 4 === 0 ? 'B' : 'A';
      let { run, scenes } = start(TODAY, variant, `f${game}`);
      const store = createStore(memoryStorage());
      for (let step = 0; step < 120 && !run.completed; step++) {
        const scene = scenes[run.round];
        const action: Action = pick<Action>([
          { type: 'select', id: pick(scene.objects).id },
          { type: 'select', id: 'nope' },
          { type: 'confirm' },
          { type: 'setT', t: (rand() - 0.5) * 4 },
          { type: 'setT', t: pick([NaN, Infinity, -Infinity, 1e308]) },
          { type: 'lock' },
          { type: 'lock' },
          { type: 'next' },
        ]);
        const before = run;
        run = reduce(run, action, scenes);
        expect(run.results.length).toBeGreaterThanOrEqual(before.results.length);
        expect(run.results.length - before.results.length).toBeLessThanOrEqual(1);
        expect(run.round).toBeGreaterThanOrEqual(before.round);
        expect(Number.isFinite(run.t)).toBe(true);
        expect(run.t).toBeGreaterThanOrEqual(T_MIN);
        expect(run.t).toBeLessThanOrEqual(T_MAX);
        // everything the game can produce must survive a save and reload unchanged
        store.saveRun(run);
        const back = store.loadRun('daily', TODAY);
        expect(back.ok && back.run).toEqual(run);
      }
      const sum = summarize(run.results, variant, 5);
      expect(sum.score).toBeGreaterThanOrEqual(0);
      expect(sum.score).toBeLessThanOrEqual(sum.max);
      for (const r of run.results) {
        expect(Number.isFinite(r.ratio) && r.ratio > 0).toBe(true);
        expect([0, 40]).toContain(r.idPoints);
        expect(Number.isInteger(r.repairPoints) && r.repairPoints >= 0 && r.repairPoints <= 60).toBe(true);
      }
    }
  });

  it('garbage and tampered saves never throw and never load as a valid run', () => {
    const rand = rng('fuzz-storage');
    const backend = memoryStorage();
    const store = createStore(backend);
    let { run, scenes } = start();
    run = playRound(run, scenes, 'right', 0.1);
    const good = JSON.stringify(run);
    const key = 'misfit:v1:run:daily:2026-11-15';
    const junk = ['', 'null', '[]', '{}', '"x"', '123', '{"__proto__":{"v":1}}', '{"v":1}', good.slice(0, 50), good + '}', '\u0000'];
    for (const raw of junk) {
      backend.setItem(key, raw);
      expect(() => store.loadRun('daily', TODAY)).not.toThrow();
      expect(store.loadRun('daily', TODAY).ok).toBe(false);
    }
    // mutate one field at a time to a hostile value
    const hostile = [null, -1, 1e9, NaN, 'x', '<img src=x onerror=alert(1)>', [], {}, true];
    const parsed = JSON.parse(good) as Record<string, unknown>;
    let rejected = 0;
    for (const field of Object.keys(parsed)) {
      for (const value of hostile) {
        const mutated = JSON.stringify({ ...parsed, [field]: value });
        backend.setItem(key, mutated);
        const r = store.loadRun('daily', TODAY);
        if (!r.ok) rejected++;
        else if (r.run) {
          // anything accepted must be safe to keep playing and scoring
          const s = summarize(r.run.results, r.run.variant, r.run.sceneRefs.length);
          expect(s.score).toBeGreaterThanOrEqual(0);
          expect(s.score).toBeLessThanOrEqual(500);
        }
      }
    }
    expect(rejected).toBeGreaterThan(60);
    // inflated scores are refused
    for (const patch of [{ idPoints: 400 }, { repairPoints: 61 }, { ratio: -1 }, { idPoints: 40, identified: false }]) {
      backend.setItem(key, JSON.stringify({ ...parsed, results: [{ ...(parsed.results as object[])[0], ...patch }] }));
      expect(store.loadRun('daily', TODAY).ok).toBe(false);
    }
    // random byte noise
    for (let i = 0; i < 500; i++) {
      const cut = Math.floor(rand() * good.length);
      backend.setItem(key, good.slice(0, cut) + String.fromCharCode(Math.floor(rand() * 128)) + good.slice(cut + 1));
      expect(() => store.loadRun('daily', TODAY)).not.toThrow();
    }
  });

  it('hostile URLs are ignored', () => {
    const nasty = ['?d=<script>alert(1)</script>', '?d=2026-11-15%0d%0aSet-Cookie:x', '?d=__proto__&g=constructor', '?d=9999-99-99&g=' + 'a'.repeat(5000), '?d[]=1&g[]=2'];
    for (const q of nasty) {
      const c = parseChallenge(q, '#s=1e9');
      expect(c.date).toBeNull();
      expect(c.claimed).toBeNull();
      expect(c.seed === null || /^[a-z0-9]{1,16}$/.test(c.seed)).toBe(true);
    }
    expect(parseChallenge('?d=2026-11-15', '#s=501').claimed).toBeNull();
    expect(parseChallenge('?d=2026-11-15', '#s=-5').claimed).toBeNull();
  });
});

describe('9. colour contrast of the actual text/background pairs', () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const c = { paper: '#F7F3E8', surface: '#FFFDF7', ink: '#202322', muted: '#5C625D', edge: '#7F857F', blue: '#234BE0', blueSoft: '#E8EDFF', coral: '#B83226', coralSoft: '#FCEAE5', green: '#216548', greenSoft: '#E3F1E8', white: '#FFFFFF' };

  it('normal text is at least 4.5:1', () => {
    const pairs: [string, string][] = [
      [c.ink, c.paper], [c.ink, c.surface], [c.muted, c.paper], [c.muted, c.surface],
      [c.white, c.blue], [c.white, c.coral], [c.blue, c.surface], [c.blue, c.paper],
      [c.coral, c.paper], [c.coral, c.surface], [c.coral, c.coralSoft],
      [c.green, c.paper], [c.green, c.surface], [c.green, c.greenSoft],
      [c.ink, c.blueSoft], [c.ink, c.coralSoft], [c.surface, c.ink],
    ];
    for (const [fg, bg] of pairs) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it('control boundaries and silhouettes are at least 3:1', () => {
    const pairs: [string, string][] = [[c.edge, c.paper], [c.edge, c.surface], [c.blue, c.blueSoft], [c.coral, c.coralSoft], [c.ink, c.surface]];
    for (const [fg, bg] of pairs) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
  });
});

it('measured dimension follows the object definition', () => {
  expect(measured(CATALOG.objects['aa-battery'])).toBe(50.5);
  expect(measured(CATALOG.objects['credit-card'])).toBe(85.6);
});
