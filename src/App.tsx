import { useCallback, useEffect, useRef, useState } from 'react';
import { CATALOG } from './content/index.ts';
import { createDebugSink, createTracker } from './engine/analytics.ts';
import { newRun, reduce, type Action } from './engine/game.ts';
import { editionFor, formatDateLabel, formatRefreshLocal, getDaily, nextRefresh, resolveScene, SEED_RE, utcDateKey } from './engine/schedule.ts';
import { career, roundPoints, summarize } from './engine/scoring.ts';
import { loadSession, resumeActive } from './engine/session.ts';
import { BANDS, parseChallenge } from './engine/share.ts';
import { computeStreak, createStore, DEFAULT_SETTINGS, type Settings, type StorageLike } from './engine/storage.ts';
import type { ResolvedScene, RunState } from './engine/types.ts';
import { Board } from './ui/Board.tsx';
import { Gallery } from './ui/Gallery.tsx';
import { usePrefersReducedMotion } from './ui/hooks.ts';
import { Mascot, Modal, Wordmark } from './ui/parts.tsx';
import { Play } from './ui/Play.tsx';
import { Replay, Results } from './ui/Results.tsx';

const RESTORE_MSG = "We couldn't restore this run. Your previous completed scores are safe.";

// --- singletons: analytics (local debug sink only), storage, site URL ---
const sink = createDebugSink();
const track = createTracker(sink, () => window.innerWidth);

function openStorage(): StorageLike | null {
  try {
    const s = window.localStorage;
    s.setItem('misfit:probe', '1');
    s.removeItem('misfit:probe');
    return s;
  } catch {
    return null;
  }
}
const store = createStore(openStorage(), (op) => track('storage_error', { props: { op } }));

// No invented domain: use the configured site URL, or wherever the page is being served from.
const siteBase = import.meta.env.PUBLIC_SITE_URL || location.origin + location.pathname.replace(/[^/]*$/, '');

const params = new URLSearchParams(location.search);
const challenge = parseChallenge(location.search, location.hash);
const playtest = import.meta.env.DEV || params.has('playtest');
const demoContent = Object.values(CATALOG.objects).some((o) => o.status !== 'verified');

declare global {
  interface Window {
    __misfit?: { events: () => unknown[] };
  }
}
window.__misfit = { events: sink.events };

type View = 'intro' | 'play' | 'results' | 'replay' | 'gallery' | 'error';
interface Sess {
  run: RunState;
  scenes: ResolvedScene[];
  stale: boolean;
}

function boot(): { session: Sess | null; view: View; notice: string | null } {
  if (params.has('gallery')) return { session: null, view: 'gallery', notice: null };
  const r = resumeActive(store, CATALOG, utcDateKey(new Date()));
  if (r.kind === 'resume') {
    return { session: { run: r.run, scenes: r.scenes, stale: r.stale }, view: r.run.completed ? 'results' : 'play', notice: null };
  }
  track('landing_view');
  if (challenge.date) track('referral_landing', { props: { date: challenge.date, hasClaim: challenge.claimed !== null } });
  return { session: null, view: 'intro', notice: r.kind === 'problem' ? RESTORE_MSG : null };
}
const initial = boot();

/** A fresh random seed: this is what makes each player's game their own. */
function randomSeed(): string {
  const buf = new Uint32Array(2);
  try {
    crypto.getRandomValues(buf);
  } catch {
    buf[0] = Math.floor(Math.random() * 2 ** 32);
    buf[1] = Math.floor(Math.random() * 2 ** 32);
  }
  const seed = (buf[0].toString(36) + buf[1].toString(36)).slice(0, 8);
  return SEED_RE.test(seed) && seed !== 'demo' ? seed : 'x' + seed.slice(1);
}

function beep(freq: number) {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.2);
    osc.onended = () => void ac.close();
  } catch {
    /* sound is optional and carries no unique information */
  }
}

