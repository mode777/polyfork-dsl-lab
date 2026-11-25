// Lit taxiway sign — generic-node graph: the casing is a four-ring octagon
// shell with per-face zones, the lit faces are flat polygons, and the frame is
// blocks, studs and frustum gussets. No per-asset node.
import { graph } from '../dsl.mjs';

const PALETTE = {
  mustard: { casing: '#a3b173', steel: '#7b787c', concrete: '#948f8f', field: '#282f3f' },
  graphite: { casing: '#575451', steel: '#948f8f', concrete: '#dddbdc', field: '#282f3f' },
  aluminium: { casing: '#e5e3e3', steel: '#7b787c', concrete: '#948f8f', field: '#3a4d6b' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const mixHex = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, '0')).join('');

const PANEL = 1.0, BOX_H = 1.0, BOX_D = 0.36, X0 = -1.0, CH = 0.03, CK = 0.04, BEZEL = 0.075;
const RECESS = 0.03, LEG = 0.14, LEG_EXPOSED = 0.39;
const FOOT_H = 0.14, FOOT_D = 0.52, FOOT_OVER = 0.06, FOOT_CH = 0.025;
const PLATE = 0.30, PLATE_T = 0.025;

const octagon = (x0, x1, y0, y1, k, z) => [
  [x0 + k, y0, z], [x1 - k, y0, z], [x1, y0 + k, z], [x1, y1 - k, z],
  [x1 - k, y1, z], [x0 + k, y1, z], [x0, y1 - k, z], [x0, y0 + k, z],
];

