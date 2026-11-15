// Counts every distinct valid generated round. Run with: npm run count:pool
import { CATALOG } from '../src/content/index.ts';
import { buildRound, GEN_DISTORTIONS } from '../src/engine/schedule.ts';

const ids = Object.keys(CATALOG.objects).sort();
let quads = 0;
let rounds = 0;
for (let a = 0; a < ids.length; a++)
  for (let b = a + 1; b < ids.length; b++)
    for (let c = b + 1; c < ids.length; c++)
      for (let d = c + 1; d < ids.length; d++) {
        const quad = [ids[a], ids[b], ids[c], ids[d]];
        let any = false;
        for (const m of quad)
          for (const k of GEN_DISTORTIONS)
            if (buildRound(CATALOG, quad, m, k)) {
              rounds++;
              any = true;
            }
        if (any) quads++;
      }
console.log(`Objects: ${ids.length}`);
console.log(`Object groups of four that make a fair scene: ${quads}`);
console.log(`Distinct valid rounds (group × misfit × distortion): ${rounds}`);
