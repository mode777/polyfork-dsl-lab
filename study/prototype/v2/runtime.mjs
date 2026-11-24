// v2 graph runtime: registry-based DAG, typed values, fields, groups, escape hatches.
// Research code for the Polyfork feasibility study.
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { compileExpr, evalExpr, parseExpr } from './expr.mjs';

export const TAU = Math.PI * 2;
export const ADDONS = { mergeGeometries, toCreasedNormals, RoundedBoxGeometry };
export const V = {
  geom: 'geometry', points: 'points', field: 'field', profile: 'profile', path: 'path',
  number: 'number', int: 'int', bool: 'bool', string: 'string', color: 'color',
  vec3: 'vec3', enum: 'enum', any: 'any', mesh: 'mesh', object: 'object', random: 'random',
};

export const makePrng = (seed = 1) => {
  let s = seed >>> 0;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

// ---------------------------------------------------------------- graph model
const hasRefDeep = (v) => {
  if (isRef(v)) return true;
  if (Array.isArray(v)) return v.some(hasRefDeep);
  if (v && typeof v === 'object' && !isField(v) && typeof v.__expr === 'undefined' && !v.isObject3D) return Object.values(v).some(hasRefDeep);
  return false;
};

export class Graph {
  constructor(name, meta = {}) {
    this.name = name;
    this.meta = meta;
    this.inputs = [];          // {name, type, default, min?, max?, options?}
    this.nodes = [];           // {id, type, in:{}, p:{}}
    this.byId = new Map();
    this.outputs = {};         // {name: ref}
    this.groups = new Map();   // name -> Graph
    this._seq = 0;
  }
  input(name, type, def, extra = {}) {
    const h = { __ref: '$' + name };
    this.inputs.push({ name, type, default: def, ...extra });
    return h;
  }
  add(type, inp = {}, params = {}) {
    const id = params.id || `n${this._seq++}`;
    delete params.id;
    const p = { ...params };
    for (const [k, v] of Object.entries(p)) {
      if (hasRefDeep(v)) { inp[k] = v; delete p[k]; }
    }
    const node = { id, type, in: inp, p };
    this.nodes.push(node);
    this.byId.set(id, node);
    return { __ref: id };
  }
  group(name) {
    const g = new Graph(name, { group: true });
    this.groups.set(name, g);
    return g;
  }
  out(name, ref) { this.outputs[name] = ref; return this; }
}

export const ref = (v) => (v && typeof v === 'object' && '__ref' in v ? v.__ref : null);
export const isRef = (v) => v && typeof v === 'object' && '__ref' in v;
const jsonSafe = (v) => (typeof v === 'function' ? String(v) : v);

// ---------------------------------------------------------------- fields
// Fields are parsed expressions, not JavaScript. See expr.mjs for the grammar.
const fieldCache = new Map();
function compileField(src) {
  if (typeof src !== 'string') return () => src;
  if (!fieldCache.has(src)) fieldCache.set(src, compileExpr(src));
  const fn = fieldCache.get(src);
  return (ctx = {}) => fn({
    ...ctx,
    x: ctx.x ?? 0, y: ctx.y ?? 0, z: ctx.z ?? 0,
    i: ctx.i ?? 0, k: ctx.k ?? 0, u: ctx.u ?? 0, v: ctx.v ?? 0,
    p: ctx.p ?? [0, 0, 0], n: ctx.n ?? [0, 1, 0], s: ctx.s ?? {}, vals: ctx.vals ?? {},
    r0: ctx.r0 ?? 0, r1: ctx.r1 ?? 0, r2: ctx.r2 ?? 0, r3: ctx.r3 ?? 0,
  });
}
export const field = (src) => ({ __field: typeof src === 'function' ? String(src) : src });
export const isField = (v) => v && typeof v === 'object' && '__field' in v;
export const expr = (src) => ({ __expr: typeof src === 'function' ? String(src) : src });

// ---------------------------------------------------------------- helpers
const tri = (o, a, b, c) => o.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
const quad = (o, a, b, c, d) => { tri(o, a, b, c); tri(o, a, c, d); };
// Emit a triangle with its winding facing away from `inside`. This is the same
// rule the reference signage builders use for hand-authored quads and caps.
const triOut = (o, a, b, c, inside = [0, 0, 0]) => {
  const u = sub3(b, a), v = sub3(c, a), n = cross3(u, v);
  const mid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
  if (dot3(n, sub3(mid, inside)) >= 0) tri(o, a, b, c); else tri(o, a, c, b);
};
const quadOut = (o, a, b, c, d, inside) => { triOut(o, a, b, c, inside); triOut(o, a, c, d, inside); };
const part = (pos, zone = 'a') => ({ pos, zone });
const geom = (parts) => ({ __kind: 'geom', parts: Array.isArray(parts) ? parts : [parts] });
const pts = (p, attrs = {}) => ({ __kind: 'points', pts: p, attrs });
const profile = (p) => ({ __kind: 'profile', pts: p });
const path = (p, closed = false) => ({ __kind: 'path', pts: p, closed });
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[2] * s, p[1], p[0] * s + p[2] * c]; };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const asArray = (v) => (v && typeof v === 'object' && Array.isArray(v.pts) ? v.pts : v);
const hash01 = (a, b = 0, c = 0) => { const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return h - Math.floor(h); };
function xf(pos, p) {
  if (!p.x && !p.y && !p.z && !p.rx && !p.ry && !p.rz && !p.s) return pos;
  const sc = Array.isArray(p.s) ? [p.s[0] ?? 1, p.s[1] ?? 1, p.s[2] ?? 1] : [p.s ?? 1, p.s ?? 1, p.s ?? 1];
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'XYZ')),
    new THREE.Vector3(sc[0], sc[1], sc[2]),
  );
  const out = new Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(m);
    out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
  }
  return out;
}

// ---------------------------------------------------------------- registry
export const NODES = new Map();
export function node(type, schema, fn) { NODES.set(type, { type, schema, fn }); }

// values are resolved before fn(); fields stay lazy
function coerce(v) { return v; }

export function evaluate(graph, values = {}, opts = {}) {
  const memo = new Map();
  const allowScript = opts.allowScript === true;
  const root = opts.root ?? graph;
  const params = { ...Object.fromEntries(graph.inputs.map((i) => [i.name, i.default])), ...values };
  const paramValue = (v) => {
    if (v && typeof v === 'object') {
      if ('__expr' in v) {
        const r = evalExpr(v.__ast ?? (v.__ast = parseExpr(v.__expr)), { s: params, ...params });
        return typeof r === 'function' ? r(params) : r;
      }
      if ('__field' in v || v.__kind || v.isObject3D || v.isBufferGeometry || v.isMaterial || v.isBufferAttribute) return v;
      if (Array.isArray(v)) return v.map(paramValue);
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = paramValue(x);
      return o;
    }
    return v;
  };
  const evalNodeParams = (p) => {
    const out = {};
    for (const [k, v] of Object.entries(p)) out[k] = paramValue(v);
    return out;
  };
  const resolve = (v, ctx) => {
    if (isRef(v)) {
      const key = v.__ref;
      if (key.startsWith('$')) return params[key.slice(1)];
      // Multi-output refs: @node.field or @node.a.b. The base node is evaluated
      // once and memoised; the path is then read from its object value.
      const dot = key.indexOf('.');
      if (dot > 0) {
        const base = resolve({ __ref: key.slice(0, dot) }, ctx);
        return key.slice(dot + 1).split('.').reduce((o, k) => o?.[k], base);
      }
      if (memo.has(key)) return memo.get(key);
      const n = graph.byId.get(key);
      if (!n) throw new Error(`unknown node ${key}`);
      const def = NODES.get(n.type);
      if (!def) throw new Error(`unknown node type ${n.type}`);
      const inp = {};
      for (const [k, val] of Object.entries(n.in)) inp[k] = paramValue(resolve(val, ctx));
      const out = def.fn({ inputs: inp, p: { ...inp, ...evalNodeParams(n.p) }, graph: root, params, evaluate, resolve, ctx: { ...ctx, params, allowScript } });
      memo.set(key, out);
      return out;
    }
    if (Array.isArray(v)) return v.map((x) => resolve(x, ctx));
    if (v && typeof v === 'object') {
      if (v.__field || v.__kind || v.isObject3D || v.isBufferGeometry || v.isMaterial || v.isBufferAttribute) return v;
      const out = {};
      for (const [k, x] of Object.entries(v)) out[k] = resolve(x, ctx);
      return out;
    }
    return v;
  };
  const outputs = {};
  for (const [k, v] of Object.entries(graph.outputs)) outputs[k] = resolve(v, {});
  return { outputs, params, graph };
}

// evaluate a field value against a context; non-fields pass through
export function fieldValue(v, ctx) {
  if (isField(v)) return compileField(v.__field)(ctx);
  if (typeof v === 'function') return v(ctx);
  return v;
}

// ---------------------------------------------------------------- geometry API
// First-class bridge: accept the runtime's geom, a THREE.BufferGeometry, or a
// THREE.Mesh/Group. This is the layer that lets a code node call the same
// three.js constructors and addons as the reference modules.
export function bufferToGeom(obj, zone = 'a') {
  let geo = obj?.isBufferGeometry ? obj : obj?.geometry;
  if (!geo) throw new Error('bufferToGeom: not a BufferGeometry/Mesh');
  if (geo.index) geo = geo.toNonIndexed();
  const attr = geo.getAttribute('position');
  if (!attr) throw new Error('bufferToGeom: no position attribute');
  return geom(part(Array.from(attr.array), zone));
}
export function objectToGeom(obj, zone = 'a') {
  if (obj?.__kind === 'geom') return obj;
  if (obj?.isBufferGeometry || obj?.isMesh) return bufferToGeom(obj, zone);
  if (obj?.isObject3D) {
    const parts = [];
    obj.traverse((o) => { if (o.isMesh) parts.push(...bufferToGeom(o, zone).parts); });
    return geom(parts);
  }
  throw new Error('objectToGeom: not a THREE object');
}
export function toGeometry(obj, zone = 'a') {
  if (!obj) throw new Error('toGeometry: empty');
  if (obj.__kind === 'geom') return obj;
  if (obj.__kind === 'points') {
    const pts = obj.pts.flatMap((q) => [q[0], q[1], q[2]]);
    return { __kind: 'geom', parts: [{ pos: pts, zone: 'a' }] };
  }
  if (obj.isObject3D || obj.isBufferGeometry) return objectToGeom(obj, zone);
  throw new Error('toGeometry: not geometry');
}

export function emitMesh(g, { zones = {}, materials = {}, flat = true, crease, name = 'mesh' } = {}) {
  const parts = g.parts.filter((p) => p.pos.length);
  const byMat = new Map();
  for (const p of parts) {
    const mat = p.mat || materials[p.zone]?.slot || 'default';
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(p);
  }
  const meshes = [];
  for (const [mat, list] of byMat) {
    const md = Object.values(materials).find((m) => m?.slot === mat) ?? {};
    const geos = list.map(({ pos, zone }) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const c = new THREE.Color(zones[zone] ?? pcolor(zone));
      const col = new Float32Array((pos.length / 3) * 3);
      for (let i = 0; i < pos.length / 3; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return geo;
    });
    let merged = mergeGeometries(geos, false);
    if (crease !== undefined) merged = toCreasedNormals(merged, crease);
    else merged.computeVertexNormals();
    const material = md.material ?? new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: flat,
      roughness: md.roughness ?? 0.85, metalness: md.metalness ?? 0,
      opacity: md.opacity ?? 1, transparent: (md.opacity ?? 1) < 1,
    });
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = mat === 'default' ? name : `${name}:${mat}`;
    meshes.push(mesh);
  }
  if (meshes.length === 1) return meshes[0];
  const grp = new THREE.Group();
  grp.name = name;
  meshes.forEach((m) => grp.add(m));
  return grp;
}
const ZC = ['#c8c8c8', '#9aa0aa', '#7f8da3', '#b08d57', '#5f7f5f', '#a05f5f'];
export const zoneColor = (z) => { if (!pcache.has(z)) pcache.set(z, ZC[pcache.size % ZC.length]); return pcache.get(z); };
const pcache = new Map();
function pcolor(z) {
  if (!pcache.has(z)) pcache.set(z, ZC[pcache.size % ZC.length]);
  return pcache.get(z);
}

// ---------------------------------------------------------------- nodes: sources
node('ring', { in: { n: V.int, r: V.number, y: V.number, sx: V.number, sz: V.number, phase: V.number, radius: V.field }, out: V.profile }, ({ p, ctx }) => {
  const n = Math.max(3, Math.round(p.n ?? 16));
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (p.phase ?? 0) + (i / n) * TAU;
    const r = p.radius !== undefined ? fieldValue(p.radius, { i, x: Math.cos(a), z: Math.sin(a), s: ctx.params }) : (p.r ?? 1);
    out.push([Math.cos(a) * r * (p.sx ?? 1), p.y ?? 0, Math.sin(a) * r * (p.sz ?? 1)]);
  }
  return profile(out);
});

node('profile', { in: { pts: V.any }, out: V.profile }, ({ p }) => profile(p.pts));

node('path', { in: { pts: V.any, closed: V.bool }, out: V.path }, ({ p }) => {
  let q = p.pts;
  if (p.closed) q = [...q, q[0]];
  if (p.samples) {
    const out = [];
    for (let i = 0; i < p.samples; i++) {
      const t = (i / (p.samples - 1)) * (q.length - 1);
      const k = Math.min(q.length - 2, Math.floor(t)), f = t - k;
      out.push([0, 1, 2].map((j) => q[k][j] * (1 - f) + q[k + 1][j] * f));
    }
    q = out;
  }
  return path(q, !!p.closed);
});

