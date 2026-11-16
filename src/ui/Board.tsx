import { ASPECT, BASELINE, place } from '../engine/geometry.ts';
import { withinTolerance } from '../engine/scoring.ts';
import type { ResolvedScene } from '../engine/types.ts';
import { useTween } from './hooks.ts';

export type BoardPhase = 'preview' | 'identify' | 'repair' | 'reveal';

interface Props {
  scene: ResolvedScene;
  phase: BoardPhase;
  selectedId?: string | null;
  pickedId?: string | null;
  /** Slider value; multiplier = exp(t). */
  t?: number;
  onSelect?: (id: string) => void;
  /** Reveal animation length in ms (0 = instant). */
  revealMs?: number;
  idPrefix?: string;
}

/**
 * The exhibit. Every cell's SVG has the same viewBox (the scene's extent in
 * millimetres) and the same on-screen size, so all four objects share exactly
 * one pixels-per-millimetre scale. Nothing is fitted per object.
 */
export function Board({ scene, phase, selectedId = null, pickedId = null, t = 0, onSelect, revealMs = 0, idPrefix = 'cell' }: Props) {
  const W = scene.extentMm;
  const H = W * ASPECT;
  const estimate = scene.distortion * Math.exp(t);
  const misfitScale = useTween(phase === 'reveal' ? 1 : phase === 'repair' ? estimate : scene.distortion, phase === 'reveal' ? revealMs : 0);
  const exposed = phase === 'repair' || phase === 'reveal';
  const good = phase === 'reveal' && withinTolerance(estimate);

  return (
    <div className={`board board-${phase}`}>
      {scene.objects.map((o) => {
        const isMisfit = o.id === scene.misfitId;
        const selected = phase === 'identify' && selectedId === o.id;
        const wrongPick = exposed && pickedId === o.id && !isMisfit;
        const target = exposed && isMisfit;
        const cls = ['cell', selected && 'is-selected', target && 'is-target', wrongPick && 'is-wrong'].filter(Boolean).join(' ');
        const labelId = `${idPrefix}-${o.id}`;
        const badge = selected
          ? { text: 'Your pick', icon: '✓' }
          : target
            ? pickedId === o.id
              ? { text: 'Spotted', icon: '✓' }
              : { text: 'The misfit', icon: '' }
            : wrongPick
              ? { text: 'Your pick', icon: '✕' }
              : null;
        const inner = (
          <>
            <svg className="draw" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
              <line className="shelf" x1={W * 0.05} x2={W * 0.95} y1={H * BASELINE} y2={H * BASELINE} />
              <g className={`art tone-${o.tone}`} style={{ color: o.color }} transform={place(o, W, isMisfit ? misfitScale : 1).transform} dangerouslySetInnerHTML={{ __html: o.art }} />
              {phase === 'reveal' && isMisfit && (
                <g className={`ghost ${good ? 'ghost-good' : ''}`} transform={place(o, W, estimate).transform} dangerouslySetInnerHTML={{ __html: o.art }} />
              )}
            </svg>
            {badge && (
              <span className="badge">
                {badge.icon && <span aria-hidden="true">{badge.icon} </span>}
                {badge.text}
              </span>
            )}
          </>
        );
        return (
          <div className="cell-wrap" key={o.id}>
            {phase === 'identify' ? (
              <button type="button" className={cls} aria-pressed={selected} aria-labelledby={labelId} onClick={() => onSelect?.(o.id)}>
                {inner}
              </button>
            ) : (
              <div className={cls}>{inner}</div>
            )}
            {phase !== 'preview' && (
              <div className="label" id={labelId}>
                {o.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
