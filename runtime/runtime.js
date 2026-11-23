// v2 graph runtime: registry-based DAG, typed values, fields, groups, escape hatches.
// Research code for the Polyfork feasibility study.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const TAU = Math.PI * 2;
export const V = {
  geom: 'geometry', points: 'points', field: 'field', profile: 'profile', path: 'path',
  number: 'number', int: 'int', bool: 'bool', string: 'string', color: 'color',
  vec3: 'vec3', enum: 'enum', any: 'any', mesh: 'mesh', object: 'object',
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
function compileField(src) {
  if (typeof src !== 'string') return () => src;
  const fn = new Function('x', 'y', 'z', 'i', 'k', 'u', 'v', 'p', 'n', 's', 'q', `
    const {sin,cos,tan,asin,acos,atan,atan2,sqrt,abs,min,max,floor,ceil,round,pow,exp,log,hypot,sign,PI}=Math;
    const TAU=Math.PI*2;
    const lerp=(a,b,t)=>a+(b-a)*t;
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
    const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    const fract=(v)=>v-Math.floor(v);
    const hash=(a,b=0,c=0)=>{let h=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return h-Math.floor(h);};
    const rand=(seed=1)=>{let s=seed;return ()=>(s=(s*16807)%2147483647)/2147483647;};
    const noise=(a,b=0,c=0)=>{const xi=Math.floor(a),yi=Math.floor(b),zi=Math.floor(c);
      const xf=a-xi,yf=b-yi,zf=c-zi;const u=xf*xf*(3-2*xf),vv=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
      const g=(i,j,k)=>hash(i,j,k);const x00=lerp(g(xi,yi,zi),g(xi+1,yi,zi),u);
      const x10=lerp(g(xi,yi+1,zi),g(xi+1,yi+1,zi),u);const x01=lerp(g(xi,yi,zi+1),g(xi+1,yi,zi+1),u);
      const x11=lerp(g(xi,yi+1,zi+1),g(xi+1,yi+1,zi+1),u);return lerp(lerp(x00,x10,vv),lerp(x01,x11,vv),w);};
    return (${src});
  `);
  return (ctx = {}) => {
    const r = fn(ctx.x ?? 0, ctx.y ?? 0, ctx.z ?? 0, ctx.i ?? 0, ctx.k ?? 0, ctx.u ?? 0, ctx.v ?? 0, ctx.p ?? [0, 0, 0], ctx.n ?? [0, 1, 0], ctx.s ?? {}, ctx);
    return typeof r === 'function'
      ? r(ctx.x ?? 0, ctx.y ?? 0, ctx.z ?? 0, ctx.i ?? 0, ctx.k ?? 0, ctx.u ?? 0, ctx.v ?? 0, ctx.p ?? [0, 0, 0], ctx.n ?? [0, 1, 0], ctx.s ?? {})
      : r;
  };
}
export const field = (src) => ({ __field: typeof src === 'function' ? String(src) : src });
export const isField = (v) => v && typeof v === 'object' && '__field' in v;
export const expr = (src) => ({ __expr: typeof src === 'function' ? String(src) : src });

// ---------------------------------------------------------------- helpers
const tri = (o, a, b, c) => o.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
const quad = (o, a, b, c, d) => { tri(o, a, b, c); tri(o, a, c, d); };
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
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(p.x ?? 0, p.y ?? 0, p.z ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'XYZ')),
    new THREE.Vector3(p.s ?? 1, p.s ?? 1, p.s ?? 1),
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
  const root = opts.root ?? graph;
  const params = { ...Object.fromEntries(graph.inputs.map((i) => [i.name, i.default])), ...values };
  const paramValue = (v) => {
    if (v && typeof v === 'object') {
      if ('__expr' in v) {
        const r = new Function('s', `const {sin,cos,sqrt,abs,min,max,floor,round,pow,PI}=Math; const TAU=Math.PI*2; const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)); const lerp=(a,b,t)=>a+(b-a)*t; return (${v.__expr});`)(params);
        return typeof r === 'function' ? r(params) : r;
      }
      if ('__field' in v || v.__kind || v.isObject3D) return v;
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
      if (memo.has(key)) return memo.get(key);
      const n = graph.byId.get(key);
      if (!n) throw new Error(`unknown node ${key}`);
      const def = NODES.get(n.type);
      if (!def) throw new Error(`unknown node type ${n.type}`);
      const inp = {};
      for (const [k, val] of Object.entries(n.in)) inp[k] = paramValue(resolve(val, ctx));
      const out = def.fn({ inputs: inp, p: { ...inp, ...evalNodeParams(n.p) }, graph: root, params, evaluate, resolve, ctx: { ...ctx, params } });
      memo.set(key, out);
      return out;
    }
    if (Array.isArray(v)) return v.map((x) => resolve(x, ctx));
    if (v && typeof v === 'object') {
      if (v.__field || v.__kind || v.isObject3D || v.isMaterial) return v;
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
export function toGeometry(obj) {
  if (!obj) throw new Error('toGeometry: empty');
  if (obj.__kind === 'geom') return obj;
  if (obj.__kind === 'points') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(obj.pts.flat(), 3));
    return { __kind: 'geom', parts: [{ pos: obj.pts.flat(), zone: 'a' }] };
  }
  if (obj.isObject3D) return obj;
  throw new Error('toGeometry: not geometry');
}

