import * as THREE from 'three';

// Pure geometry builders for the reference ports. These are the authoring
// helpers the reference modules keep locally; registering them as graph nodes
// (parts.mjs) keeps the serialized .pfn expressive instead of one face dump.

export function faceSink() {
  const faces = [];
  const add = (pts, zone = 'a', hint, inside) => {
    const face = { pts: pts.map((p) => [p[0], p[1], p[2]]), zone };
    if (hint) face.hint = hint;
    if (inside) face.inside = inside;
    faces.push(face);
    return face;
  };
  const tri = (a, b, c, zone = 'a', hint, inside) => add([a, b, c], zone, hint, inside);
  const quad = (a, b, c, d, zone = 'a', hint, inside) => {
    if (hint) {
      tri(a, b, c, zone, hint, inside);
      tri(a, c, d, zone, hint, inside);
      return;
    }
    add([a, b, c, d], zone, undefined, inside);
  };
  const poly = (pts, zone = 'a', hint, inside) => add(pts, zone, hint, inside);
  return { faces, add, tri, quad, poly };
}

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

// ---------------------------------------------------------------- plaza tile
const PL_HALF = 2.000, PL_DECK_Y = 0.050, PL_FIELD_Y = 0.085, PL_TROUGH_Y = 0.0355;
const PL_CHAN_Y = 0.0245, PL_BEVEL = 0.018, PL_SEAM_HW = 0.090, PL_SEAM_CH = 0.022;
const PL_CHAN_HW = 0.036, PL_CHAN_CH = 0.012, PL_BAR_HW = 0.034;
const PL_BAR_Y0 = 0.0265, PL_BAR_Y1 = 0.0335, PL_FX = 1.640, PL_FXC = 1.618;
const PL_SOC_HW = 0.220, PL_SOC_X = 1.300;

export function buildPlaza(P = {}) {
  const stations = P.seams === 'single' ? [0] : P.seams === 'quad' ? [-1.5, -0.5, 0.5, 1.5] : [-1, 1];
  const lit = stations.map((_, i) => P.strips === 'all' || (P.strips === 'one' && i === stations.length - 1));
  const socketOn = P.socket !== false;
  const F = faceSink();
  const face = (pts, zone, hint) => F.poly(pts, zone, hint);
  const slab = (x0, x1, z0, z1, y, zone = 'deck') =>
    face([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], zone, [0, 1, 0]);
  const ringOut = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  const ringAt = (a0, y0, a1, y1, cx, cz, ref) => {
    const A = [[-a0, -a0], [a0, -a0], [a0, a0], [-a0, a0]];
    const B = [[-a1, -a1], [a1, -a1], [a1, a1], [-a1, a1]];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      face([
        [cx + A[i][0], y0, cz + A[i][1]], [cx + A[j][0], y0, cz + A[j][1]],
        [cx + B[j][0], y1, cz + B[j][1]], [cx + B[i][0], y1, cz + B[i][1]],
      ], 'ring', ref || ringOut[i]);
    }
  };
  const cuts = [-PL_HALF];
  for (const s of stations) cuts.push(s - PL_SEAM_HW, s + PL_SEAM_HW);
  cuts.push(PL_HALF);
  const regions = [];
  for (let i = 0; i < cuts.length; i += 2) regions.push({ z0: cuts[i], z1: cuts[i + 1], raised: i > 0 && i < cuts.length - 2 });
  const hAt = (r, x) => {
    if (!r.raised) return PL_DECK_Y;
    const a = Math.abs(x);
    if (a <= PL_FXC) return PL_FIELD_Y;
    if (a >= PL_FX) return PL_DECK_Y;
    return PL_FIELD_Y + (PL_DECK_Y - PL_FIELD_Y) * ((a - PL_FXC) / (PL_FX - PL_FXC));
  };
  let soc = null;
  if (socketOn) {
    const want = 1.40;
    let best = null;
    for (const r of regions) {
      if (r.z1 - r.z0 < 2 * PL_SOC_HW + 0.16) continue;
      const d = Math.max(r.z0 - want, 0, want - r.z1);
      if (!best || d < best.d) best = { r, d };
    }
    if (best) {
      const r = best.r;
      const z = Math.min(Math.max(r.z0 + 0.30, r.z0 + PL_SOC_HW + 0.06), r.z1 - PL_SOC_HW - 0.06);
      soc = { r, z, y: hAt(r, PL_SOC_X) };
    }
  }
  for (const r of regions) {
    const spans = r.raised ? [[-PL_HALF, -PL_FX, PL_DECK_Y], [-PL_FXC, PL_FXC, PL_FIELD_Y], [PL_FX, PL_HALF, PL_DECK_Y]] : [[-PL_HALF, PL_HALF, PL_DECK_Y]];
    for (const [x0, x1, y] of spans) {
      if (soc && soc.r === r && x0 < PL_SOC_X - PL_SOC_HW && x1 > PL_SOC_X + PL_SOC_HW) {
        const sx0 = PL_SOC_X - PL_SOC_HW, sx1 = PL_SOC_X + PL_SOC_HW;
        const sz0 = soc.z - PL_SOC_HW, sz1 = soc.z + PL_SOC_HW;
        slab(x0, sx0, r.z0, r.z1, y); slab(sx1, x1, r.z0, r.z1, y);
        slab(sx0, sx1, r.z0, sz0, y); slab(sx0, sx1, sz1, r.z1, y);
      } else slab(x0, x1, r.z0, r.z1, y);
    }
    if (r.raised) for (const s of [-1, 1]) face([
      [s * PL_FXC, PL_FIELD_Y, r.z0], [s * PL_FXC, PL_FIELD_Y, r.z1],
      [s * PL_FX, PL_DECK_Y, r.z1], [s * PL_FX, PL_DECK_Y, r.z0],
    ], 'deck', [s * 0.7, 0.7, 0]);
  }
  const XS = [-PL_HALF, -PL_FX, -PL_FXC, PL_FXC, PL_FX, PL_HALF];
  for (let si = 0; si < stations.length; si++) {
    const s = stations[si], L = regions[si], R = regions[si + 1];
    const prof = (x) => {
      const pts = [[-PL_SEAM_HW, hAt(L, x)], [-PL_SEAM_HW + PL_SEAM_CH, PL_TROUGH_Y]];
      if (lit[si]) pts.push([-PL_CHAN_HW - PL_CHAN_CH, PL_TROUGH_Y], [-PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW + PL_CHAN_CH, PL_TROUGH_Y]);
      pts.push([PL_SEAM_HW - PL_SEAM_CH, PL_TROUGH_Y], [PL_SEAM_HW, hAt(R, x)]);
      return pts;
    };
    for (let k = 0; k < XS.length - 1; k++) {
      const xa = XS[k], xb = XS[k + 1], pa = prof(xa), pb = prof(xb);
      for (let j = 0; j < pa.length - 1; j++) face([
        [xa, pa[j][1], s + pa[j][0]], [xb, pb[j][1], s + pb[j][0]],
        [xb, pb[j + 1][1], s + pb[j + 1][0]], [xa, pa[j + 1][1], s + pa[j + 1][0]],
      ], 'seam', [0, 1, 0]);
    }
    if (lit[si]) {
      const z0 = s - PL_BAR_HW, z1 = s + PL_BAR_HW;
      slab(-PL_HALF, PL_HALF, z0, z1, PL_BAR_Y1, 'strip');
      face([[-PL_HALF, PL_BAR_Y0, z0], [PL_HALF, PL_BAR_Y0, z0], [PL_HALF, PL_BAR_Y0, z1], [-PL_HALF, PL_BAR_Y0, z1]], 'strip', [0, -1, 0]);
      for (const sg of [-1, 1]) {
        const z = s + sg * PL_BAR_HW;
        face([[-PL_HALF, PL_BAR_Y0, z], [PL_HALF, PL_BAR_Y0, z], [PL_HALF, PL_BAR_Y1, z], [-PL_HALF, PL_BAR_Y1, z]], 'strip', [0, 0, sg]);
      }
      for (const sg of [-1, 1]) {
        const x = sg * PL_HALF;
        face([[x, PL_BAR_Y0, z0], [x, PL_BAR_Y0, z1], [x, PL_BAR_Y1, z1], [x, PL_BAR_Y1, z0]], 'strip', [sg, 0, 0]);
      }
    }
  }
  if (soc) {
    const y = soc.y, wellY = y - 0.018;
    ringAt(PL_SOC_HW, y, 0.196, wellY, PL_SOC_X, soc.z, [0, 1, 0]);
    ringAt(0.196, wellY, 0.150, wellY, PL_SOC_X, soc.z, [0, 1, 0]);
    ringAt(0.150, wellY, 0.150, y - 0.005, PL_SOC_X, soc.z, null);
    slab(PL_SOC_X - 0.150, PL_SOC_X + 0.150, soc.z - 0.150, soc.z + 0.150, y - 0.005, 'cap');
  }
  for (const sg of [-1, 1]) {
    const z = sg * PL_HALF;
    face([[-PL_HALF, PL_BEVEL, z], [PL_HALF, PL_BEVEL, z], [PL_HALF, PL_DECK_Y, z], [-PL_HALF, PL_DECK_Y, z]], 'edge', [0, 0, sg]);
  }
  for (const sg of [-1, 1]) {
    const x = sg * PL_HALF;
    const line = [[-PL_HALF, PL_DECK_Y]];
    for (let si = 0; si < stations.length; si++) {
      const s = stations[si];
      const pts = [[-PL_SEAM_HW, PL_DECK_Y], [-PL_SEAM_HW + PL_SEAM_CH, PL_TROUGH_Y]];
      if (lit[si]) pts.push([-PL_CHAN_HW - PL_CHAN_CH, PL_TROUGH_Y], [-PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW + PL_CHAN_CH, PL_TROUGH_Y]);
      pts.push([PL_SEAM_HW - PL_SEAM_CH, PL_TROUGH_Y], [PL_SEAM_HW, PL_DECK_Y]);
      for (const [dz, y] of pts) line.push([s + dz, y]);
    }
    line.push([PL_HALF, PL_DECK_Y]);
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      face([[x, PL_BEVEL, a[0]], [x, PL_BEVEL, b[0]], [x, b[1], b[0]], [x, a[1], a[0]]], 'edge', [sg, 0, 0]);
    }
  }
  const inner = PL_HALF - PL_BEVEL;
  ringAt(PL_HALF, PL_BEVEL, inner, 0, 0, 0, [0, -1, 0]);
  face([[-inner, 0, -inner], [-inner, 0, inner], [inner, 0, inner], [inner, 0, -inner]], 'edge', [0, -1, 0]);
  return F.faces;
}

