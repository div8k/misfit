// Content validator. Run with:  npm run validate:content
// Add --public to check whether the content could be published (it cannot yet).
import { CATALOG } from '../src/content/index.ts';
import { addDays, getDaily } from '../src/engine/schedule.ts';
import type { Issue } from '../src/engine/types.ts';
import { hasErrors, validateManifest, validateObject, validateScene } from '../src/engine/validate.ts';

const asPublic = process.argv.includes('--public');
const issues: Issue[] = [];

for (const o of Object.values(CATALOG.objects)) issues.push(...validateObject(o));
for (const s of Object.values(CATALOG.scenes)) issues.push(...validateScene(s, CATALOG.objects).filter((i) => !i.code.startsWith('object.')));
for (const m of CATALOG.manifests) issues.push(...validateManifest(m, CATALOG.scenes, CATALOG.objects, asPublic ? 'public' : m.status).filter((i) => i.code.startsWith('manifest.')));

// The seeded preview schedule must resolve for the next 60 days.
let previewFailures = 0;
for (let i = 0; i < 60; i++) {
  const date = addDays(CATALOG.epoch, i);
  if (!getDaily(CATALOG, date, date).ok) previewFailures++;
}

const objects = Object.values(CATALOG.objects);
const unverified = objects.filter((o) => o.status !== 'verified').length;
console.log(`Objects: ${objects.length} (${unverified} unverified)`);
console.log(`Scenes: ${Object.keys(CATALOG.scenes).length} · hand-edited manifests: ${CATALOG.manifests.length}`);
console.log(`Preview schedule: ${60 - previewFailures}/60 days resolve`);
console.log(`Mode: ${asPublic ? 'PUBLIC launch check' : 'demo'}`);
for (const i of issues) console.log(`  ${i.level.toUpperCase()} [${i.code}] ${i.ref}: ${i.message}`);

if (hasErrors(issues) || previewFailures > 0) {
  console.log(asPublic ? '\nNot publishable. Verify every measurement against its primary source first.' : '\nContent has errors.');
  process.exit(1);
}
console.log('\nContent is valid for demo use.');
