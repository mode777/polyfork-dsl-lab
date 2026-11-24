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
