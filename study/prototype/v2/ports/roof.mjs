// Tiled roof section — generic-node graph. Each slope is one swept pan/riser
// profile plus a frustum per roll tile; the two gable slopes are mirrored in Z.
// The ridge is a swept profile with poly end blocks, and the bargeboards, gable
// end profiles and open-end cuts are isolated rake polygons / one wall loft.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'slate-kawara': { tile: '#4E5459', ridge: '#3C4145', trim: '#7E4B33', plaster: '#F0EFEC' },
  'charcoal-machiya': { tile: '#3C4145', ridge: '#2E3134', trim: '#42352A', plaster: '#ECE8DE' },
  'pale-alley': { tile: '#8A9197', ridge: '#6B7278', trim: '#8C7355', plaster: '#F7F5EF' },
  'shrine-vermilion': { tile: '#4E5459', ridge: '#3C4145', trim: '#B5462F', plaster: '#F7F5EF' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

// Reference constants (tiled-roof-section-6f1121).
const HW = 2.000, ZE = 2.000, ZN = 1.970, ZFA = 1.920;
const FH = 0.120, NOSE = 0.100, HT = 0.050, STEP = 0.050, EPS = 0.008, BT = 0.080;
const RW = 0.20, RT = 0.09, RH = 0.20, RC1 = 0.130, RC2 = 0.090;
const RH2 = 0.070, RCH = 0.030, EBL = 0.180, EBW = 0.165, EBH = 0.060, EBC = 0.040;
const PW = 0.100, PC = 0.016;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'slate-kawara', { options: Object.keys(PALETTE), label: 'Colorway' });

  // Geometry variants are authoring-time params; the palette stays a graph input.
  const gable = (params.form ?? 'gable') === 'gable';
  const ends = params.gableEnds ?? 'both';
  const closed = (sx) => (sx > 0 ? ends === 'both' || ends === 'right' : ends === 'both' || ends === 'left');

  // Baked geometry follows the authoring params; the inputs carry the palette
  // and the same values into the graph/UI.
  const pitchV = clamp(Number(params.roofPitch ?? 35), 25, 45);
  const ribsV = Math.round(clamp(Number(params.ribs ?? 8), 5, 9));
  const coursesV = Math.round(clamp(Number(params.courses ?? 4), 3, 5));

  const th = pitchV * Math.PI / 180, T = Math.tan(th), CS = Math.cos(th), SN = Math.sin(th);
  const YD = FH + NOSE - HT / CS;
  const Pd = (z) => YD + (ZN - z) * T;
  const Y = (z, h) => Pd(z) + h / CS;
  const cz = ZN / coursesV, zAt = (i) => (i >= coursesV ? ZN : i * cz);
  const hc = (i) => HT + (coursesV - 1 - i) * STEP;
  const h0 = hc(0), B0 = ZFA * T, pr = (2 * HW) / ribsV;
  const rw = RW * pr, rt = RT * pr, rh = RH * pr;
  const rb = rw + STEP * (rw - rt) / rh;
  const Y1 = Y(0, h0 + rh) + 0.01, Y2 = Y1 + RH2, Yb = Y2 + EBH;
  const xi = (sx) => (closed(sx) ? HW - BT : HW);
  const wEnd = (sx) => (gable && closed(sx) ? EBW : RC1);

  // ---------------------------------------------------------------- bbox note
  // The reference centres the finished face soup in x/z. Every point that reaches
  // the graph is tracked, including the Z-mirrored copies.
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  const note = (p) => {
    if (p[0] < bb[0]) bb[0] = p[0];
    if (p[2] < bb[1]) bb[1] = p[2];
    if (p[0] > bb[2]) bb[2] = p[0];
    if (p[2] > bb[3]) bb[3] = p[2];
  };
  const notePts = (pts) => { for (const p of pts) note(p); };
  const notePtsMirror = (pts) => { for (const p of pts) { note(p); note([p[0], p[1], -p[2]]); } };
  const noteSlope = (pts) => (gable ? notePtsMirror(pts) : notePts(pts));

  const poly = (pts, zone, hint) => { notePts(pts); return g.poly({ pts, zone, hint }); };
  const join = (list) => g.join(list);

  // Rotate a fan polygon to start at its highest vertex. The reference ear-clips,
  // so any valid fan works; this avoids folded corner triangles in the step profile.
  const fan = (pts) => {
    let m = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i][1] > pts[m][1]) m = i;
    return pts.slice(m).concat(pts.slice(0, m));
  };

  // ---------------------------------------------------------------- one slope
  const slope = [];
  const pushPoly = (pts, zone, hint) => { noteSlope(pts); slope.push(g.poly({ pts, zone, hint })); };

  const zB1 = zAt(1), yp = Y(RC1, h0), ye = Y(EBW, h0);
  const pan0 = [];
  if (gable && closed(-1)) pan0.push([-HW, ye, EBW], [-(HW - EBL), ye, EBW], [-(HW - EBL), yp, RC1]);
  else pan0.push([-HW, yp, RC1]);
  if (gable && closed(1)) pan0.push([HW - EBL, yp, RC1], [HW - EBL, ye, EBW], [HW, ye, EBW]);
  else pan0.push([HW, yp, RC1]);
  pan0.push([HW, Y(zB1, h0), zB1], [-HW, Y(zB1, h0), zB1]);
  pushPoly(pan0, 'tile', [0, CS, SN]);

  // The pan/riser staircase is one swept profile: the profile points at the two
  // x sides, with the wrap edge (last→first) skipped because the strip is open.
  const prof = [[zB1, Y(zB1, h0)]];
  for (let i = 1; i < coursesV; i++) {
    const zA = zAt(i), zB = zAt(i + 1), h = hc(i);
    prof.push([zA, Y(zA, h)], [zB, Y(zB, h)]);
  }
  const profA = prof.map(([z, y]) => [-HW, y, z]);
  const profB = prof.map(([z, y]) => [HW, y, z]);
  noteSlope(profA); noteSlope(profB);
  slope.push(g.frustum({
    a: profA, b: profB, skip: String(prof.length - 1), capA: false, capB: false,
    inside: [0, -1, -1], zone: 'tile',
  }));

  const yt = Y(ZN, hc(coursesV - 1));
  const riser = [[-xi(-1), FH, ZN], [xi(1), FH, ZN]];
  if (closed(1)) riser.push([HW - BT, YD, ZN], [HW, YD, ZN]);
  riser.push([HW, yt, ZN], [-HW, yt, ZN]);
  if (closed(-1)) riser.push([-HW, YD, ZN], [-(HW - BT), YD, ZN]);
  pushPoly(fan(riser), 'tile', [0, 0, 1]);

  for (let i = 0; i < coursesV; i++) {
    const zA = zAt(i), h = hc(i);
    const zF = i < coursesV - 1 ? zAt(i + 1) + EPS : ZE;
    for (let k = 0; k < ribsV; k++) {
      const xc = -HW + pr * (k + 0.5);
      const atZ = (z) => ({
        BL: [xc - rb, Y(z, h - STEP), z], TL: [xc - rt, Y(z, h + rh), z],
        TR: [xc + rt, Y(z, h + rh), z], BR: [xc + rb, Y(z, h - STEP), z],
      });
      const a = atZ(zA), f = atZ(zF);
      const b = i < coursesV - 1 ? f : { ...atZ(ZN), TL: f.TL, TR: f.TR };
      const A = [a.BL, a.TL, a.TR, a.BR], B = [b.BL, b.TL, b.TR, b.BR];
      noteSlope(A); noteSlope(B);
      slope.push(g.frustum({
        a: A, b: B, skip: '3', capA: false, capB: true,
        inside: [xc, Y((zA + zF) / 2, h + rh / 2), (zA + zF) / 2],
        zone: 'tile',
      }));
    }
  }

  const xL = -xi(-1), xR = xi(1);
  pushPoly([[xL, 0, ZFA], [xR, 0, ZFA], [xR, FH, ZFA], [xL, FH, ZFA]], 'trim', [0, 0, 1]);
  pushPoly([[xL, FH, ZFA], [xR, FH, ZFA], [xR, FH, ZN], [xL, FH, ZN]], 'tile', [0, -1, 0]);
  const slopeGeom = join(slope);
  const slopes = gable ? g.mirror({ geom: slopeGeom, axis: 'z' }) : slopeGeom;

  // ---------------------------------------------------------------- soffit
  const underside = gable
    ? poly([[xL, 0, -ZFA], [xR, 0, -ZFA], [xR, 0, ZFA], [xL, 0, ZFA]], 'plaster', [0, -1, 0])
    : poly([[xL, 0, ZFA], [xR, 0, ZFA], [xR, B0, 0], [xL, B0, 0]], 'plaster', [0, -CS, -SN]);

  // ---------------------------------------------------------------- ridge
  const ridge = [];
  if (gable) {
    const xa = closed(-1) ? -(HW - EBL) : -HW, xb = closed(1) ? HW - EBL : HW;
    const ridgeProf = (x) => [
      [x, yp, RC1], [x, Y1, RC1], [x, Y1, RC2], [x, Y2 - RCH, RC2], [x, Y2, RC2 - RCH],
    ];
    const ridgeHalf = g.loft({
      rings: [ridgeProf(xa), ridgeProf(xb)], zones: { band: 'ridge' },
      skipEdges: [4], inside: [0, Y1 - 0.5, 0],
    });
    notePtsMirror(ridgeProf(xa)); notePtsMirror(ridgeProf(xb));
    ridge.push(g.mirror({ geom: ridgeHalf, axis: 'z' }));
    ridge.push(poly([[xa, Y2, -(RC2 - RCH)], [xb, Y2, -(RC2 - RCH)], [xb, Y2, RC2 - RCH], [xa, Y2, RC2 - RCH]], 'ridge', [0, 1, 0]));

    for (const sx of [1, -1]) {
      if (!closed(sx)) continue;
      const X = sx * HW, nX = [sx, 0, 0];
      const xo = X, xn = sx * (HW - EBL), xoc = sx * (HW - EBC), xnc = sx * (HW - EBL + EBC);
      const ybE = ye - 0.03, yc = Yb - EBC, w2 = EBW - EBC;
      const end = [];
      const endPoly = (pts, hint) => { notePts(pts); end.push(g.poly({ pts, zone: 'ridge', hint })); };
      endPoly([[xoc, Yb, -w2], [xoc, Yb, w2], [xnc, Yb, w2], [xnc, Yb, -w2]], [0, 1, 0]);
      endPoly([[xo, yc, -EBW], [xo, yc, EBW], [xoc, Yb, w2], [xoc, Yb, -w2]], [sx, 1, 0]);
      endPoly([[xn, yc, -EBW], [xn, yc, EBW], [xnc, Yb, w2], [xnc, Yb, -w2]], [-sx, 1, 0]);
      endPoly([[xo, ye, -EBW], [xo, Y(0, h0), 0], [xo, ye, EBW], [xo, yc, EBW], [xo, yc, -EBW]], nX);
      endPoly([[xn, ybE, -EBW], [xn, ybE, EBW], [xn, yc, EBW], [xn, yc, -EBW]], [-sx, 0, 0]);
      const endHalf = [];
      const hp = (pts, hint) => { notePtsMirror(pts); endHalf.push(g.poly({ pts, zone: 'ridge', hint })); };
      hp([[xo, yc, EBW], [xn, yc, EBW], [xnc, Yb, w2], [xoc, Yb, w2]], [0, 1, 1]);
      hp([[xo, ybE, EBW], [xn, ybE, EBW], [xn, yc, EBW], [xo, yc, EBW]], [0, 0, 1]);
      end.push(g.mirror({ geom: join(endHalf), axis: 'z' }));
      ridge.push(join(end));
    }
  } else {
    // Pent: one full-width ridge side profile, a flat top and two closed end caps.
    const ridgeProf = (x) => [
      [x, yp, RC1], [x, Y1, RC1], [x, Y1, RC2], [x, Y2 - RCH, RC2], [x, Y2, RC2 - RCH], [x, Y2, 0],
    ];
    notePts(ridgeProf(-HW)); notePts(ridgeProf(HW));
    ridge.push(g.loft({
      rings: [ridgeProf(-HW), ridgeProf(HW)], zones: { band: 'ridge' },
      skipEdges: [5], inside: [0, Y1 - 0.5, 0],
    }));
    for (const sx of [1, -1]) {
      if (!closed(sx)) continue;
      const zy = [[0, Y(0, h0)], [RC1, yp], [RC1, Y1], [RC2, Y1], [RC2, Y2 - RCH], [RC2 - RCH, Y2], [0, Y2]];
      ridge.push(poly(zy.map(([z, y]) => [sx * HW, y, z]), 'ridge', [sx, 0, 0]));
    }
    const back = [[-HW, B0, 0]];
    if (closed(-1)) back.push([-(HW - BT), B0, 0]);
    if (closed(1)) back.push([HW - BT, B0, 0]);
    back.push([HW, B0, 0]);
    if (closed(1)) back.push([HW, Pd(0), 0], [HW, Y(0, h0), 0]);
    back.push([HW, Y2, 0], [-HW, Y2, 0]);
    if (closed(-1)) back.push([-HW, Y(0, h0), 0], [-HW, Pd(0), 0]);
    if (closed(-1) && closed(1)) {
      // The full back has collinear bottom/side points, so split it into two
      // fan-friendly halves rather than lose an ear to a degenerate triangle.
      const A = [-HW, B0, 0], B = [-(HW - BT), B0, 0], C = [HW - BT, B0, 0], D = [HW, B0, 0];
      const E = [HW, Pd(0), 0], F = [HW, Y(0, h0), 0], G = [HW, Y2, 0];
      const H = [-HW, Y2, 0], I = [-HW, Y(0, h0), 0], J = [-HW, Pd(0), 0];
      const backFlip = (pts) => { notePts(pts); ridge.push(g.poly({ pts, zone: 'plaster', hint: [0, 0, -1], flip: true })); };
      backFlip([G, H, I, J, A, F]);
      backFlip([F, A, B, C, D, E]);
    } else {
      // Fan from the bottom-right corner; the side/top points are collinear, so a
      // max-y fan would drop a triangle to a degenerate ear.
      const bi = back.findIndex(([x, y]) => Math.abs(x - HW) < 1e-9 && Math.abs(y - B0) < 1e-9);
      ridge.push(poly(back.slice(bi).concat(back.slice(0, bi)), 'plaster', [0, 0, -1]));
    }
  }
  const ridgeGeom = join(ridge);

  // ---------------------------------------------------------------- closed verges
  // A closed verge gets the stepped tile side profile and the bargeboards on
  // both forms; only the gable adds the mirrored half and the plaster triangle.
  const gables = [];
  for (const sx of [1, -1]) {
    if (!closed(sx)) continue;
    const X = sx * HW, nX = [sx, 0, 0];
    const half = [[ZN, YD], [ZN, Y(ZN, hc(coursesV - 1))]];
    for (let i = coursesV - 1; i >= 1; i--) half.push([zAt(i), Y(zAt(i), hc(i))], [zAt(i), Y(zAt(i), hc(i - 1))]);
    const w = wEnd(sx);
    half.push([w, Y(w, h0)], [0, Y(0, h0)]);
    const zy = gable ? half.concat(half.slice().reverse().map(([z, y]) => [-z, y])) : half.slice();
    zy.push([0, Pd(0)]);
    // Drop the duplicate where the mirrored half meets the original.
    const side = [];
    for (const q of zy) {
      const l = side[side.length - 1];
      if (l && Math.abs(q[0] - l[0]) < 1e-9 && Math.abs(q[1] - l[1]) < 1e-9) continue;
      side.push(q);
    }
    gables.push(poly(side.map(([z, y]) => [X, y, z]), 'tile', nX));

    const xin = sx * (HW - BT);
    const trim = [];
    const tp = (pts, hint) => { (gable ? notePtsMirror : notePts)(pts); trim.push(g.poly({ pts, zone: 'trim', hint })); };
    tp([[X, 0, ZN], [X, YD, ZN], [X, Pd(0), 0], [X, B0, 0], [X, 0, ZFA]], nX);
    tp([[xin, 0, ZFA], [X, 0, ZFA], [X, 0, ZN], [xin, 0, ZN]], [0, -1, 0]);
    tp([[xin, B0, 0], [X, B0, 0], [X, 0, ZFA], [xin, 0, ZFA]], [0, -CS, -SN]);
    tp([[X, YD, ZN], [xin, YD, ZN], [xin, FH, ZN], [xin, 0, ZN], [X, 0, ZN]], [0, 0, 1]);
    tp([[xin, 0, ZFA], [xin, 0, ZN], [xin, FH, ZN], [xin, FH, ZFA]], [-sx, 0, 0]);
    gables.push(gable ? g.mirror({ geom: join(trim), axis: 'z' }) : join(trim));
    if (gable) gables.push(poly([[xin, 0, -ZFA], [xin, 0, ZFA], [xin, B0, 0]], 'plaster', nX));
  }

  // ---------------------------------------------------------------- open ends
  // A closed verge is a gable end; an open verge is the reference's mitred cut:
  // one closed wall loft from the outline to its inset, plus the inset cap.
  const cuts = [];
  const outline = () => {
    const up = [{ p: [ZFA, 0], c: 'trim' }, { p: [ZFA, FH], c: 'tile' }, { p: [ZN, FH], c: 'tile' }];
    for (let i = coursesV - 1; i >= 1; i--) {
      up.push({ p: [zAt(i + 1), Y(zAt(i + 1), hc(i))], c: 'tile' }, { p: [zAt(i), Y(zAt(i), hc(i))], c: 'tile' });
    }
    up.push({ p: [zAt(1), Y(zAt(1), h0)], c: 'tile' }, { p: [RC1, Y(RC1, h0)], c: 'ridge' },
      { p: [RC1, Y1], c: 'ridge' }, { p: [RC2, Y1], c: 'ridge' }, { p: [RC2, Y2 - RCH], c: 'ridge' },
      { p: [RC2 - RCH, Y2], c: 'ridge' });
    if (!gable) return [...up, { p: [0, Y2], c: 'plaster' }, { p: [0, B0], c: 'plaster' }];
    const out = [...up];
    for (let k = up.length - 1; k >= 0; k--) out.push({ p: [-up[k].p[0], up[k].p[1]], c: k > 0 ? up[k - 1].c : 'plaster' });
    return out;
  };
  for (const sx of [1, -1]) {
    if (closed(sx)) continue;
    const O = outline(), n = O.length, P = O.map((o) => o.p);
    let area = 0;
    for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = area > 0 ? 1 : -1;
    const inw = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-sg * (b[1] - a[1]) / l, sg * (b[0] - a[0]) / l]; };
    const Q = P.map((b, k) => {
      const n1 = inw(P[(k - 1 + n) % n], b), n2 = inw(b, P[(k + 1) % n]);
      const s = PC / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
      return [b[0] + (n1[0] + n2[0]) * s, b[1] + (n1[1] + n2[1]) * s];
    });
    const X = sx * HW, XB = sx * (HW - PW);
    const ringP = P.map(([z, y]) => [X, y, z]), ringQ = Q.map(([z, y]) => [XB, y, z]);
    notePts(ringP); notePts(ringQ);
    const cy = P.reduce((a, q) => a + q[1], 0) / n, czc = P.reduce((a, q) => a + q[0], 0) / n;
    cuts.push(g.loft({
      rings: [ringP, ringQ], zones: { band: 'tile' }, bandZones: O.map((o) => o.c),
      // The wall bevel points +sx while its z/y normal points inward, so bias the
      // orientation point far along -sx; the x sign then fixes every band.
      inside: [-sx * 1e3, cy, czc],
    }));
    cuts.push(poly(Q.map(([z, y]) => [XB, y, z]), 'plaster', [sx, 0, 0]));
  }

  // ---------------------------------------------------------------- assemble
  const body = join([slopes, underside, ridgeGeom, ...gables, ...cuts]);
  const dx = -(bb[0] + bb[2]) / 2, dz = -(bb[1] + bb[3]) / 2;
  const centered = (Math.abs(dx) > 1e-12 || Math.abs(dz) > 1e-12)
    ? g.transform({ geom: body, tx: dx, tz: dz })
    : body;

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'slate-kawara' });
  return g.mesh(centered, {
    zones: { tile: at(pal, 'tile'), ridge: at(pal, 'ridge'), trim: at(pal, 'trim'), plaster: at(pal, 'plaster') },
  });
}
