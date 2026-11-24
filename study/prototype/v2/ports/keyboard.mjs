// Keyboard bench — a scissor-lift seat with a tufted cushion, four legs, rails
// and a crank. The reference loft/post/beam helpers map to generic lofts; the
// cushion tufts are loft/fan bands and the buttons are `stud` nodes.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp, lerp } from './_kit.mjs';

const PALETTE = {
  'rosewood-velvet': { wood: '#5b3e2a', cushion: '#7a2430', metal: '#ce9157' },
  'black-lacquer': { wood: '#262325', cushion: '#403b3d', metal: '#9f9b8e' },
  'gilt-silk': { wood: '#bdaa95', cushion: '#7d93b0', metal: '#ecad68' },
};
const ERA = {
  '1800s': { ct: 0.075, bevH: 0.035, bevV: 0.028, tuft: 0.030, legTop: 0.030, legBot: 0.019, legC: 0.32, turned: false, bead: false },
  modern: { ct: 0.060, bevH: 0.012, bevV: 0.010, tuft: 0, legTop: 0.023, legBot: 0.015, legC: 0.18, turned: false, bead: false },
  '1700s': { ct: 0.090, bevH: 0.046, bevV: 0.036, tuft: 0.034, legTop: 0.030, legBot: 0.022, legC: 0.32, turned: true, bead: true },
};
const rect = (hs, ht, c = 0) => (c <= 0 ? [[hs, -ht], [hs, ht], [-hs, ht], [-hs, -ht]]
  : [[hs, -ht + c], [hs, ht - c], [hs - c, ht], [-hs + c, ht], [-hs, ht - c], [-hs, -ht + c], [-hs + c, -ht], [hs - c, -ht]]);
const rect8 = (hs, ht) => [[hs, -ht], [hs, ht], [hs, ht], [-hs, ht], [-hs, ht], [-hs, -ht], [-hs, -ht], [hs, -ht]];
const circ = (r, n, ph = Math.PI / n) => Array.from({ length: n }, (_, i) => { const a = ph + (i / n) * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; });
const UP = [0, 1, 0];