node('grid', { in: { nx: V.int, nz: V.int, w: V.number, d: V.number, position: V.field, values: V.any }, out: V.any }, ({ p, ctx }) => {
  const nx = Math.max(1, Math.round(p.nx)), nz = Math.max(1, Math.round(p.nz));
  const top = [], bot = [];
  for (let i = 0; i <= nx; i++) {
    top.push([]); bot.push([]);
    for (let j = 0; j <= nz; j++) {
      const x = -(p.w ?? 1) / 2 + (i * (p.w ?? 1)) / nx;
      const z = -(p.d ?? 1) / 2 + (j * (p.d ?? 1)) / nz;
      const q = p.position ? fieldValue(p.position, { x, z, i, j, u: i / nx, v: j / nz, s: ctx.params, vals: p.values }) : [x, 0, z];
      const a = Array.isArray(q) ? q : [x, q, z];
      top[i].push(a); bot[i].push([a[0], 0, a[2]]);
    }
  }
  return { __kind: 'grid', top, bot, nx, nz };
});

// ---------------------------------------------------------------- nodes: solids
node('box', { in: { w: V.number, h: V.number, d: V.number, x: V.number, y: V.number, z: V.number, bevel: V.number, seg: V.int }, out: V.geom }, ({ p }) => {
  const w = p.w ?? 1, h = p.h ?? 1, d = p.d ?? 1, b = p.bevel ?? 0;
  let geo;
  if (b > 0) {
    geo = new RoundedBoxGeometry(w, h, d, Math.max(1, Math.round(p.seg ?? 2)), Math.min(b, Math.min(w, h, d) / 2 - 1e-5));
    if (geo.index) geo = geo.toNonIndexed();
  } else {
    geo = new THREE.BoxGeometry(w, h, d);
    geo = geo.toNonIndexed();
  }
  return geom(part(xf([...geo.attributes.position.array], p), p.zone ?? 'box'));
});

// Generic escape hatch for Three's own geometry constructors. This keeps the
// exact constructor/triangulation the reference module used.
node('prim', { in: { type: V.string, args: V.any, x: V.number, y: V.number, z: V.number, rx: V.number, ry: V.number, rz: V.number, s: V.any, zone: V.string }, out: V.geom }, ({ p }) => {
  const Ctor = THREE[p.type];
  if (typeof Ctor !== 'function') throw new Error(`prim: unknown THREE.${p.type}`);
  let geo = new Ctor(...(p.args ?? []));
  if (geo.index) geo = geo.toNonIndexed();
  const pos = Array.from(geo.attributes.position.array);
  return geom(part(xf(pos, p), p.zone ?? 'a'));
});

node('cylinder', { in: { r1: V.number, r2: V.number, h: V.number, seg: V.int, phase: V.number, caps: V.bool }, out: V.geom }, ({ p }) => {
  const n = Math.max(3, Math.round(p.seg ?? 12)), out = [];
  const r1 = p.r1 ?? 0.5, r2 = p.r2 ?? r1, h = p.h ?? 1;
  const A = [], B = [];
  for (let i = 0; i < n; i++) {
    const a = (p.phase ?? 0) + (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
    A.push([c * r1, 0, s * r1]); B.push([c * r2, h, s * r2]);
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(out, A[i], A[j], B[j], B[i]); }
  if (p.caps !== false) {
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(out, [0, 0, 0], A[j], A[i]); tri(out, [0, h, 0], B[i], B[j]); }
  }
  return geom(part(xf(out, p), p.zone ?? 'a'));
});

node('sphere', { in: { r: V.number, seg: V.int, rings: V.int }, out: V.geom }, ({ p }) => {
  const n = Math.max(3, Math.round(p.seg ?? 12)), m = Math.max(2, Math.round(p.rings ?? 6)), out = [];
  const R = p.r ?? 0.5;
  for (let j = 0; j < m; j++) {
    const t0 = (j / m) * Math.PI, t1 = ((j + 1) / m) * Math.PI;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
      const P = (t, a) => [Math.sin(t) * Math.cos(a) * R, Math.cos(t) * R, Math.sin(t) * Math.sin(a) * R];
      quad(out, P(t0, a0), P(t0, a1), P(t1, a1), P(t1, a0));
    }
  }
  return geom(part(xf(out, p), p.zone ?? 'a'));
});

// ---------------------------------------------------------------- nodes: surfaces
node('bevelProfile', { in: { profile: V.profile, dist: V.number }, out: V.profile }, ({ p }) => {
  // Walk along the two adjacent edges from each corner. This is the formula
  // used by the reference crystal/wedge profiles.
  const P = asArray(p.profile), c = p.dist ?? 0.01, out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[(i - 1 + P.length) % P.length], b = P[i], d = P[(i + 1) % P.length];
    const ta = [a[0] - b[0], a[1] - b[1]], td = [d[0] - b[0], d[1] - b[1]];
    const la = Math.hypot(...ta) || 1, ld = Math.hypot(...td) || 1;
    out.push([b[0] + (ta[0] / la) * c, b[1] + (ta[1] / la) * c]);
    out.push([b[0] + (td[0] / ld) * c, b[1] + (td[1] / ld) * c]);
  }
  return profile(out);
});

node('loftProfile', { in: { profile: V.profile, capTop: V.any, capBottom: V.any, zones: V.any, diagonal: V.string, bandZones: V.any, flip: V.bool, orient: V.bool, orientCenter: V.vec3 }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), stations = p.stations ?? [[0, 1, 0]];
  const rings = stations.map((st) => {
    const [x, sc = 1, dz = 0] = Array.isArray(st) ? st : [st.x, st.s ?? 1, st.dz ?? 0];
    return P.map(([z, y]) => [x, y * sc, z * sc + dz]);
  });
  return NODES.get('loft').fn({ p: { rings, capTop: p.capTop, capBottom: p.capBottom, zones: p.zones ?? {}, diagonal: p.diagonal, bandZones: p.bandZones, flip: p.flip, orient: p.orient, orientCenter: p.orientCenter } });
});

node('fanRing', { in: { r: V.number, y: V.number, n: V.int, phase: V.number, apex: V.any, axis: V.string, zone: V.string, flip: V.bool }, out: V.geom }, ({ p }) => {
  const n = Math.max(3, Math.round(p.n ?? 12)), ring = [];
  const phase = p.phase ?? 0;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU, r = p.r ?? 1, y = p.y ?? 0;
    ring.push(p.axis === 'z' ? [r * Math.cos(a), r * Math.sin(a), y] : [r * Math.sin(a), y, r * Math.cos(a)]);
  }
  const out = [], apex = p.apex ?? [0, p.y ?? 0, 0];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; p.flip ? tri(out, apex, ring[j], ring[i]) : tri(out, apex, ring[i], ring[j]); }
  return geom(part(out, p.zone ?? 'a'));
});

node('loft', { in: { rings: V.any, capTop: V.any, capBottom: V.any, zones: V.any, diagonal: V.string, bandZones: V.any, flip: V.bool, orient: V.bool, orientCenter: V.vec3 }, out: V.geom }, ({ p }) => {
  const rings = p.rings.map(asArray);
  const zones = p.zones ?? {};
  const out = {};
  const put = (z, pos) => (out[z] ??= []).push(...pos);
  // A closed profile can wind either way around the loft axis. `orient` flips
  // each band triangle to point away from the ring centroid, which is what the
  // reference crystal/rug helpers do explicitly.
  const all = rings.flat();
  const oc = p.orientCenter ?? (all.length ? all.reduce((a, q) => [a[0] + q[0] / all.length, a[1] + q[1] / all.length, a[2] + q[2] / all.length], [0, 0, 0]) : [0, 0, 0]);
  const emitTri = (pos, a, b, c) => {
    if (p.orient) {
      const n = cross3(sub3(b, a), sub3(c, a));
      const cen = [(a[0] + b[0] + c[0]) / 3 - oc[0], (a[1] + b[1] + c[1]) / 3 - oc[1], (a[2] + b[2] + c[2]) / 3 - oc[2]];
      if (dot3(n, cen) < 0) tri(pos, a, c, b); else tri(pos, a, b, c);
      return;
    }
    tri(pos, a, b, c);
  };
  const emitQuad = (pos, a, b, c, d) => {
    if (p.flip) { emitTri(pos, a, c, b); emitTri(pos, a, d, c); }
    else { emitTri(pos, a, b, c); emitTri(pos, a, c, d); }
  };
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1], n = A.length, pos = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // 'ab' is the historical runtime diagonal; 'ba' matches the common
      // Polyfork loft helper (A[j]-B[i] diagonal) used by cookie/rug.
      if (p.diagonal === 'ba') emitQuad(pos, A[j], A[i], B[i], B[j]);
      else emitQuad(pos, A[i], A[j], B[j], B[i]);
    }
    const zone = Array.isArray(p.bandZones) ? (p.bandZones[k] ?? 'a')
      : (typeof zones.band === 'function' ? zones.band(k) : (zones.band ?? 'a'));
    put(zone, pos);
  }
  const triOut = (out, a, b, c, hint) => {
    const n = cross3(sub3(b, a), sub3(c, a));
    if (dot3(n, hint) >= 0) tri(out, a, b, c); else tri(out, a, c, b);
  };
  if (p.capTop) {
    const A = rings[rings.length - 1], n = A.length, pos = [];
    const c = A.reduce((q, r) => add3(q, mul3(r, 1 / n)), [0, 0, 0]);
    const hint = norm(sub3(p.capTop, c));
    for (let i = 0; i < n; i++) {
      if (p.orient) emitTri(pos, p.capTop, A[(i + 1) % n], A[i]);
      else triOut(pos, p.capTop, A[(i + 1) % n], A[i], hint);
    }
    put(zones.capTop ?? 'a', pos);
  }
  if (p.capBottom) {
    const A = rings[0], n = A.length, pos = [];
    const c = A.reduce((q, r) => add3(q, mul3(r, 1 / n)), [0, 0, 0]);
    const hint = norm(sub3(c, p.capBottom));
    for (let i = 0; i < n; i++) {
      if (p.orient) emitTri(pos, p.capBottom, A[i], A[(i + 1) % n]);
      else triOut(pos, p.capBottom, A[i], A[(i + 1) % n], hint);
    }
    put(zones.capBottom ?? 'a', pos);
  }
  return geom(Object.entries(out).map(([z, pos]) => part(pos, z)));
});

node('cap', { in: { profile: V.profile, holes: V.any, z: V.number, flip: V.bool, zone: V.string }, out: V.geom }, ({ p }) => {
  const outline = asArray(p.profile);
  const outer = outline.map(([x, y]) => new THREE.Vector2(x, y));
  const holes = (p.holes ?? []).map((h) => asArray(h).map(([x, y]) => new THREE.Vector2(x, y)));
  const all = [...outline, ...(p.holes ?? []).flatMap(asArray)];
  const tris = THREE.ShapeUtils.triangulateShape(outer, holes);
  const out = [];
  for (const [i, j, k] of tris) {
    const A = [all[i][0], all[i][1], p.z ?? 0], B = [all[j][0], all[j][1], p.z ?? 0], C = [all[k][0], all[k][1], p.z ?? 0];
    (p.flip ? tri(out, A, C, B) : tri(out, A, B, C));
  }
  return geom(part(out, p.zone ?? 'a'));
});

node('extrude', { in: { profile: V.profile, depth: V.number, z0: V.number, cap: V.bool }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), z0 = p.z0 ?? 0, z1 = z0 + (p.depth ?? 1), out = [];
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    quad(out, [P[i][0], P[i][1], z0], [P[j][0], P[j][1], z0], [P[j][0], P[j][1], z1], [P[i][0], P[i][1], z1]);
  }
  if (p.cap !== false) {
    const outer = P.map(([x, y]) => new THREE.Vector2(x, y));
    const tris = THREE.ShapeUtils.triangulateShape(outer, []);
    for (const [i, j, k] of tris) {
      const A = [P[i][0], P[i][1]], B = [P[j][0], P[j][1]], C = [P[k][0], P[k][1]];
      tri(out, [A[0], A[1], z1], [B[0], B[1], z1], [C[0], C[1], z1]);
      tri(out, [A[0], A[1], z0], [C[0], C[1], z0], [B[0], B[1], z0]);
    }
  }
  return geom(part(out, 'a'));
});

