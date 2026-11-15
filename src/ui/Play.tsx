import { useEffect, useRef } from 'react';
import type { Action } from '../engine/game.ts';
import { formatMm, measured } from '../engine/geometry.ts';
import { maxRoundPoints, roundPoints, verdictFor, verdictText } from '../engine/scoring.ts';
import type { GameObject, ResolvedScene, RunState } from '../engine/types.ts';
import { Board } from './Board.tsx';
import { useCountUp } from './hooks.ts';
import { Check, Cross, ResizeControl } from './parts.tsx';

interface Props {
  run: RunState;
  scenes: ResolvedScene[];
  act: (a: Action) => void;
  heading: string;
  reduced: boolean;
}

const measureWord = (o: GameObject) => (o.measure === 'diameter' ? 'across' : o.measure === 'height' ? 'tall' : 'wide');

function RoundScore({ points, max, reduced }: { points: number; max: number; reduced: boolean }) {
  const shown = useCountUp(points, reduced ? 0 : 350);
  return (
    <p className="round-score">
      <strong>{shown}</strong>
      <span> / {max}</span>
    </p>
  );
}

export function Play({ run, scenes, act, heading, reduced }: Props) {
  const scene = scenes[run.round];
  const misfit = scene.objects.find((o) => o.id === scene.misfitId)!;
  const total = scenes.length;
  const phase = run.phase === 'results' ? 'reveal' : run.phase;
  const result = phase === 'reveal' ? run.results[run.round] : null;
  const last = run.round + 1 >= total;

  const headRef = useRef<HTMLHeadingElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const first = useRef(true);
  // Move focus to the control the new phase is about, so keyboard play flows.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const opts = { preventScroll: true };
    if (phase === 'repair') sliderRef.current?.focus(opts);
    else if (phase === 'reveal') nextRef.current?.focus(opts);
    else headRef.current?.focus(opts);
  }, [phase, run.round]);

  let title: React.ReactNode;
  let sub: React.ReactNode;
  if (phase === 'identify') {
    title = 'Which one is the wrong size?';
    sub = "Three are to scale. One isn't.";
  } else if (phase === 'repair') {
    title = `Resize the ${misfit.noun} until it belongs.`;
    sub =
      run.pending?.identified === true ? (
        <span className="tone-good">
          <Check /> Found it. Now fix it.
        </span>
      ) : run.pending?.identified === false ? (
        <span className="tone-bad">
          <Cross /> Sneaky. It was the {misfit.noun}. Now fix it.
        </span>
      ) : (
        'This one is the wrong size. The other three are to scale.'
      );
  } else {
    const v = verdictFor(result!.ratio);
    title = (
      <span className={v.kind === 'right' ? 'tone-good' : 'tone-bad'}>
        {v.kind === 'right' ? <Check /> : <Cross />} {verdictText(v)}
      </span>
    );
    const truth = measured(misfit);
    sub = `You made it ${formatMm(truth * result!.ratio)} ${measureWord(misfit)}. The real ${misfit.noun} is ${formatMm(truth)}.`;
  }

  return (
    <main className="play">
      <div className="meta">
        <span>{heading}</span>
        <span className="meta-round">
          Round {run.round + 1} of {total}
        </span>
        <span className="marks" aria-hidden="true">
          {scenes.map((_, i) => (
            <i key={i} className={i < run.results.length ? 'done' : i === run.round ? 'now' : ''} />
          ))}
        </span>
      </div>

      <div className="prompt" aria-live="polite">
        <h1 className="instruction" ref={headRef} tabIndex={-1}>
          {title}
        </h1>
        <p className="sub">{sub}</p>
      </div>

      <Board
        key={scene.ref}
        scene={scene}
        phase={phase}
        selectedId={run.selectedId}
        pickedId={result ? result.pickedId : (run.pending?.pickedId ?? null)}
        t={result ? result.t : run.t}
        onSelect={(id) => act({ type: 'select', id })}
        revealMs={reduced ? 0 : 650}
      />

      <div className="controls">
        {phase === 'identify' && (
          <button type="button" className="btn btn-primary" disabled={!run.selectedId} onClick={() => act({ type: 'confirm' })}>
            {run.selectedId ? "That's the misfit" : 'Pick an object'}
          </button>
        )}
        {phase === 'repair' && (
          <>
            <ResizeControl t={run.t} noun={misfit.noun} onChange={(t) => act({ type: 'setT', t })} inputRef={sliderRef} />
            <button type="button" className="btn btn-primary" onClick={(e) => e.detail < 2 && act({ type: 'lock' })}>
              Lock it in
            </button>
          </>
        )}
        {phase === 'reveal' && result && (
          <>
            <div className="reveal-card">
              <RoundScore key={scene.ref} points={roundPoints(result)} max={maxRoundPoints(run.variant)} reduced={reduced} />
              <ul className="chips">
                {result.identified !== null && (
                  <li className={result.identified ? 'chip chip-good' : 'chip chip-bad'}>
                    {result.identified ? <Check /> : <Cross />} {result.identified ? 'Spotted' : 'Missed'} +{result.idPoints}
                  </li>
                )}
                <li className="chip">Repair +{result.repairPoints}</li>
              </ul>
            </div>
            {/* e.detail guards against the second click of a double click on "Lock it in" landing here */}
            <button type="button" className="btn btn-primary" ref={nextRef} onClick={(e) => e.detail < 2 && act({ type: 'next' })}>
              {run.mode === 'practice' ? 'Back to start' : last ? 'See my score' : 'Next round'}
            </button>
            <div className="reveal-notes">
              <p className="legend">
                <span className="key key-dash" aria-hidden="true" /> Your size
                <span className="key key-solid" aria-hidden="true" /> Real size
              </p>
              <p className="explainer">
                Shown size: {formatMm(measured(misfit) * scene.distortion)}. Reference: {misfit.sourceShortName}.
              </p>
              <details className="why">
                <summary>Why this size?</summary>
                <p>{scene.explanation}</p>
                <p>
                  {misfit.definition} {misfit.notes}
                </p>
                <p>
                  <a href={misfit.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {misfit.sourceTitle}
                  </a>
                  {misfit.status !== 'verified' && ' — demo measurement, not yet checked against the primary source.'}
                </p>
              </details>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
