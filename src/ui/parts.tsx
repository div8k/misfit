import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { SLIDER_STEPS, stepToT, tToStep } from '../engine/scoring.ts';

export function Wordmark() {
  return (
    <span className="wordmark" aria-label="Misfit">
      <span aria-hidden="true">
        MISF<span className="tall-i">I</span>T
      </span>
    </span>
  );
}

/** Original folded-paper ruler mascot. Appears on results and help only. */
export function Mascot({ size = 72 }: { size?: number }) {
  return (
    <svg className="mascot" width={size} height={size * 0.8} viewBox="0 0 100 80" role="img" aria-label="A folded paper ruler">
      <path d="M12 66L40 16L58 62L88 14" fill="none" stroke="var(--ink)" strokeWidth="17" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 66L40 16L58 62L88 14" fill="none" stroke="var(--surface)" strokeWidth="12.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M18 55l5 2.8M24 44.5l5 2.8M30 34l5 2.8M45 29l-5 2M49 39.5l-5 2M53 50l-5 2M64 52.5l-4.5-3M70 43l-4.5-3" fill="none" stroke="var(--blue)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="79" cy="27" r="1.9" fill="var(--ink)" />
      <circle cx="84.5" cy="18.5" r="1.9" fill="var(--ink)" />
      <circle cx="40" cy="16" r="1.6" fill="var(--ink)" />
      <circle cx="58" cy="62" r="1.6" fill="var(--ink)" />
    </svg>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

interface ResizeProps {
  t: number;
  noun: string;
  onChange: (t: number) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * Logarithmic resize control. One step is about 0.5%.
 * Arrow keys move one step; Shift+Arrow moves ten; the − / + buttons move two.
 */
export function ResizeControl({ t, noun, onChange, inputRef }: ResizeProps) {
  const step = tToStep(t);
  const bump = (n: number) => onChange(stepToT(Math.max(-SLIDER_STEPS, Math.min(SLIDER_STEPS, step + n))));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey) return;
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (dir) {
      e.preventDefault();
      bump(dir * 10);
    }
  };
  const percent = Math.round(Math.exp(t) * 100);
  return (
    <div className="resize">
      <button type="button" className="step-btn" aria-label="Make it smaller" onClick={() => bump(-2)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 9h12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <div className="range-wrap">
        <input
          ref={inputRef}
          type="range"
          min={-SLIDER_STEPS}
          max={SLIDER_STEPS}
          step={1}
          value={step}
          aria-label={`Size of the ${noun}`}
          aria-valuetext={`${percent}% of the size first shown`}
          onChange={(e) => onChange(stepToT(Number(e.target.value)))}
          onKeyDown={onKey}
        />
        <div className="range-ends" aria-hidden="true">
          <span>Smaller</span>
          <span>Larger</span>
        </div>
      </div>
      <button type="button" className="step-btn" aria-label="Make it larger" onClick={() => bump(2)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 9h12M9 3v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function Check() {
  return (
    <svg className="glyph" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3.5 9.5l3.6 3.6L14.5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cross() {
  return (
    <svg className="glyph" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