// ---------------------------------------------------------------- maxima clam
const CL_RX = 0.0702, CL_RZ = 0.0621, CL_HB = 0.052, CL_HT = 0.062, CL_YG = CL_HB, CL_RIBY = 0.010, CL_ZC = -0.0004;
function clHash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function buildClam(P = {}) {
  const ribs = Math.round(Math.min(9, Math.max(6, P.ribs ?? 9)));
  const flute = Math.min(0.28, Math.max(0.08, P.flute ?? 0.17));
  const dome = Math.min(1.15, Math.max(0.65, P.dome ?? 1.0));
  const nc = ribs * 2;
  const cols = [];
  for (let i = 0; i < nc; i++) {
    const psi = i * 2 * Math.PI / nc;
    const phi = Math.PI / 2 + psi;
    const cx = Math.cos(phi), cz = Math.sin(phi);
    const ell = 1 / Math.sqrt((cx / CL_RX) ** 2 + (cz / CL_RZ) ** 2);
    const j = Math.min(i, nc - i);
    cols.push({
      cx, cz, j,
      base: ell * (1 + (clHash(j * 3.7) - 0.5) * 0.05),
      ribc: Math.cos(ribs * psi + Math.PI),
      fan: 0.55 + 0.45 * (1 + Math.cos(psi)) / 2,
      yj: (clHash(j * 7.3 + 1) - 0.5) * 0.0030,
    });
  }
  const ring = (kr, ky, kb, kz = 0) => cols.map((c) => {
    const KR = typeof kr === 'function' ? kr(c) : kr;
    const KY = typeof ky === 'function' ? ky(c) : ky;
    const r = c.base * KR * (1 + flute * c.ribc * kb * c.fan);
    return [r * c.cx, KY + (CL_RIBY * c.ribc + c.yj) * kb, r * c.cz + kz * CL_RZ + CL_ZC];
  });
  const F = faceSink();
  const band = (A, B, zoneFn) => {
    for (let i = 0; i < A.length; i++) {
      const k = (i + 1) % A.length;
      F.quad(A[i], A[k], B[k], B[i], zoneFn(i));
    }
  };
  const cap = (R, centre, up, zone) => {
    for (let i = 0; i < R.length; i++) {
      const k = (i + 1) % R.length;
      if (up) F.tri(centre, R[k], R[i], zone);
      else F.tri(centre, R[i], R[k], zone);
    }
  };
  const KR = { roll: 1.045, flank: 1.000, mid: 0.890, mid2: 0.730, shoulder: 0.500, crown: 0.300, lip: 0.860, floor: 0.26 };
  const KT = { roll: 0.165, flank: 0.365, mid: 0.565, mid2: 0.745, shoulder: 0.870, crown: 1.000 };
  const KZ = { roll: -0.012, flank: -0.050, mid: -0.088, mid2: -0.124, shoulder: -0.158, crown: -0.185 };
  const KB = { rim: 1.0, roll: 1.0, flank: 0.95, mid: 0.84, mid2: 0.60, shoulder: 0.33, crown: 0.13, lip: 0.90, floor: 0.26 };
  function valve(s) {
    const H = s < 0 ? CL_HB : CL_HT * dome;
    const rimY = CL_YG, lipY = CL_YG + s * 0.012, up = s > 0;
    const yAt = (k) => rimY + s * KT[k] * H;
    const rim = ring(1.0, rimY, KB.rim, 0);
    const roll = ring(KR.roll, yAt('roll'), KB.roll, KZ.roll);
    const flank = ring(KR.flank, yAt('flank'), KB.flank, KZ.flank);
    const mid = ring(KR.mid, yAt('mid'), KB.mid, KZ.mid);
    const mid2 = ring(KR.mid2, yAt('mid2'), KB.mid2, KZ.mid2);
    const shoulder = ring(KR.shoulder, yAt('shoulder'), KB.shoulder, KZ.shoulder);
    const crown = ring(KR.crown, yAt('crown'), up ? KB.crown : 0, KZ.crown);
    const crownC = [0, up ? rimY + 1.06 * H : 0, KZ.crown * CL_RZ + CL_ZC];
    const lip = s < 0 ? null : ring(KR.lip, lipY, KB.lip, 0);
    if (s < 0) {
      band(rim, roll, () => 'margin'); band(roll, flank, () => 'shell'); band(flank, mid, () => 'shell');
      band(mid, mid2, () => 'shell'); band(mid2, shoulder, () => 'shell'); band(shoulder, crown, () => 'shell');
      cap(crown, crownC, false, 'shell');
    } else {
      const fy = 0.62;
      const floor = ring(KR.floor, rimY + fy * H, KB.floor, KZ.crown);
      const floorC = [0, rimY + (fy + 0.07) * H, KZ.crown * CL_RZ + CL_ZC];
      band(rim, lip, () => 'margin'); band(lip, floor, () => 'nacre'); cap(floor, floorC, false, 'nacre');
      cap(crown, crownC, true, 'shell'); band(crown, shoulder, () => 'shell'); band(shoulder, mid2, () => 'shell');
      band(mid2, mid, () => 'shell'); band(mid, flank, () => 'shell'); band(flank, roll, () => 'shell'); band(roll, rim, () => 'margin');
    }
  }
  const rimRing = ring(1.0, CL_YG, KB.rim, 0);
  function mantle() {
    const capC = [0, CL_YG - 0.038, -0.11 * CL_RZ + CL_ZC];
    const k1 = ring(0.20, CL_YG - 0.030, 0.10, -0.090);
    const k2 = ring(0.41, CL_YG - 0.019, 0.22, -0.050);
    const k3 = ring(0.58, CL_YG - 0.011, 0.34, -0.030);
    const k4 = ring(0.71, CL_YG - 0.008, 0.60, -0.026);
    const k5 = ring(0.84, CL_YG - 0.014, 0.60, -0.028);
    const k6 = ring(0.90, CL_YG - 0.017, 0.95, -0.030);
    const qs = (i) => Math.min(i, nc - 1 - i);
    const cRay = (i) => (qs(i) % 4 === 0 ? 'stripe' : 'mantle');
    const cLip = (i) => (qs(i) % 4 === 2 ? 'spot' : 'stripe');
    cap(k1, capC, true, 'mantleDeep'); band(k1, k2, () => 'mantleDeep'); band(k2, k3, cRay);
    band(k3, k4, cRay); band(k4, k5, cLip); band(k5, k6, () => 'mantleDeep'); band(k6, rimRing, () => 'nacre');
  }
  valve(-1); mantle(); valve(1);
  return F.faces;
}

