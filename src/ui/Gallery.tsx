import { useState } from 'react';
import { CATALOG } from '../content/index.ts';
import { formatMm, requiredExtent } from '../engine/geometry.ts';
import { generateGame, resolveScene } from '../engine/schedule.ts';
import { T_MAX, T_MIN } from '../engine/scoring.ts';
import type { Scene } from '../engine/types.ts';
import { sceneIsVerified, validateManifest, validateScene } from '../engine/validate.ts';
import { Board } from './Board.tsx';

function SceneCard({ scene }: { scene: Scene }) {
  const [t, setT] = useState(0);
  const issues = validateScene(scene, CATALOG.objects);
  const resolved = resolveScene(scene, CATALOG.objects);
  const verified = sceneIsVerified(scene, CATALOG.objects);
  return (
    <section className="gallery-scene">
      <h2>
        {scene.title} <small>{scene.id}@v{scene.version} · {scene.difficulty}</small>
      </h2>
      <p className="sub">
        Misfit: <strong>{scene.misfitId}</strong> at {Math.round(scene.distortion * 100)}% · extent {scene.layout.extentMm} mm
        {resolved && ` (needs ≥ ${requiredExtent(resolved.objects, scene.misfitId, scene.distortion).toFixed(1)})`} ·{' '}
        {verified ? 'verified' : 'UNVERIFIED — demo only'}
      </p>
      {resolved ? <Board scene={resolved} phase="repair" t={t} idPrefix={`g-${scene.id}`} /> : <p className="tone-bad">Scene cannot be resolved.</p>}
      <label className="gallery-range">
        Scrub the misfit across the whole slider ({Math.round(Math.exp(t) * 100)}%)
        <input type="range" min={T_MIN} max={T_MAX} step={0.005} value={t} onChange={(e) => setT(Number(e.target.value))} />
      </label>
      {issues.length === 0 ? (
        <p className="tone-good">Validator: no issues for demo use.</p>
      ) : (
        <ul className="issues">
          {issues.map((i, n) => (
            <li key={n} className={i.level === 'error' ? 'tone-bad' : ''}>
              {i.level}: {i.message} ({i.code})
            </li>
          ))}
        </ul>
      )}
      {resolved && (
        <table className="gallery-table">
          <thead>
            <tr>
              <th>Object</th>
              <th>True size</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {resolved.objects.map((o) => (
              <tr key={o.id}>
                <td>{o.label}</td>
                <td>
                  {formatMm(o.widthMm)} × {formatMm(o.heightMm)}
                </td>
                <td>
                  <a href={o.sourceUrl} target="_blank" rel="noreferrer noopener">
                    {o.sourceShortName}
                  </a>
                </td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Private fixture gallery / content editor preview. Open with ?gallery. */
export function Gallery() {
  const manifest = CATALOG.manifests[0];
  const publicIssues = manifest ? validateManifest(manifest, CATALOG.scenes, CATALOG.objects, 'public').filter((i) => i.level === 'error') : [];
  return (
    <main className="gallery">
      <h1 className="title">Fixture gallery</h1>
      <p className="sub">
        Every demo scene at its shared scale, with validator output. Drag a scene's slider to check that the misfit stays inside its cell and clear of
        labels across the full range.
      </p>
      <p className={publicIssues.length ? 'banner banner-warn' : 'banner'}>
        Public-launch check for {manifest?.date}: {publicIssues.length} blocking {publicIssues.length === 1 ? 'issue' : 'issues'} (unverified
        measurements cannot be published).
      </p>
      {Object.values(CATALOG.scenes).map((s) => (
        <SceneCard key={s.id} scene={s} />
      ))}
      <h2 className="title">Generated sample</h2>
      <p className="sub">
        Players' daily games are generated from the catalogue with a random seed. This is the game for seed "sample" on {CATALOG.epoch}; run{' '}
        <code>npm run count:pool</code> for the size of the whole pool.
      </p>
      {(generateGame(CATALOG, `${CATALOG.epoch}:sample`) ?? []).map((s) => (
        <SceneCard key={s.id} scene={s} />
      ))}
      <h2 className="title">All {Object.keys(CATALOG.objects).length} objects</h2>
      <p className="sub">Each drawing on its own (not to a shared scale), for checking the artwork.</p>
      <div className="sheet">
        {Object.values(CATALOG.objects).map((o) => (
          <figure key={o.id}>
            <svg className="draw" viewBox={`${-o.widthMm * 0.06} ${-o.heightMm * 0.06} ${o.widthMm * 1.12} ${o.heightMm * 1.12}`} aria-hidden="true">
              <g className={`art tone-${o.tone}`} style={{ color: o.color }} dangerouslySetInnerHTML={{ __html: o.art }} />
            </svg>
            <figcaption>
              {o.label}
              <br />
              {formatMm(o.widthMm)} × {formatMm(o.heightMm)}
            </figcaption>
          </figure>
        ))}
      </div>
      <p>
        <a href="./">Back to the game</a>
      </p>
    </main>
  );
}
