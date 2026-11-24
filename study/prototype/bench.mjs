// Compare the original module with the graph port: geometry, bbox, time, LOC.
import fs from 'node:fs';
import * as orig from '../scripts/cookie-2016bb.mjs';
import { build as port } from './models/cookie.mjs';

function stats(obj) {
  let tris = 0, verts = 0;
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    tris += a.count / 3; verts += a.count;
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = a.array[i * 3 + k];
        b[k] = Math.min(b[k], v); b[k + 3] = Math.max(b[k + 3], v);
      }
    }
  });
  return { tris, verts, bbox: b.map((v) => Math.round(v * 1e4) / 1e4) };
}

function time(fn, n = 50) {
  for (let i = 0; i < 5; i++) fn();
  const t = performance.now();
  for (let i = 0; i < n; i++) fn();
  return Math.round(((performance.now() - t) / n) * 100) / 100;
}

const cases = [
  ['default', {}],
  ['thin 3 chips', { thickness: 0.014, chips: 3 }],
  ['thick 14 chips', { thickness: 0.034, chips: 14, colorway: 'matcha' }],
];

for (const [name, p] of cases) {
  const a = stats(orig.createAsset(p));
  const b = stats(port(p));
  console.log(`\n${name}`);
  console.log('  original ', JSON.stringify(a));
  console.log('  port     ', JSON.stringify(b));
  console.log('  tris match', a.tris === b.tris, '| verts match', a.verts === b.verts);
}

const ta = time(() => orig.createAsset());
const tb = time(() => port());
console.log(`\nbuild ms: original ${ta}  port ${tb}`);

const loc = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).length;
console.log('LOC: original', loc('../scripts/cookie-2016bb.mjs'), ' port spec', loc('./models/cookie.mjs'));
