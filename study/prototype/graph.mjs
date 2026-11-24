// Minimal three.js-native node runtime for the feasibility test.
// Nodes are pure functions of (params, inputs) -> geometry or points.
// This is research code: it exists to measure whether Polyfork-style assets
// can be expressed as a graph, not to be shipped.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const tri = (o, a, b, c) => o.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
const quad = (o, a, b, c, d) => { tri(o, a, b, c); tri(o, a, c, d); };
const rotY = (p, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c];
};
const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];

export function graph(params = {}) { return new G(params); }

class G {
  constructor(params) { this.params = params; this.parts = []; }
  p(k) { return this.params[k]; }

  // ---- sources ---------------------------------------------------------
  ring({ n = 16, radius = 1, y = 0, sx = 1, sz = 1, phase = 0 }) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * TAU;
      const r = typeof radius === 'function' ? radius(i) : radius;
      pts.push([Math.cos(a) * r * sx, y, Math.sin(a) * r * sz]);
    }
    return pts;
  }

  grid({ nx, nz, w, d, position = (x, z) => [x, 0, z] }) {
    const top = [], bot = [];
    for (let i = 0; i <= nx; i++) {
      top.push([]); bot.push([]);
      for (let j = 0; j <= nz; j++) {
        const x = -w / 2 + (i * w) / nx, z = -d / 2 + (j * d) / nz;
        const p = position(x, z, i, j);
        top[i].push([p[0], p[1], p[2]]);
        bot[i].push([p[0], 0, p[2]]);
      }
    }
    return { top, bot };
  }

  // ---- surfaces --------------------------------------------------------
  loft({ rings, capTop, capBottom, zones = { capTop: 'a', band: 'b', capBottom: 'b' } }) {
    const out = {};
    const put = (z, pos) => (out[z] ??= []).push(...pos);
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1], n = A.length, pos = [];
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(pos, A[i], A[j], B[j], B[i]); }
      put(zones.band, pos);
    }
    if (capTop) {
      const A = rings[rings.length - 1], n = A.length, pos = [];
      for (let i = 0; i < n; i++) tri(pos, capTop, A[(i + 1) % n], A[i]);
      put(zones.capTop, pos);
    }
    if (capBottom) {
      const A = rings[0], n = A.length, pos = [];
      for (let i = 0; i < n; i++) tri(pos, capBottom, A[i], A[(i + 1) % n]);
      put(zones.capBottom, pos);
    }
    return Object.entries(out).map(([z, pos]) => ({ pos, z }));
  }

  // grid top/bottom + side walls: the "solidify" node.
  // zones may be a name or fn(i, j) -> name, so per-cell colour is a field.
  solidify({ top, bot, wallZone = 'b', topZone = 'a', botZone = 'c' }) {
    const nx = top.length - 1, nz = top[0].length - 1;
    const zof = (z, i, j) => (typeof z === 'function' ? z(i, j) : z);
    const out = { top: [], bot: [], wall: [] };
    const zt = {}, zb = {};
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const a = top[i][j], b = top[i + 1][j], c = top[i + 1][j + 1], d = top[i][j + 1];
      const kt = zof(topZone, i, j), kb = zof(botZone, i, j);
      (zt[kt] ??= []); (zb[kb] ??= []);
      quad(zt[kt], a, b, c, d);
      const e = bot[i][j], f = bot[i + 1][j], g = bot[i + 1][j + 1], h = bot[i][j + 1];
      quad(zb[kb], e, h, g, f);
    }
    for (let i = 0; i < nx; i++) {
      for (const [j, flip] of [[0, true], [nz, false]]) {
        const a = top[i][j], b = top[i + 1][j], c = bot[i + 1][j], d = bot[i][j];
        flip ? quad(out.wall, a, b, c, d) : quad(out.wall, d, c, b, a);
      }
    }
    for (let j = 0; j < nz; j++) {
      for (const [i, flip] of [[0, false], [nx, true]]) {
        const a = top[i][j], b = top[i][j + 1], c = bot[i][j + 1], d = bot[i][j];
        flip ? quad(out.wall, a, b, c, d) : quad(out.wall, d, c, b, a);
      }
    }
    const parts = Object.entries(zt).map(([z, pos]) => ({ pos, z }));
    parts.push(...Object.entries(zb).map(([z, pos]) => ({ pos, z })));
    parts.push({ pos: out.wall, z: typeof wallZone === 'function' ? wallZone() : wallZone });
    return parts;
  }

  // deform a grid in place: one field per vertex, applied to top and bottom
  deform(grid, fn) {
    grid.top = grid.top.map((row, i) => row.map((p, j) => fn(p, i, j, 'top')));
    grid.bot = grid.bot.map((row, i) => row.map((p, j) => fn(p, i, j, 'bot')));
    return grid;
  }

  // ---- instances -------------------------------------------------------
  pyramid({ sides = 6, r = 1, h = 0.005, apex = 0.0075, baseY = 0 }) {
    return { sides, r, h, apex, baseY };
  }

  // seeded rejection sampler: the "distribute points" node
  // point = [x, y, z, scale, yaw]
  scatter({ count, minDist = 0, seed = 1, tries = 1000, sample, height = () => 0, size = () => 1 }) {
    let s = seed >>> 0;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const out = [];
    for (let t = 0; t < tries && out.length < count; t++) {
      const [x, z] = sample(rnd);
      if (out.some((p) => Math.hypot(p[0] - x, p[2] - z) < minDist)) continue;
      out.push([x, height(x, z), z, size(rnd), rnd() * TAU]);
    }
    return out;
  }

  // "instance on points": proto is a local-space geometry descriptor
  instance(points, proto) {
    const pos = [];
    for (const [x, y, z, sz, yaw] of points) {
      const ring = [];
      for (let i = 0; i < proto.sides; i++) {
        const a = (i / proto.sides) * TAU;
        ring.push(rotY([Math.cos(a) * proto.r * sz, proto.baseY, Math.sin(a) * proto.r * sz], yaw));
      }
      const apex = rotY([0, proto.apex, 0], yaw);
      for (let i = 0; i < proto.sides; i++) {
        const j = (i + 1) % proto.sides;
        tri(pos, add(apex, [x, y, z]), add(ring[j], [x, y, z]), add(ring[i], [x, y, z]));
      }
    }
    return { pos, z: proto.zone ?? 'a' };
  }

  // ---- combine ---------------------------------------------------------
  merge(parts) {
    this.parts.push(...parts.flat());
    return this;
  }

  mesh({ zoneColors = {}, material } = {}) {
    const geos = this.parts.map(({ pos, z }) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const c = new THREE.Color(zoneColors[z] ?? '#ffffff');
      const col = new Float32Array((pos.length / 3) * 3);
      for (let i = 0; i < pos.length / 3; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    });
    const merged = mergeGeometries(geos);
    merged.computeVertexNormals();
    const mesh = new THREE.Mesh(merged, material ?? new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0,
    }));
    return mesh;
  }
}