const arrow = (deg, len = 1, t = 0.075, hl = 0.36, hw = 0.29) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const R = (pts) => pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const h = len / 2;
  return [R([[-h, -t], [h - hl, -t], [h - hl, t], [-h, t]]), R([[h - hl, -hw], [h, 0], [h - hl, hw]])];
};

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const panels = Math.min(4, Math.max(1, Math.round(params.panels ?? 2)));
  const footing = params.footing !== false;
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'mustard' });
  const casing = PALETTE.mustard.casing, steel = PALETTE.mustard.steel;

  const base = footing ? FOOT_H : 0, L = panels * PANEL, X1 = X0 + L, cx = X0 + L / 2;
  const yB = base + LEG_EXPOSED, yT = yB + BOX_H, cy = (yB + yT) / 2, zF = BOX_D / 2;
  const parts = [];

  // Casing: four octagon rings; every band face picks its own zone from the
  // reference rule (bottom band, top band, front/back bezel, plain side).
  const rings = [
    octagon(X0 + CH, X1 - CH, yB + CH, yT - CH, CK, zF),
    octagon(X0, X1, yB, yT, CK, zF - CH),
    octagon(X0, X1, yB, yT, CK, -zF + CH),
    octagon(X0 + CH, X1 - CH, yB + CH, yT - CH, CK, -zF),
  ];
  const casingFor = (m) => {
    const dy = m[1] - cy;
    if (dy < -BOX_H / 2 + 0.01) return 'casingLow';
    if (dy > BOX_H / 2 - 0.01) return 'casingTop';
    return Math.abs(m[2]) > zF - CH - 1e-6 ? 'casingBezel' : 'casing';
  };
  const casingZones = [];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const f = [rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]];
    const m = f.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    casingZones.push(casingFor(m));
  }
  // Every casing face is reversed by the reference's outward hint, which fans
  // from B[i]; the 'ba' diagonal is that same fan, so one loft is exact.
  parts.push(g.loft({
    rings,
    diagonal: 'ba',
    zones: { band: 'casing' },
    zoneField: 'vals.z[k*8+i]',
    values: { z: casingZones },
  }));

  // Lit faces: bezel ring, recess reveal and the three band stripes plus the
  // arrow, all flat; the back is the mirrored layout of the same band sign.
  for (const s of [1, -1]) {
    const Z = (p) => [p[0], p[1], p[2] * s];
    const out = [0, 0, s];
    const O = rings[0].map((p) => [p[0], p[1], zF]);
    const a0 = X0 + BEZEL, a1 = X1 - BEZEL, b0 = yB + BEZEL, b1 = yT - BEZEL;
    const R = [[a0, b0, zF], [a1, b0, zF], [a1, b1, zF], [a0, b1, zF]];
    const ring = [
      [O[0], O[1], R[1], R[0]], [O[1], O[2], R[1]],
      [O[2], O[3], R[2], R[1]], [O[3], O[4], R[2]],
      [O[4], O[5], R[3], R[2]], [O[5], O[6], R[3]],
      [O[6], O[7], R[0], R[3]], [O[7], O[0], R[0]],
    ];
    for (const f of ring) parts.push(g.poly({ pts: f.map(Z), zone: 'casingBezel', hint: out }));

    const zr = zF - RECESS;
    const D = R.map((p) => [p[0], p[1], zr]);
    const wallZones = ['casingLow', 'casing', 'casing', 'casing'];
    // Front reveal fans from R[i]; the back is reversed by its outward hint,
    // which is the 'ba' diagonal.
    parts.push(g.loft({
      rings: [s > 0 ? R : R.map(Z), s > 0 ? D : D.map(Z)],
      diagonal: s > 0 ? undefined : 'ba',
      zones: { band: 'casing' },
      zoneField: 'vals.z[i]',
      values: { z: wallZones },
    }));

    const W3 = (u, v, z) => [s > 0 ? u : 2 * cx - u, v, z * s];
    const flat = (pts2, z, zone) => parts.push(g.poly({ pts: pts2.map(([u, v]) => W3(u, v, z)), zone, hint: out }));
    const zl = zr + 0.002;
    const bh = (b1 - b0) * 0.56, vm = (b0 + b1) / 2, v0 = vm - bh / 2, v1 = vm + bh / 2;
    flat([[a0, b0], [a1, b0], [a1, v0], [a0, v0]], zr, 'signYellow');
    flat([[a0, v0], [a1, v0], [a1, v1], [a0, v1]], zr, 'field');
    flat([[a0, v1], [a1, v1], [a1, b1], [a0, b1]], zr, 'signYellow');
    const len = (a1 - a0) * 0.84, um = (a0 + a1) / 2, hl = Math.min(0.3, len * 0.3);
    const deg = s > 0 ? 0 : 180;
    for (const pc of arrow(deg, len, bh * 0.1, hl, bh * 0.38)) {
      flat(pc.map(([x, y]) => [um + x, vm + y]), zl, 'signYellow');
    }
  }

  const bolt = (c, zone, r = 0.016, h = 0.014) => parts.push(g.stud({
    x: c[0], y: c[1], z: c[2], nx: 0, ny: 1, nz: 0, ux: 0, uy: 0, uz: 1,
    r, h, n: 6, inside: c, zone,
  }));

  // Roof mounting saddles: a thin plate over each pair of panels with four bolts.
  for (let p = 0; p < panels; p += 2) {
    const span = Math.min(2, panels - p), hc = X0 + (p + span / 2) * PANEL;
    const hl = span === 2 ? 0.8 : 0.45, hz = 0.11, ht = 0.02;
    parts.push(g.block({ x0: hc - hl / 2, x1: hc + hl / 2, y0: yT, y1: yT + ht, z0: -hz, z1: hz, skip: 'ny', zone: 'steel' }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bolt([hc + sx * (hl / 2 - 0.035), yT + ht, sz * (hz - 0.035)], 'steel', 0.012, 0.01);
    }
  }

  // Legs: base plate, four gussets, the split tube with its two flanges and the
  // saddle under the casing.
  const nLegs = Math.max(2, panels), inset = panels === 1 ? 0.22 : 0.3, legXs = [];
  for (let i = 0; i < nLegs; i++) legXs.push(X0 + inset + (L - 2 * inset) * (i / (nLegs - 1)));
  for (const lx of legXs) {
    const h = LEG / 2, y0 = base + PLATE_T;
    parts.push(g.block({
      x0: lx - PLATE / 2, x1: lx + PLATE / 2, y0: base, y1: y0,
      z0: -PLATE / 2, z1: PLATE / 2, skip: footing ? 'ny' : '', zone: 'steelLow',
    }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt([lx + sx * 0.11, y0, sz * 0.11], 'steelLow');

    const gL = 0.075, gH = 0.11, gE = 0.025, gT = 0.012;
    for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const vx = -uz, vz = ux;
      const at3 = (u, y, v) => [lx + ux * (h + u) + vx * v, y, uz * (h + u) + vz * v];
      const pr = [[0, y0], [gL, y0], [gL, y0 + gE], [0, y0 + gH]];
      const sideA = pr.map(([u, y]) => at3(u, y, gT / 2));
      const sideB = pr.map(([u, y]) => at3(u, y, -gT / 2));
      // The reference reverses every gusset face: walk the side quads from
      // sideB and take sideA as the cap, then cap sideB from its reversed ring.
      parts.push(g.frustum({
        a: sideB, b: sideA, skip: '0 3', capA: false, capB: true, zone: 'steelLow',
      }));
      parts.push(g.frustum({
        a: sideB, b: sideB.slice().reverse(), skip: '0 1 2 3', capA: false, capB: true, zone: 'steelLow',
      }));
    }

    const c0 = y0 + 0.14, fT = 0.02, gap = 0.012, fW = 0.2;
    const tube = (ya, yb, zone) => parts.push(g.block({
      x0: lx - h, x1: lx + h, y0: ya, y1: yb, z0: -h, z1: h, skip: 'py ny', zone,
    }));
    tube(y0, c0, 'steelLow');
    tube(c0 + fT, c0 + fT + gap, 'steelLow');
    tube(c0 + 2 * fT + gap, yB + 0.02, 'steel');
    parts.push(g.block({ x0: lx - fW / 2, x1: lx + fW / 2, y0: c0, y1: c0 + fT, z0: -fW / 2, z1: fW / 2, zone: 'steelLow' }));
    parts.push(g.block({ x0: lx - fW / 2, x1: lx + fW / 2, y0: c0 + fT + gap, y1: c0 + 2 * fT + gap, z0: -fW / 2, z1: fW / 2, zone: 'steel' }));
    parts.push(g.block({ x0: lx - 0.1, x1: lx + 0.1, y0: yB - 0.025, y1: yB, z0: -0.12, z1: 0.12, skip: 'py', zone: 'steel' }));
  }

  // Chamfered concrete footing: the two side bands as one loft plus the flat
  // top and bottom caps.
  if (footing) {
    const fx0 = X0 - FOOT_OVER, fx1 = X1 + FOOT_OVER, fz = FOOT_D / 2, yc = FOOT_H - FOOT_CH;
    const lo = [[fx0, 0, -fz], [fx1, 0, -fz], [fx1, 0, fz], [fx0, 0, fz]];
    const mid = lo.map(([x, , z]) => [x, yc, z]);
    const top = [
      [fx0 + FOOT_CH, FOOT_H, -fz + FOOT_CH], [fx1 - FOOT_CH, FOOT_H, -fz + FOOT_CH],
      [fx1 - FOOT_CH, FOOT_H, fz - FOOT_CH], [fx0 + FOOT_CH, FOOT_H, fz - FOOT_CH],
    ];
    parts.push(g.loft({ rings: [lo, mid, top], diagonal: 'ba', zones: { band: 'concrete' } }));
    parts.push(g.poly({ pts: top, zone: 'concrete', hint: [0, 1, 0] }));
    parts.push(g.poly({ pts: lo, zone: 'concrete', hint: [0, -1, 0] }));
  }

  return g.mesh(g.join(parts), {
    zones: {
      casing: at(pal, 'casing'), casingTop: mixHex(casing, '#dddbdc', 0.08), casingBezel: mixHex(casing, '#dddbdc', 0.05),
      casingLow: mixHex(casing, '#575451', 0.12), steel: at(pal, 'steel'), steelLow: mixHex(steel, '#575451', 0.15),
      concrete: at(pal, 'concrete'), field: at(pal, 'field'), signYellow: '#cbc852', signRed: '#b94c34', signWhite: '#f5f3f4',
    },
    name: 'lit-taxiway-sign',
  });
}