// Generic polygon extrusion along X, Y or Z. The reference sign/prop builders
// use the same three helpers (prismY, prismX and the ordinary Z extrusion) for
// frames, ledges, chalk sticks and mullions.
node('prism', { in: { profile: V.profile, axis: V.string, from: V.number, to: V.number, cap: V.any, capOrient: V.bool, zone: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), a0 = p.from ?? 0, a1 = p.to ?? 1, axis = p.axis ?? 'z', out = [];
  const capTop = p.cap === true || p.cap === 'top' || p.cap === 'both';
  const capBottom = p.cap === true || p.cap === 'bottom' || p.cap === 'both';
  if (axis === 'y') {
    for (let i = 0; i < P.length; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[(i + 1) % P.length];
      quad(out, [x0, a0, z0], [x1, a0, z1], [x1, a1, z1], [x0, a1, z0]);
    }
    if (capTop || capBottom) {
      const outer = P.map(([x, z]) => new THREE.Vector2(x, z));
      const cx = P.reduce((a, q) => a + q[0] / P.length, 0), cz = P.reduce((a, q) => a + q[1] / P.length, 0);
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(outer, [])) {
        if (capTop) p.capOrient
          ? triOut(out, [P[i][0], a1, P[i][1]], [P[j][0], a1, P[j][1]], [P[k][0], a1, P[k][1]], [cx, a1, cz])
          : tri(out, [P[i][0], a1, P[i][1]], [P[j][0], a1, P[j][1]], [P[k][0], a1, P[k][1]]);
        if (capBottom) p.capOrient
          ? triOut(out, [P[i][0], a0, P[i][1]], [P[j][0], a0, P[j][1]], [P[k][0], a0, P[k][1]], [cx, a0, cz])
          : tri(out, [P[i][0], a0, P[i][1]], [P[k][0], a0, P[k][1]], [P[j][0], a0, P[j][1]]);
      }
    }
  } else if (axis === 'x') {
    for (let i = 0; i < P.length; i++) {
      const [z0, y0] = P[i], [z1, y1] = P[(i + 1) % P.length];
      quad(out, [a0, y0, z0], [a0, y1, z1], [a1, y1, z1], [a1, y0, z0]);
    }
    if (capTop || capBottom) {
      const cy = P.reduce((a, q) => a + q[1] / P.length, 0), cz = P.reduce((a, q) => a + q[0] / P.length, 0);
      for (let i = 1; i + 1 < P.length; i++) {
        if (capTop) p.capOrient
          ? triOut(out, [a1, P[0][1], P[0][0]], [a1, P[i][1], P[i][0]], [a1, P[i + 1][1], P[i + 1][0]], [a1, cy, cz])
          : tri(out, [a1, P[0][1], P[0][0]], [a1, P[i][1], P[i][0]], [a1, P[i + 1][1], P[i + 1][0]]);
        if (capBottom) p.capOrient
          ? triOut(out, [a0, P[0][1], P[0][0]], [a0, P[i][1], P[i][0]], [a0, P[i + 1][1], P[i + 1][0]], [a0, cy, cz])
          : tri(out, [a0, P[0][1], P[0][0]], [a0, P[i + 1][1], P[i + 1][0]], [a0, P[i][1], P[i][0]]);
      }
    }
  } else {
    for (let i = 0; i < P.length; i++) {
      const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
      quad(out, [x0, y0, a0], [x1, y1, a0], [x1, y1, a1], [x0, y0, a1]);
    }
    if (capTop || capBottom) {
      const outer = P.map(([x, y]) => new THREE.Vector2(x, y));
      const cx = P.reduce((a, q) => a + q[0] / P.length, 0), cy = P.reduce((a, q) => a + q[1] / P.length, 0);
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(outer, [])) {
        if (capTop) p.capOrient
          ? triOut(out, [P[i][0], P[i][1], a1], [P[j][0], P[j][1], a1], [P[k][0], P[k][1], a1], [cx, cy, a1])
          : tri(out, [P[i][0], P[i][1], a1], [P[j][0], P[j][1], a1], [P[k][0], P[k][1], a1]);
        if (capBottom) p.capOrient
          ? triOut(out, [P[i][0], P[i][1], a0], [P[j][0], P[j][1], a0], [P[k][0], P[k][1], a0], [cx, cy, a0])
          : tri(out, [P[i][0], P[i][1], a0], [P[k][0], P[k][1], a0], [P[j][0], P[j][1], a0]);
      }
    }
  }
  return geom(part(out, p.zone ?? 'a'));
});

// Swept rectangular frame: one four-corner ring per profile point, closed back
// to the first profile point. This is the mitred frame used by the menu board.
node('frame', { in: { hx: V.number, hy: V.number, profile: V.profile, zone: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), hx = p.hx ?? 0.5, hy = p.hy ?? 0.5, out = [];
  const rings = P.map(([u, z]) => [
    [-(hx + u), -(hy + u), z], [(hx + u), -(hy + u), z],
    [(hx + u), (hy + u), z], [-(hx + u), (hy + u), z],
  ]);
  for (let i = 0; i < rings.length; i++) {
    const A = rings[i], B = rings[(i + 1) % rings.length];
    for (let k = 0; k < 4; k++) {
      const j = (k + 1) % 4;
      quad(out, A[k], A[j], B[j], B[k]);
    }
  }
  return geom(part(out, p.zone ?? 'a'));
});

// Flat plate with holes, extruded from z0 to z1: triangulated front face plus
// side walls for the outer loop and every hole. Used for sign plates, glyphs
// and bezel frames.
node('plate', { in: { profile: V.profile, holes: V.any, z0: V.number, z1: V.number, cap: V.bool, walls: V.string, skipWalls: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  const area2 = (L) => { let a = 0; for (let i = 0; i < L.length; i++) { const q = L[i], r = L[(i + 1) % L.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; };
  let outer = asArray(p.profile).map((q) => [q[0], q[1]]);
  if (area2(outer) < 0) outer = outer.slice().reverse();
  const holes = (p.holes ?? []).map((h) => {
    const q = asArray(h).map((r) => [r[0], r[1]]);
    return area2(q) > 0 ? q.slice().reverse() : q;
  });
  const all = [...outer, ...holes.flat()];
  const V2 = (L) => L.map((q) => new THREE.Vector2(q[0], q[1]));
  const out = [], z0 = p.z0 ?? 0, z1 = p.z1 ?? z0 + 0.01;
  const capFront = p.cap === undefined || p.cap === true || p.cap === 'front' || p.cap === 'both';
  const capBack = p.cap === 'back' || p.cap === 'both';
  if (capFront || capBack) for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(V2(outer), holes.map(V2))) {
    const a = all[i], b = all[j], c = all[k];
    const s = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (capFront) {
      const A = [a[0], a[1], z1], B = [b[0], b[1], z1], C = [c[0], c[1], z1];
      if (s >= 0) tri(out, A, B, C); else tri(out, A, C, B);
    }
    if (capBack) {
      const A = [a[0], a[1], z0], B = [b[0], b[1], z0], C = [c[0], c[1], z0];
      if (s >= 0) tri(out, A, C, B); else tri(out, A, B, C);
    }
  }
  const walls = p.walls ?? 'both';
  const loops = walls === 'outer' ? [[0, outer]] : walls === 'holes' ? holes.map((h, i) => [i + 1, h]) : walls === 'none' ? [] : [[0, outer], ...holes.map((h, i) => [i + 1, h])];
  const skip = new Set(String(p.skipWalls ?? '').split(/\s+/).filter(Boolean));
  for (const [li, L] of loops) {
    for (let i = 0; i < L.length; i++) {
      if (skip.has(`${li === 0 ? 'o' : 'h' + (li - 1) + ':'}${i}`)) continue;
      const a = L[i], b = L[(i + 1) % L.length];
      tri(out, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1]);
      tri(out, [a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]);
    }
  }
  return geom(part(out, p.zone ?? 'a'));
});

// Axis-aligned block with optional skipped faces. The reference builders use
// this for readerboards and sign cabinets where a hidden face must not exist.
node('block', { in: { x0: V.number, x1: V.number, y0: V.number, y1: V.number, z0: V.number, z1: V.number, skip: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  let x0 = p.x0 ?? 0, x1 = p.x1 ?? 1;
  const y0 = p.y0 ?? 0, y1 = p.y1 ?? 1, z0 = p.z0 ?? 0, z1 = p.z1 ?? 1;
  if (x0 > x1) [x0, x1] = [x1, x0];
  const sk = new Set(String(p.skip ?? '').split(/\s+/).filter(Boolean));
  const F = {
    px: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
    nx: [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]],
    py: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]],
    ny: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    nz: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]],
  };
  const out = [], m = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  for (const k of Object.keys(F)) if (!sk.has(k)) quadOut(out, ...F[k], m);
  return geom(part(out, p.zone ?? 'a'));
});

// Faceted lamp/gem: an n-sided ellipse ring around c in the plane normal to
// nrm, with an apex pushed along nrm. Sign assets use it for marquee bulbs and
// unlit socket caps.
node('gem', { in: { x: V.number, y: V.number, z: V.number, nx: V.number, ny: V.number, nz: V.number, r: V.number, ry: V.number, h: V.number, n: V.int, zone: V.string }, out: V.geom }, ({ p }) => {
  const c = [p.x ?? 0, p.y ?? 0, p.z ?? 0], nr = [p.nx ?? 0, p.ny ?? 0, p.nz ?? 1];
  const n = Math.max(3, Math.round(p.n ?? 6)), r = p.r ?? 0.1, ry = p.ry ?? r, h = p.h ?? 0.1;
  const t = Math.abs(nr[2]) > 0.5 ? [1, 0, 0] : [0, 0, 1], ring = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (i / n) * TAU, cs = Math.cos(a) * r, sn = Math.sin(a) * ry;
    ring.push([c[0] + t[0] * cs, c[1] + sn, c[2] + t[2] * cs]);
  }
  const apex = [c[0] + nr[0] * h, c[1] + nr[1] * h, c[2] + nr[2] * h];
  const inside = [c[0] + nr[0] * h * 0.25, c[1], c[2] + nr[2] * h * 0.25];
  const out = [];
  for (let i = 0; i < n; i++) triOut(out, apex, ring[i], ring[(i + 1) % n], inside);
  return geom(part(out, p.zone ?? 'a'));
});

// Arbitrary 3D polygon with an optional orientation hint or interior point.
// Hand-authored sign decals use this for arrows, icons and cut faces.
node('poly', { in: { pts: V.any, zone: V.string, hint: V.vec3, inside: V.vec3, flip: V.bool }, out: V.geom }, ({ p }) => {
  let P = asArray(p.pts).map((q) => [q[0], q[1], q[2]]);
  if (p.flip) P = P.slice().reverse();
  let hint = p.hint;
  if (!hint && p.inside) {
    const mid = P.reduce((a, q) => [a[0] + q[0] / P.length, a[1] + q[1] / P.length, a[2] + q[2] / P.length], [0, 0, 0]);
    hint = sub3(mid, p.inside);
  }
  if (hint && P.length >= 3) {
    const n = [0, 0, 0];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    if (dot3(n, hint) < 0) P = P.slice().reverse();
  }
  const out = [];
  if (p.inside) for (let i = 1; i + 1 < P.length; i++) triOut(out, P[0], P[i], P[i + 1], p.inside);
  else for (let i = 1; i + 1 < P.length; i++) tri(out, P[0], P[i], P[i + 1]);
  return geom(part(out, p.zone ?? 'a'));
});

node('revolve', { in: { profile: V.any, seg: V.int, phase: V.number, inRadius: V.bool, zone: V.any, zoneField: V.field, mod: V.field, values: V.any, axis: V.string, ringMode: V.string, orient: V.bool, orientCenter: V.vec3, capTop: V.any, capBottom: V.any, capZone: V.any, capZoneField: V.field, flip: V.bool }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), n = Math.max(3, Math.round(p.seg ?? 12)), buckets = new Map();
  const step = TAU / n, cosH = Math.cos(step / 2);
  const axis = p.axis ?? 'y';
  const asF = (v) => (typeof v === 'string' ? field(v) : v);
  const modField = asF(p.mod), zoneField = asF(p.zoneField), capZoneField = asF(p.capZoneField);
  const ringAt = (k, r, y) => {
    const R = p.inRadius ? r / cosH : r, q = [];
    for (let i = 0; i < n; i++) {
      const a = (p.phase ?? 0) + ((i + (p.inRadius ? 0.5 : 0)) / n) * TAU;
      const rr = modField ? fieldValue(modField, { i, k, x: r, y, s: p, profile: P, vals: p.values }) : R;
      const xz = p.ringMode === 'xz';
      q.push(axis === 'z' ? [rr * Math.cos(a), rr * Math.sin(a), y]
        : (xz ? [rr * Math.cos(a), y, rr * Math.sin(a)] : [rr * Math.sin(a), y, rr * Math.cos(a)]));
    }
    return q;
  };
  const rings = [];
  for (let k = 0; k < P.length; k++) rings.push(ringAt(k, P[k][0], P[k][1]));
  const all = rings.flat();
  const oc = p.orientCenter ?? (all.length ? all.reduce((a, q) => [a[0] + q[0] / all.length, a[1] + q[1] / all.length, a[2] + q[2] / all.length], [0, 0, 0]) : [0, 0, 0]);
  const put = (z, pos) => { if (!buckets.has(z)) buckets.set(z, []); buckets.get(z).push(...pos); };
  const emitTri = (pos, a, b, c) => {
    if (p.flip) [b, c] = [c, b];
    if (p.orient) {
      const nrm = cross3(sub3(b, a), sub3(c, a));
      const cen = [(a[0] + b[0] + c[0]) / 3 - oc[0], (a[1] + b[1] + c[1]) / 3 - oc[1], (a[2] + b[2] + c[2]) / 3 - oc[2]];
      if (dot3(nrm, cen) < 0) tri(pos, a, c, b); else tri(pos, a, b, c);
    } else tri(pos, a, b, c);
  };
  const zoneAt = (i, k) => {
    if (zoneField) return fieldValue(zoneField, { i, k, s: p });
    return typeof p.zone === 'function' ? p.zone(i, k) : (Array.isArray(p.zone) ? (p.zone[k] ?? 'a') : (p.zone ?? 'a'));
  };
  for (let k = 0; k < P.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, pos = [];
      emitTri(pos, A[i], A[j], B[j]); emitTri(pos, A[i], B[j], B[i]);
      put(zoneAt(i, k), pos);
    }
  }
  const capZoneAt = (i) => capZoneField ? fieldValue(capZoneField, { i, s: p })
    : (typeof p.capZone === 'function' ? p.capZone(i) : (p.capZone ?? 'a'));
  if (p.capTop) {
    const A = rings[rings.length - 1];
    for (let i = 0; i < n; i++) {
      const pos = []; emitTri(pos, p.capTop, A[(i + 1) % n], A[i]); put(capZoneAt(i), pos);
    }
  }
  if (p.capBottom) {
    const A = rings[0];
    for (let i = 0; i < n; i++) {
      const pos = []; emitTri(pos, p.capBottom, A[i], A[(i + 1) % n]); put(capZoneAt(i), pos);
    }
  }
  return geom([...buckets.entries()].map(([z, pos]) => part(pos, z)));
});

