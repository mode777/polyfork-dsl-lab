// Wooden rowboat — a clinker hull lofted from station sections, with the
// reference's planks, ribs, cleats, oarlocks and stowed oars built from the
// generic poly/loft/block nodes. The hull keeps its per-edge colour zones via
// loft.zoneField.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp, lerp, poly, loft, block, poly as P } from './_kit.mjs';

const PALETTE = {
  'weathered-oak': { hull: '#8c6a47', sheer: '#c2a479', inner: '#5d4430', floor: '#75563b', thwart: '#a5855e', oar: '#e0d2b4', iron: '#57544e' },
  'dark-pitch': { hull: '#4a3527', sheer: '#a5855e', inner: '#3a2a1e', floor: '#5d4430', thwart: '#8c6a47', oar: '#c2a479', iron: '#57544e' },
  'sun-bleached': { hull: '#c2a479', sheer: '#e0d2b4', inner: '#8c6a47', floor: '#a5855e', thwart: '#c8d98a', oar: '#f8f3ec', iron: '#87847c' },
  'moss-green': { hull: '#4c8140', sheer: '#93c46a', inner: '#4a3527', floor: '#5d4430', thwart: '#a5855e', oar: '#e0d2b4', iron: '#57544e' },
};

const MASTER = [[0.000, 0.000], [0.300, 0.015], [0.720, 0.330], [0.945, 0.680], [0.965, 0.800]];
const STRAKE = [[1.000, 0.850], [1.000, 0.950], [0.958, 1.000]];
const STEM = 0.068, RAIL = 0.058, BOARDS = 0.075, GUN = 0.530, BOW_RISE = 0.240, AFT_RISE = 0.170, ROCKER = 0.360, PITCH = 0.28;

