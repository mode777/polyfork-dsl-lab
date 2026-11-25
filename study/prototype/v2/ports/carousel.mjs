// Baggage reclaim carousel — the sloped bed is one zoned profile loft, each
// plate is a short loft plus a top polygon, and the bags are lofted cases.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'terminal-grey': { plates: '#dddbdc', frame: '#8fa5b1', skirt: '#696568', hardCase: '#3e6495', duffel: '#b94c34' },
  graphite: { plates: '#e5e3e3', frame: '#586f84', skirt: '#282f3f', hardCase: '#9b855d', duffel: '#47592d' },
  'warm-steel': { plates: '#eeeded', frame: '#7b787c', skirt: '#4c3a43', hardCase: '#497aa2', duffel: '#836047' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const prng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const CR_W = 0.6, CR_PW = 0.46, CR_YB = 0.47, CR_RISE = 0.06, CR_PT = 0.02;
const CR_OV = 0.06, CR_SKEW = 0.4, CR_SLOPE = 0.326;
const CR_PITCH = 0.25, CR_PERIOD = 16;
const CR_CREST = CR_YB + CR_RISE + CR_PT, CR_DECK_F = 0.44 + CR_SLOPE * 0.04, CR_DECK_B = CR_DECK_F + CR_SLOPE, CR_RAIL_B = 0.88;
const CR_PROF = [
  [-0.55, 0, 'skirt'], [-0.55, 0.05, 'skirt'], [-0.60, 0.05, 'skirt'], [-0.60, 0.40, 'skirt'],
  [-0.57, 0.43, 'frame'], [-0.57, CR_RAIL_B - 0.02, 'frame'], [-0.55, CR_RAIL_B, 'frame'], [-0.50, CR_RAIL_B, 'frame'],
  [-0.50, CR_DECK_B, 'frame'], [0.50, CR_DECK_F, 'frame'], [0.50, 0.50, 'frame'], [0.55, 0.50, 'frame'],
  [0.57, 0.48, 'frame'], [0.57, 0.43, 'skirt'], [0.60, 0.40, 'skirt'], [0.60, 0.05, 'skirt'],
  [0.55, 0.05, 'skirt'], [0.55, 0, null],
];
const crTilt = (w) => CR_SLOPE * (CR_PW - w);
const crP3 = (f, w, y) => [f.x + f.nx * w, y, f.z + f.nz * w];
const crAt3 = (O, A, B, U, a, b, h) => [O[0] + A[0] * a + B[0] * b + U[0] * h, O[1] + A[1] * a + B[1] * b + U[1] * h, O[2] + A[2] * a + B[2] * b + U[2] * h];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'terminal-grey', { options: Object.keys(PALETTE), label: 'Colorway' });
  const load = params.load ?? 'few';
  const parts = [];
  const poly = (pts, zone, hint) => parts.push(g.poly({ pts, zone, hint }));
  const loft = (A, B, zone, skip, flip) => parts.push(g.loft({
    rings: [A, B], diagonal: 'abba', skipEdges: skip ?? [], flip: !!flip, zones: { band: zone },
  }));
  const sideFlip = (A, B, i, hint) => {
    const j = (i + 1) % A.length;
    const n = cross3(sub3(A[j], A[i]), sub3(B[i], A[i]));
    return dot3(n, hint) < 0;
  };

  const path = { L: 4, at: (s) => ({ x: s - 2, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 }), units: CR_PERIOD, S: (q) => q * CR_PITCH };
  const a0 = path.at(0), b0 = path.at(path.L), m0 = path.at(path.L / 2);
  const A = CR_PROF.map(([w, y]) => crP3(a0, w, y)), B = CR_PROF.map(([w, y]) => crP3(b0, w, y));
  const zones = CR_PROF.slice(0, CR_PROF.length - 1).map((p) => p[2]);
  const firstHint = [m0.nx * -(CR_PROF[1][1] - CR_PROF[0][1]), CR_PROF[1][0] - CR_PROF[0][0], m0.nz * -(CR_PROF[1][1] - CR_PROF[0][1])];
  parts.push(g.loft({
    rings: [A, B], diagonal: 'abba', skipEdges: [CR_PROF.length - 1],
    zoneField: 'vals.zones[i]', values: { zones }, flip: sideFlip(A, B, 0, firstHint),
    zones: { band: 'skirt' },
  }));
  poly([crP3(a0, -0.55, 0), crP3(b0, -0.55, 0), crP3(b0, 0.55, 0), crP3(a0, 0.55, 0)], 'skirt', [0, -1, 0]);

  const lower = [[-0.55, 0], [0.55, 0], [0.55, 0.05], [0.60, 0.05], [0.60, 0.40], [0.57, 0.43], [-0.57, 0.43], [-0.60, 0.40], [-0.60, 0.05], [-0.55, 0.05]];
  const upper = [[-0.57, 0.43], [0.57, 0.43], [0.57, 0.48], [0.55, 0.50], [0.50, 0.50], [0.50, CR_DECK_F], [-0.50, CR_DECK_B], [-0.50, CR_RAIL_B], [-0.55, CR_RAIL_B], [-0.57, CR_RAIL_B - 0.02]];
  for (const s of [0, path.L]) {
    const f = path.at(s), sg = s === 0 ? -1 : 1, hint = [f.tx * sg, 0, f.tz * sg];
    parts.push(g.poly({ pts: lower.map(([w, y]) => crP3(f, w, y)), zone: 'skirt', hint, keepDegenerate: true }));
    poly(upper.map(([w, y]) => crP3(f, w, y)), 'frame', hint);
  }

  const clipS = (poly, lo, hi) => {
    const cut = (pts, keep, edge) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b);
        if (ka) out.push(a);
        if (ka !== kb) { const t = (edge - a.s) / (b.s - a.s); out.push({ s: edge, w: a.w + (b.w - a.w) * t, cut: true }); }
      }
      return out;
    };
    let p = cut(poly, (v) => v.s >= lo - 1e-9, lo);
    if (p.length) p = cut(p, (v) => v.s <= hi + 1e-9, hi);
    return p;
  };
  const Sq = (q) => (q < 0 ? q * CR_PITCH : q > path.units ? path.L + (q - path.units) * CR_PITCH : path.S(q));
  for (let i = -1; i <= path.units; i++) {
    const u0 = Sq(i) - CR_OV, u1 = Sq(i + 1);
    const hAt = (_, v) => CR_YB + crTilt(v.w) + CR_RISE * ((v.s - CR_SKEW * v.w) - u0) / (u1 - u0);
    const quad = [
      { s: u0 - CR_SKEW * CR_PW, w: -CR_PW, e: 'lead' }, { s: u1 - CR_SKEW * CR_PW, w: -CR_PW, e: 'end' },
      { s: u1 + CR_SKEW * CR_PW, w: CR_PW, e: 'trail' }, { s: u0 + CR_SKEW * CR_PW, w: CR_PW, e: 'end' },
    ];
    const p = clipS(quad, 0, path.L);
    if (p.length < 3) continue;
    const top = p.map((v) => crP3(path.at(v.s), v.w, hAt(i, v) + CR_PT));
    const bot = p.map((v) => crP3(path.at(v.s), v.w, hAt(i, v)));
    poly(top, 'plates', [0, 1, 0]);
    let cs = 0, cw = 0;
    for (const v of p) { cs += v.s; cw += v.w; }
    cs /= p.length; cw /= p.length;
    const cf = crP3(path.at(cs), cw, 0);
    const skip = [];
    let flip = false;
    for (let k = 0; k < p.length; k++) {
      const a = p[k], b = p[(k + 1) % p.length];
      const onLo = Math.abs(a.s) < 1e-6 && Math.abs(b.s) < 1e-6, onHi = Math.abs(a.s - path.L) < 1e-6 && Math.abs(b.s - path.L) < 1e-6;
      const ua = a.s - CR_SKEW * a.w, ub = b.s - CR_SKEW * b.w, isLead = Math.abs(ua - u0) < 1e-6 && Math.abs(ub - u0) < 1e-6;
      if (isLead && !onLo && !onHi) { skip.push(k); continue; }
      if (!flip) {
        const mid = [(top[k][0] + top[(k + 1) % p.length][0]) / 2, 0, (top[k][2] + top[(k + 1) % p.length][2]) / 2];
        flip = sideFlip(bot, top, k, [mid[0] - cf[0], 0, mid[2] - cf[2]]);
      }
    }
    if (p.length - skip.length >= 1) loft(bot, top, 'plates', skip, flip);
  }

  const hardCase = (col, O, A, B, U, len = 0.62, wid = 0.42, ht = 0.24) => {
    const a = len / 2, b = wid / 2, c = 0.06;
    const ring = [[a, -b + c], [a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c], [-a + c, -b], [a - c, -b]];
    const lo = ring.map(([x, y]) => crAt3(O, A, B, U, x, y, 0)), hi = ring.map(([x, y]) => crAt3(O, A, B, U, x, y, ht));
    poly(hi, col, U);
    const n = [(ring[0][0] + ring[1][0]) / 2, (ring[0][1] + ring[1][1]) / 2];
    loft(lo, hi, col, [], sideFlip(lo, hi, 0, crAt3([0, 0, 0], A, B, U, n[0], n[1], 0)));
  };
  const duffel = (col, O, A, B, U, len = 0.55, wid = 0.34, ht = 0.23) => {
    const rb = wid / 2, rh = ht / 2 / Math.sin(Math.PI / 3), hex = [];
    for (let k = 0; k < 6; k++) { const t = (k * Math.PI) / 3; hex.push([rb * Math.cos(t), ht / 2 + rh * Math.sin(t)]); }
    const ends = [-len / 2, len / 2].map((a) => hex.map(([b, h]) => crAt3(O, A, B, U, a, b, h)));
    poly(ends[0], col, [-A[0], -A[1], -A[2]]); poly(ends[1], col, A);
    const [b0, h0] = hex[0], [b1, h1] = hex[1];
    const n = crAt3([0, 0, 0], A, B, U, 0, (b0 + b1) / 2, (h0 + h1) / 2 - ht / 2);
    loft(ends[0], ends[1], col, [4], sideFlip(ends[0], ends[1], 0, n));
  };

  const F0 = { x: 0, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 }, rnd = prng(17), Lp = CR_PERIOD * CR_PITCH;
  const n = load === 'empty' ? 0 : load === 'full' ? 6 : 3, bags = [];
  for (let k = 0; k < n; k++) {
    const isCase = k % 3 !== 1, across = load === 'full' && isCase && k % 2 === 0;
    const yaw = (across ? Math.PI / 2 : 0) + (rnd() - 0.5) * (isCase ? 0.3 : 0.6);
    const [ha, hb] = isCase ? [0.31, 0.21] : [0.17, 0.275];
    const ext = Math.abs(ha * Math.cos(yaw)) + Math.abs(hb * Math.sin(yaw));
    const cross = Math.abs(ha * Math.sin(yaw)) + Math.abs(hb * Math.cos(yaw));
    bags.push({ isCase, yaw, ext, w: CR_PW - 0.05 - cross - rnd() * 0.05 });
  }
  const gap = 0.08, margin = 0.06, used = bags.reduce((t, b) => t + 2 * b.ext, 0) + gap * (n - 1);
  const spare = Math.max(0, Lp - 2 * margin - used);
  let cur = margin + spare / (2 * Math.max(1, n));
  for (const b of bags) { b.q = (cur + b.ext + (rnd() - 0.5) * spare / (2 * Math.max(1, n))) / CR_PITCH; cur += 2 * b.ext + gap + spare / Math.max(1, n); }
  const kk = Math.hypot(1, CR_SLOPE);
  for (const { isCase, yaw, w, q } of bags) {
    const O = crP3(F0, w, CR_CREST + crTilt(w)), X = [F0.nx / kk, -CR_SLOPE / kk, F0.nz / kk], U = [F0.nx * CR_SLOPE / kk, 1 / kk, F0.nz * CR_SLOPE / kk];
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const A = [F0.tx * cy + X[0] * sy, X[1] * sy, F0.tz * cy + X[2] * sy], B = [-F0.tx * sy + X[0] * cy, X[1] * cy, -F0.tz * sy + X[2] * cy];
    O[0] += path.S(q) - 2;
    if (isCase) hardCase('hardCase', O, A, B, U); else duffel('duffel', O, B, A, U, 0.55, 0.34, 0.23);
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'terminal-grey' });
  return g.mesh(g.join(parts), {
    zones: { plates: at(pal, 'plates'), frame: at(pal, 'frame'), skirt: at(pal, 'skirt'), hardCase: at(pal, 'hardCase'), duffel: at(pal, 'duffel') },
  });
}
