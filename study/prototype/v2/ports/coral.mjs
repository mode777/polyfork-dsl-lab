// Pillar coral — lofted fluted columns on a four-ring mound. The reference
// integrates each column path, then sweeps a star section; this port keeps that
// math and emits one generic loft per column plus the mound.
import { graph } from '../dsl.mjs';
import { at, TAU, DEG, clamp, smooth, add, sub, mul, dot, cross, norm } from './_kit.mjs';

const PALETTE = {
  'sunset-pillar': { column: '#ff9d7a', tip: '#ffb96b', mouth: '#8a3a26', crust: '#f2765c', foot: '#d94f4f', base: '#b8452f' },
  'golden-pillar': { column: '#ffb96b', tip: '#faf6ed', mouth: '#b8452f', crust: '#c4a874', foot: '#a88d5f', base: '#6e5a4a' },
  'violet-pillar': { column: '#c079b0', tip: '#e0aecd', mouth: '#5d4a86', crust: '#8e5aa0', foot: '#6e5a4a', base: '#3c4448' },
  'jade-pillar': { column: '#4fb8a8', tip: '#7fd4c1', mouth: '#1d6b73', crust: '#2c8f8a', foot: '#42604f', base: '#2f4a3e' },
};
const BONE = '#f2e7d0';
const R_MAIN = 0.125, MOUND_R = 0.400, MOUND_H = 0.370, NB = 12;
const CROWN_R = 0.76, MOUTH_R = 0.38, PIT_D = 0.46, PITCH0 = 0.235, TRI_TARGET = 780;
const ARMS = [
  { a: 155 * DEG, r: 0.087, u0: 0.130, tilt: 38 * DEG, hf: 0.780 },
  { a: 325 * DEG, r: 0.081, u0: 0.125, tilt: 38 * DEG, hf: 0.630 },
  { a: 55 * DEG, r: 0.084, u0: 0.125, tilt: 38 * DEG, hf: 0.710 },
];
const PSUB = 240;

