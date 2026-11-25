// Arrow quiver — the leather tube is one zoned loft, stitches are studs, the
// strap is a section loft, and each arrow is a shaft loft with frustum vanes.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'saddle-tan': { leather: '#9d846c', rim: '#6e423a', stitch: '#54352f', shaft: '#715a4e', fletch: '#d9dbe0', buckle: '#c6ab55', bark: '#8c6857', cord: '#e1e1e5', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
  oxblood: { leather: '#a0454b', rim: '#54352f', stitch: '#b2a299', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#95a0b5', bark: '#715a4e', cord: '#d9dbe0', alloy: '#7f8da3', fittings: '#4f6284', glow: '#63cadc' },
  'ranger-green': { leather: '#27372e', rim: '#54352f', stitch: '#9d846c', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#6e423a', cord: '#b2a299', alloy: '#6e7b97', fittings: '#45495d', glow: '#4eb764' },
  'frost-steel': { leather: '#7f8da3', rim: '#4f6284', stitch: '#d9dbe0', shaft: '#9d846c', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#b2a299', cord: '#af8984', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const QV_SEG = 8, QV_PH = Math.PI / 8, QV_ZS = 0.92, QV_C8 = Math.cos(Math.PI / 8);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'saddle-tan', { options: Object.keys(PALETTE), label: 'Colorway' });
  const L = Math.min(1.25, Math.max(0.8, params.length ?? 1));
  const taper = Math.min(1, Math.max(0, params.taper ?? 0.5));
  const strap = params.strap !== false;
  const b0 = 0.40 * L, rt = 0.068, rb = rt * (1 - 0.48 * taper), capTop = 0.048;
  const rAt = (y) => rb + (rt - rb) * (y - capTop) / (b0 - capTop);
  const apo = (r) => r * QV_C8 * QV_ZS;
  const parts = [];
  const poly = (pts, zone, hint, inside) => parts.push(g.poly({ pts, zone, hint, inside }));

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
  const rings = prof.map(([r, y]) => {
    const out = [];
    for (let k = 0; k < QV_SEG; k++) { const a = QV_PH + (k / QV_SEG) * Math.PI * 2; out.push([r * Math.sin(a), y, r * Math.cos(a) * QV_ZS]); }
    return out;
  });
  const bandZones = prof.slice(1).map((p) => p[2]);
  parts.push(g.loft({ rings, diagonal: 'ab', bandZones, zones: { band: 'rim' } }));
  const bot = rings[0], flo = rings[rings.length - 1];
  poly([bot[0], ...bot.slice(1).reverse()], 'rim');
  poly(flo, prof[prof.length - 1][2]);

  const pitch = 0.042, y0 = capTop + 0.028, y1 = b0 - 0.02;
  const n = Math.max(2, Math.floor((y1 - y0) / pitch) + 1);
  const vert = (k, y) => { const a = QV_PH + (k / QV_SEG) * Math.PI * 2, r = rAt(y); return [r * Math.sin(a), y, r * Math.cos(a) * QV_ZS]; };
  for (let i = 0; i < n; i++) {
    const y = y0 + i * pitch;
    for (const s of [1, -1]) {
      const [ka, kb, u] = s > 0 ? [2, 3, 0.7] : [5, 4, 0.7];
      const A = vert(ka, y), B = vert(kb, y), c = lerp(A, B, u);
      const along = norm(sub(B, A));
      const upF = norm(sub(lerp(vert(ka, y + 0.05), vert(kb, y + 0.05), u), c));
      let nrm = norm(cross(along, upF));
      if (dot(nrm, [c[0], 0, c[2]]) < 0) nrm = mul(nrm, -1);
      const ang = 0.65, uu = add(mul(upF, Math.cos(ang)), mul(along, Math.sin(ang))), w = norm(cross(nrm, uu));
      parts.push(g.stud({
        x: c[0], y: c[1], z: c[2], nx: nrm[0], ny: nrm[1], nz: nrm[2],
        ux: uu[0], uy: uu[1], uz: uu[2], r: 0.012, r2: 0.0045, h: 0.0055, n: 4, phase: 0,
        inside: add(c, mul(nrm, -0.01)), zone: 'stitch',
      }));
    }
  }

  const backZ = (y) => -apo(rAt(y));
  if (strap) {
    const w = 0.032, t = 0.011, yT = b0 + 0.027, rTop = rt + 0.012;
    const yB = Math.max(capTop + 0.035, 0.09 * L), span = yT - yB;
    const key = [[0.93, 0.03], [0.78, 0.07], [0.60, 0.10], [0.42, 0.115], [0.24, 0.112], [0.10, 0.09], [0.02, 0.055], [-0.03, 0.022]];
    const path = [[0, yT, -apo(rTop) + 0.006]];
    for (const [f, d] of key) { const y = yB + f * span; path.push([0, y, backZ(y) - d]); }
    const yE = yB - 0.03 * span; path.push([0, yE, backZ(yE) + 0.006]);
    const cen = path.reduce((s, p) => add(s, p), [0, 0, 0]).map((v) => v / path.length);
    const X = [1, 0, 0];
    const frames = path.map((p, i) => {
      const T = norm(sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)]));
      let N = [0, -T[2], T[1]];
      if (dot(N, sub(p, cen)) < 0) N = mul(N, -1);
      return { p, T, N };
    });
    const secs = frames.map(({ p, N }) => [
      add(add(p, mul(X, -w / 2)), mul(N, -t / 2)), add(add(p, mul(X, w / 2)), mul(N, -t / 2)),
      add(add(p, mul(X, w / 2)), mul(N, t / 2)), add(add(p, mul(X, -w / 2)), mul(N, t / 2)),
    ]);
    const inside = [];
    for (let i = 0; i < secs.length - 1; i++) inside.push(mul(add(frames[i].p, frames[i + 1].p), 0.5));
    parts.push(g.loft({ rings: secs, diagonal: 'ab', inside, zones: { band: 'rim' } }));

    const i0 = 2, i1 = 3;
    const segAt = (f) => {
      const p = lerp(frames[i0].p, frames[i1].p, f), T = norm(sub(frames[i1].p, frames[i0].p));
      let N = [0, -T[2], T[1]];
      if (dot(N, sub(p, cen)) < 0) N = mul(N, -1);
      return { p, T, N };
    };
    const bf = segAt(0.32), fw = 0.046, fh = 0.036, bar = 0.0065, n0 = t / 2 - 0.001, n1 = t / 2 + 0.0045;
    const corner = (sx, sy, inset, nn) => add(add(add(bf.p, mul(X, sx * (fw / 2 - inset))), mul(bf.T, sy * (fh / 2 - inset))), mul(bf.N, nn));
    const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const O0 = sq.map(([a, b]) => corner(a, b, 0, n0)), O1 = sq.map(([a, b]) => corner(a, b, 0, n1));
    const I0 = sq.map(([a, b]) => corner(a, b, bar, n0)), I1 = sq.map(([a, b]) => corner(a, b, bar, n1));
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4, mid = mul(add(add(O0[k], O0[k2]), add(I1[k], I1[k2])), 0.25);
      const hTop = add(mid, mul(bf.N, -0.01)), hBot = add(mid, mul(bf.N, 0.01));
      poly([O1[k], O1[k2], I1[k2], I1[k]], 'buckle', undefined, hTop);
      if (k !== 0) poly([O0[k], O0[k2], I0[k2], I0[k]], 'buckle', undefined, hBot);
      const ctr = add(bf.p, mul(bf.N, (n0 + n1) / 2));
      poly([O0[k], O0[k2], O1[k2], O1[k]], 'buckle', undefined, ctr);
      poly([I0[k], I0[k2], I1[k2], I1[k]], 'buckle', undefined, mid);
    }
    const tf = segAt(0.74), tw = 0.024, th = 0.03, m0 = t / 2 - 0.001, m1 = t / 2 + 0.0035;
    const tc = (sx, sy, nn) => add(add(add(tf.p, mul(X, sx * tw / 2)), mul(tf.T, sy * th / 2)), mul(tf.N, nn));
    const B0 = sq.map(([a, b]) => tc(a, b, m0)), B1 = sq.map(([a, b]) => tc(a, b, m1)), tHint = add(tf.p, mul(tf.N, (m0 + m1) / 2));
    poly([B1[0], B1[1], B1[2], B1[3]], 'rim', undefined, tHint);
    for (let k = 1; k < 4; k++) poly([B0[k], B0[(k + 1) % 4], B1[(k + 1) % 4], B1[k]], 'rim', undefined, tHint);
  }

  const SH = 0.0065, K = 2.3;
  const arrow = (px, pz, rise, vanes) => {
    const Dv = norm([px * K, 1, pz * K]);
    const E1 = norm(sub([1, 0, 0], mul(Dv, Dv[0]))), E2 = norm(cross(E1, Dv));
    const base = [px, floorY - 0.006, pz], len = (rimTop + rise - base[1]) / Dv[1];
    const at = (s, ang, rho, off = 0) => add(add(add(base, mul(Dv, s)), mul(E1, Math.cos(ang) * rho - Math.sin(ang) * off)), mul(E2, Math.sin(ang) * rho + Math.cos(ang) * off));
    const cs = [0, 1, 2, 3].map((j) => Math.PI / 4 + j * Math.PI / 2);
    const botA = cs.map((a) => at(0, a, SH)), topA = cs.map((a) => at(len, a, SH));
    const axisHint = (s) => add(base, mul(Dv, s));
    parts.push(g.loft({ rings: [botA, topA], diagonal: 'ab', inside: [axisHint(len / 2)], zones: { band: 'shaft' } }));
    poly(topA, 'shaft', undefined, axisHint(len - 0.01));
    const th2 = 0.0035, outline = [[0.003, len - 0.014], [0.019, len - 0.036], [0.017, len - 0.104], [0.003, len - 0.116]];
    for (const a of vanes) {
      const Fv = outline.map(([r, s]) => at(s, a, r, th2 / 2)), Bk = outline.map(([r, s]) => at(s, a, r, -th2 / 2)), hint = at(len - 0.066, a, 0.012);
      parts.push(g.frustum({ a: Fv, b: Bk, skip: '3', capA: true, capB: true, inside: hint, zone: 'fletch' }));
    }
  };
  const sym = [Math.PI / 2, Math.PI / 2 + 2 * Math.PI / 3, Math.PI / 2 + 4 * Math.PI / 3];
  const set = [[0, 0.002, 0.205, null], [0, 0.038, 0.170, null], [0, -0.038, 0.192, null], [0.034, 0.018, 0.183, 0.35], [0.031, -0.021, 0.198, -0.5]];
  for (const [px, pz, rise, off] of set) {
    if (px === 0) arrow(0, pz, rise, sym);
    else { const vs = [0, 1, 2].map((j) => off + j * 2 * Math.PI / 3); arrow(px, pz, rise, vs); arrow(-px, pz, rise, vs.map((a) => Math.PI - a)); }
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'saddle-tan' });
  return g.mesh(g.join(parts), {
    zones: { leather: at(pal, 'leather'), rim: at(pal, 'rim'), stitch: at(pal, 'stitch'), shaft: at(pal, 'shaft'), fletch: at(pal, 'fletch'), buckle: at(pal, 'buckle'), bark: at(pal, 'bark'), cord: at(pal, 'cord'), alloy: at(pal, 'alloy'), fittings: at(pal, 'fittings'), glow: at(pal, 'glow') },
  });
}