function frameFor(d) {
  const a = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const k = a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  let u = [a[0] - d[0] * k, a[1] - d[1] * k, a[2] - d[2] * k];
  const l = Math.hypot(...u) || 1; u = u.map((x) => x / l);
  const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  return { u, v };
}
function loftRef(g, d, rings, capStart, capEnd, zone) {
  const { u, v } = frameFor(d);
  const P = rings.map(({ c, s }) => s.map(([a, b]) => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b]));
  const out = [g.loft({ rings: P, zones: { band: zone } })];
  if (capStart) out.push(g.poly({ pts: [P[0][0], ...P[0].slice(1).reverse()], zone }));
  if (capEnd) out.push(g.poly({ pts: P[P.length - 1], zone }));
  return out;
}
function post(g, x, z, list, capBottom, capTop, zone) {
  return loftRef(g, UP, list.map(([y, s]) => ({ c: [x, y, z], s })), capBottom, capTop, zone);
}
function beam(g, p0, p1, hs, ht, zone, caps = false) {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], l = Math.hypot(...d) || 1;
  return loftRef(g, d.map((x) => x / l), [{ c: p0, s: rect(hs, ht) }, { c: p1, s: rect(hs, ht) }], caps, caps, zone);
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'rosewood-velvet', { options: Object.keys(PALETTE), label: 'Colorway' });
  const wood = g.input('wood', 'color', '', { label: 'Frame' });
  const cushion = g.input('cushion', 'color', '', { label: 'Cushion' });
  const metal = g.input('metal', 'color', '', { label: 'Metal & gilt' });

  const P = { era: '1800s', width: 0.90, seatHeight: 0.48, ...params };
  const E = ERA[P.era] || ERA['1800s'];
  const W = clamp(P.width, 0.6, 1.2), D = 0.40, H = clamp(P.seatHeight, 0.46, 0.54);
  const Z = { wood: [], cushion: [], metal: [] };
  const parts = [];
  const tt = 0.042, trayTop = H - E.ct, trayB = trayTop - tt, apronT = 0.46 - E.ct - tt - 0.010, apronB = apronT - 0.075;
  const ax = W / 2 - 0.022, az = D / 2 - 0.022, BLK = 0.032, lx = ax + 0.006 - BLK, lz = az + 0.006 - BLK;

  // Cushion side bands.
  {
    const ca = W / 2 - 0.028, cb = D / 2 - 0.028, y0 = trayTop - 0.006, y1 = H - E.bevV, y2 = H;
    const ta = ca - E.bevH, tb = cb - E.bevH, N = Math.max(1, Math.round((W - 0.1) / 0.38)), xs = [];
    for (let i = 0; i <= 2 * N; i++) xs.push(-ta + (2 * ta) * i / (2 * N));
    const outerX = (x, a) => (Math.abs(Math.abs(x) - ta) < 1e-9 ? Math.sign(x) * a : x);
    const ringAt = (y, a, b, isTop) => {
      const f = xs.map((x) => [isTop ? x : outerX(x, a), y, b]);
      const k = xs.slice().reverse().map((x) => [isTop ? x : outerX(x, a), y, -b]);
      return f.concat(k);
    };
    const R0 = ringAt(y0, ca, cb, false), R1 = ringAt(y1, ca, cb, false), R2 = ringAt(y2, ta, tb, true);
    parts.push(g.loft({ rings: [R0, R1, R2], zones: { band: 'cushion' } }));
    for (let i = 0; i < N; i++) {
      const xl = xs[2 * i], xm = xs[2 * i + 1], xr = xs[2 * i + 2], C = [xm, y2 - E.tuft, 0];
      const poly = [[xl, y2, tb], [xm, y2, tb], [xr, y2, tb], [xr, y2, -tb], [xm, y2, -tb], [xl, y2, -tb]];
      if (E.tuft <= 0) { parts.push(g.fan({ ring: poly, apex: C, zone: 'cushion' })); continue; }
      const f = 0.42, yi = y2 - E.tuft * 0.3, inner = poly.map(([x, , z]) => [xm + (x - xm) * f, yi, z * f]);
      parts.push(g.loft({ rings: [poly, inner], zones: { band: 'cushion' } }));
      parts.push(g.fan({ ring: inner, apex: C, zone: 'cushion' }));
      parts.push(g.stud({ x: xm, y: y2 - E.tuft, z: 0, nx: 0, ny: 1, nz: 0, ux: 0, uy: 0, uz: 1, r: 0.020, h: 0.021, n: 6, phase: 0, zone: 'cushion' }));
    }
  }

  // Seat tray.
  {
    const h = W / 2, d = D / 2, ca = W / 2 - 0.028, cb = D / 2 - 0.028;
    parts.push(...post(g, 0, 0, [
      [trayB, rect(h - 0.012, d - 0.012, 0.010)], [trayB + 0.014, rect(h - 0.012, d - 0.012, 0.010)],
      [trayB + 0.014, rect(h, d, 0.016)], [trayTop - 0.011, rect(h, d, 0.016)],
      [trayTop, rect(h - 0.011, d - 0.011, 0.012)], [trayTop, rect8(ca, cb)],
    ], true, false, 'wood'));
  }
  parts.push(...post(g, 0, 0, [
    [apronB, rect(ax - 0.008, az - 0.008)], [apronB + 0.013, rect(ax - 0.008, az - 0.008)],
    [apronB + 0.013, rect(ax, az)], [apronT - 0.010, rect(ax, az)], [apronT, rect(ax - 0.010, az - 0.010)],
  ], true, true, 'wood'));

  const legTopY = apronB + 0.010;
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const x = sx * lx, z = sz * lz;
    parts.push(...post(g, x, z, [[apronB - 0.008, rect(BLK, BLK)], [apronT - 0.002, rect(BLK, BLK)], [apronT + 0.006, rect(BLK - 0.009, BLK - 0.009)]], true, true, 'wood'));
    if (E.turned) {
      const L = legTopY, prof = [[0, 0.024], [0.035, 0.033], [0.075, 0.017], [0.62, 0.035], [1.0, 0.023]];
      parts.push(...post(g, x, z, prof.map(([t, r]) => [t * L, circ(r, 8)]), true, false, 'metal'));
    } else {
      parts.push(...post(g, x, z, [[0, rect(E.legBot, E.legBot, E.legBot * E.legC)], [legTopY, rect(E.legTop, E.legTop, E.legTop * E.legC)]], true, false, 'wood'));
    }
  }

  const railY = 0.12;
  for (const sz of [1, -1]) parts.push(...beam(g, [-lx, railY, sz * lz], [lx, railY, sz * lz], 0.018, 0.013, 'wood'));
  for (const sx of [1, -1]) parts.push(...beam(g, [sx * lx, railY - 0.012, -lz], [sx * lx, railY - 0.012, lz], 0.018, 0.013, 'wood'));

  const s = 0.24 * W, lowY = 0.112, highY = apronB + 0.012, zr = lz - 0.04, rodY = (lowY + highY) / 2;
  for (const side of [1, -1]) {
    const X = (v) => side * v;
    parts.push(...beam(g, [X(s), railY - 0.006, -lz], [X(s), railY - 0.006, lz], 0.015, 0.025, 'wood'));
    parts.push(...beam(g, [X(s - 0.012), lowY, zr], [X(s - 0.012), highY, -zr], 0.013, 0.008, 'wood'));
    parts.push(...beam(g, [X(s + 0.012), lowY, -zr], [X(s + 0.012), highY, zr], 0.013, 0.008, 'wood'));
    for (const sz of [1, -1]) parts.push(...post(g, X(s), sz * (az - 0.05), [[apronT - 0.010, rect(0.012, 0.012)], [trayB + 0.010, rect(0.012, 0.012)]], false, false, 'metal'));
  }
  parts.push(...loftRef(g, [1, 0, 0], [{ c: [-(s + 0.034), rodY, 0], s: circ(0.009, 6) }, { c: [s + 0.034, rodY, 0], s: circ(0.009, 6) }], true, true, 'metal'));
  {
    const teeth = 5, star = [];
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * TAU, w = Math.PI / teeth;
      star.push([Math.cos(a - w * 0.35) * 0.038, Math.sin(a - w * 0.35) * 0.038], [Math.cos(a + w * 0.35) * 0.038, Math.sin(a + w * 0.35) * 0.038], [Math.cos(a + w) * 0.028, Math.sin(a + w) * 0.028]);
    }
    const gr0 = star.map(([y, z]) => [-0.008, rodY + y, z]), gr1 = star.map(([y, z]) => [0.008, rodY + y, z]);
    const cen = (R) => R.reduce((m, q) => [m[0] + q[0] / R.length, m[1] + q[1] / R.length, m[2] + q[2] / R.length], [0, 0, 0]);
    parts.push(g.loft({ rings: [gr0, gr1], capBottom: cen(gr0), capTop: cen(gr1), capBottomFlip: true, capTopFlip: true, zones: { band: 'metal', capBottom: 'metal', capTop: 'metal' } }));
  }
  if (E.bead) {
    const bx = lx - BLK;
    for (const sz of [1, -1]) parts.push(...beam(g, [-bx, apronB + 0.034, sz * (az + 0.003)], [bx, apronB + 0.034, sz * (az + 0.003)], 0.007, 0.006, 'metal'));
  }

  // Crank handles.
  const yk = apronB + 0.038;
  for (const side of [1, -1]) {
    const X = (v) => side * v, out = [], d = [side, 0, 0];
    out.push(...loftRef(g, d, [
      { c: [X(-0.010), 0, 0], s: circ(0.033, 8) }, { c: [X(0.022), 0, 0], s: circ(0.033, 8) }, { c: [X(0.030), 0, 0], s: circ(0.024, 8) },
    ], false, true, 'metal'));
    out.push(...beam(g, [X(0.034), 0.012, 0], [X(0.034), -0.084, 0], 0.006, 0.011, 'metal', true));
    out.push(...loftRef(g, d, [
      { c: [X(0.030), -0.076, 0], s: circ(0.012, 6) }, { c: [X(0.088), -0.076, 0], s: circ(0.013, 6) },
    ], false, true, 'metal'));
    parts.push(g.transform({ geom: g.join(out), tx: X(ax), ty: yk }));
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'rosewood-velvet', overrides: { wood, cushion, metal } });
  return g.mesh(g.join(parts), { zones: { wood: at(pal, 'wood'), cushion: at(pal, 'cushion'), metal: at(pal, 'metal') } });
}