function hullCurve(segments) {
  if (segments === MASTER.length - 1) return MASTER.map((p) => p.slice());
  const W = 1.0, H = 0.75, acc = [0];
  for (let i = 1; i < MASTER.length; i++) {
    const dx = (MASTER[i][0] - MASTER[i - 1][0]) * W, dy = (MASTER[i][1] - MASTER[i - 1][1]) * H;
    acc.push(acc[i - 1] + Math.hypot(dx, dy));
  }
  const total = acc[acc.length - 1], out = [];
  for (let k = 0; k <= segments; k++) {
    const s = (k / segments) * total;
    let i = 1;
    while (i < acc.length - 1 && acc[i] < s) i++;
    const t = (s - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    out.push([lerp(MASTER[i - 1][0], MASTER[i][0], t), lerp(MASTER[i - 1][1], MASTER[i][1], t)]);
  }
  return out;
}

function makeHull(P) {
  const L = P.length, HB = P.beam / 2;
  const nSt = Math.max(6, Math.round(L / PITCH) + 1);
  const curve = hullCurve(P.strakes), half = curve.concat(STRAKE);
  const U0 = -0.08;
  const shape = (u) => Math.max(-1, Math.min(1, u <= U0 ? (u - U0) / (1 + U0) : (u - U0) / (1 - U0)));
  const halfBeam = (u) => { const a = shape(u); return STEM + (HB - STEM) * Math.pow(Math.max(0, 1 - a * a), 0.42); };
  const sheerY = (u) => { const a = shape(u); return GUN + (a > 0 ? BOW_RISE : AFT_RISE) * Math.pow(Math.abs(a), 1.9); };
  const keelY = (u) => { const a = Math.abs(shape(u)); return ROCKER * Math.pow(Math.max(0, a - 0.48) / 0.52, 1.75); };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const station = (u) => {
    const hb = halfBeam(u), yg = sheerY(u), yk = keelY(u), d = yg - yk;
    const cl = smooth(0.78, 1.0, Math.abs(shape(u)));
    const hbIn = Math.max(0.958 * hb - RAIL, 0.010) * (1 - cl) + 0.004 * cl;
    const yF = (yk + BOARDS) * (1 - cl) + (yg - 0.03) * cl;
    const inner = [[hbIn, yg], [0.82 * hbIn, yF + 0.46 * (yg - yF)], [0.40 * hbIn, yF]];
    const outer = half.map(([fx, fy]) => [fx * hb, yk + fy * d]);
    const outCol = [];
    for (let i = 0; i < outer.length - 1; i++) outCol.push((half[i][1] + half[i + 1][1]) / 2 >= 0.60 ? 'sheer' : 'hull');
    const pts = [], cols = [];
    for (let i = outer.length - 1; i >= 1; i--) { pts.push([-outer[i][0], outer[i][1]]); cols.push(outCol[i - 1]); }
    pts.push([0, outer[0][1]]); cols.push(outCol[0]);
    for (let i = 1; i < outer.length; i++) { pts.push([outer[i][0], outer[i][1]]); cols.push(i < outer.length - 1 ? outCol[i] : 'sheer'); }
    pts.push([inner[0][0], inner[0][1]]); cols.push('inner');
    pts.push([inner[1][0], inner[1][1]]); cols.push('inner');
    pts.push([inner[2][0], inner[2][1]]); cols.push('floor');
    pts.push([-inner[2][0], inner[2][1]]); cols.push('inner');
    pts.push([-inner[1][0], inner[1][1]]); cols.push('inner');
    pts.push([-inner[0][0], inner[0][1]]); cols.push('sheer');
    return { pts, cols, hb, hbIn, yg, yk, yF, inner, outer };
  };
  const sts = [];
  for (let i = 0; i < nSt; i++) {
    const t = i / (nSt - 1);
    sts.push(Object.assign({ z: -L / 2 + t * L }, station(2 * t - 1)));
  }
  return { sts, nSt };
}

function plank(g, z0, z1, hx0, hx1, y0, y1, zone, floor = false, ends = false) {
  const A = [-hx0, y0, z0], B = [hx0, y0, z0], C = [hx0, y1, z0], D = [-hx0, y1, z0];
  const E = [-hx1, y0, z1], F = [hx1, y0, z1], G = [hx1, y1, z1], H = [-hx1, y1, z1];
  const out = [];
  const q = (a, b, c, d) => out.push(poly(g, [a, b, c, d], undefined, zone));
  q(A, D, C, B); q(E, F, G, H);
  if (floor) q(A, B, F, E);
  q(D, H, G, C);
  if (ends) { q(B, C, G, F); q(A, E, H, D); }
  return out;
}

function sweptQuad(g, rings, zone, skip = [], caps = true) {
  const out = [];
  const ring = (r) => [[-r[1], r[2], r[0]], [r[1], r[2], r[0]], [r[1], r[3], r[0]], [-r[1], r[3], r[0]]];
  for (let i = 0; i < rings.length - 1; i++) {
    const a = ring(rings[i]), b = ring(rings[i + 1]);
    for (let j = 0; j < 4; j++) {
      if (skip.includes(j)) continue;
      const k = (j + 1) % 4;
      out.push(poly(g, [a[j], a[k], b[k], b[j]], undefined, zone));
    }
  }
  if (caps) {
    const a = ring(rings[0]), b = ring(rings[rings.length - 1]);
    out.push(poly(g, [a[0], a[3], a[2], a[1]], undefined, zone));
    out.push(poly(g, [b[0], b[1], b[2], b[3]], undefined, zone));
  }
  return out;
}

function sweptPoly(g, rings, sides, zone, capLow = true, capHigh = true) {
  const out = [];
  const ring = (r) => {
    const o = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * TAU + Math.PI / sides;
      o.push([Math.cos(a) * r[1], Math.sin(a) * r[1], r[0]]);
    }
    return o;
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const a = ring(rings[i]), b = ring(rings[i + 1]);
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % sides;
      out.push(poly(g, [a[j], a[k], b[k], b[j]], undefined, zone));
    }
  }
  if (capLow) {
    const a = ring(rings[0]);
    for (let i = 1; i < sides - 1; i++) out.push(poly(g, [a[0], a[i + 1], a[i]], undefined, zone));
  }
  if (capHigh) {
    const b = ring(rings[rings.length - 1]);
    for (let i = 1; i < sides - 1; i++) out.push(poly(g, [b[0], b[i], b[i + 1]], undefined, zone));
  }
  return out;
}