node('sweep', { in: { path: V.path, section: V.profile, twist: V.number, scale: V.number, caps: V.bool, zone: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.path), S = asArray(p.section), out = [];
  const closed = p.path.closed;
  const rings = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const T = norm(sub3(b, a));
    let N = norm(cross3(T, Math.abs(T[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0]));
    const B2 = norm(cross3(T, N));
    const tw = (p.twist ?? 0) * (i / Math.max(1, P.length - 1));
    const ring = S.map(([u, v]) => {
      const x = u * Math.cos(tw) - v * Math.sin(tw), y = u * Math.sin(tw) + v * Math.cos(tw);
      return add3(P[i], add3(mul3(N, x), mul3(B2, y)));
    });
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    for (let i = 0; i < A.length; i++) { const j = (i + 1) % A.length; quad(out, A[i], A[j], B[j], B[i]); }
  }
  if (p.caps !== false) {
    const cap = (R, rev) => { const q = rev ? [...R].reverse() : R; for (let i = 1; i < q.length - 1; i++) tri(out, q[0], q[i], q[i + 1]); };
    cap(rings[0], true); cap(rings[rings.length - 1], false);
  }
  return geom(part(out, p.zone ?? 'a'));
});

node('inset', { in: { profile: V.profile, dist: V.number }, out: V.profile }, ({ p }) => {
  const P = asArray(p.profile), n = P.length, d = p.dist ?? 0.1;
  const area = (() => { let a = 0; for (let i = 0; i < n; i++) { const q = P[i], r = P[(i + 1) % n]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; })();
  const sgn = area < 0 ? -1 : 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const e1 = norm([b[0] - a[0], b[1] - a[1], 0]), e2 = norm([c[0] - b[0], c[1] - b[1], 0]);
    const n1 = [-e1[1] * sgn, e1[0] * sgn, 0], n2 = [-e2[1] * sgn, e2[0] * sgn, 0];
    const k = d / Math.max(0.35, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
    out.push([b[0] + (n1[0] + n2[0]) * k, b[1] + (n1[1] + n2[1]) * k]);
  }
  return profile(out);
});

node('pocket', { in: { profile: V.profile, depth: V.number, bevel: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile);
  const inner = p.bevel ? asArray(NODES.get('inset').fn({ p: { profile: profile(P), dist: p.bevel } })) : P;
  const out = [], d = p.depth ?? 0.1;
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    quad(out, [P[i][0], P[i][1], 0], [P[j][0], P[j][1], 0], [inner[j][0], inner[j][1], -d], [inner[i][0], inner[i][1], -d]);
  }
  const q = inner.map(([x, y]) => [x, y, -d]);
  for (let i = 1; i < q.length - 1; i++) tri(out, q[0], q[i], q[i + 1]);
  return geom(part(out, p.zone ?? 'a'));
});

node('solidify', { in: { grid: V.any, topZone: V.any, botZone: V.any, wallZone: V.any, topZoneField: V.field, botZoneField: V.field, values: V.any, diagonal: V.string, wallOrder: V.string }, out: V.geom }, ({ p }) => {
  const { top, bot } = p.grid, nx = top.length - 1, nz = top[0].length - 1;
  const zo = (z, field, i, j) => field ? fieldValue(field, { i, k: j, j, s: p, vals: p.values })
    : (typeof z === 'function' ? z(i, j) : (z ?? 'a'));
  const buckets = new Map();
  const put = (z, pos) => { if (!buckets.has(z)) buckets.set(z, []); buckets.get(z).push(...pos); };
  const ref = p.diagonal === 'ref';
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = top[i][j], b = top[i + 1][j], c = top[i + 1][j + 1], d = top[i][j + 1];
    const t = [], zt = zo(p.topZone, p.topZoneField, i, j);
    if (ref) { tri(t, a, d, b); tri(t, b, d, c); } else quad(t, a, b, c, d);
    put(zt, t);
    const e = bot[i][j], f = bot[i + 1][j], g2 = bot[i + 1][j + 1], h = bot[i][j + 1];
    const u = [], zb = zo(p.botZone, p.botZoneField, i, j);
    if (ref) { tri(u, e, f, h); tri(u, f, g2, h); } else quad(u, e, h, g2, f);
    put(zb, u);
  }
  const wall = [];
  if (p.wallOrder === 'ref') {
    for (let j = 0; j < nz; j++) {
      quad(wall, top[nx][j], top[nx][j + 1], bot[nx][j + 1], bot[nx][j]);
      quad(wall, top[0][j + 1], top[0][j], bot[0][j], bot[0][j + 1]);
    }
    for (let i = 0; i < nx; i++) {
      quad(wall, top[i + 1][nz], top[i][nz], bot[i][nz], bot[i + 1][nz]);
      quad(wall, top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]);
    }
  } else {
    for (let i = 0; i < nx; i++) for (const [j, flip] of [[0, true], [nz, false]]) {
      const a = top[i][j], b = top[i + 1][j], c = bot[i + 1][j], d = bot[i][j];
      flip ? quad(wall, a, b, c, d) : quad(wall, d, c, b, a);
    }
    for (let j = 0; j < nz; j++) for (const [i, flip] of [[0, false], [nx, true]]) {
      const a = top[i][j], b = top[i][j + 1], c = bot[i][j + 1], d = bot[i][j];
      flip ? quad(wall, a, b, c, d) : quad(wall, d, c, b, a);
    }
  }
  const parts = [...buckets.entries()].map(([z, pos]) => part(pos, z));
  if (wall.length) parts.push(part(wall, typeof p.wallZone === 'function' ? p.wallZone() : (p.wallZone ?? 'a')));
  return geom(parts);
});

// ---------------------------------------------------------------- nodes: modifiers
node('transform', { in: { geom: V.any, tx: V.number, ty: V.number, tz: V.number, rx: V.number, ry: V.number, rz: V.number, s: V.any }, out: V.geom }, ({ p }) => {
  const g = toGeometry(p.geom), m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(p.tx ?? 0, p.ty ?? 0, p.tz ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'XYZ')),
    Array.isArray(p.s) ? new THREE.Vector3(p.s[0] ?? 1, p.s[1] ?? 1, p.s[2] ?? 1)
      : new THREE.Vector3(p.s ?? 1, p.s ?? 1, p.s ?? 1),
  );
  return geom(g.parts.map(({ pos, zone }) => {
    const out = new Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const v = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(m);
      out[i] = v.x; out[i + 1] = v.y; out[i + 2] = v.z;
    }
    return part(out, zone);
  }));
});

node('clip', { in: { geom: V.any, nx: V.number, ny: V.number, nz: V.number, d: V.number, cap: V.bool, zone: V.string }, out: V.geom }, ({ p }) => {
  const n = norm([p.nx ?? 0, p.ny ?? 1, p.nz ?? 0]), d = p.d ?? 0;
  const out = [], cut = [];
  const src = toGeometry(p.geom);
  const dist = (v) => v[0] * n[0] + v[1] * n[1] + v[2] * n[2] - d;
  for (const { pos, zone } of src.parts) {
    for (let t = 0; t < pos.length; t += 9) {
      const V0 = [pos[t], pos[t + 1], pos[t + 2]], V1 = [pos[t + 3], pos[t + 4], pos[t + 5]], V2 = [pos[t + 6], pos[t + 7], pos[t + 8]];
      const ds = [dist(V0), dist(V1), dist(V2)];
      const poly = [];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3, a = [V0, V1, V2][i], b = [V0, V1, V2][j], di = ds[i], dj = ds[j];
        if (di <= 1e-9) poly.push(a);
        if ((di < -1e-9 && dj > 1e-9) || (di > 1e-9 && dj < -1e-9)) {
          const f = di / (di - dj);
          const q = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
          poly.push(q); cut.push(q);
        }
      }
      const uniq = [];
      for (const q of poly) if (!uniq.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]) < 1e-7)) uniq.push(q);
      if (uniq.length >= 3) for (let i = 1; i < uniq.length - 1; i++) tri(out, uniq[0], uniq[i], uniq[i + 1]);
    }
  }
  const parts = out.length ? [part(out, p.zone ?? src.parts[0]?.zone ?? 'a')] : [];
  if (p.cap !== false && cut.length >= 3) {
    const c = [0, 0, 0];
    for (const q of cut) { c[0] += q[0] / cut.length; c[1] += q[1] / cut.length; c[2] += q[2] / cut.length; }
    const a = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross3(a, n)), v = cross3(n, u);
    const uniq = [];
    for (const q of cut) if (!uniq.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]) < 1e-7)) uniq.push(q);
    uniq.sort((q, r) => Math.atan2(dot3(sub3(q, c), v), dot3(sub3(q, c), u)) - Math.atan2(dot3(sub3(r, c), v), dot3(sub3(r, c), u)));
    const pos = [];
    for (let i = 1; i < uniq.length - 1; i++) tri(pos, uniq[0], uniq[i], uniq[i + 1]);
    parts.push(part(pos, p.zone ?? 'a'));
  }
  return geom(parts);
});

node('fan', { in: { ring: V.profile, apex: V.vec3, zone: V.string, flip: V.bool }, out: V.geom }, ({ p }) => {
  const R = asArray(p.ring), out = [];
  for (let i = 0; i < R.length; i++) {
    const j = (i + 1) % R.length;
    p.flip ? tri(out, p.apex, R[j], R[i]) : tri(out, p.apex, R[i], R[j]);
  }
  return geom(part(out, p.zone ?? 'a'));
});

node('cone', { in: { n: V.int, r: V.number, h: V.number, x: V.number, y: V.number, z: V.number, axis: V.string, zone: V.string, flip: V.bool }, out: V.geom }, ({ p }) => {
  const n = Math.max(3, Math.round(p.n ?? 6)), out = [], apex = p.axis === 'z' ? [p.x ?? 0, p.y ?? 0, (p.z ?? 0) + (p.h ?? 1)] : [p.x ?? 0, (p.y ?? 0) + (p.h ?? 1), p.z ?? 0];
  const ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, r = p.r ?? 1;
    ring.push(p.axis === 'z' ? [(p.x ?? 0) + r * Math.cos(a), (p.y ?? 0) + r * Math.sin(a), p.z ?? 0] : [(p.x ?? 0) + r * Math.cos(a), p.y ?? 0, (p.z ?? 0) + r * Math.sin(a)]);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    p.flip ? tri(out, apex, ring[j], ring[i]) : tri(out, apex, ring[i], ring[j]);
  }
  return geom(part(out, p.zone ?? 'a'));
});

node('center', { in: { geom: V.geom, x: V.bool, y: V.bool, z: V.bool }, out: V.geom }, ({ p }) => {
  const g = p.geom;
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const { pos } of g.parts) for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], pos[i + k]); max[k] = Math.max(max[k], pos[i + k]);
  }
  const t = [p.x === false ? 0 : -(min[0] + max[0]) / 2, p.y === false ? 0 : -min[1], p.z === false ? 0 : -(min[2] + max[2]) / 2];
  return geom(g.parts.map(({ pos, zone }) => {
    const q = new Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) { q[i] = pos[i] + t[0]; q[i + 1] = pos[i + 1] + t[1]; q[i + 2] = pos[i + 2] + t[2]; }
    return part(q, zone);
  }));
});

node('reverse', { in: { geom: V.any }, out: V.geom }, ({ p }) => {
  const g = toGeometry(p.geom);
  return geom(g.parts.map(({ pos, zone }) => {
    const q = [];
    for (let i = 0; i < pos.length; i += 9) {
      tri(q, [pos[i], pos[i + 1], pos[i + 2]], [pos[i + 6], pos[i + 7], pos[i + 8]], [pos[i + 3], pos[i + 4], pos[i + 5]]);
    }
    return part(q, zone);
  }));
});

node('mirror', { in: { geom: V.geom, axis: V.string, weld: V.bool }, out: V.geom }, ({ p }) => {
  const g = p.geom, axis = p.axis ?? 'x';
  const flip = (q) => (axis === 'x' ? [-q[0], q[1], q[2]] : axis === 'y' ? [q[0], -q[1], q[2]] : [q[0], q[1], -q[2]]);
  const out = [];
  for (const { pos, zone } of g.parts) {
    out.push(part([...pos], zone));
    const q = [];
    for (let i = 0; i < pos.length; i += 9) {
      const A = flip([pos[i], pos[i + 1], pos[i + 2]]);
      const B = flip([pos[i + 3], pos[i + 4], pos[i + 5]]);
      const C = flip([pos[i + 6], pos[i + 7], pos[i + 8]]);
      tri(q, A, C, B);
    }
    out.push(part(q, zone));
  }
  return geom(out);
});