function integrate(u0, y0, tilt0, L, bendFrac) {
  const ds = L / PSUB, sB = Math.max(1e-4, bendFrac * L);
  let u = u0, y = y0;
  const pts = [[u, y]];
  for (let i = 0; i < PSUB; i++) {
    const t = tilt0 * (1 - smooth(0, sB, (i + 0.5) * ds));
    u += Math.sin(t) * ds; y += Math.cos(t) * ds;
    pts.push([u, y]);
  }
  return pts;
}
function solveLength(u0, y0, tilt0, top, bendFrac) {
  let lo = 0.05, hi = 6.0;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    const p = integrate(u0, y0, tilt0, m, bendFrac);
    if (p[PSUB][1] < top) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
function bleach(hex, amount) {
  if (amount <= 0) return hex;
  const a = clamp(amount, 0, 1), src = parseInt(String(hex).replace('#', ''), 16), dst = parseInt(BONE.replace('#', ''), 16);
  let out = 0;
  for (let s = 16; s >= 0; s -= 8) {
    const c0 = (src >> s) & 255, c1 = (dst >> s) & 255;
    out |= Math.round(c0 + (c1 - c0) * a) << s;
  }
  return `#${out.toString(16).padStart(6, '0')}`;
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'sunset-pillar', { options: Object.keys(PALETTE), label: 'Colorway' });
  const column = g.input('column', 'color', '', { label: 'Column flesh' });
  const tip = g.input('tip', 'color', '', { label: 'Growing crown' });
  const mouth = g.input('mouth', 'color', '', { label: 'Oral mouth' });
  const crust = g.input('crust', 'color', '', { label: 'Foot crust' });
  const foot = g.input('foot', 'color', '', { label: 'Foot middle' });
  const base = g.input('base', 'color', '', { label: 'Foot base' });

  const P = { health: 0.85, height: 1.80, columns: 3, flutes: 5, ...params };
  const health = clamp(P.health, 0, 1), H = clamp(P.height, 1.0, 2.6);
  const nCol = clamp(Math.round(P.columns), 2, 4), flutes = clamp(Math.round(P.flutes), 3, 9), N = flutes * 2;
  const GIRTH = 0.82 + 0.2118 * health, GROW = 0.92 + 0.0941 * health;
  const FLUTE = 0.070 + 0.1412 * health, KNOB = 0.35 + 0.765 * health;
  const yDead = MOUND_H * 0.75 + (1 - health) * 0.55;
  const bl = clamp((0.70 - health) / 0.70, 0, 1);
  const cw = PALETTE[P.colorway] || PALETTE['sunset-pillar'];
  const C = {
    column: bleach(P.column ?? cw.column, bl * 0.92), tip: bleach(P.tip ?? cw.tip, bl * 0.55),
    mouth: bleach(P.mouth ?? cw.mouth, bl * 0.30), crust: bleach(P.crust ?? cw.crust, bl * 0.36),
    foot: bleach(P.foot ?? cw.foot, bl * 0.28), base: bleach(P.base ?? cw.base, bl * 0.20),
  };

  const cols = [{ a: 90 * DEG, r: R_MAIN * GIRTH, u0: 0, tilt: 0, y0: 0.24, top: H * GROW, flare: 0.18, flareL: 0.30 }];
  for (let i = 0; i < nCol - 1; i++) {
    const A = ARMS[i];
    cols.push({ a: A.a, r: A.r * GIRTH, u0: A.u0, tilt: A.tilt, y0: 0.30, top: H * GROW * A.hf, flare: 0.42, flareL: 0.34 });
  }
  for (const c of cols) {
    c.ch = 0.50 * c.r;
    const rough = c.top - c.y0;
    c.bend = clamp(0.62 * rough, 0.30, 0.78) / Math.max(rough, 1e-3);
    c.L = solveLength(c.u0, c.y0, c.tilt, c.top, c.bend);
    c.bend = clamp(0.62 * c.L, 0.30, 0.78) / c.L;
    c.L = solveLength(c.u0, c.y0, c.tilt, c.top, c.bend);
    c.path = integrate(c.u0, c.y0, c.tilt, c.L, c.bend);
  }
  const baseTris = NB * 7;
  const bandsAt = (L, ch, pitch) => Math.max(2, Math.round((L - ch) / pitch)) + 1;
  const costAt = (pitch) => baseTris + cols.reduce((t, c) => t + 2 * N * bandsAt(c.L, c.ch, pitch) + 3 * N, 0);
  let pitch = PITCH0;
  for (let i = 0; i < 60 && costAt(pitch) > TRI_TARGET; i++) pitch *= 1.05;

  const bump = (ang) => {
    let s = 0;
    for (let i = 1; i < cols.length; i++) {
      let d = ang - cols[i].a;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      s += Math.exp(-(d / 0.80) * (d / 0.80));
    }
    return Math.min(s, 1.6);
  };
  const lumps = (ang) => KNOB * (0.105 * Math.sin(3 * ang + 1.15) + 0.068 * Math.sin(5 * ang - 0.42));
  const ROWS = [
    { y: 0.00, r: 1.00, k: 0.85, l: 0.00 },
    { y: 0.30, r: 0.93, k: 1.00, l: 0.17 },
    { y: 0.64, r: 0.71, k: 0.80, l: 0.34 },
    { y: 1.00, r: 0.22, k: 0.00, l: 0.00 },
  ];
  const mound = ROWS.map((row, i) => Array.from({ length: NB }, (_, k) => {
    const ang = (k / NB) * TAU;
    const rr = MOUND_R * row.r * (1 + row.k * (lumps(ang) + 0.16 * bump(ang)));
    const yy = MOUND_H * (row.y + row.l * bump(ang)) + (i === 0 || i === 3 ? 0 : KNOB * 0.018 * Math.sin(4 * ang + 0.6));
    return [Math.cos(ang) * rr, yy, Math.sin(ang) * rr];
  }));
  const parts = [
    g.loft({ rings: mound, bandZones: ['base', 'foot', 'crust'], diagonal: 'abba' }),
    g.loft({ rings: [mound[0]], capBottom: [0, 0, 0], zones: { capBottom: 'base' } }),
  ];

  for (const c of cols) {
    const ex = Math.cos(c.a), ez = Math.sin(c.a);
    const ds = c.L / PSUB;
    const atS = (s) => {
      const i = clamp(Math.round(s / ds), 0, PSUB), j = Math.min(i, PSUB - 1);
      const du = c.path[j + 1][0] - c.path[j][0], dy = c.path[j + 1][1] - c.path[j][1];
      const m = Math.hypot(du, dy) || 1;
      return { c: [c.path[i][0] * ex, c.path[i][1], c.path[i][0] * ez], t: [(du / m) * ex, dy / m, (du / m) * ez] };
    };
    const rf = (s) => (1 + c.flare * Math.pow(Math.max(0, 1 - s / (c.flareL * c.L)), 1.4)) * (1 - 0.06 * s / c.L);
    const ring = (st, r, amp) => {
      const T = st.t;
      let ux = ex - T[0] * (ex * T[0] + ez * T[2]), uy = -T[1] * (ex * T[0] + ez * T[2]), uz = ez - T[2] * (ex * T[0] + ez * T[2]);
      const um = Math.hypot(ux, uy, uz) || 1; ux /= um; uy /= um; uz /= um;
      const vx = uy * T[2] - uz * T[1], vy = uz * T[0] - ux * T[2], vz = ux * T[1] - uy * T[0];
      return Array.from({ length: N }, (_, k) => {
        const ang = (k / N) * TAU, rr = r * (1 + (k % 2 === 0 ? amp : -amp));
        const cs = Math.cos(ang) * rr, sn = Math.sin(ang) * rr;
        return [st.c[0] + ux * cs + vx * sn, st.c[1] + uy * cs + vy * sn, st.c[2] + uz * cs + vz * sn];
      });
    };
    const nMain = bandsAt(c.L, c.ch, pitch) - 1, sMain = (c.L - c.ch) / nMain, sts = [];
    for (let i = 0; i <= nMain; i++) {
      const s = i * sMain, st = atS(s);
      sts.push({ st, ring: ring(st, c.r * rf(s), FLUTE), y: st.c[1] });
    }
    const stTop = atS(c.L);
    sts.push({ st: stTop, ring: ring(stTop, c.r * rf(c.L) * CROWN_R, FLUTE * 0.35), y: stTop.c[1] });
    const bandZones = sts.slice(0, -1).map((_, i) => i === sts.length - 2 ? 'tip' : (sts[i + 1].y < yDead ? 'crust' : 'column'));
    parts.push(g.loft({ rings: sts.map((s) => s.ring), bandZones, diagonal: 'abba' }));

    const rimR = c.r * rf(c.L) * MOUTH_R, rim = ring(stTop, rimR, 0), outer = sts[sts.length - 1].ring;
    parts.push(g.loft({ rings: [rim, outer], zones: { band: 'tip' } }));
    const d = c.r * PIT_D;
    const apex = [stTop.c[0] - stTop.t[0] * d, stTop.c[1] - stTop.t[1] * d, stTop.c[2] - stTop.t[2] * d];
    parts.push(g.loft({ rings: [rim], capTop: apex, capTopRaw: true, zones: { capTop: 'mouth' } }));
  }

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'sunset-pillar',
    overrides: { column, tip, mouth, crust, foot, base },
  });
  return g.mesh(g.center({ geom: g.join(parts), x: true, y: true, z: true }), {
    zones: { column: at(pal, 'column'), tip: at(pal, 'tip'), mouth: at(pal, 'mouth'), crust: at(pal, 'crust'), foot: at(pal, 'foot'), base: at(pal, 'base') },
  });
}
