// Compare the original area-rug module with its graph port.
import fs from 'node:fs';
import * as orig from '../scripts/area-rug-5c56e2.mjs';
import { build as port } from './models/area-rug.mjs';

function stats(obj) {
  let tris = 0, verts = 0;
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    tris += a.count / 3; verts += a.count;
    for (let i = 0; i < a.count; i++) for (let k = 0; k < 3; k++) {
      const v = a.array[i * 3 + k];
      b[k] = Math.min(b[k], v); b[k + 3] = Math.max(b[k + 3], v);
    }
  });
  return { tris, verts, bbox: b.map((v) => Math.round(v * 1e4) / 1e4) };
}

const cases = [
  ['default', {}],
  ['plain, flat pile', { pattern: 'plain', pile: 0 }],
  ['large, lived-in', { size: 'large', lived_in: 1, pile: 1, colorway: 'slate-teal' }],
  ['bordered', { pattern: 'bordered', lived_in: 0 }],
];

for (const [name, p] of cases) {
  const a = stats(orig.createAsset(p));
  const b = stats(port(p));
  const same = a.tris === b.tris && a.verts === b.verts && JSON.stringify(a.bbox) === JSON.stringify(b.bbox);
  console.log(`\n${name}: ${same ? 'MATCH' : 'DIFF'}`);
  if (!same) {
    console.log('  original', JSON.stringify(a));
    console.log('  port    ', JSON.stringify(b));
  } else console.log('  ', JSON.stringify(a));
}

const loc = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length;
console.log('\nLOC: original', loc('../scripts/area-rug-5c56e2.mjs'), ' port spec', loc('./models/area-rug.mjs'));
