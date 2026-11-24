import * as THREE from 'three';
import { graph } from './dsl.mjs';
import { evaluate } from './runtime.mjs';

export function stats(obj) {
  let tris = 0, verts = 0, meshes = 0;
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const a = o.geometry.attributes.position;
    const mult = o.isInstancedMesh ? o.count : 1;
    tris += (a.count / 3) * mult; verts += a.count * mult;
    for (let i = 0; i < a.count; i++) for (let k = 0; k < 3; k++) {
      const v = a.array[i * 3 + k];
      b[k] = Math.min(b[k], v); b[k + 3] = Math.max(b[k + 3], v);
    }
  });
  return { tris, verts, meshes, bbox: b.map((v) => Math.round(v * 1e4) / 1e4) };
}

export async function buildPort(name, params = {}) {
  const mod = await import(`./ports/${name}.mjs`);
  const g = graph(name);
  const meshRef = mod.default(g, params);
  g.out('mesh', meshRef);
  const t0 = performance.now();
  const { outputs } = evaluate(g.ir, params);
  const ms = performance.now() - t0;
  return { graph: g.ir, mesh: outputs.mesh, ms, stats: stats(outputs.mesh), nodes: g.ir.nodes.length };
}

export function diff(a, b) {
  return {
    tris: a.tris === b.tris, verts: a.verts === b.verts,
    bbox: JSON.stringify(a.bbox) === JSON.stringify(b.bbox),
  };
}

// ---------------------------------------------------------------- geometry parity
// Order-independent comparison: the user-facing contract is the same vertices
// in roughly the same place, not the same vertex buffer order.
export function geometry(obj) {
  let geo = null;
  obj.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
  if (!geo) throw new Error('geometry: no mesh');
  if (geo.index) geo = geo.toNonIndexed();
  return geo;
}
export function positions(obj) {
  obj.updateMatrixWorld(true);
  const out = [], v = new THREE.Vector3(), im = new THREE.Matrix4();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry;
    if (g.index) g = g.toNonIndexed();
    const p = g.attributes.position.array;
    if (o.isInstancedMesh) {
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, im);
        const m = new THREE.Matrix4().multiplyMatrices(o.matrixWorld, im);
        for (let i = 0; i < p.length; i += 3) {
          v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m);
          out.push(v.x, v.y, v.z);
        }
      }
    } else {
      for (let i = 0; i < p.length; i += 3) {
        v.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(o.matrixWorld);
        out.push(v.x, v.y, v.z);
      }
    }
  });
  return out;
}
export function bboxOf(pos) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
    const v = pos[i + k]; if (v < b[k]) b[k] = v; if (v > b[k + 3]) b[k + 3] = v;
  }
  return b;
}
function vertexList(pos) {
  const out = [];
  for (let i = 0; i < pos.length; i += 3) out.push([pos[i], pos[i + 1], pos[i + 2]]);
  return out;
}
function centroidList(pos) {
  const out = [];
  for (let i = 0; i < pos.length; i += 9) {
    out.push([
      (pos[i] + pos[i + 3] + pos[i + 6]) / 3,
      (pos[i + 1] + pos[i + 4] + pos[i + 7]) / 3,
      (pos[i + 2] + pos[i + 5] + pos[i + 8]) / 3,
    ]);
  }
  return out;
}
function nearestDistances(a, b, cell) {
  const grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (const q of b) {
    const k = key(q[0], q[1], q[2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(q);
  }
  const out = [];
  for (const p of a) {
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
    let best = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (list) for (const q of list) {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        if (d < best) best = d;
      }
    }
    if (best === Infinity) {
      // A vertex farther than one cell: fall back to a coarse scan. Ports should
      // not hit this, but it keeps the error honest instead of reporting 0.
      for (const q of b) {
        const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        if (d < best) best = d;
      }
    }
    out.push(best);
  }
  return out;
}
export function compareGeometry(orig, port, { tol = 1e-4 } = {}) {
  const a = positions(orig), b = positions(port);
  const ba = bboxOf(a), bb = bboxOf(b);
  const bboxDelta = Math.max(...ba.map((v, i) => Math.abs(v - bb[i])));
  const va = vertexList(a), vb = vertexList(b);
  const ca = centroidList(a), cb = centroidList(b);
  const span = Math.max(1e-6, ...ba.slice(3).map((v, i) => v - ba[i]));
  const cell = Math.max(tol, span / 96);
  const dAB = nearestDistances(va, vb, cell);
  const dBA = nearestDistances(vb, va, cell);
  const all = [...dAB, ...dBA];
  const maxVertexError = all.length ? Math.max(...all) : 0;
  const meanVertexError = all.length ? all.reduce((s, v) => s + v, 0) / all.length : 0;
  const cd = nearestDistances(ca, cb, cell);
  const maxCentroidError = cd.length ? Math.max(...cd) : 0;
  const trisA = a.length / 9, trisB = b.length / 9;
  // The user-facing contract is the same vertices in roughly the same place.
  // Triangle count/centroids are reported for diagnosis, but a different quad
  // diagonal (same four vertices) is not a parity failure.
  return {
    ok: va.length === vb.length && maxVertexError <= tol && bboxDelta <= tol,
    tris: [trisA, trisB],
    verts: [va.length, vb.length],
    bbox: [ba, bb],
    bboxDelta,
    maxVertexError,
    meanVertexError,
    maxCentroidError,
    tol,
  };
}
export function parityLine(name, result) {
  const p = result;
  return `${name.padEnd(10)} ${p.ok ? 'PASS' : 'FAIL'} tris ${p.tris[0]}/${p.tris[1]} ` +
    `vtxErr ${p.maxVertexError.toExponential(2)} mean ${p.meanVertexError.toExponential(2)} ` +
    `centroidErr ${p.maxCentroidError.toExponential(2)} bbox ${p.bboxDelta.toExponential(2)}`;
}
