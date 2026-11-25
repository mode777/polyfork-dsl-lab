// Lounge armchair — the tub shell is two short-diagonal lofts with fan caps;
// each leg is a frustum plus a bottom polygon, and the cushions are lofted pads.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'linen-mustard': { shellOuter: '#ECE7E0', shellInner: '#F8F4EF', cushion: '#D9A02B', leg: '#6B4A32' },
  'oak-sage': { shellOuter: '#CFC3B0', shellInner: '#F3EEE8', cushion: '#7E9179', leg: '#B8946A' },
  'walnut-teal': { shellOuter: '#B4AAA0', shellInner: '#E3E6E4', cushion: '#3E7C86', leg: '#4E3423' },
  'ochre-plum': { shellOuter: '#F3EEE8', shellInner: '#FAF8F3', cushion: '#7A4A5E', leg: '#8A6244' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const AC_TAU = Math.PI * 2, AC_D2R = Math.PI / 180;
const AC_N = 16, AC_HALF = 0.375, AC_PLAN_N = 4.5, AC_TAPER = 0.82, AC_RAKE = 0.055;
const AC_Y_BOT = 0.29, AC_Y_PAN = 0.34, AC_T_RIM = 0.055, AC_W_PAN = 0.045;
const AC_CH = 0.020, AC_CHY = 0.018, AC_FLAT = 0.015;
const AC_K1 = Math.pow(0.40, 0.75), AC_K2 = Math.pow(0.78, 0.75);
const acD2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const acPlanR = (phi, a, b, n) => Math.pow(Math.pow(Math.abs(Math.sin(phi)) / a, n) + Math.pow(Math.abs(Math.cos(phi)) / b, n), -1 / n);
const acLobe = (x, c, w) => { const d = Math.abs(x - c); return d >= w ? 0 : Math.cos((d / w) * Math.PI / 2); };
const acOuterScale = (f) => {
  const k = f <= 0.40 ? (f / 0.40) * AC_K1 : f <= 0.78 ? AC_K1 + (AC_K2 - AC_K1) * (f - 0.40) / 0.38 : AC_K2 + (1 - AC_K2) * (f - 0.78) / 0.22;
  return AC_TAPER + (1 - AC_TAPER) * k;
};
const acShearAt = (f) => AC_RAKE * Math.pow(1 - f, 1.6);

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'linen-mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const shellOuter = g.input('shellOuter', 'color', '', { label: 'Shell outer' });
  const shellInner = g.input('shellInner', 'color', '', { label: 'Shell lining' });
  const cushion = g.input('cushion', 'color', '', { label: 'Cushion' });
  const leg = g.input('leg', 'color', '', { label: 'Legs' });
  const wing = !!params.backLine && params.backLine === 'wing' || params.wing === true;
  const lived = Math.min(1, Math.max(0, params.lived ?? params.lived_in ?? 0.35));
  const armLine = Math.min(1, Math.max(0, params.armLine ?? 0.5));
  const parts = [];
  const poly = (pts, zone) => parts.push(g.poly({ pts, zone, keepDegenerate: true }));
  const fan = (ring, apex, zone) => parts.push(g.fan({ ring, apex, zone }));
  const loft = (rings, zone) => parts.push(g.loft({ rings, diagonal: 'short', keepDegenerate: true, zones: { band: zone } }));

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
  loft([O0, O1, O2, O3], 'shellOuter');
  const panC = [0, AC_Y_PAN - lived * 0.018, 0.035], botC = [0, AC_Y_BOT - 0.012, AC_RAKE];
  fan(O0.slice().reverse(), botC, 'shellOuter');
  loft([O3, C1, C2, I0, I1, I2], 'shellInner');
  fan(I2, panC, 'shellInner');

  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    const yTop = 0.320, xt = 0.175 * sx, zt = 0.165 * sz, xb = 0.315 * sx, zb = 0.305 * sz, aT = 0.030, aB = 0.019;
    const T = [], B = [];
    for (const [ox, oz] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      T.push([xt + ox * aT, yTop, zt + oz * aT]); B.push([xb + ox * aB, 0, zb + oz * aB]);
    }
    parts.push(g.frustum({ a: B, b: T, capA: false, capB: false, zone: 'leg' }));
    poly([B[0], B[3], B[2], B[1]], 'leg');
  }

  const pillow = (base, hgt, bulge, dent, xf, botInset = 0.88, capBottom = true) => {
    const M = base.length;
    let cx = 0, cz = 0;
    for (const p of base) { cx += p[0] / M; cz += p[1] / M; }
    const lv = [{ y: 0, f: botInset }, { y: hgt * 0.42, f: 1.0 + bulge }, { y: hgt, f: 0.84 }];
    const rings = lv.map((L) => base.map((p) => xf([cx + (p[0] - cx) * L.f, L.y, cz + (p[1] - cz) * L.f])));
    loft(rings, 'cushion');
    const top = xf([cx, hgt - dent, cz]), bot = xf([cx, 0, cz]);
    fan(rings[2], top, 'cushion');
    if (capBottom) fan(rings[0].slice().reverse(), bot, 'cushion');
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

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'linen-mustard',
    overrides: { shellOuter, shellInner, cushion, leg },
  });
  return g.mesh(g.join(parts), {
    zones: { shellOuter: at(pal, 'shellOuter'), shellInner: at(pal, 'shellInner'), cushion: at(pal, 'cushion'), leg: at(pal, 'leg') },
  });
}
