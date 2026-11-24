import * as THREE from 'three';
import { graph } from './dsl.mjs';
import { evaluate, ADDONS } from './runtime.mjs';
import { stats } from './run.mjs';

// A code node can return a THREE object directly.
const g1 = graph('code-object');
const obj = g1.script({
  src: `
    const geo = ADDONS.mergeGeometries([
      new THREE.BoxGeometry(0.2, 0.1, 0.1),
      new THREE.BoxGeometry(0.1, 0.2, 0.1).translate(0.15, 0, 0),
    ]);
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#88aaff' }));
  `,
});
g1.out('mesh', g1.mesh(obj));
console.log('code object', stats(evaluate(g1.ir).outputs.mesh));

// A code node can return a BufferGeometry; geometry/mesh bridge it into the
// graph's zone/colour path.
const g2 = graph('code-buffer');
const buf = g2.script({
  src: `
    const g = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12, 1, false);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    return g;
  `,
});
g2.out('mesh', g2.mesh(g2.geometry({ object: buf, zone: 'metal' }), { zones: { metal: '#c2c7cd' } }));
console.log('code buffer', stats(evaluate(g2.ir).outputs.mesh));

// A random stream is consumable and deterministic.
const g3 = graph('random-stream');
const rnd = g3.random({ seed: 42, count: 8 });
const pts = g3.scatter({
  count: 3, rng: rnd, lazy: true, tries: 20, minDist: 0,
  sample: '[r0, r1]',
  size: '[0.1, 0.2, 0.3]',
});
g3.out('pts', pts);
const a = evaluate(g3.ir).outputs.pts.pts;
const b = evaluate(g3.ir).outputs.pts.pts;
console.log('random stream', JSON.stringify(a), JSON.stringify(a) === JSON.stringify(b) ? 'deterministic' : 'NONDETERMINISTIC');

// A grid value can be deformed before solidify.
const g4 = graph('grid-deform');
const grid = g4.grid({ nx: 2, nz: 2, w: 1, d: 1, position: '[x, 1, z]' });
const moved = g4.deform({ geom: grid, expr: '[x, y + 0.5, z]' });
g4.out('mesh', g4.mesh(g4.solidify({ grid: moved, topZone: 'a', botZone: 'a', wallZone: 'a' }), { zones: { a: '#888888' } }));
console.log('grid deform', stats(evaluate(g4.ir).outputs.mesh));