node('deform', { in: { geom: V.any, expr: V.field, values: V.any }, out: V.any }, ({ p }) => {
  const g = p.geom;
  if (g?.__kind === 'grid') {
    const map = (lattice, side) => lattice.map((row, i) => row.map((q, k) => {
      const r = fieldValue(p.expr, { x: q[0], y: q[1], z: q[2], i, k, j: k, p: q, side, vals: p.values }) ?? q;
      return Array.isArray(r) ? r : [q[0], r, q[2]];
    }));
    return { ...g, top: map(g.top, 'top'), bot: map(g.bot, 'bot') };
  }
  return geom(toGeometry(g).parts.map(({ pos, zone }) => {
    const out = new Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      const q = fieldValue(p.expr, { x, y, z, p: [x, y, z], vals: p.values }) ?? [x, y, z];
      out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2];
    }
    return part(out, zone);
  }));
});

node('join', { in: { geoms: V.any }, out: V.geom }, ({ p }) => {
  const flat = (v) => (Array.isArray(v) ? v.flatMap(flat) : [v]);
  return geom(flat(p.geoms).filter(Boolean).flatMap((g) => toGeometry(g).parts));
});

// Expose a THREE.BufferGeometry/Mesh/Group coming out of a code node as a
// normal graph geometry value. The mesh node also accepts objects directly,
// but this node makes them composable with join/transform/etc.
node('geometry', { in: { object: V.any, zone: V.string }, out: V.geom }, ({ p }) => objectToGeom(p.object, p.zone ?? 'a'));

node('random', { in: { seed: V.int, count: V.int }, out: V.random }, ({ p }) => {
  const n = Math.max(0, Math.round(p.count ?? 4096));
  let s = (p.seed ?? 1) >>> 0;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const values = [];
  for (let i = 0; i < n; i++) values.push(rnd());
  return { __kind: 'random', seed: p.seed ?? 1, values, state: s, next: 0 };
});

node('scatter', { in: { count: V.int, minDist: V.number, seed: V.int, tries: V.int, sample: V.field, height: V.field, size: V.field, values: V.any, yawScale: V.number, prng: V.bool, lazy: V.bool, rng: V.any }, out: V.points }, ({ p, ctx }) => {
  let s = (p.seed ?? 1) >>> 0;
  const fallback = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rnd = p.rng ? () => {
    const r = p.rng;
    if (r.next >= r.values.length) {
      // A finite stream is deliberately finite; extend deterministically only
      // when the caller asked for more than it allocated.
      const more = makePrng((r.seed ?? 1) + r.values.length + 1);
      while (r.values.length <= r.next) r.values.push(more());
    }
    return r.values[r.next++];
  } : fallback;
  const out = [];
  for (let t = 0; t < (p.tries ?? 800) && out.length < (p.count ?? 1); t++) {
    let r0, r1;
    if (p.prng || p.rng) { r0 = rnd(); r1 = rnd(); }
    const q = (p.prng || p.rng)
      ? (fieldValue(p.sample, { i: t, s: ctx.params, r0, r1, vals: p.values }) ?? [0, 0])
      : (fieldValue(p.sample, { i: t, s: ctx.params, vals: p.values }) ?? [0, 0]);
    const [x, z] = q;
    if (out.some((r) => Math.hypot(r[0] - x, r[2] - z) < (p.minDist ?? 0))) continue;
    // lazy=true matches the reference modules: draw size/yaw only after the
    // candidate has passed the separation test.
    let r2 = 0, r3;
    if ((p.prng || p.rng) && p.lazy) { r2 = rnd(); r3 = rnd(); }
    const y = p.height ? fieldValue(p.height, { x, z, s: ctx.params, r2, vals: p.values }) : 0;
    if ((p.prng || p.rng) && !p.lazy) r2 = rnd();
    const sz = p.size ? fieldValue(p.size, { x, z, i: out.length, s: ctx.params, r2, vals: p.values }) : 1;
    if ((p.prng || p.rng) && !p.lazy) r3 = rnd();
    const yawStep = p.yawScale ?? TAU;
    out.push([x, y, z, sz, (p.prng || p.rng) ? r3 * yawStep : hash01(t, 4, p.seed ?? 1) * yawStep]);
  }
  return pts(out);
});