export default function App() {
  const [today, setToday] = useState(() => utcDateKey(new Date()));
  const [settings, setSettingsState] = useState<Settings>(() => store.getSettings());
  const [session, setSessionState] = useState<Sess | null>(initial.session);
  const sessionRef = useRef<Sess | null>(initial.session);
  const [view, setView] = useState<View>(initial.view);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const [overlay, setOverlay] = useState<null | 'help' | 'settings'>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const reduced = usePrefersReducedMotion() || settings.reduceMotion;
  const soundRef = useRef(settings.sound);
  useEffect(() => {
    soundRef.current = settings.sound;
  }, [settings.sound]);

  const setSession = (s: Sess | null) => {
    sessionRef.current = s;
    setSessionState(s);
  };
  const setSettings = (s: Settings) => {
    setSettingsState(s);
    store.setSettings(s);
  };

  useEffect(() => {
    const refresh = () => setToday(utcDateKey(new Date()));
    const id = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // A friend link opens that date's exhibit, if it has been published.
  const targetDate = challenge.date && getDaily(CATALOG, challenge.date, today).ok ? challenge.date : today;
  // A link's seed applies to the date it names (or to today if it names none).
  const linkSeed = challenge.seed && (challenge.date === targetDate || challenge.date === null) ? challenge.seed : null;
  const saved = store.loadRun('daily', targetDate);
  const dailyState = saved.ok && saved.run ? (saved.run.completed ? 'done' : 'active') : 'new';

  const act = useCallback((action: Action) => {
    const cur = sessionRef.current;
    if (!cur) return;
    const prev = cur.run;
    const next = reduce(prev, action, cur.scenes);
    if (next === prev) return; // illegal or repeated action: nothing happens, nothing is scored
    const ctx = { puzzle: prev.puzzleKey, round: prev.round + 1, mode: prev.mode, variant: prev.variant };
    if (action.type === 'confirm') track('round_identify', { ...ctx, props: { correct: next.pending?.identified ?? null } });
    if (action.type === 'lock') {
      const r = next.results[next.results.length - 1];
      track('round_repair_commit', { ...ctx, props: { repairPoints: r.repairPoints } });
      track('round_complete', { ...ctx, props: { points: roundPoints(r) } });
      if (soundRef.current) beep(r.repairPoints >= 54 ? 880 : 520);
    }
    if (next.completed && next.mode === 'practice') {
      track('tutorial_complete', ctx);
      const st = store.getSettings();
      if (!st.practiced) {
        store.setSettings({ ...st, practiced: true });
        setSettingsState((cur) => ({ ...cur, practiced: true }));
      }
      store.discardRun('practice', next.date);
      store.setActive(null);
      sessionRef.current = null;
      setSessionState(null);
      setView('intro');
      return;
    }
    sessionRef.current = { ...cur, run: next };
    setSessionState(sessionRef.current);
    store.saveRun(next);
    if (next.completed) {
      const s = summarize(next.results, next.variant, next.sceneRefs.length);
      track('daily_complete', { ...ctx, props: { score: s.score, found: s.found } });
      setView('results');
    }
  }, []);

  const startDaily = (date: string) => {
    const now = utcDateKey(new Date());
    const seed = (date === targetDate && linkSeed) || randomSeed();
    let s = loadSession(store, CATALOG, 'daily', date, now, seed);
    if (s.status === 'problem') {
      setNotice(RESTORE_MSG);
      s = loadSession(store, CATALOG, 'daily', date, now, seed);
    } else {
      setNotice(null);
    }
    if (s.status === 'unavailable' || s.status === 'problem') {
      track('content_issue', { props: { date, where: 'daily' } });
      setView('error');
      return;
    }
    let next: Sess;
    if (s.status === 'ok') {
      next = { run: s.run, scenes: s.scenes, stale: s.stale };
    } else {
      const run = newRun({ mode: 'daily', variant: settings.variant, date, seed: s.seed, puzzleKey: s.puzzleKey, sceneRefs: s.scenes.map((x) => x.ref) });
      store.saveRun(run);
      next = { run, scenes: s.scenes, stale: false };
      const ctx = { puzzle: run.puzzleKey, mode: run.mode, variant: run.variant };
      track('daily_start', ctx);
      if (linkSeed && run.seed === linkSeed && challenge.seed !== 'demo') track('referral_start', ctx);
    }
    store.setActive({ mode: 'daily', date });
    setSession(next);
    setView(next.run.completed ? 'results' : 'play');
  };

  const startPractice = () => {
    const now = utcDateKey(new Date());
    store.discardRun('practice', now);
    // The first practice is the fixed teaching round; after that each one is a fresh random round.
    const s = loadSession(store, CATALOG, 'practice', now, now, settings.practiced ? randomSeed() : '');
    if (s.status !== 'none') {
      track('content_issue', { props: { where: 'practice' } });
      setView('error');
      return;
    }
    const run = newRun({ mode: 'practice', variant: settings.variant, date: now, seed: s.seed, puzzleKey: s.puzzleKey, sceneRefs: s.scenes.map((x) => x.ref) });
    store.saveRun(run);
    store.setActive({ mode: 'practice', date: now });
    track('tutorial_start', { puzzle: run.puzzleKey, mode: run.mode, variant: run.variant });
    setNotice(null);
    setSession({ run, scenes: s.scenes, stale: false });
    setView('play');
  };

  const goHome = () => {
    store.setActive(null);
    setSession(null);
    setView('intro');
  };

  const resetData = () => {
    store.resetAll();
    setConfirmReset(false);
    setOverlay(null);
    setSettingsState({ ...DEFAULT_SETTINGS });
    setSession(null);
    setNotice('Saved results erased from this device.');
    setView('intro');
  };

  const downloadEvents = () => {
    const blob = new Blob([JSON.stringify(sink.events(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `misfit-events-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const run = session?.run ?? null;
  const edition = editionFor(run?.date ?? targetDate, CATALOG.epoch);
  const dateLabel = formatDateLabel(run?.date ?? targetDate);
  const refreshLabel = formatRefreshLocal(nextRefresh(new Date()));
  const tutorial = resolveScene(CATALOG.scenes[CATALOG.tutorialId], CATALOG.objects);
  const cta =
    dailyState === 'done'
      ? targetDate === today
        ? "See today's score"
        : `See your score for #${edition}`
      : dailyState === 'active'
        ? targetDate === today
          ? "Continue today's Misfit"
          : `Continue Misfit #${edition}`
        : targetDate === today
          ? "Play today's Misfit"
          : `Play Misfit #${edition}`;

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="home" onClick={goHome} aria-label="Misfit — back to start">
          <Wordmark />
        </button>
        <div className="header-actions">
          <button type="button" className="icon-btn" aria-label="Help" onClick={() => setOverlay('help')}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M8.4 8.6a2.7 2.7 0 1 1 3.9 2.4c-.8.4-1.3 1-1.3 1.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="11" cy="15.8" r="1.2" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={() => setOverlay('settings')}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M3 6.5h16M3 15.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8" cy="6.5" r="2.6" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
              <circle cx="14" cy="15.5" r="2.6" fill="var(--paper)" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </header>

      {view !== 'gallery' && demoContent && <p className="banner banner-warn">Demo measurements — not ready for a public challenge</p>}
      {view === 'play' && run?.mode === 'practice' && <p className="banner">Practice — doesn't affect your daily score</p>}
      {notice && view === 'intro' && (
        <p className="banner banner-warn" role="status">
          {notice}
        </p>
      )}

      {view === 'intro' && (
        <main className="intro">
          <h1 className="intro-title">Something doesn't add up.</h1>
          <p className="intro-sub">Four objects. One wrong size. Find it. Fix it.</p>
          {tutorial && (
            <div className="teaser" aria-hidden="true">
              <Board scene={tutorial} phase="preview" idPrefix="teaser" />
            </div>
          )}
          <p className="intro-meta">5 rounds · About 2 minutes · A new exhibit every day</p>
          {linkSeed && challenge.date === targetDate && (!saved.ok || !saved.run || saved.run.seed === linkSeed) && (
            <p className="note">
              A friend sent you their exhibit #{edition} ({dateLabel}). You'll get the exact same five rounds they played.
            </p>
          )}
          {linkSeed && saved.ok && saved.run && saved.run.seed !== linkSeed && (
            <p className="note">You've already played #{edition} with your own set of rounds, so your score and your friend's aren't directly comparable.</p>
          )}
          {challenge.date === targetDate && challenge.claimed !== null && dailyState !== 'done' && (
            <p className="note">They claim {challenge.claimed}/500. Claimed scores are unverified.</p>
          )}
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => startDaily(targetDate)}>
              {cta}
            </button>
            <button type="button" className="btn btn-secondary" onClick={startPractice}>
              Try a practice round
            </button>
          </div>
          {settings.practiced && <p className="note">Practice rounds are random and unlimited. They never affect your daily score.</p>}
          {dailyState === 'done' && targetDate === today && <p className="note">Next exhibit: {refreshLabel}, your time.</p>}
          <p className="assurance">Free to play. No account needed.</p>
        </main>
      )}

      {view === 'play' && session && run && (
        <Play run={run} scenes={session.scenes} act={act} heading={run.mode === 'practice' ? 'Practice exhibit' : `#${edition} · ${dateLabel}`} reduced={reduced} />
      )}

      {view === 'results' && run && (
        <Results
          run={run}
          edition={edition}
          dateLabel={dateLabel}
          streak={computeStreak(store.completedDates(), today)}
          career={career(store.completedRuns())}
          refreshLabel={refreshLabel}
          isToday={run.date === today}
          claimed={challenge.date === run.date && challenge.seed === run.seed ? challenge.claimed : null}
          canReplay={!session!.stale}
          siteBase={siteBase}
          reduced={reduced}
          track={track}
          onReplay={() => {
            // Viewing only: nothing is rescored and the saved result is untouched.
            track('replay_reveal', { puzzle: run.puzzleKey, mode: run.mode, variant: run.variant });
            setView('replay');
          }}
          onHome={goHome}
        />
      )}

      {view === 'replay' && session && run && <Replay run={run} scenes={session.scenes} onBack={() => setView('results')} />}

      {view === 'gallery' && <Gallery />}

      {view === 'error' && (
        <main className="intro">
          <h1 className="intro-title">Hm.</h1>
          <p className="intro-sub" role="alert">
            Today's exhibit couldn't load. Try again, or play a practice round.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={() => startDaily(today)}>
              Try again
            </button>
            <button type="button" className="btn btn-secondary" onClick={startPractice}>
              Try a practice round
            </button>
          </div>
        </main>
      )}

      {overlay === 'help' && (
        <Modal title="How to play" onClose={() => setOverlay(null)}>
          <div className="help">
            <Mascot size={64} />
            <ol>
              <li>
                <strong>Find it.</strong> Four objects are drawn at one shared scale. Three are true to size; one has been enlarged or shrunk. Pick it.
                You can change your mind until you confirm.
              </li>
              <li>
                <strong>Fix it.</strong> Resize the real misfit until it belongs. You get to do this even if your pick was wrong.
              </li>
              <li>
                <strong>See it.</strong> The true size slides into place over your dashed estimate.
              </li>
            </ol>
            <h3>Scoring</h3>
            <p>
              Each round is worth 100: 40 for spotting the misfit and up to 60 for the repair. A repair that lands roughly within 5% of the true size
              earns all 60; points fall away smoothly the further off you are, and too big counts the same as equally too small. Five rounds, 500
              points. There is no timer.
            </p>
            <h3>Share symbols</h3>
            <ul className="bands">
              {BANDS.map((b) => (
                <li key={b.symbol}>
                  <span aria-hidden="true">{b.symbol}</span> {b.name}: {b.range} points in a round
                </li>
              ))}
            </ul>
            <p>Shared scores never include object names, sizes or answers.</p>
            <h3>Controls</h3>
            <p>
              Drag the slider, or use the minus and plus buttons. With a keyboard: press 1 to 4 to pick an object (or Tab to it and press Enter); arrow keys
              nudge the size by about half a percent, and Shift + arrow by about 5%.
            </p>
            <p>
              Misfit is a game about judging size by eye, so the comparison itself is visual. Text and icons accompany every colour, and motion follows
              your device's reduced-motion setting.
            </p>
            <p>
              One scored game a day, changing at midnight UTC ({refreshLabel}, your time). Your five rounds are drawn at random just for you, so no
              two players are likely to get the same game. "Challenge a friend" sends a link to your exact rounds, so the comparison is fair.
            </p>
          </div>
        </Modal>
      )}

      {overlay === 'settings' && (
        <Modal
          title="Settings"
          onClose={() => {
            setOverlay(null);
            setConfirmReset(false);
          }}
        >
          <div className="settings">
            <label className="toggle">
              <input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ ...settings, sound: e.target.checked })} />
              <span>Sound effects</span>
            </label>
            <label className="toggle">
              <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => setSettings({ ...settings, reduceMotion: e.target.checked })} />
              <span>Reduce motion</span>
            </label>

            <h3>Your data</h3>
            <p>
              Scores and streaks are saved in this browser only{store.persistent ? '' : ' — and this browser is blocking storage, so they will not survive a reload'}.
              There is no account and no cloud sync.
            </p>
            {!confirmReset ? (
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(true)}>
                Erase saved results…
              </button>
            ) : (
              <div className="confirm" role="alertdialog" aria-label="Confirm erase">
                <p>Erase everything? This removes your saved results, streak and settings from this device. It can't be undone.</p>
                <div className="action-row">
                  <button type="button" className="btn btn-danger" onClick={resetData}>
                    Yes, erase
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setConfirmReset(false)}>
                    Keep my results
                  </button>
                </div>
              </div>
            )}

            {playtest && (
              <>
                <h3>Private playtest</h3>
                <fieldset className="variant">
                  <legend>Variant for the next run you start</legend>
                  <label className="toggle">
                    <input type="radio" name="variant" checked={settings.variant === 'A'} onChange={() => setSettings({ ...settings, variant: 'A' })} />
                    <span>A — find it, then fix it</span>
                  </label>
                  <label className="toggle">
                    <input type="radio" name="variant" checked={settings.variant === 'B'} onChange={() => setSettings({ ...settings, variant: 'B' })} />
                    <span>B — fix a misfit that is already pointed out</span>
                  </label>
                </fieldset>
                <p>Scores from A (out of 500) and B (out of 300) are different competitions; report them separately.</p>
                <div className="action-row">
                  <button type="button" className="btn btn-secondary" onClick={downloadEvents}>
                    Download event log
                  </button>
                  <a className="btn btn-secondary" href="?gallery">
                    Fixture gallery
                  </a>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