// ---------------------------------------------------------------- tram tile
const TR_HALF = 2.0, TR_TOP = 0, TR_COURSE = -0.04, TR_BOT = -0.05;
const TR_GUT = -0.016, TR_CH = -0.004, TR_LIP = -0.008, TR_FLG = -0.034;
const TR_STEEL = [
  [-0.224, TR_CH], [-0.212, 0], [-0.151, 0], [-0.139, TR_LIP],
  [-0.139, TR_FLG], [-0.077, TR_FLG], [-0.077, TR_LIP], [-0.065, 0],
  [0.065, 0], [0.077, TR_CH], [0.077, TR_GUT],
];
export function buildTram(P = {}) {
  const GAUGE = { 'cape-1067': 1.067, 'tram-1370': 1.370, 'standard-1435': 1.435 };
  const gauge = typeof P.gauge === 'string' ? (GAUGE[P.gauge] ?? 1.370) : (P.gauge ?? 1.370);
  const g2 = gauge / 2, inB = g2 - 0.269, outB = g2 + 0.122;
  const halfPts = [[0, TR_TOP]], halfCols = [];
  const seg = (x, y, c) => { halfPts.push([x, y]); halfCols.push(c); };
  seg(inB, TR_TOP, 'asphalt'); seg(inB, TR_GUT, 'asphalt'); seg(g2 + TR_STEEL[0][0], TR_GUT, 'asphalt');
  for (const [dx, y] of TR_STEEL) seg(g2 + dx, y, 'rail');
  seg(outB, TR_GUT, 'asphalt'); seg(outB, TR_TOP, 'asphalt'); seg(TR_HALF, TR_TOP, 'asphalt');
  const n = halfCols.length;
  const pts = [], cols = [];
  for (let i = n; i >= 1; i--) pts.push([-halfPts[i][0], halfPts[i][1]]);
  for (let i = n - 1; i >= 0; i--) cols.push(halfCols[i]);
  for (let i = 0; i <= n; i++) pts.push(halfPts[i]);
  for (let i = 0; i < n; i++) cols.push(halfCols[i]);
  const F = faceSink();
  for (let i = 0; i < cols.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (Math.abs(x0 - x1) < 1e-9 && Math.abs(y0 - y1) < 1e-9) continue;
    F.quad([x0, y0, -TR_HALF], [x0, y0, TR_HALF], [x1, y1, TR_HALF], [x1, y1, -TR_HALF], cols[i]);
  }
  const spans = [];
  for (let i = 0; i < cols.length; i++) spans.push([pts[i][0], pts[i + 1][0], pts[i][1], pts[i + 1][1], cols[i]]);
  for (const sign of [1, -1]) {
    const z = sign * TR_HALF;
    for (const [x0, x1, y0, y1, col] of spans) {
      if (x1 - x0 < 1e-9) continue;
      if (sign > 0) F.quad([x0, TR_COURSE, z], [x1, TR_COURSE, z], [x1, y1, z], [x0, y0, z], col);
      else F.quad([x0, y0, z], [x1, y1, z], [x1, TR_COURSE, z], [x0, TR_COURSE, z], col);
    }
  }
  for (const sign of [1, -1]) {
    const x = sign * TR_HALF;
    if (sign > 0) F.quad([x, 0, -TR_HALF], [x, 0, TR_HALF], [x, TR_COURSE, TR_HALF], [x, TR_COURSE, -TR_HALF], 'asphalt');
    else F.quad([x, TR_COURSE, -TR_HALF], [x, TR_COURSE, TR_HALF], [x, 0, TR_HALF], [x, 0, -TR_HALF], 'asphalt');
  }
  F.quad([-TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_COURSE, TR_HALF], [-TR_HALF, TR_COURSE, TR_HALF], 'base');
  F.quad([-TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_BOT, -TR_HALF], [-TR_HALF, TR_BOT, -TR_HALF], 'base');
  F.quad([TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_COURSE, TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_BOT, -TR_HALF], 'base');
  F.quad([-TR_HALF, TR_COURSE, TR_HALF], [-TR_HALF, TR_COURSE, -TR_HALF], [-TR_HALF, TR_BOT, -TR_HALF], [-TR_HALF, TR_BOT, TR_HALF], 'base');
  F.quad([-TR_HALF, TR_BOT, -TR_HALF], [TR_HALF, TR_BOT, -TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [-TR_HALF, TR_BOT, TR_HALF], 'base');
  return F.faces;
}

// ---------------------------------------------------------------- armchair
const AC_TAU = Math.PI * 2, AC_D2R = Math.PI / 180;
const AC_N = 16, AC_HALF = 0.375, AC_PLAN_N = 4.5, AC_TAPER = 0.82, AC_RAKE = 0.055;
const AC_Y_BOT = 0.29, AC_Y_PAN = 0.34, AC_T_RIM = 0.055, AC_W_PAN = 0.045;
const AC_CH = 0.020, AC_CHY = 0.018, AC_FLAT = 0.015;
const AC_K1 = Math.pow(0.40, 0.75), AC_K2 = Math.pow(0.78, 0.75);
function acD2(a, b) { const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2]; return x * x + y * y + z * z; }
function acPlanR(phi, a, b, n) { return Math.pow(Math.pow(Math.abs(Math.sin(phi)) / a, n) + Math.pow(Math.abs(Math.cos(phi)) / b, n), -1 / n); }
function acLobe(x, c, w) { const d = Math.abs(x - c); return d >= w ? 0 : Math.cos((d / w) * Math.PI / 2); }
function acOuterScale(f) {
  const k = f <= 0.40 ? (f / 0.40) * AC_K1 : f <= 0.78 ? AC_K1 + (AC_K2 - AC_K1) * (f - 0.40) / 0.38 : AC_K2 + (1 - AC_K2) * (f - 0.78) / 0.22;
  return AC_TAPER + (1 - AC_TAPER) * k;
}
function acShearAt(f) { return AC_RAKE * Math.pow(1 - f, 1.6); }
export function buildArmchair(P = {}) {
  const wing = !!P.wing, lived = Math.min(1, Math.max(0, P.lived ?? 0.35)), armLine = Math.min(1, Math.max(0, P.armLine ?? 0.5));
  const rimTable = () => {
    const A = 0.605 + (armLine - 0.5) * 0.10, S = A - 0.020;
    return wing ? [0.400, 0.415, 0.505, A, A, S, 0.820, 0.790, 0.700]
      : [0.400, 0.415, 0.505, A, A, S, Math.max(0.680, A + 0.060), 0.745, 0.790];
  };
  const RT = rimTable();
  const rimHeight = (phi) => {
    const pf = phi <= Math.PI ? phi : AC_TAU - phi;
    const u = pf / (22.5 * AC_D2R);
    const i = Math.min(RT.length - 2, Math.max(0, Math.floor(u)));
    const w = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u - i)));
    let h = RT[i] + (RT[i + 1] - RT[i]) * w;
    h -= lived * 0.026 * Math.max(0, Math.cos(pf));
    return h;
  };
  const rimWiden = (pf, R) => {
    const d = 22.5 * AC_D2R, h0 = rimHeight(pf);
    const s = Math.max(Math.abs(h0 - rimHeight(Math.abs(pf - d))), Math.abs(h0 - rimHeight(Math.min(Math.PI, pf + d))));
    return Math.min(0.020, 0.030 * (s / (R * d)));
  };
  const station = (phi) => {
    const pf = phi <= Math.PI ? phi : AC_TAU - phi;
    const R = acPlanR(phi, AC_HALF, AC_HALF, AC_PLAN_N);
    const h = rimHeight(phi);
    const cup = wing ? 1 - 0.06 * acLobe(pf, 135 * AC_D2R, 55 * AC_D2R) : 1;
    const wallTop = h - AC_CHY, hw = wallTop - AC_Y_BOT;
    const fPan = Math.min(0.96, Math.max(0.04, (AC_Y_PAN - AC_Y_BOT) / hw));
    return { pf, R, h, cup, wallTop, hw, fPan, rPan: R * acOuterScale(fPan) - AC_W_PAN, zPan: acShearAt(fPan) };
  };
  const innerBackZ = (y) => {
    const st = station(Math.PI);
    const zPan = -st.rPan + st.zPan;
    const zTop = -(st.R * st.cup - AC_T_RIM - rimWiden(Math.PI, st.R));
    const t = Math.min(1, Math.max(0, (y - AC_Y_PAN) / (st.wallTop - AC_Y_PAN)));
    return zPan + (zTop - zPan) * t;
  };
  const F = faceSink();
  const tri = (a, b, c, zone) => F.tri(a, b, c, zone);
  const quad = (a, b, c, d, zone) => F.quad(a, b, c, d, zone);
  const quadS = (a, b, c, d, zone) => {
    if (acD2(a, c) <= acD2(b, d)) { tri(a, b, c, zone); tri(a, c, d, zone); }
    else { tri(b, c, d, zone); tri(b, d, a, zone); }
  };
  const O0 = [], O1 = [], O2 = [], O3 = [], C1 = [], C2 = [], I0 = [], I1 = [], I2 = [];
  for (let i = 0; i < AC_N; i++) {
    const phi = i * AC_TAU / AC_N, sx = Math.sin(phi), sz = Math.cos(phi), st = station(phi);
    const { R, cup, wallTop, hw, fPan } = st;
    const pt = (r, y, f) => [sx * r, y, sz * r + acShearAt(f)];
    O0.push(pt(R * acOuterScale(0), AC_Y_BOT, 0));
    O1.push(pt(R * acOuterScale(0.40), AC_Y_BOT + 0.40 * hw, 0.40));
    O2.push(pt(R * acOuterScale(0.78), AC_Y_BOT + 0.78 * hw, 0.78));
    O3.push(pt(R * cup, wallTop, 1));
    const wid = rimWiden(st.pf, R);
    C1.push(pt(R * cup - AC_CH, st.h, 1));
    C2.push(pt(R * cup - AC_CH - AC_FLAT - wid, st.h, 1));
    const rI0 = R * cup - AC_T_RIM - wid;
    I0.push(pt(rI0, wallTop, 1));
    I1.push(pt((rI0 + st.rPan) / 2 - 0.008, (wallTop + AC_Y_PAN) / 2, (1 + fPan) / 2));
    I2.push(pt(st.rPan, AC_Y_PAN, fPan));
  }
  const panC = [0, AC_Y_PAN - lived * 0.018, 0.035], botC = [0, AC_Y_BOT - 0.012, AC_RAKE];
  for (let i = 0; i < AC_N; i++) {
    const j = (i + 1) % AC_N;
    quadS(O0[i], O0[j], O1[j], O1[i], 'shellOuter');
    quadS(O1[i], O1[j], O2[j], O2[i], 'shellOuter');
    quadS(O2[i], O2[j], O3[j], O3[i], 'shellOuter');
    tri(botC, O0[j], O0[i], 'shellOuter');
    quadS(O3[i], O3[j], C1[j], C1[i], 'shellInner');
    quadS(C1[i], C1[j], C2[j], C2[i], 'shellInner');
    quadS(C2[i], C2[j], I0[j], I0[i], 'shellInner');
    quadS(I0[i], I0[j], I1[j], I1[i], 'shellInner');
    quadS(I1[i], I1[j], I2[j], I2[i], 'shellInner');
    tri(panC, I2[i], I2[j], 'shellInner');
  }
  const leg = (sx, sz) => {
    const yTop = 0.320, xt = 0.175 * sx, zt = 0.165 * sz, xb = 0.315 * sx, zb = 0.305 * sz, aT = 0.030, aB = 0.019;
    const T = [], B = [];
    for (const [ox, oz] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      T.push([xt + ox * aT, yTop, zt + oz * aT]); B.push([xb + ox * aB, 0, zb + oz * aB]);
    }
    for (let i = 0; i < 4; i++) quad(B[i], B[(i + 1) % 4], T[(i + 1) % 4], T[i], 'leg');
    quad(B[0], B[3], B[2], B[1], 'leg');
  };
  for (const sx of [1, -1]) for (const sz of [1, -1]) leg(sx, sz);
  const pillow = (base, hgt, bulge, dent, xf, botInset = 0.88, capBottom = true) => {
    const M = base.length;
    let cx = 0, cz = 0;
    for (const p of base) { cx += p[0] / M; cz += p[1] / M; }
    const lv = [{ y: 0, f: botInset }, { y: hgt * 0.42, f: 1.0 + bulge }, { y: hgt, f: 0.84 }];
    const rings = lv.map((L) => base.map((p) => xf([cx + (p[0] - cx) * L.f, L.y, cz + (p[1] - cz) * L.f])));
    for (let k = 0; k < 2; k++) for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      quadS(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i], 'cushion');
    }
    const top = xf([cx, hgt - dent, cz]), bot = xf([cx, 0, cz]);
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      tri(top, rings[2][i], rings[2][j], 'cushion');
      if (capBottom) tri(bot, rings[0][j], rings[0][i], 'cushion');
    }
  };
  {
    const dz = lived * 0.030, base = [];
    for (let i = 0; i < 12; i++) {
      const phi = i * AC_TAU / 12, st = station(phi), r = st.rPan - 0.022;
      base.push([Math.sin(phi) * r, Math.cos(phi) * r + st.zPan]);
    }
    pillow(base, 0.125 - lived * 0.038, lived * 0.06, lived * 0.034, (v) => [v[0], v[1] + 0.325, v[2] + dz], 0.94, false);
  }
  {
    const st = station(Math.PI);
    const wallRake = Math.atan2((-innerBackZ(st.wallTop)) - (-innerBackZ(AC_Y_PAN)), st.wallTop - AC_Y_PAN);
    const rake = wallRake + lived * 13 * AC_D2R, ca = Math.cos(-rake), sa = Math.sin(-rake);
    const y0 = 0.425 - lived * 0.048, B = 0.075;
    const hgt = Math.min(0.300 - lived * 0.030, Math.max(0.16, (rimHeight(Math.PI) - 0.055 - y0) / ca));
    const yTop = y0 + hgt * ca + 0.84 * B * sa, zTopLocal = hgt * sa - 0.84 * B * ca;
    const z0 = innerBackZ(yTop) - (0.022 - lived * 0.016) - zTopLocal;
    const xf = (v) => [v[0], v[1] * ca - v[2] * sa + y0, v[1] * sa + v[2] * ca + z0];
    const base = [];
    for (let i = 0; i < 12; i++) {
      const phi = i * AC_TAU / 12, r = acPlanR(phi, 0.215, B, 3.4);
      base.push([Math.sin(phi) * r, Math.cos(phi) * r]);
    }
    pillow(base, hgt, lived * 0.05, lived * 0.018, xf);
  }
  return F.faces;
}

