// Tiled roof section — geometric port of the reference default gable roof:
// four stepped courses of eight kawara rolls, closed gable verges, ridge cap,
// fascia, bargeboards and plaster soffit. Ear-clipped pans become face fans;
// the vertex set and winding are unchanged.
import { faceSink } from './_facekit.mjs';

const HW = 2.000, ZE = 2.000, ZN = 1.970, ZFA = 1.920;
const FH = 0.120, NOSE = 0.100, HT = 0.050, STEP = 0.050, EPS = 0.008, BT = 0.080;
const RW = 0.20, RT = 0.09, RH = 0.20, RC1 = 0.130, RC2 = 0.090;
const RH2 = 0.070, RCH = 0.030, EBL = 0.180, EBW = 0.165, EBH = 0.060, EBC = 0.040;
const PALETTE = {
  'slate-kawara': { tile: '#4E5459', ridge: '#3C4145', trim: '#7E4B33', plaster: '#F0EFEC' },
  'charcoal-machiya': { tile: '#3C4145', ridge: '#2E3134', trim: '#42352A', plaster: '#ECE8DE' },
  'pale-alley': { tile: '#8A9197', ridge: '#6B7278', trim: '#8C7355', plaster: '#F7F5EF' },
  'shrine-vermilion': { tile: '#4E5459', ridge: '#3C4145', trim: '#B5462F', plaster: '#F7F5EF' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'slate-kawara', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'slate-kawara' });

  const pitch = 35, ribs = 8, courses = 4;
  const th = pitch * Math.PI / 180, T = Math.tan(th), CS = Math.cos(th), SN = Math.sin(th);
  const YD = FH + NOSE - HT / CS;
  const Pd = (z) => YD + (ZN - z) * T;
  const Y = (z, h) => Pd(z) + h / CS;
  const cz = ZN / courses;
  const zAt = (i) => (i >= courses ? ZN : i * cz);
  const hc = (i) => HT + (courses - 1 - i) * STEP;
  const h0 = hc(0);
  const B0 = ZFA * T;
  const pr = (2 * HW) / ribs;
  const rw = RW * pr, rt = RT * pr, rh = RH * pr;
  const rb = rw + STEP * (rw - rt) / rh;
  const Y1 = Y(0, h0 + rh) + 0.01, Y2 = Y1 + RH2, Yb = Y2 + EBH;
  const closed = () => true;
  const xi = () => HW - BT;
  const wEnd = () => EBW;
  const slopes = [1, -1];

  const F = faceSink();
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const area2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
  const earClip = (P) => {
    const idx = P.map((_, i) => i), out = [];
    const E = 1e-10;
    const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    const inTri = (p, a, b, c) => area2(a, b, p) >= -E && area2(b, c, p) >= -E && area2(c, a, p) >= -E;
    let strict = true;
    while (idx.length > 3) {
      let cut = -1;
      for (let k = 0; k < idx.length && cut < 0; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
        const a = P[i0], b = P[i1], c = P[i2];
        if (area2(a, b, c) <= E) continue;
        let ok = true;
        for (const j of idx) {
          if (j === i0 || j === i1 || j === i2) continue;
          const q = P[j];
          if (same(q, a) || same(q, b) || same(q, c)) continue;
          if (strict ? inTri(q, a, b, c)
            : (area2(a, b, q) > E && area2(b, c, q) > E && area2(c, a, q) > E)) { ok = false; break; }
        }
        if (ok) cut = k;
      }
      if (cut < 0) {
        if (strict) { strict = false; continue; }
        break;
      }
      const k = cut;
      out.push([idx[(k + idx.length - 1) % idx.length], idx[k], idx[(k + 1) % idx.length]]);
      idx.splice(k, 1);
    }
    if (idx.length === 3 && area2(P[idx[0]], P[idx[1]], P[idx[2]]) > E) out.push([idx[0], idx[1], idx[2]]);
    return out;
  };
  const poly = (pts, zone, n) => {
    const q = [];
    for (const p of pts) {
      const l = q[q.length - 1];
      if (!l || Math.hypot(p[0] - l[0], p[1] - l[1], p[2] - l[2]) > 1e-7) q.push(p);
    }
    while (q.length > 1 && Math.hypot(...sub(q[0], q[q.length - 1])) <= 1e-7) q.pop();
    if (q.length < 3) return;
    const nn = unit(n);
    const u = unit(cross(Math.abs(nn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], nn)), v = cross(nn, u);
    let order = q.map((_, i) => i);
    let P2 = q.map((p) => [dot(p, u), dot(p, v)]);
    let A = 0;
    for (let i = 0; i < P2.length; i++) { const a = P2[i], b = P2[(i + 1) % P2.length]; A += a[0] * b[1] - b[0] * a[1]; }
    if (A < 0) { order = order.reverse(); P2 = order.map((i) => [dot(q[i], u), dot(q[i], v)]); }
    for (const [a, b, c] of earClip(P2)) {
      F.tri(q[order[a]], q[order[b]], q[order[c]], zone);
    }
  };

  for (const sz of slopes) {
    const M = (x, y, z) => [x, y, sz * z];
    const nSlope = M(0, CS, SN), nDown = M(0, 0, 1), nUnder = M(0, -CS, -SN);

    for (let i = 0; i < courses; i++) {
      const zA = zAt(i), zB = zAt(i + 1), h = hc(i);
      if (i === 0) {
        const yp = Y(RC1, h), ye = Y(EBW, h), pts = [];
        if (closed(-1)) pts.push(M(-HW, ye, EBW), M(-(HW - EBL), ye, EBW), M(-(HW - EBL), yp, RC1));
        else pts.push(M(-HW, yp, RC1));
        if (closed(1)) pts.push(M(HW - EBL, yp, RC1), M(HW - EBL, ye, EBW), M(HW, ye, EBW));
        else pts.push(M(HW, yp, RC1));
        pts.push(M(HW, Y(zB, h), zB), M(-HW, Y(zB, h), zB));
        poly(pts, 'tile', nSlope);
      } else {
        poly([M(-HW, Y(zA, h), zA), M(HW, Y(zA, h), zA), M(HW, Y(zB, h), zB), M(-HW, Y(zB, h), zB)], 'tile', nSlope);
      }
      if (i < courses - 1) {
        const h1 = hc(i + 1);
        poly([M(-HW, Y(zB, h1), zB), M(HW, Y(zB, h1), zB), M(HW, Y(zB, h), zB), M(-HW, Y(zB, h), zB)], 'tile', nDown);
      } else {
        const yt = Y(ZN, h), pts = [];
        pts.push(M(-xi(-1), FH, ZN), M(xi(1), FH, ZN));
        if (closed(1)) pts.push(M(HW - BT, YD, ZN), M(HW, YD, ZN));
        pts.push(M(HW, yt, ZN), M(-HW, yt, ZN));
        if (closed(-1)) pts.push(M(-HW, YD, ZN), M(-(HW - BT), YD, ZN));
        poly(pts, 'tile', nDown);
      }
    }

    for (let i = 0; i < courses; i++) {
      const zA = zAt(i), h = hc(i);
      const zF = i < courses - 1 ? zAt(i + 1) + EPS : ZE;
      for (let k = 0; k < ribs; k++) {
        const xc = -HW + pr * (k + 0.5);
        const at = (z) => ({
          BL: M(xc - rb, Y(z, h - STEP), z), TL: M(xc - rt, Y(z, h + rh), z),
          TR: M(xc + rt, Y(z, h + rh), z), BR: M(xc + rb, Y(z, h - STEP), z),
        });
        const a = at(zA), f = at(zF);
        const b = i < courses - 1 ? f : { ...at(ZN), TL: f.TL, TR: f.TR };
        poly([a.BL, b.BL, b.TL, a.TL], 'tile', M(-1, 0.4, 0));
        poly([a.TL, b.TL, b.TR, a.TR], 'tile', nSlope);
        poly([a.TR, b.TR, b.BR, a.BR], 'tile', M(1, 0.4, 0));
        poly([b.BL, b.BR, b.TR, b.TL], 'tile', nDown);
      }
    }

    const xL = -xi(-1), xR = xi(1);
    poly([M(xL, 0, ZFA), M(xR, 0, ZFA), M(xR, FH, ZFA), M(xL, FH, ZFA)], 'trim', nDown);
    poly([M(xL, FH, ZFA), M(xR, FH, ZFA), M(xR, FH, ZN), M(xL, FH, ZN)], 'tile', [0, -1, 0]);
  }

  const xL = -xi(-1), xR = xi(1);
  poly([[xL, 0, -ZFA], [xR, 0, -ZFA], [xR, 0, ZFA], [xL, 0, ZFA]], 'plaster', [0, -1, 0]);

  {
    const xa = closed(-1) ? -(HW - EBL) : -HW, xb = closed(1) ? HW - EBL : HW;
    const yp = Y(RC1, h0);
    for (const sz of [1, -1]) {
      const M = (x, y, z) => [x, y, sz * z];
      poly([M(xa, yp, RC1), M(xb, yp, RC1), M(xb, Y1, RC1), M(xa, Y1, RC1)], 'ridge', M(0, 0, 1));
      poly([M(xa, Y1, RC1), M(xb, Y1, RC1), M(xb, Y1, RC2), M(xa, Y1, RC2)], 'ridge', [0, 1, 0]);
      poly([M(xa, Y1, RC2), M(xb, Y1, RC2), M(xb, Y2 - RCH, RC2), M(xa, Y2 - RCH, RC2)], 'ridge', M(0, 0, 1));
      poly([M(xa, Y2 - RCH, RC2), M(xb, Y2 - RCH, RC2), M(xb, Y2, RC2 - RCH), M(xa, Y2, RC2 - RCH)], 'ridge', M(0, 1, 1));
    }
    poly([[xa, Y2, -(RC2 - RCH)], [xb, Y2, -(RC2 - RCH)], [xb, Y2, RC2 - RCH], [xa, Y2, RC2 - RCH]], 'ridge', [0, 1, 0]);
    for (const sx of [1, -1]) {
      const X = sx * HW, nX = [sx, 0, 0];
      if (!closed(sx)) continue;
      const xo = X, xn = sx * (HW - EBL), xoc = sx * (HW - EBC), xnc = sx * (HW - EBL + EBC);
      const ye = Y(EBW, h0), ybE = ye - 0.03, yc = Yb - EBC, w2 = EBW - EBC;
      poly([[xoc, Yb, -w2], [xoc, Yb, w2], [xnc, Yb, w2], [xnc, Yb, -w2]], 'ridge', [0, 1, 0]);
      for (const sz of [1, -1]) {
        poly([[xo, yc, sz * EBW], [xn, yc, sz * EBW], [xnc, Yb, sz * w2], [xoc, Yb, sz * w2]], 'ridge', [0, 1, sz]);
        poly([[xo, ybE, sz * EBW], [xn, ybE, sz * EBW], [xn, yc, sz * EBW], [xo, yc, sz * EBW]], 'ridge', [0, 0, sz]);
      }
      poly([[xo, yc, -EBW], [xo, yc, EBW], [xoc, Yb, w2], [xoc, Yb, -w2]], 'ridge', [sx, 1, 0]);
      poly([[xn, yc, -EBW], [xn, yc, EBW], [xnc, Yb, w2], [xnc, Yb, -w2]], 'ridge', [-sx, 1, 0]);
      poly([[xo, ye, -EBW], [xo, Y(0, h0), 0], [xo, ye, EBW], [xo, yc, EBW], [xo, yc, -EBW]], 'ridge', nX);
      poly([[xn, ybE, -EBW], [xn, ybE, EBW], [xn, yc, EBW], [xn, yc, -EBW]], 'ridge', [-sx, 0, 0]);
    }
  }

  for (const sx of [1, -1]) {
    if (!closed(sx)) continue;
    const X = sx * HW, nX = [sx, 0, 0];
    const prof = () => {
      const out = [[ZN, YD], [ZN, Y(ZN, hc(courses - 1))]];
      for (let i = courses - 1; i >= 1; i--) out.push([zAt(i), Y(zAt(i), hc(i))], [zAt(i), Y(zAt(i), hc(i - 1))]);
      const w = wEnd(sx);
      out.push([w, Y(w, h0)], [0, Y(0, h0)]);
      return out;
    };
    const half = prof();
    let zy = half.slice();
    zy = zy.concat(half.slice().reverse().map(([z, y]) => [-z, y]));
    zy.push([0, Pd(0)]);
    poly(zy.map(([z, y]) => [X, y, z]), 'tile', nX);

    const xin = sx * (HW - BT);
    for (const sz of slopes) {
      const M = (x, y, z) => [x, y, sz * z];
      const nSlope = M(0, CS, SN), nDown = M(0, 0, 1), nUnder = M(0, -CS, -SN);
      poly([M(X, 0, ZN), M(X, YD, ZN), M(X, Pd(0), 0), M(X, B0, 0), M(X, 0, ZFA)], 'trim', nX);
      poly([M(xin, 0, ZFA), M(X, 0, ZFA), M(X, 0, ZN), M(xin, 0, ZN)], 'trim', [0, -1, 0]);
      poly([M(xin, B0, 0), M(X, B0, 0), M(X, 0, ZFA), M(xin, 0, ZFA)], 'trim', nUnder);
      poly([M(xin, 0, ZN), M(X, 0, ZN), M(X, YD, ZN), M(xin, YD, ZN), M(xin, FH, ZN)], 'trim', nDown);
      poly([M(xin, 0, ZFA), M(xin, 0, ZN), M(xin, FH, ZN), M(xin, FH, ZFA)], 'trim', [-sx, 0, 0]);
    }
    poly([[xin, 0, -ZFA], [xin, 0, ZFA], [xin, B0, 0]], 'plaster', nX);
  }

  // The reference recentres the merged roof in X/Z.
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const f of F.faces) for (const p of f.pts) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]);
    z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
  }
  const dx = -(x0 + x1) / 2, dz = -(z0 + z1) / 2;
  for (const f of F.faces) for (const p of f.pts) { p[0] += dx; p[2] += dz; }

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { tile: at(pal, 'tile'), ridge: at(pal, 'ridge'), trim: at(pal, 'trim'), plaster: at(pal, 'plaster') },
  });
}
