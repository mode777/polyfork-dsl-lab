// Lit taxiway sign — geometric port of the reference default: two-panel arrow
// face, chamfered octagonal casing, mounting saddles, two legs and concrete pad.
import { faceSink, v3 } from './_facekit.mjs';

const PANEL = 1.0, BOX_H = 1.0, BOX_D = 0.36, X0 = -1.0, CH = 0.03, CK = 0.04, BEZEL = 0.075;
const RECESS = 0.03, DIV = 0.035, LEG = 0.14, LEG_EXPOSED = 0.39;
const FOOT_H = 0.14, FOOT_D = 0.52, FOOT_OVER = 0.06, FOOT_CH = 0.025;
const PLATE = 0.30, PLATE_T = 0.025;
const PALETTE = {
  mustard: { casing: '#a3b173', steel: '#7b787c', concrete: '#948f8f', field: '#282f3f' },
  graphite: { casing: '#575451', steel: '#948f8f', concrete: '#dddbdc', field: '#282f3f' },
  aluminium: { casing: '#e5e3e3', steel: '#7b787c', concrete: '#948f8f', field: '#3a4d6b' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const mix = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, '0')).join('');

function octagon(x0, x1, y0, y1, k, z) {
  return [[x0 + k, y0, z], [x1 - k, y0, z], [x1, y0 + k, z], [x1, y1 - k, z],
    [x1 - k, y1, z], [x0 + k, y1, z], [x0, y1 - k, z], [x0, y0 + k, z]];
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function arrowPieces(deg, len = 1, t = 0.075, hl = 0.36, hw = 0.29) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const R = (pts) => pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const h = len / 2;
  return [R([[-h, -t], [h - hl, -t], [h - hl, t], [-h, t]]), R([[h - hl, -hw], [h, 0], [h - hl, hw]])];
}

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'mustard' });

  const panels = 2, base = FOOT_H, L = panels * PANEL, X1 = X0 + L, cx = X0 + L / 2;
  const yB = base + LEG_EXPOSED, yT = yB + BOX_H, cy = (yB + yT) / 2, zF = BOX_D / 2;
  const casing = PALETTE.mustard.casing, steel = PALETTE.mustard.steel, concrete = PALETTE.mustard.concrete, field = PALETTE.mustard.field;
  const signYellow = '#cbc852';
  const casingTop = mix(casing, '#dddbdc', 0.2 * 0.4);
  const casingBezel = mix(casing, '#dddbdc', 0.2 * 0.25);
  const casingLow = mix(casing, '#575451', 0.2 * 0.6);
  const steelLow = mix(steel, '#575451', 0.2 * 0.75);

  const F = faceSink();
  const solid = (faces, centre, zone) => {
    for (const f of faces) {
      const m = f.reduce((a, p) => [a[0] + p[0] / f.length, a[1] + p[1] / f.length, a[2] + p[2] / f.length], [0, 0, 0]);
      F.poly(f, zone, [m[0] - centre[0], m[1] - centre[1], m[2] - centre[2]]);
    }
  };
  const box = (x0, x1, y0, y1, z0, z1, zone, omit = []) => {
    const faces = {
      px: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
      nx: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
      py: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
      ny: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
      nz: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
    };
    solid(Object.entries(faces).filter(([k]) => !omit.includes(k)).map(([, f]) => f), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], zone);
  };
  const bolt = (c, n, zone, r = 0.016, h = 0.014) => {
    const N = v3.norm(n);
    const up = Math.abs(N[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const t = v3.norm(v3.cross(up, N));
    const b = v3.norm(v3.cross(N, t));
    const apex = [c[0] + N[0] * h, c[1] + N[1] * h, c[2] + N[2] * h];
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r;
      ring.push([c[0] + t[0] * cs + b[0] * sn, c[1] + t[1] * cs + b[1] * sn, c[2] + t[2] * cs + b[2] * sn]);
    }
    for (let i = 0; i < 6; i++) F.tri(apex, ring[i], ring[(i + 1) % 6], zone, undefined, c);
  };

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
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const f = [rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]];
      const m = f.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
      F.poly(f, casingFor(m), [m[0] - cx, m[1] - cy, m[2]]);
    }
  }

  const signFace = (s) => {
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
    for (const f of ring) F.poly(f.map(Z), 'casingBezel', out);

    const zr = zF - RECESS;
    const D = R.map((p) => [p[0], p[1], zr]);
    const walls = [[R[0], R[1], D[1], D[0], [0, 1, 0]], [R[1], R[2], D[2], D[1], [-1, 0, 0]],
      [R[2], R[3], D[3], D[2], [0, -1, 0]], [R[3], R[0], D[0], D[3], [1, 0, 0]]];
    for (const [p, q, u, v, n] of walls) F.poly([p, q, u, v].map(Z), n[1] > 0 ? 'casingLow' : 'casing', n);

    const W3 = (u, v, z) => [s > 0 ? u : 2 * cx - u, v, z * s];
    const flat = (pts2, z, zone) => F.poly(pts2.map(([u, v]) => W3(u, v, z)), zone, out);
    const zl = zr + 0.002;
    const tiles = s > 0 ? [{ type: 'band', span: 2, items: ['>'] }] : [{ type: 'band', span: 2, items: ['<'] }];
    let k = 0;
    tiles.forEach((t, ti) => {
      const u0 = ti === 0 ? a0 : X0 + k * PANEL + DIV / 2;
      k += t.span;
      const u1 = ti === tiles.length - 1 ? a1 : X0 + k * PANEL - DIV / 2;
      if (ti < tiles.length - 1) {
        const m = X0 + k * PANEL, mz = zF - 0.008;
        const sides = [
          [[m - DIV / 2, b0, zr], [m - DIV / 2, b1, zr], [m - DIV / 2, b1, mz], [m - DIV / 2, b0, mz]],
          [[m + DIV / 2, b0, zr], [m + DIV / 2, b1, zr], [m + DIV / 2, b1, mz], [m + DIV / 2, b0, mz]],
          [[m - DIV / 2, b0, mz], [m + DIV / 2, b0, mz], [m + DIV / 2, b1, mz], [m - DIV / 2, b1, mz]],
        ];
        const hints = [[-1, 0, 0], [1, 0, 0], [0, 0, 1]];
        sides.forEach((f, i) => F.poly(f.map(([x, y, z]) => [s > 0 ? x : 2 * cx - x, y, z * s]), 'casingBezel', [hints[i][0] * s, 0, hints[i][2] * s]));
      }
      if (t.type === 'band') {
        const bh = (b1 - b0) * 0.56, vm = (b0 + b1) / 2;
        const v0 = vm - bh / 2, v1 = vm + bh / 2;
        flat(rect(u0, b0, u1, v0), zr, 'signYellow');
        flat(rect(u0, v0, u1, v1), zr, 'field');
        flat(rect(u0, v1, u1, b1), zr, 'signYellow');
        const len = (u1 - u0) * 0.84, um = (u0 + u1) / 2;
        const hl = Math.min(0.3, len * 0.3);
        const arrowDeg = t.items[0] === '<' ? 180 : 0;
        for (const pc of arrowPieces(arrowDeg, len, bh * 0.1, hl, bh * 0.38)) {
          flat(pc.map(([x, y]) => [um + x, vm + y]), zl, 'signYellow');
        }
      }
    });
  };
  signFace(1);
  signFace(-1);

  for (let p = 0; p < panels; p += 2) {
    const span = Math.min(2, panels - p);
    const hc = X0 + (p + span / 2) * PANEL, hl = span === 2 ? 0.8 : 0.45, hz = 0.11, ht = 0.02;
    box(hc - hl / 2, hc + hl / 2, yT, yT + ht, -hz, hz, 'steel', ['ny']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      bolt([hc + sx * (hl / 2 - 0.035), yT + ht, sz * (hz - 0.035)], [0, 1, 0], 'steel', 0.012, 0.01);
    }
  }

  const nLegs = Math.max(2, panels), inset = panels === 1 ? 0.22 : 0.3;
  const legXs = [];
  for (let i = 0; i < nLegs; i++) legXs.push(X0 + inset + (L - 2 * inset) * (i / (nLegs - 1)));
  const leg = (lx) => {
    const h = LEG / 2, y0 = base + PLATE_T;
    box(lx - PLATE / 2, lx + PLATE / 2, base, y0, -PLATE / 2, PLATE / 2, 'steelLow', ['ny']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bolt([lx + sx * 0.11, y0, sz * 0.11], [0, 1, 0], 'steelLow');
    const gL = 0.075, gH = 0.11, gE = 0.025, gT = 0.012;
    for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const vx = -uz, vz = ux;
      const at = (u, y, v) => [lx + ux * (h + u) + vx * v, y, uz * (h + u) + vz * v];
      const pr = [[0, y0], [gL, y0], [gL, y0 + gE], [0, y0 + gH]];
      const sideA = pr.map(([u, y]) => at(u, y, gT / 2));
      const sideB = pr.map(([u, y]) => at(u, y, -gT / 2));
      solid([sideA, sideB, [sideA[1], sideA[2], sideB[2], sideB[1]], [sideA[2], sideA[3], sideB[3], sideB[2]]], at(gL / 3, y0 + gH / 3, 0), 'steelLow');
    }
    const c0 = y0 + 0.14, fT = 0.02, gap = 0.012, fW = 0.2;
    const tube = (ya, yb, zone) => box(lx - h, lx + h, ya, yb, -h, h, zone, ['py', 'ny']);
    tube(y0, c0, 'steelLow');
    tube(c0 + fT, c0 + fT + gap, 'steelLow');
    tube(c0 + 2 * fT + gap, yB + 0.02, 'steel');
    box(lx - fW / 2, lx + fW / 2, c0, c0 + fT, -fW / 2, fW / 2, 'steelLow');
    box(lx - fW / 2, lx + fW / 2, c0 + fT + gap, c0 + 2 * fT + gap, -fW / 2, fW / 2, 'steel');
    box(lx - 0.1, lx + 0.1, yB - 0.025, yB, -0.12, 0.12, 'steel', ['py']);
  };
  for (const lx of legXs) leg(lx);

  const fx0 = X0 - FOOT_OVER, fx1 = X1 + FOOT_OVER, fz = FOOT_D / 2, yc = FOOT_H - FOOT_CH;
  const lo = [[fx0, 0, -fz], [fx1, 0, -fz], [fx1, 0, fz], [fx0, 0, fz]];
  const mid = lo.map(([x, , z]) => [x, yc, z]);
  const top = [[fx0 + FOOT_CH, FOOT_H, -fz + FOOT_CH], [fx1 - FOOT_CH, FOOT_H, -fz + FOOT_CH],
    [fx1 - FOOT_CH, FOOT_H, fz - FOOT_CH], [fx0 + FOOT_CH, FOOT_H, fz - FOOT_CH]];
  const faces = [top, lo];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push([lo[i], lo[j], mid[j], mid[i]], [mid[i], mid[j], top[j], top[i]]);
  }
  solid(faces, [cx, FOOT_H / 2, 0], 'concrete');

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: {
      casing: at(pal, 'casing'), casingTop, casingBezel, casingLow,
      steel: at(pal, 'steel'), steelLow, concrete: at(pal, 'concrete'), field: at(pal, 'field'),
      signYellow, signRed: '#b94c34', signWhite: '#f5f3f4',
    },
  });
}
