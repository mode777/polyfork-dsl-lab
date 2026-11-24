// Baggage reclaim carousel — geometric port of the reference straight module
// with the default three-bag load. Plates, sloped rails, bumper skirt, end caps
// and the hard case/duffel pair are all baked in their world positions.
import { faceSink, v3 } from './_facekit.mjs';

const W = 0.6, R = 1.4, LEAD = 2.0, PW = 0.46, YB = 0.47, RISE = 0.06, PT = 0.02;
const OV = 0.06, SKEW = 0.4, SLOPE = 0.326;
const PITCH = 0.25, PERIOD = 16;
const CREST = YB + RISE + PT, DECK_F = 0.44 + SLOPE * 0.04, DECK_B = DECK_F + SLOPE * 1.0, RAIL_B = 0.88;
const PROF = [
  [-0.55, 0, 'skirt'], [-0.55, 0.05, 'skirt'], [-0.60, 0.05, 'skirt'], [-0.60, 0.40, 'skirt'],
  [-0.57, 0.43, 'frame'], [-0.57, RAIL_B - 0.02, 'frame'], [-0.55, RAIL_B, 'frame'], [-0.50, RAIL_B, 'frame'],
  [-0.50, DECK_B, 'frame'], [0.50, DECK_F, 'frame'], [0.50, 0.50, 'frame'], [0.55, 0.50, 'frame'],
  [0.57, 0.48, 'frame'], [0.57, 0.43, 'skirt'], [0.60, 0.40, 'skirt'], [0.60, 0.05, 'skirt'],
  [0.55, 0.05, 'skirt'], [0.55, 0, null],
];
const PALETTE = {
  'terminal-grey': { plates: '#dddbdc', frame: '#8fa5b1', skirt: '#696568', hardCase: '#3e6495', duffel: '#b94c34' },
  graphite: { plates: '#e5e3e3', frame: '#586f84', skirt: '#282f3f', hardCase: '#9b855d', duffel: '#47592d' },
  'warm-steel': { plates: '#eeeded', frame: '#7b787c', skirt: '#4c3a43', hardCase: '#497aa2', duffel: '#836047' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const prng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const mixHex = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, '0')).join('');