// ---------------------------------------------------------------- wattle fence
const WT_MOD = 4.0, WT_RP = 0.06, WT_RS = 0.04, WT_ROD_H = 0.068, WT_ROD_W = 0.04;
const WT_PITCH = 0.08, WT_ROW_BOT = 0.12, WT_SAIL_PITCH = 0.5;
const WT_COS30 = Math.cos(Math.PI / 6);
const wtPrng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export function buildWattle(P = {}) {
  const H = Math.min(1.4, Math.max(0.9, P.height ?? 1.2));
  const u = Math.min(1, Math.max(0, P.unevenness ?? 0.5));
  const rand = wtPrng(1307);
  const F = faceSink();
  const triOut = (a, b, c, zone, inside) => F.tri(a, b, c, zone, undefined, inside);
  const quadOut = (a, b, c, d, zone, inside) => F.quad(a, b, c, d, zone, undefined, inside);
  const fanOut = (ring, zone, inside) => { for (let k = 1; k < ring.length - 1; k++) triOut(ring[0], ring[k], ring[k + 1], zone, inside); };
  const hexRing = (x, z, r, rot, y) => {
    const ring = [];
    for (let k = 0; k < 6; k++) {
      const a = rot + k * Math.PI / 3;
      ring.push([x + r * Math.cos(a), typeof y === 'function' ? y(a) : y, z + r * Math.sin(a)]);
    }
    return ring;
  };
  const flatRot = (nx, nz) => Math.atan2(nz, nx) - Math.PI / 2;
  function stake(x, z, r, h, rot, top, y0 = 0, capBottom = true) {
    const bot = hexRing(x, z, r, rot, y0);
    let sideTop, cap;
    if (top.chamfer) {
      const c = top.chamfer;
      sideTop = hexRing(x, z, r, rot, h - c);
      cap = hexRing(x, z, r * 0.6, rot, h);
      for (let k = 0; k < 6; k++) {
        const k1 = (k + 1) % 6;
        quadOut(sideTop[k], sideTop[k1], cap[k1], cap[k], 'stake', [x, h - c * 2, z]);
      }
    } else {
      const [tilt, dir] = top.bevel;
      const t = Math.tan(tilt);
      sideTop = hexRing(x, z, r, rot, (a) => h + t * r * Math.cos(a - dir));
      cap = sideTop;
    }
    const mid = [x, (y0 + h) / 2, z];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      quadOut(bot[k], bot[k1], sideTop[k1], sideTop[k], 'stake', mid);
    }
    fanOut(cap, 'stake', [x, h - 0.1, z]);
    if (capBottom) fanOut(bot, 'stake', [x, y0 + 0.1, z]);
  }
  function lashing(x, z, r, rot, y, hh = 0.045) {
    const lo = hexRing(x, z, r * 0.97, rot, y - hh), md = hexRing(x, z, r + 0.017, rot, y), hi = hexRing(x, z, r * 0.97, rot, y + hh);
    const ax = [x, y, z];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      quadOut(lo[k], lo[k1], md[k1], md[k], 'rope', ax);
      quadOut(md[k], md[k1], hi[k1], hi[k], 'rope', ax);
    }
  }
  function rod(pts, w = WT_ROD_W, h = WT_ROD_H, closed = false) {
    const sec = pts.map((p) => {
      const Fp = [p.x + p.lx * w / 2, p.y + h / 2, p.z + p.lz * w / 2];
      const Bp = [p.x - p.lx * w / 2, p.y + h / 2, p.z - p.lz * w / 2];
      const A = [p.x, p.y - h / 2, p.z];
      const C = [(Fp[0] + Bp[0] + A[0]) / 3, (Fp[1] + Bp[1] + A[1]) / 3, (Fp[2] + Bp[2] + A[2]) / 3];
      return { F: Fp, B: Bp, A, C };
    });
    const n = sec.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const s = sec[i], t = sec[(i + 1) % n];
      const ax = [(s.C[0] + t.C[0]) / 2, (s.C[1] + t.C[1]) / 2, (s.C[2] + t.C[2]) / 2];
      quadOut(s.F, t.F, t.A, s.A, 'withy', ax);
      quadOut(s.B, t.B, t.A, s.A, 'withy', ax);
      quadOut(s.F, t.F, t.B, s.B, 'withy', ax);
    }
    if (!closed) {
      triOut(sec[0].F, sec[0].B, sec[0].A, 'withy', sec[1].C);
      triOut(sec[n - 1].F, sec[n - 1].B, sec[n - 1].A, 'withy', sec[n - 2].C);
    }
  }
  function weave(stakes, rowYs, o) {
    const N = stakes.length, segN = [];
    for (let i = 0; i < N - 1; i++) {
      const dx = stakes[i + 1].x - stakes[i].x, dz = stakes[i + 1].z - stakes[i].z, L = Math.hypot(dx, dz);
      segN.push({ nx: -dz / L, nz: dx / L, L });
    }
    const miter = stakes.map((_, i) => {
      if (i === 0) return [segN[0].nx, segN[0].nz];
      if (i === N - 1) return [segN[N - 2].nx, segN[N - 2].nz];
      const a = segN[i - 1], b = segN[i], k = 1 / (1 + a.nx * b.nx + a.nz * b.nz);
      return [(a.nx + b.nx) * k, (a.nz + b.nz) * k];
    });
    const rr = o.rand, uu = o.u;
    rowYs.forEach((y0, j) => {
      const top = j === rowYs.length - 1, jits = [];
      for (let i = 0; i < N; i++) jits.push(o.mirror && i > N - 1 - i ? jits[N - 1 - i] : top ? (rr() * 0.055 - 0.005) * uu : (rr() - 0.5) * 0.011 * uu);
      const pts = stakes.map((s, i) => {
        const side = ((i + j + (o.parity || 0)) % 2 === 0) ? 1 : -1;
        const d = WT_COS30 * s.r + 0.004 + WT_ROD_W / 2, [mx, mz] = miter[i];
        return { x: s.x + side * d * mx, y: y0 + jits[i], z: s.z + side * d * mz, lx: mx, lz: mz };
      });
      const ext = (e, a, b, run) => { const f = e / run; a.x += (a.x - b.x) * f; a.z += (a.z - b.z) * f; a.y += (a.y - b.y) * f; };
      const e0 = typeof o.e0 === 'function' ? o.e0(rr) : o.e0;
      const e1 = o.mirror && o.e1 === o.e0 ? e0 : typeof o.e1 === 'function' ? o.e1(rr) : o.e1;
      ext(e0, pts[0], pts[1], segN[0].L); ext(e1, pts[N - 1], pts[N - 2], segN[N - 2].L);
      rod(pts);
    });
  }
  const rows = Math.floor((H - 0.2 - WT_ROW_BOT - WT_ROD_H) / WT_PITCH) + 1;
  const rowYs = Array.from({ length: rows }, (_, j) => WT_ROW_BOT + WT_ROD_H / 2 + j * WT_PITCH);
  const topRowY = rowYs[rows - 1], postH = H + 0.06;
  const edgePost = (x, z, nx, nz) => { const rot = flatRot(nx, nz); stake(x, z, WT_RP, postH, rot, { chamfer: 0.03 }); lashing(x, z, WT_RP, rot, topRowY); };
  const sailSpec = () => ({ h: H + (rand() * 0.34 - 0.12) * u, tilt: (5 + rand() * 18 * u) * Math.PI / 180, dir: rand() * Math.PI * 2 });
  const sail = (x, z, nx, nz, sp) => stake(x, z, WT_RS, sp.h, flatRot(nx, nz), { bevel: [sp.tilt, sp.dir] });
  const mirroredSails = (list) => {
    const specs = [];
    list.forEach((s, i) => {
      const j = list.length - 1 - i;
      if (i < j) specs[i] = sailSpec();
      else if (i === j) specs[i] = Object.assign(sailSpec(), { dir: Math.PI / 2 });
      else specs[i] = Object.assign({}, specs[j], { dir: Math.PI - specs[j].dir });
    });
    list.forEach((s, i) => sail(s.x, s.z, 0, 1, specs[i]));
  };
  const leg = (ax, az, bx, bz, minN = 1, even = false) => {
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(minN, even ? 2 * Math.round(L / WT_SAIL_PITCH / 2) : Math.round(L / WT_SAIL_PITCH)), out = [];
    for (let i = 1; i < n; i++) out.push({ x: ax + (bx - ax) * i / n, z: az + (bz - az) * i / n, r: WT_RS });
    return out;
  };
  const E = WT_MOD / 2 - WT_RP - 0.018, edgeExt = (r) => WT_RP + 0.012 - r() * 0.04 * u;
  const sails = leg(-E, 0, E, 0, 2, true);
  const line = [{ x: -E, z: 0, r: WT_RP }, ...sails, { x: E, z: 0, r: WT_RP }];
  edgePost(-E, 0, 0, 1); edgePost(E, 0, 0, 1); mirroredSails(sails);
  weave(line, rowYs, { rand, u, e0: edgeExt, e1: edgeExt, mirror: true });
  return F.faces;
}

// ---------------------------------------------------------------- quiver
const QV_SEG = 8, QV_PH = Math.PI / 8, QV_ZS = 0.92, QV_C8 = Math.cos(Math.PI / 8);
export function buildQuiver(P = {}) {
  const L = Math.min(1.25, Math.max(0.8, P.length ?? 1));
  const taper = Math.min(1, Math.max(0, P.taper ?? 0.5));
  const strap = P.strap !== false;
  const b0 = 0.40 * L, rt = 0.068, rb = rt * (1 - 0.48 * taper), capTop = 0.048;
  const rAt = (y) => rb + (rt - rb) * (y - capTop) / (b0 - capTop);
  const apo = (r) => r * QV_C8 * QV_ZS;
  const F = faceSink();
  const quad = (a, b, c, d, zone, inside) => F.quad(a, b, c, d, zone, undefined, inside);
  const tri = (a, b, c, zone, inside) => F.tri(a, b, c, zone, undefined, inside);
  const raw = (zone, a, b, c) => F.tri(a, b, c, zone);
  const prof = [];
  const pt = (r, y, z) => prof.push([r, y, z]);
  pt(rb * 0.58, 0, null); pt(rb + 0.005, 0.042, 'rim'); pt(rb, capTop, 'rim'); pt(rt, b0, 'leather');
  const gr = 0.005;
  pt(rt + 0.012, b0 + 0.010, 'rim'); pt(rt + 0.012, b0 + 0.044, 'rim'); pt(rt + gr, b0 + 0.051, 'rim');
  pt(rt + gr, b0 + 0.058, 'rim'); pt(rt + 0.013, b0 + 0.065, 'rim'); pt(rt + 0.013, b0 + 0.090, 'rim');
  pt(rt + 0.006, b0 + 0.097, 'rim'); pt(rt - 0.004, b0 + 0.097, 'rim');
  const floorY = b0 + 0.055, innerR = rt - 0.006;
  pt(innerR, floorY, 'rim');
  const rimTop = b0 + 0.097;
  const ring = prof.map(([r, y]) => {
    const out = [];
    for (let k = 0; k < QV_SEG; k++) { const a = QV_PH + (k / QV_SEG) * Math.PI * 2; out.push([r * Math.sin(a), y, r * Math.cos(a) * QV_ZS]); }
    return out;
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const zone = prof[i + 1][2];
    for (let k = 0; k < QV_SEG; k++) {
      const a = ring[i][k], b = ring[i][(k + 1) % QV_SEG], c = ring[i + 1][(k + 1) % QV_SEG], d = ring[i + 1][k];
      raw(zone, a, b, c); raw(zone, a, c, d);
    }
  }
  const bot = ring[0], flo = ring[ring.length - 1];
  for (let k = 1; k < QV_SEG - 1; k++) { raw('rim', bot[0], bot[k + 1], bot[k]); raw(prof[prof.length - 1][2], flo[0], flo[k], flo[k + 1]); }
  const pitch = 0.042, y0 = capTop + 0.028, y1 = b0 - 0.02;
  const n = Math.max(2, Math.floor((y1 - y0) / pitch) + 1);
  const vert = (k, y) => { const a = QV_PH + (k / QV_SEG) * Math.PI * 2, r = rAt(y); return [r * Math.sin(a), y, r * Math.cos(a) * QV_ZS]; };
  for (let i = 0; i < n; i++) {
    const y = y0 + i * pitch;
    for (const s of [1, -1]) {
      const [ka, kb, u] = s > 0 ? [2, 3, 0.7] : [5, 4, 0.7];
      const A = vert(ka, y), B = vert(kb, y), c = v3.lerp(A, B, u);
      const along = v3.norm(v3.sub(B, A));
      const upF = v3.norm(v3.sub(v3.lerp(vert(ka, y + 0.05), vert(kb, y + 0.05), u), c));
      let nrm = v3.norm(v3.cross(along, upF));
      if (v3.dot(nrm, [c[0], 0, c[2]]) < 0) nrm = v3.mul(nrm, -1);
      const ang = 0.65, uu = v3.add(v3.mul(upF, Math.cos(ang)), v3.mul(along, Math.sin(ang))), w = v3.norm(v3.cross(nrm, uu));
      const base = [v3.add(c, v3.mul(uu, 0.012)), v3.add(c, v3.mul(w, 0.0045)), v3.add(c, v3.mul(uu, -0.012)), v3.add(c, v3.mul(w, -0.0045))];
      const apex = v3.add(c, v3.mul(nrm, 0.0055)), hint = v3.add(c, v3.mul(nrm, -0.01));
      for (let k = 0; k < 4; k++) tri(apex, base[k], base[(k + 1) % 4], 'stitch', hint);
    }
  }
  const backZ = (y) => -apo(rAt(y));
  if (strap) {
    const zone = 'rim', w = 0.032, t = 0.011, yT = b0 + 0.027, rTop = rt + 0.012;
    const yB = Math.max(capTop + 0.035, 0.09 * L), span = yT - yB;
    const key = [[0.93, 0.03], [0.78, 0.07], [0.60, 0.10], [0.42, 0.115], [0.24, 0.112], [0.10, 0.09], [0.02, 0.055], [-0.03, 0.022]];
    const path = [[0, yT, -apo(rTop) + 0.006]];
    for (const [f, d] of key) { const y = yB + f * span; path.push([0, y, backZ(y) - d]); }
    const yE = yB - 0.03 * span; path.push([0, yE, backZ(yE) + 0.006]);
    const cen = path.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map((v) => v / path.length);
    const X = [1, 0, 0];
    const frames = path.map((p, i) => {
      const T = v3.norm(v3.sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)]));
      let N = [0, -T[2], T[1]];
      if (v3.dot(N, v3.sub(p, cen)) < 0) N = v3.mul(N, -1);
      return { p, T, N };
    });
    const secs = frames.map(({ p, N }) => [
      v3.add(v3.add(p, v3.mul(X, -w / 2)), v3.mul(N, -t / 2)), v3.add(v3.add(p, v3.mul(X, w / 2)), v3.mul(N, -t / 2)),
      v3.add(v3.add(p, v3.mul(X, w / 2)), v3.mul(N, t / 2)), v3.add(v3.add(p, v3.mul(X, -w / 2)), v3.mul(N, t / 2)),
    ]);
    for (let i = 0; i < secs.length - 1; i++) {
      const hint = v3.mul(v3.add(frames[i].p, frames[i + 1].p), 0.5);
      for (let k = 0; k < 4; k++) quad(secs[i][k], secs[i][(k + 1) % 4], secs[i + 1][(k + 1) % 4], secs[i + 1][k], zone, hint);
    }
    const i0 = 2, i1 = 3;
    const segAt = (f) => {
      const p = v3.lerp(frames[i0].p, frames[i1].p, f), T = v3.norm(v3.sub(frames[i1].p, frames[i0].p));
      let N = [0, -T[2], T[1]];
      if (v3.dot(N, v3.sub(p, cen)) < 0) N = v3.mul(N, -1);
      return { p, T, N };
    };
    const bf = segAt(0.32), fw = 0.046, fh = 0.036, bar = 0.0065, n0 = t / 2 - 0.001, n1 = t / 2 + 0.0045;
    const corner = (sx, sy, inset, nn) => v3.add(v3.add(v3.add(bf.p, v3.mul(X, sx * (fw / 2 - inset))), v3.mul(bf.T, sy * (fh / 2 - inset))), v3.mul(bf.N, nn));
    const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const O0 = sq.map(([a, b]) => corner(a, b, 0, n0)), O1 = sq.map(([a, b]) => corner(a, b, 0, n1));
    const I0 = sq.map(([a, b]) => corner(a, b, bar, n0)), I1 = sq.map(([a, b]) => corner(a, b, bar, n1));
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4, mid = v3.mul(v3.add(v3.add(O0[k], O0[k2]), v3.add(I1[k], I1[k2])), 0.25);
      const hTop = v3.add(mid, v3.mul(bf.N, -0.01)), hBot = v3.add(mid, v3.mul(bf.N, 0.01));
      quad(O1[k], O1[k2], I1[k2], I1[k], 'buckle', hTop);
      if (k !== 0) quad(O0[k], O0[k2], I0[k2], I0[k], 'buckle', hBot);
      const ctr = v3.add(bf.p, v3.mul(bf.N, (n0 + n1) / 2));
      quad(O0[k], O0[k2], O1[k2], O1[k], 'buckle', ctr);
      quad(I0[k], I0[k2], I1[k2], I1[k], 'buckle', mid);
    }
    const tf = segAt(0.74), tw = 0.024, th = 0.03, m0 = t / 2 - 0.001, m1 = t / 2 + 0.0035;
    const tc = (sx, sy, nn) => v3.add(v3.add(v3.add(tf.p, v3.mul(X, sx * tw / 2)), v3.mul(tf.T, sy * th / 2)), v3.mul(tf.N, nn));
    const B0 = sq.map(([a, b]) => tc(a, b, m0)), B1 = sq.map(([a, b]) => tc(a, b, m1)), tHint = v3.add(tf.p, v3.mul(tf.N, (m0 + m1) / 2));
    quad(B1[0], B1[1], B1[2], B1[3], 'rim', tHint);
    for (let k = 1; k < 4; k++) quad(B0[k], B0[(k + 1) % 4], B1[(k + 1) % 4], B1[k], 'rim', tHint);
  }
  const SH = 0.0065, K = 2.3;
  const arrow = (px, pz, rise, vanes) => {
    const Dv = v3.norm([px * K, 1, pz * K]);
    const E1 = v3.norm(v3.sub([1, 0, 0], v3.mul(Dv, Dv[0]))), E2 = v3.norm(v3.cross(E1, Dv));
    const base = [px, floorY - 0.006, pz], len = (rimTop + rise - base[1]) / Dv[1];
    const at = (s, ang, rho, off = 0) => v3.add(v3.add(v3.add(base, v3.mul(Dv, s)), v3.mul(E1, Math.cos(ang) * rho - Math.sin(ang) * off)), v3.mul(E2, Math.sin(ang) * rho + Math.cos(ang) * off));
    const cs = [0, 1, 2, 3].map((j) => Math.PI / 4 + j * Math.PI / 2);
    const botA = cs.map((a) => at(0, a, SH)), topA = cs.map((a) => at(len, a, SH));
    const axisHint = (s) => v3.add(base, v3.mul(Dv, s));
    for (let j = 0; j < 4; j++) quad(botA[j], botA[(j + 1) % 4], topA[(j + 1) % 4], topA[j], 'shaft', axisHint(len / 2));
    quad(topA[0], topA[1], topA[2], topA[3], 'shaft', axisHint(len - 0.01));
    const th2 = 0.0035, outline = [[0.003, len - 0.014], [0.019, len - 0.036], [0.017, len - 0.104], [0.003, len - 0.116]];
    for (const a of vanes) {
      const Fv = outline.map(([r, s]) => at(s, a, r, th2 / 2)), Bk = outline.map(([r, s]) => at(s, a, r, -th2 / 2)), hint = at(len - 0.066, a, 0.012);
      quad(Fv[0], Fv[1], Fv[2], Fv[3], 'fletch', hint); quad(Bk[0], Bk[1], Bk[2], Bk[3], 'fletch', hint);
      for (let j = 0; j < 3; j++) quad(Fv[j], Fv[(j + 1) % 4], Bk[(j + 1) % 4], Bk[j], 'fletch', hint);
    }
  };
  const sym = [Math.PI / 2, Math.PI / 2 + 2 * Math.PI / 3, Math.PI / 2 + 4 * Math.PI / 3];
  const set = [[0, 0.002, 0.205, null], [0, 0.038, 0.170, null], [0, -0.038, 0.192, null], [0.034, 0.018, 0.183, 0.35], [0.031, -0.021, 0.198, -0.5]];
  for (const [px, pz, rise, off] of set) {
    if (px === 0) arrow(0, pz, rise, sym);
    else { const vs = [0, 1, 2].map((j) => off + j * 2 * Math.PI / 3); arrow(px, pz, rise, vs); arrow(-px, pz, rise, vs.map((a) => Math.PI - a)); }
  }
  return F.faces;
}

