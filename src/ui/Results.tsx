import { useState } from 'react';
import type { Tracker } from '../engine/analytics.ts';
import { formatMm, measured } from '../engine/geometry.ts';
import { maxRoundPoints, roundPoints, summarize, verdictFor, verdictText, type Career } from '../engine/scoring.ts';
import { BANDS, bandIndex, buildChallengeUrl, buildShareText, roundPercents } from '../engine/share.ts';
import type { ResolvedScene, RunState } from '../engine/types.ts';
import { Board } from './Board.tsx';
import { useCountUp } from './hooks.ts';
import { Check, Cross, Mascot } from './parts.tsx';
import { drawScoreCard } from './scorecard.ts';

interface Props {
  run: RunState;
  edition: number;
  dateLabel: string;
  streak: number;
  career: Career;
  refreshLabel: string;
  isToday: boolean;
  claimed: number | null;
  canReplay: boolean;
  siteBase: string;
  reduced: boolean;
  track: Tracker;
  onReplay: () => void;
  onHome: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function Results({ run, edition, dateLabel, streak, career, refreshLabel, isToday, claimed, canReplay, siteBase, reduced, track, onReplay, onHome }: Props) {
  const s = summarize(run.results, run.variant, run.sceneRefs.length);
  const shown = useCountUp(s.score, reduced ? 0 : 350);
  const [toast, setToast] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [cardError, setCardError] = useState(false);
  const percents = roundPercents(run);
  const ctx = { puzzle: run.puzzleKey, mode: run.mode, variant: run.variant };
  const perfect = s.score === s.max;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((m) => (m === msg ? null : m)), 2600);
  };

  const copyOrFallback = async (text: string) => {
    if (await copyText(text)) {
      track('clipboard_success', ctx);
      setFallback(null);
      flash('Copied. Your group chat awaits.');
    } else {
      setFallback(text);
    }
  };

  const challenge = async () => {
    track('share_intent', { ...ctx, props: { channel: 'challenge' } });
    const text = buildShareText(run, edition, buildChallengeUrl(siteBase, run.date, run.seed, s.score));
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        // Resolving only means the sheet closed with a target chosen, not that anything was posted.
        track('share_sheet_resolved', { ...ctx, props: { outcome: 'completed' } });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') {
          track('share_sheet_resolved', { ...ctx, props: { outcome: 'cancelled' } });
          return;
        }
        track('share_sheet_resolved', { ...ctx, props: { outcome: 'failed' } });
      }
    }
    await copyOrFallback(text);
  };

  const copyScore = async () => {
    track('share_intent', { ...ctx, props: { channel: 'copy' } });
    await copyOrFallback(buildShareText(run, edition, buildChallengeUrl(siteBase, run.date, run.seed)));
  };

  const saveCard = async () => {
    track('share_intent', { ...ctx, props: { channel: 'card' } });
    try {
      let host = siteBase;
      try {
        host = new URL(siteBase).host;
      } catch {
        /* keep as is */
      }
      const blob = await drawScoreCard({
        edition,
        dateLabel,
        score: s.score,
        max: s.max,
        detail: run.variant === 'A' ? `${s.found}/${s.rounds} spotted` : 'Resize-only playtest',
        percents,
        host,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `misfit-${edition}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setCardError(false);
    } catch {
      setCardError(true);
    }
  };

  return (
    <main className="results">
      <div className="results-head">
        <Mascot />
        <div>
          <p className="eyebrow">
            #{edition} · {dateLabel}
          </p>
          <h1 className="title">Your eye for size</h1>
        </div>
      </div>

      <p className="score" aria-label={`${s.score} out of ${s.max} points`}>
        <span className="score-num">{shown}</span>
        <span className="score-max"> / {s.max}</span>
      </p>
      <p className="subheading">
        {run.variant === 'A' ? `${s.found}/${s.rounds} spotted · ${s.score}/${s.max} points` : `Resize-only playtest · ${s.score}/${s.max} points`}
      </p>
      {perfect && !reduced && (
        <div className="flourish" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ left: `${6 + i * 9.5}%`, animationDelay: `${(i % 5) * 70}ms` }} />
          ))}
        </div>
      )}
      {claimed !== null && <p className="note">Your friend claims {claimed}/500 on this exhibit. Claimed scores are unverified.</p>}

      <ol className="rounds">
        {run.results.map((r, i) => {
          const b = BANDS[bandIndex(percents[i])];
          return (
            <li key={i}>
              <span className={`mark band-${bandIndex(percents[i])}`} aria-hidden="true">
                <i style={{ height: `${percents[i]}%` }} />
              </span>
              <span className="round-name">Round {i + 1}</span>
              <span className="round-detail">
                {r.identified !== null && (
                  <span className={r.identified ? 'tone-good' : 'tone-bad'}>
                    {r.identified ? <Check /> : <Cross />} {r.identified ? 'Spotted' : 'Missed'}
                  </span>
                )}
                <span>Repair {r.repairPoints}/60</span>
              </span>
              <span className="round-points">
                {roundPoints(r)}
                <span className="sr-only">
                  {' '}
                  of {maxRoundPoints(run.variant)} points, {b.name}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <dl className="stats">
        {run.variant === 'A' && (
          <div>
            <dt>Spotting</dt>
            <dd>
              {s.found * 40}/{s.rounds * 40}
            </dd>
          </div>
        )}
        <div>
          <dt>Repair accuracy</dt>
          <dd>
            {s.repair}/{s.repairMax}
          </dd>
        </div>
        <div>
          <dt>Daily streak</dt>
          <dd>
            {streak} {streak === 1 ? 'day' : 'days'}
          </dd>
        </div>
      </dl>

      <h2 className="section">Your record on this device</h2>
      <dl className="stats">
        <div>
          <dt>Games played</dt>
          <dd>{career.played}</dd>
        </div>
        <div>
          <dt>Average</dt>
          <dd>{career.averagePercent}%</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{career.bestPercent}%</dd>
        </div>
      </dl>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={challenge}>
          Challenge a friend
        </button>
        <div className="action-row">
          <button type="button" className="btn btn-secondary" onClick={copyScore}>
            Copy score
          </button>
          <button type="button" className="btn btn-secondary" onClick={saveCard}>
            Save score card
          </button>
        </div>
        {canReplay && (
          <button type="button" className="btn btn-quiet" onClick={onReplay}>
            Replay the reveals
          </button>
        )}
      </div>

      {fallback !== null && (
        <div className="fallback" role="alert">
          <p>Sharing isn't available here. Copy your score instead.</p>
          <textarea readOnly rows={5} value={fallback} aria-label="Your score, ready to copy" onFocus={(e) => e.currentTarget.select()} />
        </div>
      )}
      {cardError && (
        <p className="note" role="alert">
          The score card couldn't be created in this browser. Copy your score instead.
        </p>
      )}

      <p className="closing">
        {isToday ? 'Tomorrow: five more things that look almost right.' : 'Five more things that look almost right are waiting.'}
      </p>
      {isToday && <p className="note">Next exhibit: {refreshLabel}, your time.</p>}
      <button type="button" className="btn btn-quiet" onClick={onHome}>
        Back to start
      </button>

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </main>
  );
}

export function Replay({ run, scenes, onBack }: { run: RunState; scenes: ResolvedScene[]; onBack: () => void }) {
  return (
    <main className="replay">
      <p className="banner banner-warn" role="note">
        Contains today's answers
      </p>
      <h1 className="title">The reveals</h1>
      {run.results.map((r, i) => {
        const scene = scenes[i];
        const misfit = scene.objects.find((o) => o.id === scene.misfitId)!;
        const v = verdictFor(r.ratio);
        const truth = measured(misfit);
        return (
          <section className="replay-round" key={scene.ref}>
            <h2>
              Round {i + 1}: {scene.title}
            </h2>
            <p className={v.kind === 'right' ? 'tone-good' : 'tone-bad'}>
              {v.kind === 'right' ? <Check /> : <Cross />} {misfit.label}: {verdictText(v)}
            </p>
            <Board scene={scene} phase="reveal" pickedId={r.pickedId} t={r.t} idPrefix={`replay-${i}`} />
            <p className="sub">
              You made it {formatMm(truth * r.ratio)}. The real one is {formatMm(truth)}. {scene.explanation}
            </p>
          </section>
        );
      })}
      <button type="button" className="btn btn-primary" onClick={onBack}>
        Back to my score
      </button>
    </main>
  );
}
