import { ASPECT, BASELINE, place } from '../engine/geometry.ts';
import { withinTolerance } from '../engine/scoring.ts';
import type { GameObject, ResolvedScene } from '../engine/types.ts';
import { useTween } from './hooks.ts';

/**
 * One object, drawn in its colour with a soft highlight, edge shading and a
 * contact shadow so it reads as a solid thing rather than a flat cut-out.
 * The shading is clipped to the object's own shape with a mask.
 */
function Shaded({ o, W, H, scale, sid }: { o: GameObject; W: number; H: number; scale: number; sid: string }) {
  const p = place(o, W, scale);
  const [vx, vy, vw, vh] = o.viewBox;
  // Balls get a spherical highlight; flat things (coins, discs, cards) get a gentle sheen.
  const round = /ball$/i.test(o.noun);
  return (
    <>
      <defs>
        <mask id={`m-${sid}`}>
          <g className="mask-art" dangerouslySetInnerHTML={{ __html: o.art }} />
        </mask>
        {round ? (
          <radialGradient id={`g-${sid}`} cx="0.34" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="0.7" stopColor="#000" stopOpacity="0.1" />
            <stop offset="1" stopColor="#000" stopOpacity="0.42" />
          </radialGradient>
        ) : (
          <linearGradient id={`g-${sid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.26" />
          </linearGradient>
        )}
      </defs>
      <ellipse className="ground" cx={W / 2} cy={H * BASELINE} rx={p.widthMm * 0.48} ry={Math.max(W * 0.006, Math.min(p.heightMm * 0.05, W * 0.02))} />
      <g className={`art tone-${o.tone}`} style={{ color: o.color }} transform={p.transform} dangerouslySetInnerHTML={{ __html: o.art }} />
      <g transform={p.transform} className="shade">
        <rect x={vx} y={vy} width={vw} height={vh} fill={`url(#g-${sid})`} mask={`url(#m-${sid})`} />
      </g>
    </>
  );
}

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
              <Shaded o={o} W={W} H={H} scale={isMisfit ? misfitScale : 1} sid={`${idPrefix}-${o.id}`} />
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