// ---------------------------------------------------------------- door leaf
const DR_H = 2.10, DR_T = 0.045, DR_STILE = 0.115, DR_BOT_RAIL = 0.205, DR_TOP_RAIL = 0.135;
const DR_LEVER_Y = 1.00, DR_MR = 0.022, DR_PD = 0.011, DR_GR = 0.025, DR_GZ = 0.008, DR_GT = 0.003, DR_GBURY = 0.004;
const DR_HINGE_Y = [0.28, 1.05, 1.82];
function drMix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round((((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
export function buildDoor(P = {}) {
  const W = Math.min(0.95, Math.max(0.70, P.width ?? 0.90));
  const lived = Math.min(1, Math.max(0, P.lived ?? 0.35));
  const CH = 0.008 + lived * 0.004, SAG = lived * 0.009;
  const layout = {
    cols: [CH, DR_STILE, W - DR_STILE, W - CH],
    rows: [CH, DR_BOT_RAIL, 0.625, 0.725, 0.905, 1.085, DR_H - DR_TOP_RAIL, DR_H - CH],
    cells: { '1,1': 'panel', '3,1': 'panel', '5,1': 'glass' },
  };
  const F = faceSink(), pane = faceSink();
  const quad = (sink, a, b, c, d, zone) => sink.quad(a, b, c, d, zone);
  const tri = (sink, a, b, c, zone) => sink.tri(a, b, c, zone);
  const openBox = (sink, x0, y0, z0, x1, y1, z1, skip = '', zone = 'leaf') => {
    const off = new Set(skip.split(' ').filter(Boolean));
    const q = (n, a, b, c, d) => { if (!off.has(n)) quad(sink, a, b, c, d, zone); };
    q('px', [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    q('nx', [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q('py', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
    q('ny', [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    q('pz', [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    q('nz', [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  };
  const prismZ = (sink, cx, cy, z0, z1, r, seg, phase = 0, zone = 'leaf') => {
    const ring = [];
    for (let i = 0; i < seg; i++) { const a = phase + (i / seg) * Math.PI * 2; ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    for (let i = 0; i < seg; i++) { const p = ring[i], q = ring[(i + 1) % seg]; quad(sink, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], zone); }
    for (let i = 1; i < seg - 1; i++) tri(sink, [ring[0][0], ring[0][1], z1], [ring[i][0], ring[i][1], z1], [ring[i + 1][0], ring[i + 1][1], z1], zone);
  };
  const ZF = DR_T / 2, ZS = DR_T / 2 - CH;
  for (const s of [1, -1]) {
    const P3 = (x, y, z) => [x, y, s * z];
    const Q = (sink, a, b, c, d, zone) => { if (s > 0) quad(sink, a, b, c, d, zone); else quad(sink, d, c, b, a, zone); };
    const R = (x0, y0, x1, y1, z) => [P3(x0, y0, z), P3(x1, y0, z), P3(x1, y1, z), P3(x0, y1, z)];
    const band = (sink, A, B, zone) => { for (let i = 0; i < 4; i++) Q(sink, A[i], A[(i + 1) % 4], B[(i + 1) % 4], B[i], zone); };
    for (let r = 0; r < layout.rows.length - 1; r++) {
      const zone = r === 0 ? 'wear' : 'leaf';
      let c = 0;
      while (c < layout.cols.length - 1) {
        if (layout.cells[`${r},${c}`]) { c++; continue; }
        let e = c;
        while (e < layout.cols.length - 1 && !layout.cells[`${r},${e}`]) e++;
        Q(F, ...R(layout.cols[c], layout.rows[r], layout.cols[e], layout.rows[r + 1], ZF), zone);
        c = e + 1;
      }
    }
    for (const k of Object.keys(layout.cells)) {
      const [r, c] = k.split(',').map(Number);
      const x0 = layout.cols[c], x1 = layout.cols[c + 1], y0 = layout.rows[r], y1 = layout.rows[r + 1];
      const A = R(x0, y0, x1, y1, ZF);
      if (layout.cells[k] === 'glass') {
        band(F, A, R(x0 + DR_GR, y0 + DR_GR, x1 - DR_GR, y1 - DR_GR, DR_GZ), 'leaf');
        Q(pane, ...R(x0 + DR_GR - DR_GBURY, y0 + DR_GR - DR_GBURY, x1 - DR_GR + DR_GBURY, y1 - DR_GR + DR_GBURY, DR_GT), 'glass');
      } else {
        const B = R(x0 + DR_MR, y0 + DR_MR, x1 - DR_MR, y1 - DR_MR, ZF - DR_PD);
        band(F, A, B, 'leaf'); Q(F, ...B, 'panel');
      }
    }
    band(F, R(0, 0, W, DR_H, ZS), R(CH, CH, W - CH, DR_H - CH, ZF), 'leaf');
  }
  const P4 = [[0, 0], [W, 0], [W, DR_H], [0, DR_H]];
  for (let i = 0; i < 4; i++) {
    const a = P4[i], b = P4[(i + 1) % 4];
    quad(F, [a[0], a[1], -ZS], [b[0], b[1], -ZS], [b[0], b[1], ZS], [a[0], a[1], ZS], i === 0 ? 'wear' : 'leaf');
  }
  for (const k of Object.keys(layout.cells)) {
    if (layout.cells[k] !== 'glass') continue;
    const [r, c] = k.split(',').map(Number);
    const x0 = layout.cols[c] + DR_GR, x1 = layout.cols[c + 1] - DR_GR, y0 = layout.rows[r] + DR_GR, y1 = layout.rows[r + 1] - DR_GR;
    const Fq = [[x0, y0, DR_GZ], [x1, y0, DR_GZ], [x1, y1, DR_GZ], [x0, y1, DR_GZ]];
    const Bq = Fq.map(([x, y]) => [x, y, -DR_GZ]);
    for (let i = 0; i < 4; i++) quad(F, Fq[i], Fq[(i + 1) % 4], Bq[(i + 1) % 4], Bq[i], 'leaf');
  }
  const mirrorFaces = (faces) => {
    const out = [];
    for (const f of faces) for (let i = 1; i + 1 < f.pts.length; i++) {
      const pts = [f.pts[0], f.pts[i], f.pts[i + 1]].map(([x, y, z]) => [x, y, -z]);
      out.push({ ...f, pts: [pts[0], pts[2], pts[1]] });
    }
    return out;
  };
  const leverSet = (droop) => {
    const cx = W - 0.070, z0 = DR_T / 2 - 0.001;
    openBox(F, W - 0.105, DR_LEVER_Y - 0.115, z0, W - 0.035, DR_LEVER_Y + 0.115, DR_T / 2 + 0.004, 'nz', 'brass');
    prismZ(F, cx, DR_LEVER_Y, z0, DR_T / 2 + 0.028, 0.020, 8, Math.PI / 8, 'brass');
    const start = F.faces.length;
    openBox(F, W - 0.185, DR_LEVER_Y - 0.014, DR_T / 2 + 0.016, cx + 0.014, DR_LEVER_Y + 0.013, DR_T / 2 + 0.050, '', 'brass');
    openBox(F, W - 0.185, DR_LEVER_Y - 0.044, DR_T / 2 + 0.022, W - 0.157, DR_LEVER_Y - 0.008, DR_T / 2 + 0.048, 'py nz', 'brass');
    const c = Math.cos(droop), s = Math.sin(droop);
    for (let i = start; i < F.faces.length; i++) F.faces[i].pts = F.faces[i].pts.map(([x, y, z]) => {
      const dx = x - cx, dy = y - DR_LEVER_Y;
      return [cx + dx * c - dy * s, DR_LEVER_Y + dx * s + dy * c, z];
    });
  };
  const before = F.faces.length;
  leverSet(lived * 4 * Math.PI / 180);
  F.faces.push(...mirrorFaces(F.faces.slice(before)));
  for (const y of DR_HINGE_Y) {
    const start = F.faces.length;
    openBox(F, 0.014, y - 0.065, DR_T / 2 - 0.001, 0.078, y + 0.065, DR_T / 2 + 0.003, 'nz', 'brass');
    F.faces.push(...mirrorFaces(F.faces.slice(start)));
    const geo = new THREE.CylinderGeometry(0.010, 0.010, 0.130, 8);
    const g2 = geo.index ? geo.toNonIndexed() : geo;
    g2.rotateY(Math.PI / 8); g2.translate(0.008, y, DR_T / 2);
    const a = g2.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) F.tri([a[i], a[i + 1], a[i + 2]], [a[i + 3], a[i + 4], a[i + 5]], [a[i + 6], a[i + 7], a[i + 8]], 'brass');
  }
  openBox(F, W - 0.002, DR_LEVER_Y - 0.055, -0.008, W + 0.002, DR_LEVER_Y + 0.055, 0.008, 'nx', 'brass');
  const M = [1, -SAG / W, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, SAG, 0, 1];
  const apply = (p) => [
    M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12] - W / 2,
    M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
    M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
  ];
  const all = [...F.faces, ...pane.faces];
  for (const f of all) f.pts = f.pts.map(apply);
  return all;
}

// ---------------------------------------------------------------- taxiway sign
const TX_PANEL = 1.0, TX_BOX_H = 1.0, TX_BOX_D = 0.36, TX_X0 = -1.0, TX_CH = 0.03, TX_CK = 0.04, TX_BEZEL = 0.075;
const TX_RECESS = 0.03, TX_DIV = 0.035, TX_LEG = 0.14, TX_LEG_EXPOSED = 0.39;
const TX_FOOT_H = 0.14, TX_FOOT_D = 0.52, TX_FOOT_OVER = 0.06, TX_FOOT_CH = 0.025;
const TX_PLATE = 0.30, TX_PLATE_T = 0.025;
function txOctagon(x0, x1, y0, y1, k, z) {
  return [[x0 + k, y0, z], [x1 - k, y0, z], [x1, y0 + k, z], [x1, y1 - k, z], [x1 - k, y1, z], [x0 + k, y1, z], [x0, y1 - k, z], [x0, y0 + k, z]];
}
function txArrow(deg, len = 1, t = 0.075, hl = 0.36, hw = 0.29) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const R = (pts) => pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const h = len / 2;
  return [R([[-h, -t], [h - hl, -t], [h - hl, t], [-h, t]]), R([[h - hl, -hw], [h, 0], [h - hl, hw]])];
}
export function buildTaxiway(P = {}) {
  const panels = Math.min(4, Math.max(1, Math.round(P.panels ?? 2)));
  const footing = P.footing !== false;
  const base = footing ? TX_FOOT_H : 0, L = panels * TX_PANEL, X1 = TX_X0 + L, cx = TX_X0 + L / 2;
  const yB = base + TX_LEG_EXPOSED, yT = yB + TX_BOX_H, cy = (yB + yT) / 2, zF = TX_BOX_D / 2;
  const F = faceSink();
  const solid = (faces, centre, zone) => {
    for (const f of faces) {
      const m = f.reduce((a, p) => [a[0] + p[0] / f.length, a[1] + p[1] / f.length, a[2] + p[2] / f.length], [0, 0, 0]);
      F.poly(f, zone, [m[0] - centre[0], m[1] - centre[1], m[2] - centre[2]]);
    }
  };
  const box = (x0, x1, y0, y1, z0, z1, zone, omit = []) => {
    const faces = {
      px: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], nx: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      py: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], ny: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], nz: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
    };
    solid(Object.entries(faces).filter(([k]) => !omit.includes(k)).map(([, f]) => f), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], zone);
  };
  const bolt = (c, n, zone, r = 0.016, h = 0.014) => {
    const N = v3.norm(n), up = Math.abs(N[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const t = v3.norm(v3.cross(up, N)), b = v3.norm(v3.cross(N, t));
    const apex = [c[0] + N[0] * h, c[1] + N[1] * h, c[2] + N[2] * h], ring = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r; ring.push([c[0] + t[0] * cs + b[0] * sn, c[1] + t[1] * cs + b[1] * sn, c[2] + t[2] * cs + b[2] * sn]); }
    for (let i = 0; i < 6; i++) F.tri(apex, ring[i], ring[(i + 1) % 6], zone, undefined, c);
  };
  const rings = [
    txOctagon(TX_X0 + TX_CH, X1 - TX_CH, yB + TX_CH, yT - TX_CH, TX_CK, zF),
    txOctagon(TX_X0, X1, yB, yT, TX_CK, zF - TX_CH),
    txOctagon(TX_X0, X1, yB, yT, TX_CK, -zF + TX_CH),
    txOctagon(TX_X0 + TX_CH, X1 - TX_CH, yB + TX_CH, yT - TX_CH, TX_CK, -zF),
  ];
  const casingFor = (m) => {
    const dy = m[1] - cy;
    if (dy < -TX_BOX_H / 2 + 0.01) return 'casingLow';
    if (dy > TX_BOX_H / 2 - 0.01) return 'casingTop';
    return Math.abs(m[2]) > zF - TX_CH - 1e-6 ? 'casingBezel' : 'casing';
  };
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8, f = [rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]];
    const m = f.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    F.poly(f, casingFor(m), [m[0] - cx, m[1] - cy, m[2]]);
  }
  const signFace = (s) => {
    const Z = (p) => [p[0], p[1], p[2] * s], out = [0, 0, s];
    const O = rings[0].map((p) => [p[0], p[1], zF]);
    const a0 = TX_X0 + TX_BEZEL, a1 = X1 - TX_BEZEL, b0 = yB + TX_BEZEL, b1 = yT - TX_BEZEL;
    const R = [[a0, b0, zF], [a1, b0, zF], [a1, b1, zF], [a0, b1, zF]];
    const ring = [[O[0], O[1], R[1], R[0]], [O[1], O[2], R[1]], [O[2], O[3], R[2], R[1]], [O[3], O[4], R[2]], [O[4], O[5], R[3], R[2]], [O[5], O[6], R[3]], [O[6], O[7], R[0], R[3]], [O[7], O[0], R[0]]];
    for (const f of ring) F.poly(f.map(Z), 'casingBezel', out);
    const zr = zF - TX_RECESS, D = R.map((p) => [p[0], p[1], zr]);
    const walls = [[R[0], R[1], D[1], D[0], [0, 1, 0]], [R[1], R[2], D[2], D[1], [-1, 0, 0]], [R[2], R[3], D[3], D[2], [0, -1, 0]], [R[3], R[0], D[0], D[3], [1, 0, 0]]];
    for (const [p, q, u, v, n] of walls) F.poly([p, q, u, v].map(Z), n[1] > 0 ? 'casingLow' : 'casing', n);
    const W3 = (u, v, z) => [s > 0 ? u : 2 * cx - u, v, z * s];
    const flat = (pts2, z, zone) => F.poly(pts2.map(([u, v]) => W3(u, v, z)), zone, out);
    const zl = zr + 0.002;
    const tiles = s > 0 ? [{ type: 'band', span: panels, items: ['>'] }] : [{ type: 'band', span: panels, items: ['<'] }];
    let k = 0;
    tiles.forEach((t, ti) => {
      const u0 = ti === 0 ? a0 : TX_X0 + k * TX_PANEL + TX_DIV / 2;
      k += t.span;
      const u1 = ti === tiles.length - 1 ? a1 : TX_X0 + k * TX_PANEL - TX_DIV / 2;
      if (ti < tiles.length - 1) {
        const m = TX_X0 + k * TX_PANEL, mz = zF - 0.008;
        const sides = [
          [[m - TX_DIV / 2, b0, zr], [m - TX_DIV / 2, b1, zr], [m - TX_DIV / 2, b1, mz], [m - TX_DIV / 2, b0, mz]],
          [[m + TX_DIV / 2, b0, zr], [m + TX_DIV / 2, b1, zr], [m + TX_DIV / 2, b1, mz], [m + TX_DIV / 2, b0, mz]],
          [[m - TX_DIV / 2, b0, mz], [m + TX_DIV / 2, b0, mz], [m + TX_DIV / 2, b1, mz], [m - TX_DIV / 2, b1, mz]],
        ];
        const hints = [[-1, 0, 0], [1, 0, 0], [0, 0, 1]];
        sides.forEach((f, i) => F.poly(f.map(([x, y, z]) => [s > 0 ? x : 2 * cx - x, y, z * s]), 'casingBezel', [hints[i][0] * s, 0, hints[i][2] * s]));
      }
      const bh = (b1 - b0) * 0.56, vm = (b0 + b1) / 2, v0 = vm - bh / 2, v1 = vm + bh / 2;
      flat([[u0, b0], [u1, b0], [u1, v0], [u0, v0]], zr, 'signYellow');
      flat([[u0, v0], [u1, v0], [u1, v1], [u0, v1]], zr, 'field');
      flat([[u0, v1], [u1, v1], [u1, b1], [u0, b1]], zr, 'signYellow');
      const len = (u1 - u0) * 0.84, um = (u0 + u1) / 2, hl = Math.min(0.3, len * 0.3);
      const deg = t.items[0] === '<' ? 180 : 0;
      for (const pc of txArrow(deg, len, bh * 0.1, hl, bh * 0.38)) flat(pc.map(([x, y]) => [um + x, vm + y]), zl, 'signYellow');
    });
  };
  signFace(1); signFace(-1);
  for (let p = 0; p < panels; p += 2) {
    const span = Math.min(2, panels - p), hc = TX_X0 + (p + span / 2) * TX_PANEL, hl = span === 2 ? 0.8 : 0.45, hz = 0.11, ht = 0.02;
    box(hc - hl / 2, hc + hl / 2, yT, yT + ht, -hz, hz, 'steel', ['ny']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt([hc + sx * (hl / 2 - 0.035), yT + ht, sz * (hz - 0.035)], [0, 1, 0], 'steel', 0.012, 0.01);
  }
  const nLegs = Math.max(2, panels), inset = panels === 1 ? 0.22 : 0.3, legXs = [];
  for (let i = 0; i < nLegs; i++) legXs.push(TX_X0 + inset + (L - 2 * inset) * (i / (nLegs - 1)));
  const leg = (lx) => {
    const h = TX_LEG / 2, y0 = base + TX_PLATE_T;
    box(lx - TX_PLATE / 2, lx + TX_PLATE / 2, base, y0, -TX_PLATE / 2, TX_PLATE / 2, 'steelLow', ['ny']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt([lx + sx * 0.11, y0, sz * 0.11], [0, 1, 0], 'steelLow');
    const gL = 0.075, gH = 0.11, gE = 0.025, gT = 0.012;
    for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const vx = -uz, vz = ux;
      const at = (u, y, v) => [lx + ux * (h + u) + vx * v, y, uz * (h + u) + vz * v];
      const pr = [[0, y0], [gL, y0], [gL, y0 + gE], [0, y0 + gH]];
      const sideA = pr.map(([u, y]) => at(u, y, gT / 2)), sideB = pr.map(([u, y]) => at(u, y, -gT / 2));
      solid([sideA, sideB, [sideA[1], sideA[2], sideB[2], sideB[1]], [sideA[2], sideA[3], sideB[3], sideB[2]]], at(gL / 3, y0 + gH / 3, 0), 'steelLow');
    }
    const c0 = y0 + 0.14, fT = 0.02, gap = 0.012, fW = 0.2;
    const tube = (ya, yb, zone) => box(lx - h, lx + h, ya, yb, -h, h, zone, ['py', 'ny']);
    tube(y0, c0, 'steelLow'); tube(c0 + fT, c0 + fT + gap, 'steelLow'); tube(c0 + 2 * fT + gap, yB + 0.02, 'steel');
    box(lx - fW / 2, lx + fW / 2, c0, c0 + fT, -fW / 2, fW / 2, 'steelLow');
    box(lx - fW / 2, lx + fW / 2, c0 + fT + gap, c0 + 2 * fT + gap, -fW / 2, fW / 2, 'steel');
    box(lx - 0.1, lx + 0.1, yB - 0.025, yB, -0.12, 0.12, 'steel', ['py']);
  };
  for (const lx of legXs) leg(lx);
  if (footing) {
    const fx0 = TX_X0 - TX_FOOT_OVER, fx1 = X1 + TX_FOOT_OVER, fz = TX_FOOT_D / 2, yc = TX_FOOT_H - TX_FOOT_CH;
    const lo = [[fx0, 0, -fz], [fx1, 0, -fz], [fx1, 0, fz], [fx0, 0, fz]], mid = lo.map(([x, , z]) => [x, yc, z]);
    const top = [[fx0 + TX_FOOT_CH, TX_FOOT_H, -fz + TX_FOOT_CH], [fx1 - TX_FOOT_CH, TX_FOOT_H, -fz + TX_FOOT_CH], [fx1 - TX_FOOT_CH, TX_FOOT_H, fz - TX_FOOT_CH], [fx0 + TX_FOOT_CH, TX_FOOT_H, fz - TX_FOOT_CH]];
    const faces = [top, lo];
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; faces.push([lo[i], lo[j], mid[j], mid[i]], [mid[i], mid[j], top[j], top[i]]); }
    solid(faces, [cx, TX_FOOT_H / 2, 0], 'concrete');
  }
  return F.faces;
}

// ---------------------------------------------------------------- tiled roof
const RF_HW = 2.000, RF_ZE = 2.000, RF_ZN = 1.970, RF_ZFA = 1.920;
const RF_FH = 0.120, RF_NOSE = 0.100, RF_HT = 0.050, RF_STEP = 0.050, RF_EPS = 0.008, RF_BT = 0.080;
const RF_RW = 0.20, RF_RT = 0.09, RF_RH = 0.20, RF_RC1 = 0.130, RF_RC2 = 0.090;
const RF_RH2 = 0.070, RF_RCH = 0.030, RF_EBL = 0.180, RF_EBW = 0.165, RF_EBH = 0.060, RF_EBC = 0.040;
export function buildRoof(P = {}) {
  const pitch = Math.min(45, Math.max(25, P.pitch ?? 35));
  const ribs = Math.round(Math.min(9, Math.max(5, P.ribs ?? 8)));
  const courses = Math.round(Math.min(5, Math.max(3, P.courses ?? 4)));
  const th = pitch * Math.PI / 180, T = Math.tan(th), CS = Math.cos(th), SN = Math.sin(th);
  const YD = RF_FH + RF_NOSE - RF_HT / CS;
  const Pd = (z) => YD + (RF_ZN - z) * T;
  const Y = (z, h) => Pd(z) + h / CS;
  const cz = RF_ZN / courses, zAt = (i) => (i >= courses ? RF_ZN : i * cz), hc = (i) => RF_HT + (courses - 1 - i) * RF_STEP;
  const h0 = hc(0), B0 = RF_ZFA * T, pr = (2 * RF_HW) / ribs;
  const rw = RF_RW * pr, rt = RF_RT * pr, rh = RF_RH * pr, rb = rw + RF_STEP * (rw - rt) / rh;
  const Y1 = Y(0, h0 + rh) + 0.01, Y2 = Y1 + RF_RH2, Yb = Y2 + RF_EBH;
  const xi = () => RF_HW - RF_BT, wEnd = () => RF_EBW;
  const F = faceSink();
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const area2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const earClip = (P2) => {
    const idx = P2.map((_, i) => i), out = [];
    const E = 1e-10;
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    const inTri = (p, a, b, c) => area2(a, b, p) >= -E && area2(b, c, p) >= -E && area2(c, a, p) >= -E;
    let strict = true;
    while (idx.length > 3) {
      let cut = -1;
      for (let k = 0; k < idx.length && cut < 0; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        const a = P2[i0], b = P2[i1], c = P2[i2];
        if (area2(a, b, c) <= E) continue;
        let ok = true;
        for (const j of idx) {
          if (j === i0 || j === i1 || j === i2) continue;
          const q = P2[j];
          if (same(q, a) || same(q, b) || same(q, c)) continue;
          if (strict ? inTri(q, a, b, c) : (area2(a, b, q) > E && area2(b, c, q) > E && area2(c, a, q) > E)) { ok = false; break; }
        }
        if (ok) cut = k;
      }
      if (cut < 0) { if (strict) { strict = false; continue; } break; }
      const k = cut;
      out.push([idx[(k + idx.length - 1) % idx.length], idx[k], idx[(k + 1) % idx.length]]);
      idx.splice(k, 1);
    }
    if (idx.length === 3 && area2(P2[idx[0]], P2[idx[1]], P2[idx[2]]) > E) out.push([idx[0], idx[1], idx[2]]);
    return out;
  };
  const poly = (pts, zone, n) => {
    const q = [];
    for (const p of pts) { const l = q[q.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1], p[2] - l[2]) > 1e-7) q.push(p); }
    while (q.length > 1 && Math.hypot(...sub(q[0], q[q.length - 1])) <= 1e-7) q.pop();
    if (q.length < 3) return;
    const nn = unit(n), u = unit(cross(Math.abs(nn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], nn)), v = cross(nn, u);
    let order = q.map((_, i) => i);
    let P2 = q.map((p) => [dot(p, u), dot(p, v)]);
    let A = 0;
    for (let i = 0; i < P2.length; i++) { const a = P2[i], b = P2[(i + 1) % P2.length]; A += a[0] * b[1] - b[0] * a[1]; }
    if (A < 0) { order = order.reverse(); P2 = order.map((i) => [dot(q[i], u), dot(q[i], v)]); }
    for (const [a, b, c] of earClip(P2)) F.tri(q[order[a]], q[order[b]], q[order[c]], zone);
  };
  for (const sz of [1, -1]) {
    const M = (x, y, z) => [x, y, sz * z];
    const nSlope = M(0, CS, SN), nDown = M(0, 0, 1);
    for (let i = 0; i < courses; i++) {
      const zA = zAt(i), zB = zAt(i + 1), h = hc(i);
      if (i === 0) {
        const yp = Y(RF_RC1, h), ye = Y(RF_EBW, h), pts = [];
        pts.push(M(-RF_HW, ye, RF_EBW), M(-(RF_HW - RF_EBL), ye, RF_EBW), M(-(RF_HW - RF_EBL), yp, RF_RC1));
        pts.push(M(RF_HW - RF_EBL, yp, RF_RC1), M(RF_HW - RF_EBL, ye, RF_EBW), M(RF_HW, ye, RF_EBW));
        pts.push(M(RF_HW, Y(zB, h), zB), M(-RF_HW, Y(zB, h), zB));
        poly(pts, 'tile', nSlope);
      } else poly([M(-RF_HW, Y(zA, h), zA), M(RF_HW, Y(zA, h), zA), M(RF_HW, Y(zB, h), zB), M(-RF_HW, Y(zB, h), zB)], 'tile', nSlope);
      if (i < courses - 1) {
        const h1 = hc(i + 1);
        poly([M(-RF_HW, Y(zB, h1), zB), M(RF_HW, Y(zB, h1), zB), M(RF_HW, Y(zB, h), zB), M(-RF_HW, Y(zB, h), zB)], 'tile', nDown);
      } else {
        const yt = Y(RF_ZN, h), pts = [M(-xi(-1), RF_FH, RF_ZN), M(xi(1), RF_FH, RF_ZN), M(RF_HW - RF_BT, YD, RF_ZN), M(RF_HW, YD, RF_ZN), M(RF_HW, yt, RF_ZN), M(-RF_HW, yt, RF_ZN), M(-RF_HW, YD, RF_ZN), M(-(RF_HW - RF_BT), YD, RF_ZN)];
        poly(pts, 'tile', nDown);
      }
    }
    for (let i = 0; i < courses; i++) {
      const zA = zAt(i), h = hc(i), zF = i < courses - 1 ? zAt(i + 1) + RF_EPS : RF_ZE;
      for (let k = 0; k < ribs; k++) {
        const xc = -RF_HW + pr * (k + 0.5);
        const at = (z) => ({ BL: M(xc - rb, Y(z, h - RF_STEP), z), TL: M(xc - rt, Y(z, h + rh), z), TR: M(xc + rt, Y(z, h + rh), z), BR: M(xc + rb, Y(z, h - RF_STEP), z) });
        const a = at(zA), f = at(zF), b = i < courses - 1 ? f : { ...at(RF_ZN), TL: f.TL, TR: f.TR };
        poly([a.BL, b.BL, b.TL, a.TL], 'tile', M(-1, 0.4, 0));
        poly([a.TL, b.TL, b.TR, a.TR], 'tile', nSlope);
        poly([a.TR, b.TR, b.BR, a.BR], 'tile', M(1, 0.4, 0));
        poly([b.BL, b.BR, b.TR, b.TL], 'tile', nDown);
      }
    }
    const xL = -xi(-1), xR = xi(1);
    poly([M(xL, 0, RF_ZFA), M(xR, 0, RF_ZFA), M(xR, RF_FH, RF_ZFA), M(xL, RF_FH, RF_ZFA)], 'trim', nDown);
    poly([M(xL, RF_FH, RF_ZFA), M(xR, RF_FH, RF_ZFA), M(xR, RF_FH, RF_ZN), M(xL, RF_FH, RF_ZN)], 'tile', [0, -1, 0]);
  }
  const xL = -xi(-1), xR = xi(1);
  poly([[xL, 0, -RF_ZFA], [xR, 0, -RF_ZFA], [xR, 0, RF_ZFA], [xL, 0, RF_ZFA]], 'plaster', [0, -1, 0]);
  {
    const xa = -(RF_HW - RF_EBL), xb = RF_HW - RF_EBL, yp = Y(RF_RC1, h0);
    for (const sz of [1, -1]) {
      const M = (x, y, z) => [x, y, sz * z];
      poly([M(xa, yp, RF_RC1), M(xb, yp, RF_RC1), M(xb, Y1, RF_RC1), M(xa, Y1, RF_RC1)], 'ridge', M(0, 0, 1));
      poly([M(xa, Y1, RF_RC1), M(xb, Y1, RF_RC1), M(xb, Y1, RF_RC2), M(xa, Y1, RF_RC2)], 'ridge', [0, 1, 0]);
      poly([M(xa, Y1, RF_RC2), M(xb, Y1, RF_RC2), M(xb, Y2 - RF_RCH, RF_RC2), M(xa, Y2 - RF_RCH, RF_RC2)], 'ridge', M(0, 0, 1));
      poly([M(xa, Y2 - RF_RCH, RF_RC2), M(xb, Y2 - RF_RCH, RF_RC2), M(xb, Y2, RF_RC2 - RF_RCH), M(xa, Y2, RF_RC2 - RF_RCH)], 'ridge', M(0, 1, 1));
    }
    poly([[xa, Y2, -(RF_RC2 - RF_RCH)], [xb, Y2, -(RF_RC2 - RF_RCH)], [xb, Y2, RF_RC2 - RF_RCH], [xa, Y2, RF_RC2 - RF_RCH]], 'ridge', [0, 1, 0]);
    for (const sx of [1, -1]) {
      const X = sx * RF_HW, nX = [sx, 0, 0], xo = X, xn = sx * (RF_HW - RF_EBL), xoc = sx * (RF_HW - RF_EBC), xnc = sx * (RF_HW - RF_EBL + RF_EBC);
      const ye = Y(RF_EBW, h0), ybE = ye - 0.03, yc = Yb - RF_EBC, w2 = RF_EBW - RF_EBC;
      poly([[xoc, Yb, -w2], [xoc, Yb, w2], [xnc, Yb, w2], [xnc, Yb, -w2]], 'ridge', [0, 1, 0]);
      for (const sz of [1, -1]) {
        poly([[xo, yc, sz * RF_EBW], [xn, yc, sz * RF_EBW], [xnc, Yb, sz * w2], [xoc, Yb, sz * w2]], 'ridge', [0, 1, sz]);
        poly([[xo, ybE, sz * RF_EBW], [xn, ybE, sz * RF_EBW], [xn, yc, sz * RF_EBW], [xo, yc, sz * RF_EBW]], 'ridge', [0, 0, sz]);
      }
      poly([[xo, yc, -RF_EBW], [xo, yc, RF_EBW], [xoc, Yb, w2], [xoc, Yb, -w2]], 'ridge', [sx, 1, 0]);
      poly([[xn, yc, -RF_EBW], [xn, yc, RF_EBW], [xnc, Yb, w2], [xnc, Yb, -w2]], 'ridge', [-sx, 1, 0]);
      poly([[xo, ye, -RF_EBW], [xo, Y(0, h0), 0], [xo, ye, RF_EBW], [xo, yc, RF_EBW], [xo, yc, -RF_EBW]], 'ridge', nX);
      poly([[xn, ybE, -RF_EBW], [xn, ybE, RF_EBW], [xn, yc, RF_EBW], [xn, yc, -RF_EBW]], 'ridge', [-sx, 0, 0]);
    }
  }
  for (const sx of [1, -1]) {
    const X = sx * RF_HW, nX = [sx, 0, 0];
    const prof = () => {
      const out = [[RF_ZN, YD], [RF_ZN, Y(RF_ZN, hc(courses - 1))]];
      for (let i = courses - 1; i >= 1; i--) out.push([zAt(i), Y(zAt(i), hc(i))], [zAt(i), Y(zAt(i), hc(i - 1))]);
      const w = wEnd(sx);
      out.push([w, Y(w, h0)], [0, Y(0, h0)]);
      return out;
    };
    const half = prof(), zy = half.concat(half.slice().reverse().map(([z, y]) => [-z, y]));
    zy.push([0, Pd(0)]);
    poly(zy.map(([z, y]) => [X, y, z]), 'tile', nX);
    const xin = sx * (RF_HW - RF_BT);
    for (const sz of [1, -1]) {
      const M = (x, y, z) => [x, y, sz * z];
      const nSlope = M(0, CS, SN), nDown = M(0, 0, 1), nUnder = M(0, -CS, -SN);
      poly([M(X, 0, RF_ZN), M(X, YD, RF_ZN), M(X, Pd(0), 0), M(X, B0, 0), M(X, 0, RF_ZFA)], 'trim', nX);
      poly([M(xin, 0, RF_ZFA), M(X, 0, RF_ZFA), M(X, 0, RF_ZN), M(xin, 0, RF_ZN)], 'trim', [0, -1, 0]);
      poly([M(xin, B0, 0), M(X, B0, 0), M(X, 0, RF_ZFA), M(xin, 0, RF_ZFA)], 'trim', nUnder);
      poly([M(xin, 0, RF_ZN), M(X, 0, RF_ZN), M(X, YD, RF_ZN), M(xin, YD, RF_ZN), M(xin, RF_FH, RF_ZN)], 'trim', nDown);
      poly([M(xin, 0, RF_ZFA), M(xin, 0, RF_ZN), M(xin, RF_FH, RF_ZN), M(xin, RF_FH, RF_ZFA)], 'trim', [-sx, 0, 0]);
    }
    poly([[xin, 0, -RF_ZFA], [xin, 0, RF_ZFA], [xin, B0, 0]], 'plaster', nX);
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const f of F.faces) for (const p of f.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
  const dx = -(x0 + x1) / 2, dz = -(z0 + z1) / 2;
  for (const f of F.faces) for (const p of f.pts) { p[0] += dx; p[2] += dz; }
  return F.faces;
}

// ---------------------------------------------------------------- carousel
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
export function buildCarousel(P = {}) {
  const load = P.load ?? 'few';
  const F = faceSink();
  const path = { L: 4, at: (s) => ({ x: s - 2, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 }), samples: [0, 4], units: CR_PERIOD, S: (q) => q * CR_PITCH };
  const edgeCol = (j) => CR_PROF[j][2];
  for (let i = 0; i < path.samples.length - 1; i++) {
    const a = path.at(path.samples[i]), b = path.at(path.samples[i + 1]), m = path.at((path.samples[i] + path.samples[i + 1]) / 2);
    for (let j = 0; j < CR_PROF.length - 1; j++) {
      const [w0, y0] = CR_PROF[j], [w1, y1] = CR_PROF[j + 1], ow = -(y1 - y0), oy = w1 - w0;
      F.poly([crP3(a, w0, y0), crP3(b, w0, y0), crP3(b, w1, y1), crP3(a, w1, y1)], edgeCol(j), [m.nx * ow, oy, m.nz * ow]);
    }
    const t0 = 0.55;
    F.poly([crP3(a, -t0, 0), crP3(b, -t0, 0), crP3(b, t0, 0), crP3(a, t0, 0)], 'skirt', [0, -1, 0]);
  }
  const lower = [[-0.55, 0], [0.55, 0], [0.55, 0.05], [0.60, 0.05], [0.60, 0.40], [0.57, 0.43], [-0.57, 0.43], [-0.60, 0.40], [-0.60, 0.05], [-0.55, 0.05]];
  const upper = [[-0.57, 0.43], [0.57, 0.43], [0.57, 0.48], [0.55, 0.50], [0.50, 0.50], [0.50, CR_DECK_F], [-0.50, CR_DECK_B], [-0.50, CR_RAIL_B], [-0.55, CR_RAIL_B], [-0.57, CR_RAIL_B - 0.02]];
  for (const s of [0, path.L]) {
    const f = path.at(s), sg = s === 0 ? -1 : 1, hint = [f.tx * sg, 0, f.tz * sg];
    F.poly(lower.map(([w, y]) => crP3(f, w, y)), 'skirt', hint);
    F.poly(upper.map(([w, y]) => crP3(f, w, y)), 'frame', hint);
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
    const poly = clipS(quad, 0, path.L);
    if (poly.length < 3) continue;
    const top = poly.map((v) => crP3(path.at(v.s), v.w, hAt(i, v) + CR_PT)), bot = poly.map((v) => crP3(path.at(v.s), v.w, hAt(i, v)));
    F.poly(top, 'plates', [0, 1, 0]);
    let cs = 0, cw = 0;
    for (const v of poly) { cs += v.s; cw += v.w; }
    cs /= poly.length; cw /= poly.length;
    const cf = crP3(path.at(cs), cw, 0);
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const onLo = Math.abs(a.s) < 1e-6 && Math.abs(b.s) < 1e-6, onHi = Math.abs(a.s - path.L) < 1e-6 && Math.abs(b.s - path.L) < 1e-6;
      const ua = a.s - CR_SKEW * a.w, ub = b.s - CR_SKEW * b.w, isLead = Math.abs(ua - u0) < 1e-6 && Math.abs(ub - u0) < 1e-6;
      if (isLead && !onLo && !onHi) continue;
      const mid = [(top[k][0] + top[(k + 1) % poly.length][0]) / 2, 0, (top[k][2] + top[(k + 1) % poly.length][2]) / 2];
      F.poly([bot[k], bot[(k + 1) % poly.length], top[(k + 1) % poly.length], top[k]], 'plates', [mid[0] - cf[0], 0, mid[2] - cf[2]]);
    }
  }
  const hardCase = (col, O, A, B, U, len = 0.62, wid = 0.42, ht = 0.24) => {
    const a = len / 2, b = wid / 2, c = 0.06;
    const ring = [[a, -b + c], [a, b - c], [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c], [-a + c, -b], [a - c, -b]];
    const lo = ring.map(([x, y]) => crAt3(O, A, B, U, x, y, 0)), hi = ring.map(([x, y]) => crAt3(O, A, B, U, x, y, ht));
    F.poly(hi, col, U);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8, [x0, y0] = ring[i], [x1, y1] = ring[j], n = [(x0 + x1) / 2, (y0 + y1) / 2];
      F.poly([lo[i], lo[j], hi[j], hi[i]], col, crAt3([0, 0, 0], A, B, U, n[0], n[1], 0));
    }
  };
  const duffel = (col, O, A, B, U, len = 0.55, wid = 0.34, ht = 0.23) => {
    const rb = wid / 2, rh = ht / 2 / Math.sin(Math.PI / 3), hex = [];
    for (let k = 0; k < 6; k++) { const t = (k * Math.PI) / 3; hex.push([rb * Math.cos(t), ht / 2 + rh * Math.sin(t)]); }
    const ends = [-len / 2, len / 2].map((a) => hex.map(([b, h]) => crAt3(O, A, B, U, a, b, h)));
    F.poly(ends[0], col, [-A[0], -A[1], -A[2]]); F.poly(ends[1], col, A);
    for (let k = 0; k < 6; k++) {
      const j = (k + 1) % 6; if (k === 4) continue;
      const [b0, h0] = hex[k], [b1, h1] = hex[j], n = crAt3([0, 0, 0], A, B, U, 0, (b0 + b1) / 2, (h0 + h1) / 2 - ht / 2);
      F.poly([ends[0][k], ends[1][k], ends[1][j], ends[0][j]], col, n);
    }
  };
  const F0 = { x: 0, z: 0, tx: 1, tz: 0, nx: 0, nz: 1 }, rnd = wtPrng(17), Lp = CR_PERIOD * CR_PITCH;
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
    const before = F.faces.length;
    if (isCase) hardCase('hardCase', O, A, B, U); else duffel('duffel', O, B, A, U, 0.55, 0.34, 0.23);
    const dx = path.S(q) - 2;
    for (let i = before; i < F.faces.length; i++) for (const p of F.faces[i].pts) p[0] += dx;
  }
  return F.faces;
}