node('instance', { in: { points: V.points, proto: V.any, orient: V.bool, scale: V.any, yawSign: V.number }, out: V.geom }, ({ p }) => {
  const out = [];
  const up = new THREE.Vector3(0, 1, 0);
  const proto = toGeometry(p.proto);
  const gs = Array.isArray(p.scale) ? p.scale : [p.scale ?? 1, p.scale ?? 1, p.scale ?? 1];
  for (const [x, y, z, sz = 1, yaw = 0, nx, ny, nz] of p.points.pts) {
    const n = (nx !== undefined && p.orient !== false) ? new THREE.Vector3(nx, ny, nz).normalize() : null;
    const q0 = n ? new THREE.Quaternion().setFromUnitVectors(up, n) : new THREE.Quaternion();
    const qy = new THREE.Quaternion().setFromAxisAngle(n ?? up, (p.yawSign ?? 1) * yaw);
    const Q = q0.clone().multiply(qy);
    const s = Array.isArray(sz) ? sz : [sz, sz, sz];
    for (const { pos, zone } of proto.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const v = new THREE.Vector3(pos[i] * s[0] * gs[0], pos[i + 1] * s[1] * gs[1], pos[i + 2] * s[2] * gs[2]).applyQuaternion(Q);
        q[i] = v.x + x; q[i + 1] = v.y + y; q[i + 2] = v.z + z;
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

node('arrayPolar', { in: { geom: V.any, count: V.int, radius: V.number, axis: V.string, start: V.number, arc: V.number, spin: V.bool }, out: V.geom }, ({ p }) => {
  const out = [], n = Math.max(1, Math.round(p.count ?? 1)), g0 = toGeometry(p.geom);
  // spin=false keeps each copy's local orientation and only moves its centroid
  // around the circle. This matches reference helpers that place radial bolts
  // with a fixed world-space hexagon orientation.
  const all = g0.parts.flatMap((q) => q.pos);
  const c = [0, 0, 0];
  for (let i = 0; i < all.length; i += 3) { c[0] += all[i] / (all.length / 3); c[1] += all[i + 1] / (all.length / 3); c[2] += all[i + 2] / (all.length / 3); }
  for (let k = 0; k < n; k++) {
    const a = (p.start ?? 0) + (p.arc ?? TAU) * (k / n);
    const ca = Math.cos(a), sa = Math.sin(a);
    let t = null;
    if (p.spin === false) {
      const rc = p.axis === 'z' ? [c[0] * ca - c[1] * sa, c[0] * sa + c[1] * ca, c[2]] : rotY(c, a);
      t = [rc[0] - c[0], rc[1] - c[1], rc[2] - c[2]];
    }
    for (const { pos, zone } of g0.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const src = p.axis === 'z'
          ? [pos[i], pos[i + 1], pos[i + 2]]
          : [pos[i], pos[i + 1], pos[i + 2] + (p.radius ?? 0)];
        const v = t ? [src[0] + t[0], src[1] + t[1], src[2] + t[2]]
          : (p.axis === 'z'
            ? [src[0] * ca - src[1] * sa, src[0] * sa + src[1] * ca, src[2]]
            : rotY(src, a));
        q[i] = v[0]; q[i + 1] = v[1]; q[i + 2] = v[2];
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

node('arrayLinear', { in: { geom: V.any, count: V.int, dx: V.number, dy: V.number, dz: V.number }, out: V.geom }, ({ p }) => {
  const out = [], n = Math.max(1, Math.round(p.count ?? 1)), g0 = toGeometry(p.geom);
  for (let k = 0; k < n; k++) {
    const t = k * (p.step ?? 1);
    for (const { pos, zone } of g0.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        q[i] = pos[i] + (p.dx ?? 0) * t; q[i + 1] = pos[i + 1] + (p.dy ?? 0) * t; q[i + 2] = pos[i + 2] + (p.dz ?? 0) * t;
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

// Lay out a row of flat legend items (arrows, letters, pictograms) on a sign
// face. Items are {w, p} where p is a list of 2D polygons in a 0..w by
// 0..unitHeight box. This is the shared layout used by the signage references;
// keeping it as a node avoids repeating the scale/offset maths per glyph.
node('pack', { in: { items: V.any, gap: V.number, maxScale: V.number, maxWidth: V.number, x: V.number, y: V.number, z: V.number, side: V.number, unitHeight: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const items = p.items ?? [], gap = p.gap ?? 0;
  const units = items.reduce((a, it) => a + (it.w ?? 0), 0) + gap * Math.max(0, items.length - 1);
  const maxScale = p.maxScale ?? 1e9, maxWidth = p.maxWidth ?? 1e9;
  const k = Math.min(maxScale, units > 0 ? maxWidth / units : maxScale);
  const side = p.side ?? 1, uh = p.unitHeight ?? 6;
  let u = -units * k / 2;
  const buckets = new Map();
  for (const it of items) {
    for (const poly of it.p ?? []) {
      const pts = poly.map(([a, b]) => [side * ((p.x ?? 0) + u + a * k), (p.y ?? 0) + (b - uh / 2) * k, side * (p.z ?? 0)]);
      const zone = it.zone ?? p.zone ?? 'a';
      if (!buckets.has(zone)) buckets.set(zone, []);
      const out = buckets.get(zone);
      for (let i = 1; i + 1 < pts.length; i++) triOut(out, pts[0], pts[i], pts[i + 1], [0, 0, 0]);
    }
    u += ((it.w ?? 0) + gap) * k;
  }
  return geom([...buckets.entries()].map(([z, pos]) => part(pos, z)));
});

node('switch', { in: { on: V.string, cases: V.any }, out: V.any }, ({ p }) => {
  const k = p.on;
  if (!(k in p.cases)) throw new Error(`switch: no case ${k}`);
  return p.cases[k];
});

node('mesh', { in: { geom: V.any, zones: V.any, materials: V.any, flat: V.bool, crease: V.number }, out: V.object }, ({ p }) => {
  if (p.geom?.isObject3D) return p.geom;
  const g = toGeometry(p.geom);
  if (g?.isObject3D) return g;
  return emitMesh(g, {
    zones: p.zones ?? {}, materials: p.materials ?? {}, flat: p.flat !== false, crease: p.crease,
  });
});

node('group', { in: { children: V.any }, out: V.object }, ({ p }) => {
  const g = new THREE.Group();
  for (const c of p.children) if (c) g.add(c);
  return g;
});


// ---------------------------------------------------------------- chamfer box
function pushTriOut(out, a, b, c, center) {
  const n = cross3(sub3(b, a), sub3(c, a));
  const g = [(a[0] + b[0] + c[0]) / 3 - center[0], (a[1] + b[1] + c[1]) / 3 - center[1], (a[2] + b[2] + c[2]) / 3 - center[2]];
  if (dot3(n, g) >= 0) tri(out, a, b, c); else tri(out, a, c, b);
}
function pushQuadOut(out, a, b, c, d, center) { pushTriOut(out, a, b, c, center); pushTriOut(out, a, c, d, center); }

node('chamferBox', { in: { w: V.number, h: V.number, d: V.number, c: V.number, x: V.number, y: V.number, z: V.number, ry: V.number, skip: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  const h = [p.w ?? 1, p.h ?? 1, p.d ?? 1].map((v) => v / 2);
  const c = Math.min(p.c ?? 0.02, Math.min(...h) * 0.9);
  const C = [p.x ?? 0, p.y ?? 0, p.z ?? 0];
  const sk = new Set(String(p.skip ?? '').split(/\s+/).filter(Boolean));
  const P = (a, sa, b, sb, d2, sd) => {
    const q = [0, 0, 0];
    q[a] = sa * h[a]; q[b] = sb * (h[b] - c); q[d2] = sd * (h[d2] - c);
    return q;
  };
  const out = [];
  for (let a = 0; a < 3; a++) for (const sa of [-1, 1]) {
    if (sk.has((sa < 0 ? 'n' : 'p') + 'xyz'[a])) continue;
    const b = (a + 1) % 3, d2 = (a + 2) % 3;
    pushQuadOut(out,
      P(a, sa, b, -1, d2, -1), P(a, sa, b, 1, d2, -1), P(a, sa, b, 1, d2, 1), P(a, sa, b, -1, d2, 1), [0, 0, 0]);
  }
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const d2 = 3 - a - b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      pushQuadOut(out,
        P(a, sa, b, sb, d2, -1), P(a, sa, b, sb, d2, 1),
        P(b, sb, a, sa, d2, 1), P(b, sb, a, sa, d2, -1), [0, 0, 0]);
    }
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (const sd of [-1, 1]) {
    pushTriOut(out, P(0, sa, 1, sb, 2, sd), P(1, sb, 2, sd, 0, sa), P(2, sd, 0, sa, 1, sb), [0, 0, 0]);
  }
  const q = [];
  for (let i = 0; i < out.length; i += 3) q.push(out[i] + C[0], out[i + 1] + C[1], out[i + 2] + C[2]);
  if (p.ry) {
    const c2 = Math.cos(p.ry), s2 = Math.sin(p.ry);
    for (let i = 0; i < q.length; i += 3) {
      const X = q[i] - C[0], Z = q[i + 2] - C[2];
      q[i] = C[0] + X * c2 - Z * s2; q[i + 2] = C[2] + X * s2 + Z * c2;
    }
  }
  return geom(part(q, p.zone ?? 'a'));
});

// Chamfered rectangle outline used by furniture and signage: four straight
// sides with `nc` facets in each corner. Keeping this as a node avoids
// repeating the corner loop in every port.
node('outlineRect', { in: { hx: V.number, hz: V.number, c: V.number, nc: V.int, cx: V.number, cz: V.number }, out: V.profile }, ({ p }) => {
  const hx = p.hx ?? 0.5, hz = p.hz ?? 0.5, c = p.c ?? 0, nc = Math.max(1, Math.round(p.nc ?? 1));
  const cx = p.cx ?? 0, cz = p.cz ?? 0;
  if (c <= 1e-6) return profile([[cx + hx, cz - hz], [cx + hx, cz + hz], [cx - hx, cz + hz], [cx - hx, cz - hz]]);
  const out = [];
  const corners = [[hx - c, hz - c, 0], [-(hx - c), hz - c, Math.PI / 2], [-(hx - c), -(hz - c), Math.PI], [hx - c, -(hz - c), 3 * Math.PI / 2]];
  for (const [qx, qz, a0] of corners) {
    for (let i = 0; i <= nc; i++) {
      const a = a0 + (i / nc) * Math.PI / 2;
      out.push([cx + qx + Math.cos(a) * c, cz + qz + Math.sin(a) * c]);
    }
  }
  return profile(out);
});

// Connect two matching 2D outlines at different heights. This is the
// chamfer/band helper used by the furniture references.
node('band', { in: { lower: V.profile, upper: V.profile, yl: V.number, yu: V.number, zone: V.string, skipEdge: V.int, reverse: V.bool }, out: V.geom }, ({ p }) => {
  const L = asArray(p.lower), U = asArray(p.upper);
  const lo = p.reverse ? L.slice().reverse() : L, up = p.reverse ? U.slice().reverse() : U;
  const n = Math.min(lo.length, up.length), out = [];
  for (let i = 0; i < n; i++) {
    if (i === p.skipEdge) continue;
    const j = (i + 1) % n;
    quad(out, [lo[i][0], p.yl, lo[i][1]], [up[i][0], p.yu, up[i][1]], [up[j][0], p.yu, up[j][1]], [lo[j][0], p.yl, lo[j][1]]);
  }
  return geom(part(out, p.zone ?? 'a'));
});

// ---------------------------------------------------------------- spline / scatter3d / instancing
node('spline', { in: { pts: V.any, closed: V.bool, samples: V.int, tension: V.number }, out: V.path }, ({ p }) => {
  const P = asArray(p.pts), n = P.length, out = [], per = p.samples ?? 8;
  const at = (i) => P[Math.max(0, Math.min(n - 1, i))];
  const cr = (p0, p1, p2, p3, t, k) => {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3));
  };
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < per; s++) out.push(cr(at(i - 1), at(i), at(i + 1), at(i + 2), s / per, p.tension ?? 1));
  }
  out.push(P[n - 1]);
  return path(out, !!p.closed);
});

node('scatterSurface', { in: { geom: V.any, count: V.int, minDist: V.number, seed: V.int, size: V.field }, out: V.points }, ({ p }) => {
  const g = toGeometry(p.geom), tris = [];
  for (const { pos } of g.parts) {
    for (let i = 0; i < pos.length; i += 9) {
      const a = [pos[i], pos[i + 1], pos[i + 2]], b = [pos[i + 3], pos[i + 4], pos[i + 5]], c = [pos[i + 6], pos[i + 7], pos[i + 8]];
      const n = cross3(sub3(b, a), sub3(c, a)), area = Math.hypot(...n) / 2;
      if (area > 1e-12) tris.push({ a, b, c, n: norm(n), area });
    }
  }
  const total = tris.reduce((s, t) => s + t.area, 0);
  const pick = (u) => { let x = u * total; for (const t of tris) { if (x <= t.area) return t; x -= t.area; } return tris[tris.length - 1]; };
  const out = [], seed = p.seed ?? 1;
  for (let i = 0; i < 4000 && out.length < (p.count ?? 10); i++) {
    const t = pick(hash01(i, 1, seed)), u = hash01(i, 2, seed), v = hash01(i, 3, seed);
    const su = Math.sqrt(u), q = [0, 1, 2].map((j) => (1 - su) * t.a[j] + su * (1 - v) * t.b[j] + su * v * t.c[j]);
    if (out.some((r) => Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]) < (p.minDist ?? 0))) continue;
    const sz = p.size ? fieldValue(p.size, { x: q[0], y: q[1], z: q[2], i: out.length }) : 1;
    out.push([q[0], q[1], q[2], sz, hash01(i, 4, seed) * TAU, t.n[0], t.n[1], t.n[2]]);
  }
  return pts(out);
});

node('instancedMesh', { in: { geom: V.any, points: V.points, color: V.color, yawSign: V.number }, out: V.object }, ({ p }) => {
  const src = toGeometry(p.geom).parts[0]; if (!src) throw new Error('instancedMesh: empty geometry');
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(src.pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: p.color ?? '#cccccc', flatShading: true, roughness: 0.85 }), p.points.pts.length);
  const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  p.points.pts.forEach(([x, y, z, sz = 1, yaw = 0, nx, ny, nz], i) => {
    const n = new THREE.Vector3(nx ?? 0, ny ?? 1, nz ?? 0).normalize();
    q.setFromUnitVectors(up, n).multiply(new THREE.Quaternion().setFromAxisAngle(n, (p.yawSign ?? 1) * yaw));
    if (Array.isArray(sz)) s.set(sz[0], sz[1], sz[2]); else s.set(sz, sz, sz);
    m.compose(new THREE.Vector3(x, y, z), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
});

// ---------------------------------------------------------------- cavity (approximate subtraction)
node('cavity', { in: { geom: V.any, cx: V.number, cy: V.number, cz: V.number, r: V.number, depth: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const c = [p.cx ?? 0, p.cy ?? 0, p.cz ?? 0], r = p.r ?? 0.1, d = p.depth ?? 0.6;
  return geom(toGeometry(p.geom).parts.map(({ pos, zone }) => {
    const q = new Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const v = [pos[i], pos[i + 1], pos[i + 2]], dir = sub3(v, c), len = Math.hypot(...dir);
      if (len < r && len > 1e-9) {
        const k = (r * d) / len;
        q[i] = c[0] + dir[0] * k; q[i + 1] = c[1] + dir[1] * k; q[i + 2] = c[2] + dir[2] * k;
      } else { q[i] = v[0]; q[i + 1] = v[1]; q[i + 2] = v[2]; }
    }
    return part(q, zone);
  }));
});

// ---------------------------------------------------------------- skeleton / skin
node('skeleton', { in: { bones: V.any }, out: V.any }, ({ p }) => {
  const defs = p.bones, byName = new Map(), list = [];
  for (const b of defs) {
    const bone = new THREE.Bone(); bone.name = b.name; bone.position.set(...(b.pos ?? [0, 0, 0]));
    if (b.parent) byName.get(b.parent).add(bone);
    byName.set(b.name, bone); list.push(bone);
  }
  const root = list.find((b) => !b.parent?.isBone) ?? list[0];
  root.updateMatrixWorld(true);
  return { __kind: 'skeleton', root, list, byName, defs };
});

node('skin', { in: { geom: V.any, skeleton: V.any, soft: V.bool, zones: V.any }, out: V.object }, ({ p }) => {
  const sk = p.skeleton, parts = toGeometry(p.geom).parts;
  const pos = [], col = [];
  for (const { pos: pp, zone } of parts) {
    const c = new THREE.Color(p.zones?.[zone] ?? zoneColor(zone));
    for (let i = 0; i < pp.length; i += 3) { pos.push(pp[i], pp[i + 1], pp[i + 2]); col.push(c.r, c.g, c.b); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const skinIndex = new Uint16Array((pos.length / 3) * 4);
  const skinWeight = new Float32Array((pos.length / 3) * 4);
  const world = sk.list.map((b) => { const v = new THREE.Vector3(); b.getWorldPosition(v); return v; });
  const parents = sk.defs.map((d) => (d.parent ? sk.byName.get(d.parent) : null));
  for (let i = 0; i < pos.length / 3; i++) {
    const v = new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    let best = 0, bestD = Infinity, second = 0, secondD = Infinity;
    for (let b = 0; b < sk.list.length; b++) {
      const a = world[b], c = parents[b] ? world[sk.list.indexOf(parents[b])] : a;
      const ab = new THREE.Vector3().subVectors(c, a), t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(v, a).dot(ab) / (ab.lengthSq() || 1)));
      const d = new THREE.Vector3().copy(a).addScaledVector(ab, t).distanceTo(v);
      if (d < bestD) { second = best; secondD = bestD; best = b; bestD = d; }
      else if (d < secondD) { second = b; secondD = d; }
    }
    if (p.soft) {
      const w = secondD === Infinity ? 1 : bestD / (bestD + secondD + 1e-6);
      skinIndex[i * 4] = best; skinWeight[i * 4] = 1 - w;
      skinIndex[i * 4 + 1] = second; skinWeight[i * 4 + 1] = w;
    } else { skinIndex[i * 4] = best; skinWeight[i * 4] = 1; }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geo.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide }));
  mesh.add(sk.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(sk.list));
  return mesh;
});

node('pose', { in: { object: V.object, poses: V.any }, out: V.object }, ({ p }) => {
  const bones = new Map(); p.object.traverse((o) => { if (o.isBone) bones.set(o.name, o); });
  for (const [name, r] of Object.entries(p.poses ?? {})) {
    const b = bones.get(name); if (b) b.rotation.set(r[0] ?? 0, r[1] ?? 0, r[2] ?? 0);
  }
  p.object.updateMatrixWorld(true);
  return p.object;
});

node('group', { in: {}, out: V.any }, ({ p, inputs, graph }) => {
  const sg = graph.groups.get(p.graph);
  if (!sg) throw new Error(`group: ${p.graph} not found`);
  const bound = { ...p, ...inputs }; delete bound.graph;
  const r = evaluate(sg, bound, { root: graph });
  return r.outputs.out ?? Object.values(r.outputs)[0];
});

node('repeat', { in: { count: V.int }, out: V.geom }, ({ p, inputs, graph }) => {
  const sg = graph.groups.get(p.graph);
  if (!sg) throw new Error(`repeat: ${p.graph} not found`);
  const parts = [];
  const bound = { ...p, ...inputs }; delete bound.graph; delete bound.count;
  for (let i = 0; i < Math.max(0, Math.round(p.count ?? 0)); i++) {
    const r = evaluate(sg, { ...bound, i }, { root: graph });
    const out = r.outputs.out ?? Object.values(r.outputs)[0];
    if (out?.__kind === 'geom') parts.push(...out.parts);
    else if (out?.parts) parts.push(...out.parts);
  }
  return geom(parts);
});




// ---------------------------------------------------------------- stylized segment text
const SEG = {
  T: [[0.12, 1], [0.88, 1]], UL: [[0, 0.94], [0, 0.56]], LL: [[0, 0.44], [0, 0.06]],
  B: [[0.12, 0], [0.88, 0]], LR: [[1, 0.06], [1, 0.44]], UR: [[1, 0.56], [1, 0.94]],
  M: [[0.12, 0.5], [0.88, 0.5]],
  D1: [[0.12, 0.9], [0.45, 0.54]], D2: [[0.88, 0.9], [0.55, 0.54]],
  D3: [[0.12, 0.1], [0.45, 0.46]], D4: [[0.88, 0.1], [0.55, 0.46]],
};
const GLYPH14 = {
  A: 'T UL UR LL LR M', B: 'T UL UR LL LR M B', C: 'T UL LL B', D: 'T UL UR LL LR B',
  E: 'T UL LL M B', F: 'T UL LL M', G: 'T UL LL B LR M', H: 'UL UR LL LR M',
  I: 'T B M', J: 'UR LR B LL', K: 'UL LL D2 D4', L: 'UL LL B', M: 'UL UR LL LR T',
  N: 'UL UR LL LR D1', O: 'T UL UR LL LR B', P: 'T UL UR M LL', Q: 'T UL UR LL LR B D4',
  R: 'T UL UR M LL D4', S: 'T UL M LR B', T: 'T UR LR', U: 'UL UR LL LR B',
  V: 'UL UR D3 D4', W: 'UL UR LL LR D3 D4', X: 'D1 D2 D3 D4', Y: 'D1 D2 LR',
  Z: 'T D2 D3 B', '0': 'T UL UR LL LR B', '1': 'UR LR', '2': 'T UR M LL B',
  '3': 'T UR M LR B', '4': 'UL UR M LR', '5': 'T UL M LR B', '6': 'T UL LL M LR B',
  '7': 'T UR LR', '8': 'T UL UR LL LR M B', '9': 'T UL UR M LR B', '-': 'M', ' ': '',
};

node('text', { in: { text: V.string, size: V.number, tracking: V.number, stroke: V.number, depth: V.number, x: V.number, y: V.number, z: V.number, align: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  const str = String(p.text ?? 'TEXT').toUpperCase(), H = p.size ?? 0.5;
  const track = p.tracking ?? 0.12, sw = p.stroke ?? H * 0.12, D = p.depth ?? H * 0.1;
  const widths = str.split('').map((ch) => (ch === ' ' ? 0.45 : 1));
  const total = widths.reduce((a, b) => a + b * (1 + track), -track) * H;
  let cx = p.align === 'center' ? -total / 2 : (p.align === 'right' ? -total : 0);
  const out = [];
  for (let k = 0; k < str.length; k++) {
    const ch = str[k], w = widths[k] * H;
    if (ch !== ' ') {
      const segs = (GLYPH14[ch] ?? GLYPH14['?'] ?? '').split(' ').filter(Boolean);
      for (const name of segs) {
        const [a, b] = SEG[name] ?? SEG.M;
        const p1 = [cx + a[0] * w, (p.y ?? 0) + a[1] * H, p.z ?? 0];
        const p2 = [cx + b[0] * w, (p.y ?? 0) + b[1] * H, p.z ?? 0];
        const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1;
        const nx = (-dy / L) * sw / 2, ny = (dx / L) * sw / 2;
        const v = (q, dz) => [q[0] + nx, q[1] + ny, q[2] + dz];
        const w1 = (q, dz) => [q[0] - nx, q[1] - ny, q[2] + dz];
        const A1 = v(p1, 0), B1 = v(p2, 0), C1 = w1(p2, 0), E1 = w1(p1, 0);
        const A2 = v(p1, D), B2 = v(p2, D), C2 = w1(p2, D), E2 = w1(p1, D);
        quad(out, A1, B1, C1, E1); quad(out, A2, E2, C2, B2);
        quad(out, A1, A2, B2, B1); quad(out, B1, B2, C2, C1);
        quad(out, C1, C2, E2, E1); quad(out, E1, E2, A2, A1);
      }
    }
    cx += w + track * H;
  }
  return geom(part(out, p.zone ?? 'a'));
});

// ---------------------------------------------------------------- surface-relative construction
const rayTri = (o, d, a, b, c) => {
  const e1 = sub3(b, a), e2 = sub3(c, a), pv = cross3(d, e2), det = dot3(e1, pv);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det, tv = sub3(o, a);
  const u = dot3(tv, pv) * inv; if (u < 0 || u > 1) return null;
  const qv = cross3(tv, e1), v = dot3(d, qv) * inv; if (v < 0 || u + v > 1) return null;
  const t = dot3(e2, qv) * inv; return t > 1e-7 ? t : null;
};
const hitSurface = (g, o, d, mode = 'exit') => {
  let best = null;
  for (const { pos } of g.parts) for (let i = 0; i < pos.length; i += 9) {
    const a = [pos[i], pos[i + 1], pos[i + 2]], b = [pos[i + 3], pos[i + 4], pos[i + 5]], c = [pos[i + 6], pos[i + 7], pos[i + 8]];
    const t = rayTri(o, d, a, b, c); if (t == null) continue;
    if (!best || (mode === 'exit' ? t > best.t : t < best.t)) best = { t, a, b, c };
  }
  if (!best) return null;
  const n = norm(cross3(sub3(best.b, best.a), sub3(best.c, best.a)));
  return { p: add3(o, mul3(d, best.t)), n };
};

node('curl', { in: { size: V.number, tip: V.number, sink: V.number, twist: V.number, x: V.number, y: V.number, z: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const s = p.size ?? 0.04, tip = p.tip ?? s * 0.26, sink = p.sink ?? s * 0.06, tw = p.twist ?? 0;
  const c = [p.x ?? 0, p.y ?? 0, p.z ?? 0], out = [];
  const ring = [0, 1, 2, 3].map((j) => { const a = tw + j * Math.PI / 2; return [c[0] + Math.cos(a) * s * 0.92, c[1] - sink, c[2] + Math.sin(a) * s * 0.92]; });
  const apex = [c[0], c[1] + tip, c[2]];
  for (let j = 0; j < 4; j++) tri(out, apex, ring[(j + 1) % 4], ring[j]);
  tri(out, ring[0], ring[1], ring[2]); tri(out, ring[0], ring[2], ring[3]);
  return geom(part(out, p.zone ?? 'a'));
});

node('scatterVolume', { in: { count: V.int, minDist: V.number, seed: V.int, radius: V.vec3, center: V.vec3, boxes: V.any, keep: V.field, size: V.field }, out: V.points }, ({ p, ctx }) => {
  const cx = p.center ?? [0, 0, 0], R = p.radius ?? [0.1, 0.12, 0.1];
  const GA = Math.PI * (3 - Math.sqrt(5)), out = [], N = Math.max((p.count ?? 10) * 10, 800);
  const size = p.size ?? 0.04, minD = p.minDist ?? size * 0.95;
  for (let i = 0; i < N && out.length < (p.count ?? 10); i++) {
    const dy = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(Math.max(0, 1 - dy * dy));
    const d = [Math.cos(GA * i) * rr, dy, Math.sin(GA * i) * rr];
    let pos, n;
    if (p.boxes?.length) {
      let best = -1, axis = 1, sign = 1;
      for (const b of p.boxes) {
        let t0 = -Infinity, t1 = Infinity, ax = 1, sg = 1;
        for (let a = 0; a < 3; a++) {
          if (Math.abs(d[a]) < 1e-9) { if (cx[a] < b[a] || cx[a] > b[a + 3]) { t1 = -1; break; } continue; }
          let u = (b[a] - cx[a]) / d[a], v = (b[a + 3] - cx[a]) / d[a];
          if (u > v) [u, v] = [v, u];
          t0 = Math.max(t0, u); if (v < t1) { t1 = v; ax = a; sg = Math.sign(d[a]); }
        }
        if (t1 > Math.max(t0, 0) && t1 > best) { best = t1; axis = ax; sign = sg; }
      }
      if (best < 0) continue;
      pos = [cx[0] + d[0] * best, cx[1] + d[1] * best, cx[2] + d[2] * best];
      n = [0, 0, 0]; n[axis] = sign;
    } else {
      pos = [cx[0] + d[0] * R[0], cx[1] + d[1] * R[1], cx[2] + d[2] * R[2]];
      n = norm([d[0] / R[0], d[1] / R[1], d[2] / R[2]]);
    }
    const sz = typeof p.size === 'object' ? fieldValue(p.size, { x: pos[0], y: pos[1], z: pos[2], i: out.length, s: ctx.params }) : size;
    if (p.keep && !fieldValue(p.keep, { x: pos[0], y: pos[1], z: pos[2], p: pos, n, i: out.length, s: ctx.params })) continue;
    if (out.some((q) => Math.hypot(q[0] - pos[0], q[1] - pos[1], q[2] - pos[2]) < minD)) continue;
    out.push([pos[0], pos[1], pos[2], sz, hash01(i, 4, p.seed ?? 1) * TAU, n[0], n[1], n[2]]);
  }
  return pts(out);
});

node('pathOnSurface', { in: { geom: V.geom, pts: V.any, from: V.vec3, mode: V.string }, out: V.path }, ({ p }) => {
  const from = p.from ?? [0, 0, 0], out = [], nr = [];
  for (const q of p.pts) {
    const d = norm(sub3(q, from)), hit = hitSurface(p.geom, from, d, p.mode ?? 'exit');
    if (hit) { out.push(hit.p); nr.push(hit.n); } else { out.push(q); nr.push([0, 1, 0]); }
  }
  return { __kind: 'path', pts: out, normals: nr, closed: false };
});

const frameAt = (pathPts, normals, i) => {
  const a = pathPts[Math.max(0, i - 1)], b = pathPts[Math.min(pathPts.length - 1, i + 1)];
  const t = norm(sub3(b, a)), n = norm(normals[i] ?? [0, 1, 0]);
  const u = norm(cross3(n, t));
  return { t, n, u };
};

node('bandOnSurface', { in: { geom: V.geom, pts: V.any, from: V.vec3, width: V.number, height: V.number, ease: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const src = p.pts.map((q) => q);
  let P = src, N = src.map(() => [0, 1, 0]);
  if (p.geom) {
    const from = p.from ?? [0, 0, 0]; P = []; N = [];
    for (const q of src) { const d = norm(sub3(q, from)), hit = hitSurface(p.geom, from, d, 'exit'); if (hit) { P.push(hit.p); N.push(hit.n); } else { P.push(q); N.push([0, 1, 0]); } }
  }
  const hw = (p.width ?? 0.04) / 2, hh = (p.height ?? 0.02) / 2, ease = p.ease ?? 0;
  const rings = P.map((q, i) => {
    const { n, u } = frameAt(P, N, i);
    const c = add3(q, mul3(n, ease));
    return [
      add3(add3(c, mul3(u, -hw)), mul3(n, -hh)), add3(add3(c, mul3(u, hw)), mul3(n, -hh)),
      add3(add3(c, mul3(u, hw)), mul3(n, hh)), add3(add3(c, mul3(u, -hw)), mul3(n, hh)),
    ];
  });
  const out = [];
  for (let k = 0; k < rings.length - 1; k++) { const A = rings[k], B = rings[k + 1]; for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(out, A[i], A[j], B[j], B[i]); } }
  const cap = (R, rev) => { const q = rev ? [...R].reverse() : R; for (let i = 1; i < 3; i++) tri(out, q[0], q[i], q[i + 1]); };
  cap(rings[0], true); cap(rings[rings.length - 1], false);
  return geom(part(out, p.zone ?? 'a'));
});

node('ribbon', { in: { path: V.path, width: V.number, fold: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.path), N = p.path.normals ?? P.map(() => [0, 1, 0]);
  const hw = (p.width ?? 0.05) / 2, fold = p.fold ?? 0, out = [];
  const rings = P.map((q, i) => {
    const { n, u } = frameAt(P, N, i), c = add3(q, mul3(n, 0));
    return [add3(c, mul3(u, -hw)), add3(add3(c, mul3(n, fold)), [0, 0, 0]), add3(c, mul3(u, hw))];
  });
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1];
    quad(out, A[0], A[1], B[1], B[0]); quad(out, A[1], A[2], B[2], B[1]);
    quad(out, A[0], B[0], B[1], A[1]); quad(out, A[1], B[1], B[2], A[2]);
  }
  return geom(part(out, p.zone ?? 'a'));
});

node('wrapShell', { in: { rings: V.any, ease: V.number, thickness: V.number, gap: V.number, zones: V.any, axis: V.string }, out: V.geom }, ({ p }) => {
  const rings = p.rings.map(asArray), ease = p.ease ?? 0.02, th = p.thickness ?? 0.004, gap = p.gap ?? 0;
  const z = p.zones ?? {}; const out = { outer: [], inner: [], rim: [] };
  const layers = rings.map((R) => {
    const cx = R.reduce((a, q) => a + q[0] / R.length, 0), cz = R.reduce((a, q) => a + q[2] / R.length, 0);
    const outer = R.map((q) => { const d = norm([q[0] - cx, 0, q[2] - cz]); return [q[0] + d[0] * ease, q[1], q[2] + d[2] * ease]; });
    const inner = outer.map((q, i) => { const d = norm([q[0] - cx, 0, q[2] - cz]); return [q[0] - d[0] * th, q[1], q[2] - d[2] * th]; });
    return { outer, inner };
  });
  const ang = (q, R) => { const cx = R.reduce((a, r) => a + r[0] / R.length, 0), cz = R.reduce((a, r) => a + r[2] / R.length, 0); return Math.atan2(q[2] - cz, q[0] - cx); };
  for (let k = 0; k < layers.length - 1; k++) {
    const A = layers[k], B = layers[k + 1], n = A.outer.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (gap > 0) {
        const m = (ang(A.outer[i], A.outer) + ang(A.outer[j], A.outer)) / 2;
        if (Math.abs(Math.atan2(Math.sin(m), Math.cos(m))) < gap) continue;
      }
      quad(out.outer, A.outer[i], A.outer[j], B.outer[j], B.outer[i]);
      quad(out.inner, A.inner[i], A.inner[j], B.inner[j], B.inner[i]);
    }
  }
  const n = layers[0].outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, m = (ang(layers[0].outer[i], layers[0].outer) + ang(layers[0].outer[j], layers[0].outer)) / 2;
    if (gap > 0 && Math.abs(Math.atan2(Math.sin(m), Math.cos(m))) < gap) continue;
    quad(out.rim, layers[0].outer[i], layers[0].inner[i], layers[0].inner[j], layers[0].outer[j]);
    quad(out.rim, layers.at(-1).outer[i], layers.at(-1).outer[j], layers.at(-1).inner[j], layers.at(-1).inner[i]);
  }
  if (gap > 0) {
    for (const [i, edge] of [[0, 1], [n - 1, -1]]) {
      // find the two vertices closest to the gap edge on each side
    }
  }
  return geom([
    part(out.outer, z.outer ?? 'outer'), part(out.inner, z.inner ?? 'inner'), part(out.rim, z.rim ?? 'rim'),
  ].filter((q) => q.pos.length));
});

// ---------------------------------------------------------------- booleans (Manifold WASM)
let MF = null;
export async function initManifold() {
  if (MF) return MF;
  const mod = await import('manifold-3d');
  const w = await mod.default();
  w.setup();
  MF = w;
  return w;
}
const MSCALE = 1000;
function toManifold(g) {
  const { Manifold, Mesh } = MF;
  const vp = [], tv = [];
  for (const { pos } of g.parts) {
    const base = vp.length / 3;
    for (let i = 0; i < pos.length; i += 3) vp.push(Math.round(pos[i] * MSCALE), Math.round(pos[i + 1] * MSCALE), Math.round(pos[i + 2] * MSCALE));
    for (let i = 0; i < pos.length / 9; i++) tv.push(base + i * 3, base + i * 3 + 1, base + i * 3 + 2);
  }
  const mesh = new Mesh({ numProp: 3, vertProperties: new Float32Array(vp), triVerts: new Uint32Array(tv) });
  if (typeof mesh.merge === 'function') mesh.merge();
  return new Manifold(mesh);
}
function fromManifold(m, zone) {
  const mesh = m.getMesh();
  const vp = mesh.vertProperties, tv = mesh.triVerts, np = mesh.numProp;
  const out = [];
  for (let i = 0; i < tv.length; i++) {
    const b = tv[i] * np;
    out.push(vp[b] / MSCALE, vp[b + 1] / MSCALE, vp[b + 2] / MSCALE);
  }
  return geom(part(out, zone));
}

node('boolean', { in: { a: V.geom, b: V.geom, op: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  if (!MF) throw new Error('boolean: call await initManifold() first');
  const A = toManifold(p.a), B = toManifold(p.b);
  let C;
  if (p.op === 'union') C = A.add(B);
  else if (p.op === 'intersect') C = A.intersect(B);
  else C = A.subtract(B);
  const out = fromManifold(C, p.zone ?? 'a');
  A.delete(); B.delete(); C.delete();
  return out;
});

// ---------------------------------------------------------------- cards / point grids
node('plane', { in: { w: V.number, d: V.number, x: V.number, y: V.number, z: V.number, ry: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const w = (p.w ?? 1) / 2, d = (p.d ?? 1) / 2, c = Math.cos(p.ry ?? 0), s2 = Math.sin(p.ry ?? 0);
  const P = [[-w, 0, -d], [w, 0, -d], [w, 0, d], [-w, 0, d]].map(([x, y, z]) => [x * c - z * s2 + (p.x ?? 0), y + (p.y ?? 0), x * s2 + z * c + (p.z ?? 0)]);
  const out = [];
  quad(out, P[0], P[1], P[2], P[3]);
  return geom(part(out, p.zone ?? 'a'));
});

node('card', { in: { w: V.number, h: V.number, bend: V.number, taper: V.number, seg: V.int, x: V.number, y: V.number, z: V.number, ry: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const w = p.w ?? 0.1, h = p.h ?? 0.3, bend = p.bend ?? 0, taper = p.taper ?? 1, seg = Math.max(1, Math.round(p.seg ?? 3));
  const out = [];
  for (let k = 0; k < seg; k++) {
    const t0 = k / seg, t1 = (k + 1) / seg;
    const w0 = w * (1 - (1 - taper) * t0), w1 = w * (1 - (1 - taper) * t1);
    const b0 = bend * t0 * t0, b1 = bend * t1 * t1;
    const A = [-w0 / 2, h * t0, b0], B = [w0 / 2, h * t0, b0], C = [w1 / 2, h * t1, b1], D = [-w1 / 2, h * t1, b1];
    quad(out, A, B, C, D);
  }
  const s2 = Math.sin(p.ry ?? 0), c2 = Math.cos(p.ry ?? 0);
  const q = [];
  for (let i = 0; i < out.length; i += 3) {
    const X = out[i], Z = out[i + 2];
    q.push(X * c2 - Z * s2 + (p.x ?? 0), out[i + 1] + (p.y ?? 0), X * s2 + Z * c2 + (p.z ?? 0));
  }
  return geom(part(q, p.zone ?? 'a'));
});

node('pointsGrid', { in: { nx: V.int, nz: V.int, w: V.number, d: V.number, y: V.number, normal: V.vec3 }, out: V.points }, ({ p }) => {
  const nx = Math.max(1, Math.round(p.nx)), nz = Math.max(1, Math.round(p.nz)), out = [];
  const n = p.normal ?? [0, 1, 0];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    out.push([-(p.w ?? 1) / 2 + (i + 0.5) * (p.w ?? 1) / nx, p.y ?? 0, -(p.d ?? 1) / 2 + (j + 0.5) * (p.d ?? 1) / nz, 1, 0, n[0], n[1], n[2]]);
  }
  return pts(out);
});

// ---------------------------------------------------------------- generic data nodes
// Generic data nodes: values, lists, ranges, mapping a group over a list,
// folding a value through a list, and a boolean select. Layout math is expressed
// with these plus the parsed expression language, not with code blocks.
node('value', { in: { args: V.any }, out: V.any }, ({ p, params }) => {
  const env = { ...(p.args ?? {}), s: params, ...params };
  return evalExpr(parseExpr(String(p.expr ?? 'null')), env);
});

node('list', { in: { items: V.any }, out: V.any }, ({ p }) => p.items ?? []);

node('range', { in: { from: V.int, to: V.int, step: V.number }, out: V.any }, ({ p }) => {
  const step = p.step ?? 1, out = [];
  for (let v = p.from ?? 0; step > 0 ? v < (p.to ?? 0) : v > (p.to ?? 0); v += step) out.push(v);
  return out;
});

node('if', { in: { cond: V.bool, then: V.any, else: V.any }, out: V.any }, ({ p }) => (p.cond ? p.then : p.else));

node('map', { in: { list: V.any, graph: V.string }, out: V.any }, ({ p, inputs, graph, params }) => {
  const sg = graph.groups.get(p.graph);
  if (!sg) throw new Error(`map: ${p.graph} not found`);
  const bound = { ...p, ...inputs };
  delete bound.graph; delete bound.list;
  const list = asArray(p.list) ?? [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const r = evaluate(sg, { ...params, ...bound, item: list[i], index: i }, { root: graph });
    out.push('out' in r.outputs ? r.outputs.out : r.outputs);
  }
  return out;
});

node('fold', { in: { list: V.any, init: V.any, graph: V.string }, out: V.any }, ({ p, inputs, graph, params }) => {
  const sg = graph.groups.get(p.graph);
  if (!sg) throw new Error(`fold: ${p.graph} not found`);
  const bound = { ...p, ...inputs };
  delete bound.graph; delete bound.list; delete bound.init;
  const list = asArray(p.list) ?? [];
  let acc = p.init;
  for (let i = 0; i < list.length; i++) {
    const r = evaluate(sg, { ...params, ...bound, item: list[i], index: i, acc }, { root: graph });
    acc = 'out' in r.outputs ? r.outputs.out : r.outputs;
  }
  return acc;
});

// Named derived values: one node, many outputs. Each binding is a field
// expression evaluated in order, so later bindings can use earlier ones.
node('let', { in: {}, out: V.any }, ({ p, inputs, params }) => {
  // Bindings are ordinary field expressions, so expose the graph inputs under
  // `s` as well as as bare names (matching `value` and field evaluation).
  const env = { ...params, ...inputs, s: params };
  const out = {};
  for (const [k, v] of Object.entries(p.binds ?? {})) {
    const val = isField(v) ? fieldValue(v, env) : typeof v === 'string' ? fieldValue(field(v), env) : v;
    env[k] = val;
    out[k] = val;
  }
  return p.outs ? Object.fromEntries(p.outs.map((k) => [k, out[k]])) : out;
});

// Row/column table: rows are arrays, access is by column name.
node('table', { in: { rows: V.any }, out: V.any }, ({ p }) => {
  const cols = p.cols ?? [];
  return (p.rows ?? []).map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
});

// Named preset lookup: presets is a record of records, choice selects one.
node('preset', { in: { choice: V.any, overrides: V.any }, out: V.any }, ({ p }) => {
  const presets = p.presets ?? {};
  const base = presets[p.choice] ?? presets[p.fallback] ?? Object.values(presets)[0] ?? {};
  if (typeof base !== 'object' || base === null) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(p.overrides ?? {})) {
    if (v !== '' && v !== undefined && v !== null) out[k] = v;
  }
  return out;
});

// First non-empty value, used for "explicit override else preset".
node('coalesce', { in: { value: V.any, fallback: V.any }, out: V.any }, ({ p }) => {
  const v = p.value;
  return (v === '' || v === undefined || v === null) ? p.fallback : v;
});

// Consecutive draws from a random stream: item*count + offset.
node('draws', { in: { rng: V.any, item: V.int, n: V.int, offset: V.int }, out: V.any }, ({ p }) => {
  const values = Array.isArray(p.rng) ? p.rng : (p.rng?.values ?? []);
  const n = Math.max(0, Math.round(p.n ?? 1));
  const start = Math.round((p.offset ?? 0) + (p.item ?? 0) * n);
  return values.slice(start, start + n);
});

// Jitter a point list from a stream: dims draws per point, symmetric offset.
node('jitter', { in: { points: V.any, amps: V.any, rng: V.any, offset: V.int, dims: V.int, amount: V.number }, out: V.any }, ({ p }) => {
  const pts = asArray(p.points) ?? [];
  const values = Array.isArray(p.rng) ? p.rng : (p.rng?.values ?? []);
  const dims = Math.max(1, Math.round(p.dims ?? 2));
  const offset = Math.round(p.offset ?? 0);
  return pts.map((q, i) => {
    const amp = p.amps ? asArray(p.amps)[i] ?? p.amps : 1;
    const a = Array.isArray(amp) ? amp : [amp, amp, amp];
    return q.map((v, d) => {
      if (d >= dims) return v;
      const r = values[offset + i * dims + d] ?? 0;
      return v + (r * 2 - 1) * (a[d] ?? 0) * (p.amount ?? 1);
    });
  });
});

node('centroid', { in: { points: V.any }, out: V.any }, ({ p }) => {
  const q = asArray(p.points) ?? [], c = [0, 0, 0];
  for (const v of q) { c[0] += v[0] / q.length; c[1] += v[1] / q.length; c[2] += v[2] / q.length; }
  return c;
});

node('lerpPoint', { in: { a: V.any, b: V.any, t: V.number }, out: V.any }, ({ p }) => {
  const t = p.t ?? 0.5;
  return [0, 1, 2].map((k) => p.a[k] + (p.b[k] - p.a[k]) * t);
});

node('mirrorPoint', { in: { point: V.any, axis: V.string }, out: V.any }, ({ p }) => {
  const q = [...p.point];
  const k = p.axis === 'y' ? 1 : p.axis === 'z' ? 2 : 0;
  q[k] = -q[k];
  return q;
});

node('rotateAbout', { in: { point: V.any, pivot: V.any, axis: V.any, angle: V.number }, out: V.any }, ({ p }) => {
  const v = sub3(p.point, p.pivot), ax = norm(p.axis), phi = p.angle ?? 0;
  const k = cross3(ax, v), d = dot3(ax, v), c = Math.cos(phi), s = Math.sin(phi);
  return add3(p.pivot, [v[0] * c + k[0] * s + ax[0] * d * (1 - c),
    v[1] * c + k[1] * s + ax[1] * d * (1 - c),
    v[2] * c + k[2] * s + ax[2] * d * (1 - c)]);
});

node('planeCut', { in: { r0: V.any, r1: V.any, a: V.number, b: V.number, xc: V.number, yc: V.number, clampLo: V.number, clampHi: V.number }, out: V.any }, ({ p }) => {
  const r0 = asArray(p.r0), r1 = asArray(p.r1), a = p.a ?? 0, b = p.b ?? 0;
  const lo = p.clampLo ?? 0.04, hi = p.clampHi ?? 0.9;
  return r0.map((p0, i) => {
    const p1 = r1[i];
    const d = sub3(p1, p0);
    const num = (p.xc ?? 0) + a * (p0[1] - (p.yc ?? 0)) + b * p0[2] - p0[0];
    const den = d[0] - a * d[1] - b * d[2];
    const t = Math.min(hi, Math.max(lo, num / den));
    return add3(p0, mul3(d, t));
  });
});

node('gridPoint', { in: { grid: V.any, i: V.int, j: V.int }, out: V.any }, ({ p }) => p.grid?.top?.[p.i]?.[p.j]);

node('direction', { in: { a: V.any, b: V.any, flatten: V.string }, out: V.any }, ({ p }) => {
  const d = sub3(p.b, p.a);
  if (p.flatten === 'y') d[1] = 0;
  return norm(d);
});

node('lookup', { in: { object: V.any }, out: V.any }, ({ p }) => p.object?.[p.key]);

node('first', { in: { list: V.any }, out: V.any }, ({ p }) => (asArray(p.list) ?? [])[0]);
node('last', { in: { list: V.any }, out: V.any }, ({ p }) => { const q = asArray(p.list) ?? []; return q[q.length - 1]; });
node('slice', { in: { list: V.any, from: V.int, to: V.int }, out: V.any }, ({ p }) => (asArray(p.list) ?? []).slice(p.from ?? 0, p.to ?? undefined));
node('concat', { in: { lists: V.any }, out: V.any }, ({ p }) => (p.lists ?? []).flatMap((q) => asArray(q) ?? []));

// script escape hatch: receives resolved inputs, returns any value. The scope
// intentionally matches the reference modules: THREE, the BufferGeometryUtils
// addons, raw tri/quad/part/geom, ring and the same LCG. A script can return a
// BufferGeometry/Mesh directly; mesh/geometry accept it.
const SCRIPT_HELPERS = {
  tri, quad, part, geom, profile, path, pts,
  ring: (n, fn) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const q = typeof fn === 'function' ? fn(i, a) : [Math.cos(a), Math.sin(a)];
      out.push(Array.isArray(q) ? q : [Math.cos(a) * q, 0, Math.sin(a) * q]);
    }
    return out;
  },
  prng: makePrng,
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  TAU,
};
node('script', { in: { inputs: V.any }, out: V.any }, ({ p, inputs, ctx }) => {
  if (!ctx?.allowScript) throw new Error('script: disabled by host (pass { allowScript: true } to evaluate)');
  const fn = new Function('inputs', 'p', 'THREE', 'ADDONS', 'H', `
    "use strict";
    ${p.src}
  `);
  return fn(inputs, p, THREE, ADDONS, SCRIPT_HELPERS);
});

// opaque module escape hatch: wraps an existing Polyfork module
node('module', { in: { params: V.any }, out: V.object }, ({ p }) => {
  const mod = p.module;
  if (!mod || typeof mod.createAsset !== 'function') throw new Error('module: missing createAsset');
  return mod.createAsset(p.params ?? {});
});

export { profile, path, geom, pts, part, tri, quad };