export function emitMesh(g, { zones = {}, materials = {}, flat = true, name = 'mesh' } = {}) {
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
    const merged = mergeGeometries(geos, false);
    merged.computeVertexNormals();
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

node('grid', { in: { nx: V.int, nz: V.int, w: V.number, d: V.number, position: V.field }, out: V.any }, ({ p, ctx }) => {
  const nx = Math.max(1, Math.round(p.nx)), nz = Math.max(1, Math.round(p.nz));
  const top = [], bot = [];
  for (let i = 0; i <= nx; i++) {
    top.push([]); bot.push([]);
    for (let j = 0; j <= nz; j++) {
      const x = -(p.w ?? 1) / 2 + (i * (p.w ?? 1)) / nx;
      const z = -(p.d ?? 1) / 2 + (j * (p.d ?? 1)) / nz;
      const q = p.position ? fieldValue(p.position, { x, z, i, j, u: i / nx, v: j / nz, s: ctx.params }) : [x, 0, z];
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

node('loftProfile', { in: { profile: V.profile, capTop: V.any, capBottom: V.any, zones: V.any }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), stations = p.stations ?? [[0, 1, 0]];
  const rings = stations.map(([x, s = 1, dz = 0]) => P.map(([z, y]) => [x, y * s, z * s + dz]));
  return NODES.get('loft').fn({ p: { rings, capTop: p.capTop, capBottom: p.capBottom, zones: p.zones ?? {} } });
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

node('loft', { in: { rings: V.any, capTop: V.any, capBottom: V.any, zones: V.any }, out: V.geom }, ({ p }) => {
  const rings = p.rings.map(asArray);
  const zones = p.zones ?? {};
  const out = {};
  const put = (z, pos) => (out[z] ??= []).push(...pos);
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1], n = A.length, pos = [];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(pos, A[i], A[j], B[j], B[i]); }
    put(typeof zones.band === 'function' ? zones.band(k) : (zones.band ?? 'a'), pos);
  }
  if (p.capTop) {
    const A = rings[rings.length - 1], n = A.length, pos = [];
    for (let i = 0; i < n; i++) tri(pos, p.capTop, A[(i + 1) % n], A[i]);
    put(zones.capTop ?? 'a', pos);
  }
  if (p.capBottom) {
    const A = rings[0], n = A.length, pos = [];
    for (let i = 0; i < n; i++) tri(pos, p.capBottom, A[i], A[(i + 1) % n]);
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

node('revolve', { in: { profile: V.any, seg: V.int, phase: V.number, inRadius: V.bool, zone: V.any, mod: V.field, axis: V.string }, out: V.geom }, ({ p }) => {
  const P = asArray(p.profile), n = Math.max(3, Math.round(p.seg ?? 12)), buckets = new Map();
  const step = TAU / n, cosH = Math.cos(step / 2);
  const axis = p.axis ?? 'y';
  const ringAt = (k, r, y) => {
    const R = p.inRadius ? r / cosH : r, q = [];
    for (let i = 0; i < n; i++) {
      const a = (p.phase ?? 0) + ((i + (p.inRadius ? 0.5 : 0)) / n) * TAU;
      const rr = p.mod ? fieldValue(p.mod, { i, k, x: r, y, s: p }) : R;
      q.push(axis === 'z' ? [rr * Math.cos(a), rr * Math.sin(a), y] : [rr * Math.sin(a), y, rr * Math.cos(a)]);
    }
    return q;
  };
  for (let k = 0; k < P.length - 1; k++) {
    const A = ringAt(k, P[k][0], P[k][1]), B = ringAt(k + 1, P[k + 1][0], P[k + 1][1]);
    const z = typeof p.zone === 'function' ? p.zone(k) : (Array.isArray(p.zone) ? p.zone[k] : (p.zone ?? 'a'));
    if (!buckets.has(z)) buckets.set(z, []);
    const out = buckets.get(z);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(out, A[i], A[j], B[j], B[i]); }
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

node('solidify', { in: { grid: V.any, topZone: V.any, botZone: V.any, wallZone: V.any }, out: V.geom }, ({ p }) => {
  const { top, bot } = p.grid, nx = top.length - 1, nz = top[0].length - 1;
  const zo = (z, i, j) => (typeof z === 'function' ? z(i, j) : (z ?? 'a'));
  const buckets = new Map();
  const put = (z, pos) => { if (!buckets.has(z)) buckets.set(z, []); buckets.get(z).push(...pos); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = top[i][j], b = top[i + 1][j], c = top[i + 1][j + 1], d = top[i][j + 1];
    const t = [], zt = zo(p.topZone, i, j); quad(t, a, b, c, d); put(zt, t);
    const e = bot[i][j], f = bot[i + 1][j], g2 = bot[i + 1][j + 1], h = bot[i][j + 1];
    const u = [], zb = zo(p.botZone, i, j); quad(u, e, h, g2, f); put(zb, u);
  }
  const wall = [];
  for (let i = 0; i < nx; i++) for (const [j, flip] of [[0, true], [nz, false]]) {
    const a = top[i][j], b = top[i + 1][j], c = bot[i + 1][j], d = bot[i][j];
    flip ? quad(wall, a, b, c, d) : quad(wall, d, c, b, a);
  }
  for (let j = 0; j < nz; j++) for (const [i, flip] of [[0, false], [nx, true]]) {
    const a = top[i][j], b = top[i][j + 1], c = bot[i][j + 1], d = bot[i][j];
    flip ? quad(wall, a, b, c, d) : quad(wall, d, c, b, a);
  }
  const parts = [...buckets.entries()].map(([z, pos]) => part(pos, z));
  if (wall.length) parts.push(part(wall, typeof p.wallZone === 'function' ? p.wallZone() : (p.wallZone ?? 'a')));
  return geom(parts);
});

// ---------------------------------------------------------------- nodes: modifiers
node('transform', { in: { geom: V.geom, tx: V.number, ty: V.number, tz: V.number, rx: V.number, ry: V.number, rz: V.number, s: V.number }, out: V.geom }, ({ p }) => {
  const g = p.geom, m = new THREE.Matrix4();
  m.compose(
    new THREE.Vector3(p.tx ?? 0, p.ty ?? 0, p.tz ?? 0),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'XYZ')),
    new THREE.Vector3(p.s ?? 1, p.s ?? 1, p.s ?? 1),
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

node('clip', { in: { geom: V.geom, nx: V.number, ny: V.number, nz: V.number, d: V.number, cap: V.bool, zone: V.string }, out: V.geom }, ({ p }) => {
  const n = norm([p.nx ?? 0, p.ny ?? 1, p.nz ?? 0]), d = p.d ?? 0;
  const out = [], cut = [];
  const dist = (v) => v[0] * n[0] + v[1] * n[1] + v[2] * n[2] - d;
  for (const { pos, zone } of p.geom.parts) {
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
  const parts = out.length ? [part(out, p.zone ?? p.geom.parts[0]?.zone ?? 'a')] : [];
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

node('cone', { in: { n: V.int, r: V.number, h: V.number, x: V.number, y: V.number, z: V.number, axis: V.string, zone: V.string }, out: V.geom }, ({ p }) => {
  const n = Math.max(3, Math.round(p.n ?? 6)), out = [], apex = p.axis === 'z' ? [p.x ?? 0, p.y ?? 0, (p.z ?? 0) + (p.h ?? 1)] : [p.x ?? 0, (p.y ?? 0) + (p.h ?? 1), p.z ?? 0];
  const ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, r = p.r ?? 1;
    ring.push(p.axis === 'z' ? [(p.x ?? 0) + r * Math.cos(a), (p.y ?? 0) + r * Math.sin(a), p.z ?? 0] : [(p.x ?? 0) + r * Math.cos(a), p.y ?? 0, (p.z ?? 0) + r * Math.sin(a)]);
  }
  for (let i = 0; i < n; i++) tri(out, apex, ring[i], ring[(i + 1) % n]);
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

node('deform', { in: { geom: V.geom, expr: V.field }, out: V.geom }, ({ p }) => {
  const g = p.geom;
  return geom(g.parts.map(({ pos, zone }) => {
    const out = new Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      const q = fieldValue(p.expr, { x, y, z, p: [x, y, z] }) ?? [x, y, z];
      out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2];
    }
    return part(out, zone);
  }));
});

node('join', { in: { geoms: V.any }, out: V.geom }, ({ p }) => geom(p.geoms.flatMap((g) => (g.__kind === 'geom' ? g.parts : []))));

node('scatter', { in: { count: V.int, minDist: V.number, seed: V.int, tries: V.int, sample: V.field, height: V.field, size: V.field }, out: V.points }, ({ p, ctx }) => {
  let s = (p.seed ?? 1) >>> 0;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  for (let t = 0; t < (p.tries ?? 800) && out.length < (p.count ?? 1); t++) {
    const q = fieldValue(p.sample, { i: t, s: ctx.params }) ?? [0, 0];
    const [x, z] = q;
    if (out.some((r) => Math.hypot(r[0] - x, r[2] - z) < (p.minDist ?? 0))) continue;
    const y = p.height ? fieldValue(p.height, { x, z, s: ctx.params }) : 0;
    const sz = p.size ? fieldValue(p.size, { x, z, i: out.length, s: ctx.params }) : 1;
    out.push([x, y, z, sz, rnd() * TAU]);
  }
  return pts(out);
});

node('instance', { in: { points: V.points, proto: V.geom, orient: V.bool, scale: V.number }, out: V.geom }, ({ p }) => {
  const out = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const [x, y, z, sz = 1, yaw = 0, nx, ny, nz] of p.points.pts) {
    const n = (nx !== undefined && p.orient !== false) ? new THREE.Vector3(nx, ny, nz).normalize() : null;
    const q0 = n ? new THREE.Quaternion().setFromUnitVectors(up, n) : new THREE.Quaternion();
    const qy = new THREE.Quaternion().setFromAxisAngle(n ?? up, yaw);
    const Q = q0.clone().multiply(qy);
    for (const { pos, zone } of p.proto.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const v = new THREE.Vector3(pos[i] * sz * (p.scale ?? 1), pos[i + 1] * sz * (p.scale ?? 1), pos[i + 2] * sz * (p.scale ?? 1)).applyQuaternion(Q);
        q[i] = v.x + x; q[i + 1] = v.y + y; q[i + 2] = v.z + z;
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

node('arrayPolar', { in: { geom: V.geom, count: V.int, radius: V.number, axis: V.string, start: V.number, arc: V.number }, out: V.geom }, ({ p }) => {
  const out = [], n = Math.max(1, Math.round(p.count ?? 1));
  for (let k = 0; k < n; k++) {
    const a = (p.start ?? 0) + (p.arc ?? TAU) * (k / n);
    for (const { pos, zone } of p.geom.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        const src = p.axis === 'z'
          ? [pos[i], pos[i + 1], pos[i + 2]]
          : [pos[i], pos[i + 1], pos[i + 2] + (p.radius ?? 0)];
        const v = p.axis === 'z'
          ? (() => { const c = Math.cos(a), s2 = Math.sin(a); return [src[0] * c - src[1] * s2, src[0] * s2 + src[1] * c, src[2]]; })()
          : rotY(src, a);
        q[i] = v[0]; q[i + 1] = v[1]; q[i + 2] = v[2];
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

node('arrayLinear', { in: { geom: V.geom, count: V.int, dx: V.number, dy: V.number, dz: V.number }, out: V.geom }, ({ p }) => {
  const out = [], n = Math.max(1, Math.round(p.count ?? 1));
  for (let k = 0; k < n; k++) {
    const t = k * (p.step ?? 1);
    for (const { pos, zone } of p.geom.parts) {
      const q = new Array(pos.length);
      for (let i = 0; i < pos.length; i += 3) {
        q[i] = pos[i] + (p.dx ?? 0) * t; q[i + 1] = pos[i + 1] + (p.dy ?? 0) * t; q[i + 2] = pos[i + 2] + (p.dz ?? 0) * t;
      }
      out.push(part(q, zone));
    }
  }
  return geom(out);
});

node('switch', { in: { on: V.string, cases: V.any }, out: V.any }, ({ p }) => {
  const k = p.on;
  if (!(k in p.cases)) throw new Error(`switch: no case ${k}`);
  return p.cases[k];
});

node('mesh', { in: { geom: V.geom, zones: V.any, materials: V.any, flat: V.bool }, out: V.object }, ({ p }) => emitMesh(p.geom, {
  zones: p.zones ?? {}, materials: p.materials ?? {}, flat: p.flat !== false,
}));

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

node('chamferBox', { in: { w: V.number, h: V.number, d: V.number, c: V.number, x: V.number, y: V.number, z: V.number, ry: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const h = [p.w ?? 1, p.h ?? 1, p.d ?? 1].map((v) => v / 2);
  const c = Math.min(p.c ?? 0.02, Math.min(...h) * 0.9);
  const C = [p.x ?? 0, p.y ?? 0, p.z ?? 0];
  const P = (a, sa, b, sb, d2, sd) => {
    const q = [0, 0, 0];
    q[a] = sa * h[a]; q[b] = sb * (h[b] - c); q[d2] = sd * (h[d2] - c);
    return q;
  };
  const out = [];
  for (let a = 0; a < 3; a++) for (const sa of [-1, 1]) {
    const b = (a + 1) % 3, d2 = (a + 2) % 3;
    pushQuadOut(out,
      P(a, sa, b, -1, d2, -1), P(a, sa, b, 1, d2, -1), P(a, sa, b, 1, d2, 1), P(a, sa, b, -1, d2, 1), C);
  }
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const d2 = 3 - a - b;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      pushQuadOut(out,
        P(a, sa, b, sb, d2, -1), P(a, sa, b, sb, d2, 1),
        P(b, sb, a, sa, d2, 1), P(b, sb, a, sa, d2, -1), C);
    }
  }
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) for (const sd of [-1, 1]) {
    pushTriOut(out, P(0, sa, 1, sb, 2, sd), P(1, sb, 2, sd, 0, sa), P(2, sd, 0, sa, 1, sb), C);
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

node('scatterSurface', { in: { geom: V.geom, count: V.int, minDist: V.number, seed: V.int, size: V.field }, out: V.points }, ({ p }) => {
  const g = p.geom, tris = [];
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

node('instancedMesh', { in: { geom: V.geom, points: V.points, color: V.color }, out: V.object }, ({ p }) => {
  const src = p.geom.parts[0]; if (!src) throw new Error('instancedMesh: empty geometry');
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(src.pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: p.color ?? '#cccccc', flatShading: true, roughness: 0.85 }), p.points.pts.length);
  const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  p.points.pts.forEach(([x, y, z, sz = 1, yaw = 0, nx, ny, nz], i) => {
    const n = new THREE.Vector3(nx ?? 0, ny ?? 1, nz ?? 0).normalize();
    q.setFromUnitVectors(up, n).multiply(new THREE.Quaternion().setFromAxisAngle(n, yaw));
    s.set(sz, sz, sz);
    m.compose(new THREE.Vector3(x, y, z), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
});

// ---------------------------------------------------------------- cavity (approximate subtraction)
node('cavity', { in: { geom: V.geom, cx: V.number, cy: V.number, cz: V.number, r: V.number, depth: V.number, zone: V.string }, out: V.geom }, ({ p }) => {
  const c = [p.cx ?? 0, p.cy ?? 0, p.cz ?? 0], r = p.r ?? 0.1, d = p.depth ?? 0.6;
  return geom(p.geom.parts.map(({ pos, zone }) => {
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

node('skin', { in: { geom: V.geom, skeleton: V.any, soft: V.bool }, out: V.object }, ({ p }) => {
  const sk = p.skeleton, parts = p.geom.parts;
  const pos = [], col = [];
  for (const { pos: pp, zone } of parts) {
    const c = new THREE.Color(zoneColor(zone));
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

// script escape hatch: receives resolved inputs, returns any value
node('script', { in: { inputs: V.any }, out: V.any }, ({ p, inputs }) => {
  const fn = new Function('inputs', 'p', 'THREE', `
    "use strict";
    ${p.src}
  `);
  return fn(inputs, p, THREE);
});

// opaque module escape hatch: wraps an existing Polyfork module
node('module', { in: { params: V.any }, out: V.object }, ({ p }) => {
  const mod = p.module;
  if (!mod || typeof mod.createAsset !== 'function') throw new Error('module: missing createAsset');
  return mod.createAsset(p.params ?? {});
});

export { profile, path, geom, pts, part, tri, quad };