function sweptRect(g, rings, zone, capLow = true, capHigh = true) {
  const out = [];
  const ring = (r) => [[-r[1], -r[2], r[0]], [r[1], -r[2], r[0]], [r[1], r[2], r[0]], [-r[1], r[2], r[0]]];
  for (let i = 0; i < rings.length - 1; i++) {
    const a = ring(rings[i]), b = ring(rings[i + 1]);
    for (let j = 0; j < 4; j++) { const k = (j + 1) % 4; out.push(poly(g, [a[j], a[k], b[k], b[j]], undefined, zone)); }
  }
  if (capLow) { const a = ring(rings[0]); out.push(poly(g, [a[0], a[3], a[2], a[1]], undefined, zone)); }
  if (capHigh) { const b = ring(rings[rings.length - 1]); out.push(poly(g, [b[0], b[1], b[2], b[3]], undefined, zone)); }
  return out;
}

function ribBand(g, path, outW, intoIn, z0, z1, zone) {
  const into = (i) => (Array.isArray(intoIn) ? intoIn[i] : intoIn), n = path.length, nrm = [];
  for (let i = 0; i < n; i++) {
    let nx = 0, ny = 0;
    if (i > 0) { const dx = path[i][0] - path[i - 1][0], dy = path[i][1] - path[i - 1][1], m = Math.hypot(dx, dy) || 1; nx += dy / m; ny += -dx / m; }
    if (i < n - 1) { const dx = path[i + 1][0] - path[i][0], dy = path[i + 1][1] - path[i][1], m = Math.hypot(dx, dy) || 1; nx += dy / m; ny += -dx / m; }
    const m = Math.hypot(nx, ny) || 1; nrm.push([nx / m, ny / m]);
  }
  const A = path.map((p, i) => [p[0] + nrm[i][0] * outW, p[1] + nrm[i][1] * outW]);
  const B = path.map((p, i) => [p[0] - nrm[i][0] * into(i), p[1] - nrm[i][1] * into(i)]);
  const at3 = (p, z) => [p[0], p[1], z], out = [];
  for (let i = 0; i < n - 1; i++) {
    out.push(poly(g, [at3(A[i], z0), at3(B[i], z0), at3(B[i + 1], z0), at3(A[i + 1], z0)], undefined, zone));
    out.push(poly(g, [at3(A[i], z1), at3(A[i + 1], z1), at3(B[i + 1], z1), at3(B[i], z1)], undefined, zone));
    out.push(poly(g, [at3(B[i], z0), at3(B[i], z1), at3(B[i + 1], z1), at3(B[i + 1], z0)], undefined, zone));
  }
  out.push(poly(g, [at3(A[0], z0), at3(A[0], z1), at3(B[0], z1), at3(B[0], z0)], undefined, zone));
  out.push(poly(g, [at3(A[n - 1], z0), at3(B[n - 1], z0), at3(B[n - 1], z1), at3(A[n - 1], z1)], undefined, zone));
  return out;
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'weathered-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const hull = g.input('hull', 'color', '', { label: 'Hull' });
  const sheer = g.input('sheer', 'color', '', { label: 'Sheer band' });
  const inner = g.input('inner', 'color', '', { label: 'Interior' });
  const floor = g.input('floor', 'color', '', { label: 'Bottom boards' });
  const thwart = g.input('thwart', 'color', '', { label: 'Benches' });
  const oar = g.input('oar', 'color', '', { label: 'Oars' });
  const iron = g.input('iron', 'color', '', { label: 'Ironwork' });

  const P = { length: 3.4, beam: 1.2, strakes: 6, thwarts: 2, ribs: 6, ...params };
  const L = P.length, HB = P.beam / 2;
  const { sts, nSt } = makeHull(P);
  const parts = [];

  const rings = sts.map((s) => s.pts.map((p) => [p[0], p[1], s.z]));
  parts.push(g.loft({ rings, zoneField: 'vals.cols[k][i]', values: { cols: sts.map((s) => s.cols) } }));

  const stemFace = (S, bow) => {
    const nOut = S.outer.length, A = [];
    for (let i = nOut - 1; i >= 1; i--) A.push([-S.outer[i][0], S.outer[i][1]]);
    A.push([0, S.outer[0][1]]);
    for (let i = 1; i < nOut; i++) A.push([S.outer[i][0], S.outer[i][1]]);
    const B = [[-S.inner[0][0], S.inner[0][1]], [-S.inner[1][0], S.inner[1][1]], [-S.inner[2][0], S.inner[2][1]], [S.inner[2][0], S.inner[2][1]], [S.inner[1][0], S.inner[1][1]], [S.inner[0][0], S.inner[0][1]]];
    const P3 = (p) => [p[0], p[1], S.z];
    let i = 0, j = 0;
    while (i < A.length - 1 || j < B.length - 1) {
      const ti = i / (A.length - 1), tj = j / (B.length - 1);
      const stepA = j >= B.length - 1 || (i < A.length - 1 && ti <= tj);
      const t3 = stepA ? [P3(A[i]), P3(A[i + 1]), P3(B[j])] : [P3(A[i]), P3(B[j + 1]), P3(B[j])];
      const frac = ((t3[0][1] + t3[1][1] + t3[2][1]) / 3 - S.yk) / Math.max(1e-6, S.yg - S.yk);
      parts.push(poly(g, bow ? t3 : [t3[0], t3[2], t3[1]], undefined, frac >= 0.60 ? 'sheer' : 'hull'));
      if (stepA) i++; else j++;
    }
  };
  stemFace(sts[nSt - 1], true); stemFace(sts[0], false);

  const lerpSt = (z, f) => {
    const zc = clamp(z, sts[0].z, sts[sts.length - 1].z);
    let i = 0;
    while (i < sts.length - 2 && sts[i + 1].z < zc) i++;
    const t = (zc - sts[i].z) / (sts[i + 1].z - sts[i].z);
    return f(sts[i]) + t * (f(sts[i + 1]) - f(sts[i]));
  };
  const sheerAt = (z) => lerpSt(z, (s) => s.yg), boardsAt = (z) => lerpSt(z, (s) => s.yF);
  const innerXAt = (z, y) => {
    const hbIn = lerpSt(z, (s) => s.hbIn), yg = sheerAt(z), yF = boardsAt(z), yMid = yF + 0.46 * (yg - yF);
    if (y <= yF) return 0.40 * hbIn;
    if (y <= yMid) return hbIn * (0.40 + 0.42 * (y - yF) / (yMid - yF));
    return hbIn * (0.82 + 0.18 * clamp((y - yMid) / (yg - yMid), 0, 1));
  };
  const keelAt = (z) => lerpSt(z, (s) => s.yk), EMBED = 0.030;
  const seatTop = (z0, z1, drop, th) => Math.max(Math.min(sheerAt(z0), sheerAt(z1)) - drop, Math.max(boardsAt(z0), boardsAt(z1)) + 0.05 + th);

  const seatZ0 = -L / 2 + 0.36, seatZ1 = -L / 2 + 0.84, seatY = seatTop(seatZ0, seatZ1, 0.11, 0.045);
  parts.push(...plank(g, seatZ0, seatZ1, innerXAt(seatZ0, seatY) + EMBED, innerXAt(seatZ1, seatY) + EMBED, seatY - 0.045, seatY, 'thwart'));
  const bhZ1 = L / 2 - 0.22, bhZ0 = L / 2 - 0.56, bhY = seatTop(bhZ0, bhZ1, 0.09, 0.042);
  parts.push(...plank(g, bhZ0, bhZ1, innerXAt(bhZ0, bhY) + EMBED, innerXAt(bhZ1, bhY) + EMBED, bhY - 0.042, bhY, 'thwart'));

  {
    const zEnd = 0.40 * L, rr = [], n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), z = -zEnd + (2 * zEnd) * t, e = 1 - Math.pow(Math.abs(2 * t - 1), 2.2), yk = keelAt(z);
      rr.push([z, 0.018 + 0.037 * e, yk - (0.006 + 0.042 * e), yk + 0.020]);
    }
    parts.push(...sweptQuad(g, rr, 'floor', [2]));
  }
  {
    const bz0 = seatZ1 + 0.06, bz1 = bhZ0 - 0.10, fw = Math.min(innerXAt(bz0, boardsAt(bz0)), innerXAt(bz1, boardsAt(bz1))), hw = 0.20 * fw;
    for (const cx of [-0.72 * fw, -0.26 * fw, 0.26 * fw, 0.72 * fw]) {
      const rr = [], n = 5;
      for (let i = 0; i < n; i++) { const z = bz0 + (bz1 - bz0) * i / (n - 1), yF = boardsAt(z); rr.push([z, hw, yF - 0.015, yF + 0.045]); }
      for (const p of sweptQuad(g, rr, 'thwart', [0], false)) parts.push(g.transform({ geom: p, tx: cx }));
    }
  }

  const ribZs = [], ribZ0 = seatZ1 + 0.12, ribZ1 = bhZ0 - 0.14;
  for (let i = 0; i < P.ribs; i++) ribZs.push(ribZ0 + (ribZ1 - ribZ0) * (P.ribs === 1 ? 0.5 : i / (P.ribs - 1)));
  for (const zc of ribZs) {
    const yg = sheerAt(zc), yF = boardsAt(zc), hbIn = lerpSt(zc, (s) => s.hbIn), yMid = yF + 0.46 * (yg - yF);
    const path = [[-hbIn, yg - 0.055], [-0.82 * hbIn, yMid], [-0.40 * hbIn, yF], [0, yF], [0.40 * hbIn, yF], [0.82 * hbIn, yMid], [hbIn, yg - 0.055]];
    parts.push(...ribBand(g, path, 0.022, [0.045, 0.045, 0.032, 0.026, 0.032, 0.045, 0.045], zc - 0.028, zc + 0.028, 'thwart'));
  }

  const zA = -0.13 * L, zB = 0.22 * L, thwarts = [];
  for (let i = 0; i < P.thwarts; i++) {
    const f = P.thwarts === 1 ? 0.45 : i / (P.thwarts - 1), zc = zA + (zB - zA) * f, z0 = zc - 0.10, z1 = zc + 0.10;
    const yTop = seatTop(z0, z1, 0.10, 0.045), hx0 = innerXAt(z0, yTop) + EMBED, hx1 = innerXAt(z1, yTop) + EMBED;
    parts.push(...plank(g, z0, z1, hx0, hx1, yTop - 0.045, yTop, 'thwart'));
    for (const side of [1, -1]) {
      const cx = side * (Math.min(hx0, hx1) - 0.055), xi = cx - side * 0.05, xo = cx + side * 0.05;
      const A = [xi, yTop - 0.100, zc - 0.085], B = [xi, yTop - 0.045, zc - 0.085], C = [xi, yTop - 0.045, zc + 0.085], D = [xi, yTop - 0.100, zc + 0.085];
      const E = [xo, yTop - 0.100, zc - 0.085], F = [xo, yTop - 0.045, zc - 0.085], G = [xo, yTop - 0.045, zc + 0.085], H = [xo, yTop - 0.100, zc + 0.085];
      if (side > 0) { parts.push(poly(g, [A, D, C, B], undefined, 'thwart')); parts.push(poly(g, [A, B, F, E], undefined, 'thwart')); parts.push(poly(g, [D, H, G, C], undefined, 'thwart')); }
      else { parts.push(poly(g, [A, B, C, D], undefined, 'thwart')); parts.push(poly(g, [A, E, F, B], undefined, 'thwart')); parts.push(poly(g, [D, C, G, H], undefined, 'thwart')); }
    }
    thwarts.push({ z: zc, top: yTop });
  }

  const lockZ = clamp(thwarts[thwarts.length - 1].z - 0.30, zA - 0.35, zB);
  const railX = (z) => (0.958 * lerpSt(z, (s) => s.hb) + lerpSt(z, (s) => s.hbIn)) / 2;
  for (const side of [1, -1]) {
    const x = side * railX(lockZ), y = sheerAt(lockZ);
    parts.push(block(g, x - 0.0525, x + 0.0525, y - 0.007, y + 0.043, lockZ - 0.0575, lockZ + 0.0575, 'iron'));
    for (const dz of [-0.040, 0.040]) {
      const y0 = y + 0.036, y1 = y + 0.146, h0 = 0.0185, h1 = 0.0135;
      const a = [[x - h0, y0, lockZ + dz - h0], [x + h0, y0, lockZ + dz - h0], [x + h0, y0, lockZ + dz + h0], [x - h0, y0, lockZ + dz + h0]];
      const b = [[x - h1, y1, lockZ + dz - h1], [x + h1, y1, lockZ + dz - h1], [x + h1, y1, lockZ + dz + h1], [x - h1, y1, lockZ + dz + h1]];
      for (let j = 0; j < 4; j++) { const k = (j + 1) % 4; parts.push(poly(g, [a[j], b[j], b[k], a[k]], undefined, 'iron')); }
      parts.push(poly(g, [b[3], b[2], b[1], b[0]], undefined, 'iron'));
    }
  }

  const oarZ0 = seatZ1 + 0.05, oarZ1 = Math.min(bhZ0 - 0.05, oarZ0 + 2.6), OAR_R = 0.030;
  const tA = thwarts[0], tB = thwarts[thwarts.length - 1];
  const slope = thwarts.length > 1 ? (tB.top - tA.top) / (tB.z - tA.z) : 0.022;
  const oarY = (z) => tA.top + OAR_R + slope * (z - tA.z), OAR_X0 = 0.231 * HB, OAR_X1 = 0.440 * HB;
  const oarLen = Math.hypot(oarZ1 - oarZ0, oarY(oarZ1) - oarY(oarZ0), OAR_X1 - OAR_X0);
  const rotYX = (p, yaw, pitch, from) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
    const y1 = p[1] * cx - p[2] * sx, z1 = p[1] * sx + p[2] * cx;
    return [from[0] + p[0] * cy + z1 * sy, from[1] + y1, from[2] - p[0] * sy + z1 * cy];
  };
  for (const side of [1, -1]) {
    const x0 = side * OAR_X0, x1 = side * OAR_X1;
    const from = [x0, oarY(oarZ0), oarZ0], to = [x1, oarY(oarZ1), oarZ1];
    const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2], ll = Math.hypot(dx, dy, dz) || 1;
    const dir = [dx / ll, dy / ll, dz / ll], yaw = Math.atan2(dir[0], dir[2]), pitch = -Math.asin(clamp(dir[1], -1, 1));
    const Lo = oarLen, bladeRoot = Lo - clamp(0.26 * Lo, 0.32, 0.52);
    const addLocal = (pts) => parts.push(poly(g, pts.map((p) => rotYX(p, yaw, pitch, from)), undefined, 'oar'));
    const sweptLocal = (rings, sides, capLow, capHigh) => {
      const ring = (r) => Array.from({ length: sides }, (_, i) => {
        const a = (i / sides) * TAU + Math.PI / sides;
        return [Math.cos(a) * r[1], Math.sin(a) * r[1], r[0]];
      });
      for (let i = 0; i < rings.length - 1; i++) {
        const a = ring(rings[i]), b = ring(rings[i + 1]);
        for (let j = 0; j < sides; j++) { const k = (j + 1) % sides; addLocal([a[j], a[k], b[k], b[j]]); }
      }
      if (capLow) { const a = ring(rings[0]); for (let i = 1; i < sides - 1; i++) addLocal([a[0], a[i + 1], a[i]]); }
      if (capHigh) { const b = ring(rings[rings.length - 1]); for (let i = 1; i < sides - 1; i++) addLocal([b[0], b[i], b[i + 1]]); }
    };
    sweptLocal([[0, 0.030], [0.10, 0.028], [bladeRoot * 0.62, 0.024], [bladeRoot + 0.06, 0.020]], 6, true, false);
    const rectRing = (r) => [[-r[1], -r[2], r[0]], [r[1], -r[2], r[0]], [r[1], r[2], r[0]], [-r[1], r[2], r[0]]];
    const rr = [[bladeRoot, 0.028, 0.023], [Lo - 0.12, 0.100, 0.013], [Lo, 0.080, 0.011]];
    for (let i = 0; i < rr.length - 1; i++) {
      const a = rectRing(rr[i]), b = rectRing(rr[i + 1]);
      for (let j = 0; j < 4; j++) { const k = (j + 1) % 4; addLocal([a[j], a[k], b[k], b[j]]); }
    }
    addLocal([rectRing(rr[rr.length - 1])[0], rectRing(rr[rr.length - 1])[1], rectRing(rr[rr.length - 1])[2], rectRing(rr[rr.length - 1])[3]]);
  }

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'weathered-oak',
    overrides: { hull, sheer, inner, floor, thwart, oar, iron },
  });
  return g.mesh(g.center({ geom: g.join(parts), x: true, y: true, z: true }), {
    zones: { hull: at(pal, 'hull'), sheer: at(pal, 'sheer'), inner: at(pal, 'inner'), floor: at(pal, 'floor'), thwart: at(pal, 'thwart'), oar: at(pal, 'oar'), iron: at(pal, 'iron') },
  });
}
