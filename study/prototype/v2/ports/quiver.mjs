// Arrow quiver — geometric port of the reference leather tube, stitched seam,
// shoulder strap/buckle and the full seven-arrow bundle.
import { faceSink, v3 } from './_facekit.mjs';

const SEG = 8, PH = Math.PI / 8, ZS = 0.92, C8 = Math.cos(Math.PI / 8);
const PALETTE = {
  'saddle-tan': { leather: '#9d846c', rim: '#6e423a', stitch: '#54352f', shaft: '#715a4e', fletch: '#d9dbe0', buckle: '#c6ab55', bark: '#8c6857', cord: '#e1e1e5', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
  oxblood: { leather: '#a0454b', rim: '#54352f', stitch: '#b2a299', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#95a0b5', bark: '#715a4e', cord: '#d9dbe0', alloy: '#7f8da3', fittings: '#4f6284', glow: '#63cadc' },
  'ranger-green': { leather: '#27372e', rim: '#54352f', stitch: '#9d846c', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#6e423a', cord: '#b2a299', alloy: '#6e7b97', fittings: '#45495d', glow: '#4eb764' },
  'frost-steel': { leather: '#7f8da3', rim: '#4f6284', stitch: '#d9dbe0', shaft: '#9d846c', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#b2a299', cord: '#af8984', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'saddle-tan', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'saddle-tan' });

  const L = 1, taper = 0.5;
  const b0 = 0.40 * L, rt = 0.068, rb = rt * (1 - 0.48 * taper), capTop = 0.048;
  const rAt = (y) => rb + (rt - rb) * (y - capTop) / (b0 - capTop);
  const apo = (r) => r * C8 * ZS;
  const F = faceSink();
  const quad = (a, b, c, d, zone, inside) => F.quad(a, b, c, d, zone, undefined, inside);
  const tri = (a, b, c, zone, inside) => F.tri(a, b, c, zone, undefined, inside);
  const raw = (zone, a, b, c) => F.tri(a, b, c, zone);

  const prof = [];
  const pt = (r, y, z) => prof.push([r, y, z]);
  pt(rb * 0.58, 0, null);
  pt(rb + 0.005, 0.042, 'rim');
  pt(rb, capTop, 'rim');
  pt(rt, b0, 'leather');
  const gr = 0.005;
  pt(rt + 0.012, b0 + 0.010, 'rim');
  pt(rt + 0.012, b0 + 0.044, 'rim');
  pt(rt + gr, b0 + 0.051, 'rim');
  pt(rt + gr, b0 + 0.058, 'rim');
  pt(rt + 0.013, b0 + 0.065, 'rim');
  pt(rt + 0.013, b0 + 0.090, 'rim');
  pt(rt + 0.006, b0 + 0.097, 'rim');
  pt(rt - 0.004, b0 + 0.097, 'rim');
  const floorY = b0 + 0.055, innerR = rt - 0.006;
  pt(innerR, floorY, 'rim');
  const rimTop = b0 + 0.097;

  const ring = prof.map(([r, y]) => {
    const out = [];
    for (let k = 0; k < SEG; k++) {
      const a = PH + (k / SEG) * Math.PI * 2, rr = r;
      out.push([rr * Math.sin(a), y, rr * Math.cos(a) * ZS]);
    }
    return out;
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const zone = prof[i + 1][2];
    for (let k = 0; k < SEG; k++) {
      const a = ring[i][k], b = ring[i][(k + 1) % SEG], c = ring[i + 1][(k + 1) % SEG], d = ring[i + 1][k];
      raw(zone, a, b, c); raw(zone, a, c, d);
    }
  }
  const bot = ring[0], flo = ring[ring.length - 1];
  for (let k = 1; k < SEG - 1; k++) {
    raw('rim', bot[0], bot[k + 1], bot[k]);
    raw(prof[prof.length - 1][2], flo[0], flo[k], flo[k + 1]);
  }

  // Stitched seam.
  const pitch = 0.042, y0 = capTop + 0.028, y1 = b0 - 0.02;
  const n = Math.max(2, Math.floor((y1 - y0) / pitch) + 1);
  const vert = (k, y) => {
    const a = PH + (k / SEG) * Math.PI * 2, r = rAt(y);
    return [r * Math.sin(a), y, r * Math.cos(a) * ZS];
  };
  for (let i = 0; i < n; i++) {
    const y = y0 + i * pitch;
    for (const s of [1, -1]) {
      const [ka, kb, u] = s > 0 ? [2, 3, 0.7] : [5, 4, 0.7];
      const A = vert(ka, y), B = vert(kb, y);
      const c = v3.lerp(A, B, u);
      const along = v3.norm(v3.sub(B, A));
      const upF = v3.norm(v3.sub(v3.lerp(vert(ka, y + 0.05), vert(kb, y + 0.05), u), c));
      let nrm = v3.norm(v3.cross(along, upF));
      if (v3.dot(nrm, [c[0], 0, c[2]]) < 0) nrm = v3.mul(nrm, -1);
      const ang = 0.65;
      const uu = v3.add(v3.mul(upF, Math.cos(ang)), v3.mul(along, Math.sin(ang)));
      const w = v3.norm(v3.cross(nrm, uu));
      const base = [
        v3.add(c, v3.mul(uu, 0.012)), v3.add(c, v3.mul(w, 0.0045)),
        v3.add(c, v3.mul(uu, -0.012)), v3.add(c, v3.mul(w, -0.0045)),
      ];
      const apex = v3.add(c, v3.mul(nrm, 0.0055));
      const hint = v3.add(c, v3.mul(nrm, -0.01));
      for (let k = 0; k < 4; k++) tri(apex, base[k], base[(k + 1) % 4], 'stitch', hint);
    }
  }

  // Shoulder strap.
  const backZ = (y) => -apo(rAt(y));
  const zone = 'rim', w = 0.032, t = 0.011;
  const yT = b0 + 0.027, rTop = rt + 0.012;
  const yB = Math.max(capTop + 0.035, 0.09 * L);
  const span = yT - yB;
  const key = [[0.93, 0.03], [0.78, 0.07], [0.60, 0.10], [0.42, 0.115], [0.24, 0.112],
    [0.10, 0.09], [0.02, 0.055], [-0.03, 0.022]];
  const path = [[0, yT, -apo(rTop) + 0.006]];
  for (const [f, d] of key) { const y = yB + f * span; path.push([0, y, backZ(y) - d]); }
  const yE = yB - 0.03 * span;
  path.push([0, yE, backZ(yE) + 0.006]);
  const cen = path.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map((v) => v / path.length);
  const X = [1, 0, 0];
  const frames = path.map((p, i) => {
    const T = v3.norm(v3.sub(path[Math.min(i + 1, path.length - 1)], path[Math.max(i - 1, 0)]));
    let N = [0, -T[2], T[1]];
    if (v3.dot(N, v3.sub(p, cen)) < 0) N = v3.mul(N, -1);
    return { p, T, N };
  });
  const secs = frames.map(({ p, N }) => [
    v3.add(v3.add(p, v3.mul(X, -w / 2)), v3.mul(N, -t / 2)),
    v3.add(v3.add(p, v3.mul(X, w / 2)), v3.mul(N, -t / 2)),
    v3.add(v3.add(p, v3.mul(X, w / 2)), v3.mul(N, t / 2)),
    v3.add(v3.add(p, v3.mul(X, -w / 2)), v3.mul(N, t / 2)),
  ]);
  for (let i = 0; i < secs.length - 1; i++) {
    const hint = v3.mul(v3.add(frames[i].p, frames[i + 1].p), 0.5);
    for (let k = 0; k < 4; k++) quad(secs[i][k], secs[i][(k + 1) % 4], secs[i + 1][(k + 1) % 4], secs[i + 1][k], zone, hint);
  }

  // Buckle and strap tab.
  const i0 = 2, i1 = 3;
  const segAt = (f) => {
    const p = v3.lerp(frames[i0].p, frames[i1].p, f);
    const T = v3.norm(v3.sub(frames[i1].p, frames[i0].p));
    let N = [0, -T[2], T[1]];
    if (v3.dot(N, v3.sub(p, cen)) < 0) N = v3.mul(N, -1);
    return { p, T, N };
  };
  const bf = segAt(0.32);
  const fw = 0.046, fh = 0.036, bar = 0.0065, n0 = t / 2 - 0.001, n1 = t / 2 + 0.0045;
  const corner = (sx, sy, inset, nn) => v3.add(v3.add(v3.add(bf.p, v3.mul(X, sx * (fw / 2 - inset))), v3.mul(bf.T, sy * (fh / 2 - inset))), v3.mul(bf.N, nn));
  const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const O0 = sq.map(([a, b]) => corner(a, b, 0, n0)), O1 = sq.map(([a, b]) => corner(a, b, 0, n1));
  const I0 = sq.map(([a, b]) => corner(a, b, bar, n0)), I1 = sq.map(([a, b]) => corner(a, b, bar, n1));
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    const mid = v3.mul(v3.add(v3.add(O0[k], O0[k2]), v3.add(I1[k], I1[k2])), 0.25);
    const hTop = v3.add(mid, v3.mul(bf.N, -0.01));
    const hBot = v3.add(mid, v3.mul(bf.N, 0.01));
    quad(O1[k], O1[k2], I1[k2], I1[k], 'buckle', hTop);
    if (k !== 0) quad(O0[k], O0[k2], I0[k2], I0[k], 'buckle', hBot);
    const ctr = v3.add(bf.p, v3.mul(bf.N, (n0 + n1) / 2));
    quad(O0[k], O0[k2], O1[k2], O1[k], 'buckle', ctr);
    quad(I0[k], I0[k2], I1[k2], I1[k], 'buckle', mid);
  }
  const tf = segAt(0.74);
  const tw = 0.024, th = 0.03, m0 = t / 2 - 0.001, m1 = t / 2 + 0.0035;
  const tc = (sx, sy, nn) => v3.add(v3.add(v3.add(tf.p, v3.mul(X, sx * tw / 2)), v3.mul(tf.T, sy * th / 2)), v3.mul(tf.N, nn));
  const B0 = sq.map(([a, b]) => tc(a, b, m0)), B1 = sq.map(([a, b]) => tc(a, b, m1));
  const tHint = v3.add(tf.p, v3.mul(tf.N, (m0 + m1) / 2));
  quad(B1[0], B1[1], B1[2], B1[3], 'rim', tHint);
  for (let k = 1; k < 4; k++) quad(B0[k], B0[(k + 1) % 4], B1[(k + 1) % 4], B1[k], 'rim', tHint);

  // Arrows.
  const SH = 0.0065, K = 2.3;
  const arrow = (px, pz, rise, vanes) => {
    const Dv = v3.norm([px * K, 1, pz * K]);
    const E1 = v3.norm(v3.sub([1, 0, 0], v3.mul(Dv, Dv[0])));
    const E2 = v3.norm(v3.cross(E1, Dv));
    const base = [px, floorY - 0.006, pz];
    const len = (rimTop + rise - base[1]) / Dv[1];
    const at = (s, ang, rho, off = 0) => v3.add(v3.add(v3.add(base, v3.mul(Dv, s)), v3.mul(E1, Math.cos(ang) * rho - Math.sin(ang) * off)), v3.mul(E2, Math.sin(ang) * rho + Math.cos(ang) * off));
    const cs = [0, 1, 2, 3].map((j) => Math.PI / 4 + j * Math.PI / 2);
    const botA = cs.map((a) => at(0, a, SH)), topA = cs.map((a) => at(len, a, SH));
    const axisHint = (s) => v3.add(base, v3.mul(Dv, s));
    for (let j = 0; j < 4; j++) quad(botA[j], botA[(j + 1) % 4], topA[(j + 1) % 4], topA[j], 'shaft', axisHint(len / 2));
    quad(topA[0], topA[1], topA[2], topA[3], 'shaft', axisHint(len - 0.01));
    const th2 = 0.0035;
    const outline = [[0.003, len - 0.014], [0.019, len - 0.036], [0.017, len - 0.104], [0.003, len - 0.116]];
    for (const a of vanes) {
      const Fv = outline.map(([r, s]) => at(s, a, r, th2 / 2)), Bk = outline.map(([r, s]) => at(s, a, r, -th2 / 2));
      const hint = at(len - 0.066, a, 0.012);
      quad(Fv[0], Fv[1], Fv[2], Fv[3], 'fletch', hint);
      quad(Bk[0], Bk[1], Bk[2], Bk[3], 'fletch', hint);
      for (let j = 0; j < 3; j++) quad(Fv[j], Fv[(j + 1) % 4], Bk[(j + 1) % 4], Bk[j], 'fletch', hint);
    }
  };
  const sym = [Math.PI / 2, Math.PI / 2 + 2 * Math.PI / 3, Math.PI / 2 + 4 * Math.PI / 3];
  const set = [
    [0, 0.002, 0.205, null], [0, 0.038, 0.170, null], [0, -0.038, 0.192, null],
    [0.034, 0.018, 0.183, 0.35], [0.031, -0.021, 0.198, -0.5],
  ];
  for (const [px, pz, rise, off] of set) {
    if (px === 0) arrow(0, pz, rise, sym);
    else {
      const vs = [0, 1, 2].map((j) => off + j * 2 * Math.PI / 3);
      arrow(px, pz, rise, vs);
      arrow(-px, pz, rise, vs.map((a) => Math.PI - a));
    }
  }

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { leather: at(pal, 'leather'), rim: at(pal, 'rim'), stitch: at(pal, 'stitch'), shaft: at(pal, 'shaft'), fletch: at(pal, 'fletch'), buckle: at(pal, 'buckle'), bark: at(pal, 'bark'), cord: at(pal, 'cord'), alloy: at(pal, 'alloy'), fittings: at(pal, 'fittings'), glow: at(pal, 'glow') },
  });
}