const tilt = (w) => SLOPE * (PW - w);
const P3 = (f, w, y) => [f.x + f.nx * w, y, f.z + f.nz * w];
const at3 = (O, A, B, U, a, b, h) => [
  O[0] + A[0] * a + B[0] * b + U[0] * h,
  O[1] + A[1] * a + B[1] * b + U[1] * h,
  O[2] + A[2] * a + B[2] * b + U[2] * h,
];

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'terminal-grey', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'terminal-grey' });
  const base = PALETTE['terminal-grey'];
  const C = {
    skirt: mixHex(base.skirt, '#948f8f', 0.35 * 0.2),
    plates: mixHex(base.plates, '#7b787c', 0.3 * 0.2),
    frame: mixHex(base.frame, '#575451', 0.4 * 0.2),
    hardCase: base.hardCase,
    duffel: base.duffel,
  };

  const F = faceSink();
  const path = { L: 4, at: (s) => ({ x: s - 2, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 }), samples: [0, 4], units: PERIOD, S: (q) => q * PITCH };
  const S = F;
  const edgeCol = (j) => C[PROF[j][2]];

  // Body.
  const sm = path.samples;
  for (let i = 0; i < sm.length - 1; i++) {
    const a = path.at(sm[i]), b = path.at(sm[i + 1]), m = path.at((sm[i] + sm[i + 1]) / 2);
    for (let j = 0; j < PROF.length - 1; j++) {
      const [w0, y0] = PROF[j], [w1, y1] = PROF[j + 1];
      const ow = -(y1 - y0), oy = w1 - w0;
      const hint = [m.nx * ow, oy, m.nz * ow];
      S.poly([P3(a, w0, y0), P3(b, w0, y0), P3(b, w1, y1), P3(a, w1, y1)], edgeCol(j), hint);
    }
    const t0 = 0.55;
    S.poly([P3(a, -t0, 0), P3(b, -t0, 0), P3(b, t0, 0), P3(a, t0, 0)], C.skirt, [0, -1, 0]);
  }
  const lower = [[-0.55, 0], [0.55, 0], [0.55, 0.05], [0.60, 0.05], [0.60, 0.40], [0.57, 0.43],
    [-0.57, 0.43], [-0.60, 0.40], [-0.60, 0.05], [-0.55, 0.05]];
  const upper = [[-0.57, 0.43], [0.57, 0.43], [0.57, 0.48], [0.55, 0.50], [0.50, 0.50], [0.50, DECK_F],
    [-0.50, DECK_B], [-0.50, RAIL_B], [-0.55, RAIL_B], [-0.57, RAIL_B - 0.02]];
  for (const s of [0, path.L]) {
    const f = path.at(s), sg = s === 0 ? -1 : 1;
    const hint = [f.tx * sg, 0, f.tz * sg];
    S.poly(lower.map(([w, y]) => P3(f, w, y)), C.skirt, hint);
    S.poly(upper.map(([w, y]) => P3(f, w, y)), C.frame, hint);
  }

  // Slat plates.
  const clipS = (poly, lo, hi) => {
    const cut = (pts, keep, edge) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], ka = keep(a), kb = keep(b);
        if (ka) out.push(a);
        if (ka !== kb) {
          const t = (edge - a.s) / (b.s - a.s);
          out.push({ s: edge, w: a.w + (b.w - a.w) * t, cut: true });
        }
      }
      return out;
    };
    let p = cut(poly, (v) => v.s >= lo - 1e-9, lo);
    if (p.length) p = cut(p, (v) => v.s <= hi + 1e-9, hi);
    return p;
  };
  const Sq = (q) => (q < 0 ? q * PITCH : q > path.units ? path.L + (q - path.units) * PITCH : path.S(q));
  for (let i = -1; i <= path.units; i++) {
    const u0 = Sq(i) - OV, u1 = Sq(i + 1);
    const hAt = (_, v) => YB + tilt(v.w) + RISE * ((v.s - SKEW * v.w) - u0) / (u1 - u0);
    const quad = [
      { s: u0 - SKEW * PW, w: -PW, e: 'lead' }, { s: u1 - SKEW * PW, w: -PW, e: 'end' },
      { s: u1 + SKEW * PW, w: PW, e: 'trail' }, { s: u0 + SKEW * PW, w: PW, e: 'end' },
    ];
    const poly = clipS(quad, 0, path.L);
    if (poly.length < 3) continue;
    const top = poly.map((v) => P3(path.at(v.s), v.w, hAt(i, v) + PT));
    const bot = poly.map((v) => P3(path.at(v.s), v.w, hAt(i, v)));
    S.poly(top, C.plates, [0, 1, 0]);
    let cs = 0, cw = 0;
    for (const v of poly) { cs += v.s; cw += v.w; }
    cs /= poly.length; cw /= poly.length;
    const cf = P3(path.at(cs), cw, 0);
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const onLo = Math.abs(a.s) < 1e-6 && Math.abs(b.s) < 1e-6;
      const onHi = Math.abs(a.s - path.L) < 1e-6 && Math.abs(b.s - path.L) < 1e-6;
      const ua = a.s - SKEW * a.w, ub = b.s - SKEW * b.w;
      const isLead = Math.abs(ua - u0) < 1e-6 && Math.abs(ub - u0) < 1e-6;
      if (isLead && !onLo && !onHi) continue;
      const mid = [(top[k][0] + top[(k + 1) % poly.length][0]) / 2, 0, (top[k][2] + top[(k + 1) % poly.length][2]) / 2];
      const hint = [mid[0] - cf[0], 0, mid[2] - cf[2]];
      S.poly([bot[k], bot[(k + 1) % poly.length], top[(k + 1) % poly.length], top[k]], C.plates, hint);
    }
  }

  // Bags.
  const hardCase = (col, O, A, B, U, len = 0.62, wid = 0.42, ht = 0.24) => {
    const a = len / 2, b = wid / 2, c = 0.06;
    const ring = [[a, -b + c], [a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c], [-a + c, -b], [a - c, -b]];
    const lo = ring.map(([x, y]) => at3(O, A, B, U, x, y, 0));
    const hi = ring.map(([x, y]) => at3(O, A, B, U, x, y, ht));
    S.poly(hi, col, U);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8, [x0, y0] = ring[i], [x1, y1] = ring[j];
      const n = [(x0 + x1) / 2, (y0 + y1) / 2];
      S.poly([lo[i], lo[j], hi[j], hi[i]], col, at3([0, 0, 0], A, B, U, n[0], n[1], 0));
    }
  };
  const duffel = (col, O, A, B, U, len = 0.55, wid = 0.34, ht = 0.23) => {
    const rb = wid / 2, rh = ht / 2 / Math.sin(Math.PI / 3);
    const hex = [];
    for (let k = 0; k < 6; k++) {
      const t = (k * Math.PI) / 3;
      hex.push([rb * Math.cos(t), ht / 2 + rh * Math.sin(t)]);
    }
    const ends = [-len / 2, len / 2].map((a) => hex.map(([b, h]) => at3(O, A, B, U, a, b, h)));
    S.poly(ends[0], col, [-A[0], -A[1], -A[2]]);
    S.poly(ends[1], col, A);
    for (let k = 0; k < 6; k++) {
      const j = (k + 1) % 6;
      if (k === 4) continue;
      const [b0, h0] = hex[k], [b1, h1] = hex[j];
      const n = at3([0, 0, 0], A, B, U, 0, (b0 + b1) / 2, (h0 + h1) / 2 - ht / 2);
      S.poly([ends[0][k], ends[1][k], ends[1][j], ends[0][j]], col, n);
    }
  };
  const F0 = { x: 0, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 };
  const rnd = prng(17), Lp = PERIOD * PITCH;
  const n = 3, bags = [];
  for (let k = 0; k < n; k++) {
    const isCase = k % 3 !== 1;
    const across = false;
    const yaw = (across ? Math.PI / 2 : 0) + (rnd() - 0.5) * (isCase ? 0.3 : 0.6);
    const [ha, hb] = isCase ? [0.31, 0.21] : [0.17, 0.275];
    const ext = Math.abs(ha * Math.cos(yaw)) + Math.abs(hb * Math.sin(yaw));
    const cross = Math.abs(ha * Math.sin(yaw)) + Math.abs(hb * Math.cos(yaw));
    bags.push({ isCase, yaw, ext, w: PW - 0.05 - cross - rnd() * 0.05 });
  }
  const gap = 0.08, margin = 0.06;
  const used = bags.reduce((t, b) => t + 2 * b.ext, 0) + gap * (n - 1);
  const spare = Math.max(0, Lp - 2 * margin - used);
  let cur = margin + spare / (2 * n);
  for (const b of bags) {
    b.q = (cur + b.ext + (rnd() - 0.5) * spare / (2 * n)) / PITCH;
    cur += 2 * b.ext + gap + spare / n;
  }
  const kk = Math.hypot(1, SLOPE);
  const allBags = bags.map((b) => ({ ...b }));
  for (const { isCase, yaw, w, q } of allBags) {
    const O = P3(F0, w, CREST + tilt(w));
    const X = [F0.nx / kk, -SLOPE / kk, F0.nz / kk];
    const U = [F0.nx * SLOPE / kk, 1 / kk, F0.nz * SLOPE / kk];
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const A = [F0.tx * cy + X[0] * sy, X[1] * sy, F0.tz * cy + X[2] * sy];
    const B = [-F0.tx * sy + X[0] * cy, X[1] * cy, -F0.tz * sy + X[2] * cy];
    const before = F.faces.length;
    if (isCase) hardCase(C.hardCase, O, A, B, U);
    else duffel(C.duffel, O, B, A, U, 0.55, 0.34, 0.23);
    const dx = path.S(q) - 2;
    for (let i = before; i < F.faces.length; i++) {
      for (const p of F.faces[i].pts) p[0] += dx;
    }
  }

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { plates: at(pal, 'plates'), frame: at(pal, 'frame'), skirt: at(pal, 'skirt'), hardCase: at(pal, 'hardCase'), duffel: at(pal, 'duffel') },
  });
}
