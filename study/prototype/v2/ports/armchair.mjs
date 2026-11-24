// Lounge armchair — geometric port of the reference tub shell, splayed legs
// and the two loose cushions. Default build: tub back, lived-in 0.35, arm 0.5.
import { faceSink } from './_facekit.mjs';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const PALETTE = {
  'linen-mustard': { shellOuter: '#ECE7E0', shellInner: '#F8F4EF', cushion: '#D9A02B', leg: '#6B4A32' },
  'oak-sage': { shellOuter: '#CFC3B0', shellInner: '#F3EEE8', cushion: '#7E9179', leg: '#B8946A' },
  'walnut-teal': { shellOuter: '#B4AAA0', shellInner: '#E3E6E4', cushion: '#3E7C86', leg: '#4E3423' },
  'ochre-plum': { shellOuter: '#F3EEE8', shellInner: '#FAF8F3', cushion: '#7A4A5E', leg: '#8A6244' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const N = 16, HALF = 0.375, PLAN_N = 4.5, TAPER = 0.82, RAKE = 0.055;
const Y_BOT = 0.29, Y_PAN = 0.34, H_FRONT = 0.400, T_RIM = 0.055, W_PAN = 0.045;
const CH = 0.020, CHY = 0.018, FLAT = 0.015;
const K1 = Math.pow(0.40, 0.75), K2 = Math.pow(0.78, 0.75);

function d2(a, b) {
  const x = a[0] - b[0], y = a[1] - b[1], z = a[2] - b[2];
  return x * x + y * y + z * z;
}
function planR(phi, a, b, n) {
  return Math.pow(Math.pow(Math.abs(Math.sin(phi)) / a, n) + Math.pow(Math.abs(Math.cos(phi)) / b, n), -1 / n);
}
function lobe(x, c, w) {
  const d = Math.abs(x - c);
  return d >= w ? 0 : Math.cos((d / w) * Math.PI / 2);
}
function outerScale(f) {
  const k = f <= 0.40 ? (f / 0.40) * K1
    : f <= 0.78 ? K1 + (K2 - K1) * (f - 0.40) / 0.38
      : K2 + (1 - K2) * (f - 0.78) / 0.22;
  return TAPER + (1 - TAPER) * k;
}
function shearAt(f) { return RAKE * Math.pow(1 - f, 1.6); }

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'linen-mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const shellOuter = g.input('shellOuter', 'color', '', { label: 'Shell outer' });
  const shellInner = g.input('shellInner', 'color', '', { label: 'Shell lining' });
  const cushion = g.input('cushion', 'color', '', { label: 'Cushion' });
  const legColor = g.input('leg', 'color', '', { label: 'Legs' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'linen-mustard',
    overrides: { shellOuter, shellInner, cushion, leg: legColor },
  });

  const P = { wing: false, lived: 0.35, armLine: 0.5 };
  const rimTable = () => {
    const A = 0.605 + (P.armLine - 0.5) * 0.10;
    const S = A - 0.020;
    return P.wing
      ? [0.400, 0.415, 0.505, A, A, S, 0.820, 0.790, 0.700]
      : [0.400, 0.415, 0.505, A, A, S, Math.max(0.680, A + 0.060), 0.745, 0.790];
  };
  const RT = rimTable();
  const rimHeight = (phi) => {
    const pf = phi <= Math.PI ? phi : TAU - phi;
    const u = pf / (22.5 * D2R);
    const i = Math.min(RT.length - 2, Math.max(0, Math.floor(u)));
    const w = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u - i)));
    let h = RT[i] + (RT[i + 1] - RT[i]) * w;
    h -= P.lived * 0.026 * Math.max(0, Math.cos(pf));
    return h;
  };
  const rimWiden = (pf, R) => {
    const d = 22.5 * D2R;
    const h0 = rimHeight(pf);
    const s = Math.max(Math.abs(h0 - rimHeight(Math.abs(pf - d))), Math.abs(h0 - rimHeight(Math.min(Math.PI, pf + d))));
    return Math.min(0.020, 0.030 * (s / (R * d)));
  };
  const station = (phi) => {
    const pf = phi <= Math.PI ? phi : TAU - phi;
    const R = planR(phi, HALF, HALF, PLAN_N);
    const h = rimHeight(phi);
    const cup = P.wing ? 1 - 0.06 * lobe(pf, 135 * D2R, 55 * D2R) : 1;
    const wallTop = h - CHY;
    const hw = wallTop - Y_BOT;
    const fPan = Math.min(0.96, Math.max(0.04, (Y_PAN - Y_BOT) / hw));
    return { pf, R, h, cup, wallTop, hw, fPan, rPan: R * outerScale(fPan) - W_PAN, zPan: shearAt(fPan) };
  };
  const innerBackZ = (y) => {
    const st = station(Math.PI);
    const zPan = -st.rPan + st.zPan;
    const zTop = -(st.R * st.cup - T_RIM - rimWiden(Math.PI, st.R));
    const t = Math.min(1, Math.max(0, (y - Y_PAN) / (st.wallTop - Y_PAN)));
    return zPan + (zTop - zPan) * t;
  };

  const F = faceSink();
  const tri = (a, b, c, zone) => F.tri(a, b, c, zone);
  const quad = (a, b, c, d, zone) => F.quad(a, b, c, d, zone);
  const quadS = (a, b, c, d, zone) => {
    if (d2(a, c) <= d2(b, d)) { tri(a, b, c, zone); tri(a, c, d, zone); }
    else { tri(b, c, d, zone); tri(b, d, a, zone); }
  };

  // Shell, outer skin and lining.
  const O0 = [], O1 = [], O2 = [], O3 = [], C1 = [], C2 = [], I0 = [], I1 = [], I2 = [];
  for (let i = 0; i < N; i++) {
    const phi = i * TAU / N;
    const sx = Math.sin(phi), sz = Math.cos(phi);
    const st = station(phi);
    const { R, cup, wallTop, hw, fPan } = st;
    const pt = (r, y, f) => [sx * r, y, sz * r + shearAt(f)];
    O0.push(pt(R * outerScale(0), Y_BOT, 0));
    O1.push(pt(R * outerScale(0.40), Y_BOT + 0.40 * hw, 0.40));
    O2.push(pt(R * outerScale(0.78), Y_BOT + 0.78 * hw, 0.78));
    O3.push(pt(R * cup, wallTop, 1));
    const wid = rimWiden(st.pf, R);
    C1.push(pt(R * cup - CH, st.h, 1));
    C2.push(pt(R * cup - CH - FLAT - wid, st.h, 1));
    const rI0 = R * cup - T_RIM - wid;
    I0.push(pt(rI0, wallTop, 1));
    I1.push(pt((rI0 + st.rPan) / 2 - 0.008, (wallTop + Y_PAN) / 2, (1 + fPan) / 2));
    I2.push(pt(st.rPan, Y_PAN, fPan));
  }
  const panC = [0, Y_PAN - P.lived * 0.018, 0.035];
  const botC = [0, Y_BOT - 0.012, RAKE];
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
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

  // Legs.
  const leg = (sx, sz) => {
    const yTop = 0.320;
    const xt = 0.175 * sx, zt = 0.165 * sz;
    const xb = 0.315 * sx, zb = 0.305 * sz;
    const aT = 0.030, aB = 0.019;
    const T = [], B = [];
    for (const [ox, oz] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      T.push([xt + ox * aT, yTop, zt + oz * aT]);
      B.push([xb + ox * aB, 0, zb + oz * aB]);
    }
    for (let i = 0; i < 4; i++) quad(B[i], B[(i + 1) % 4], T[(i + 1) % 4], T[i], 'leg');
    quad(B[0], B[3], B[2], B[1], 'leg');
  };
  for (const sx of [1, -1]) for (const sz of [1, -1]) leg(sx, sz);

  // Loose pillows.
  const pillow = (base, hgt, bulge, dent, xf, botInset = 0.88, capBottom = true) => {
    const M = base.length;
    let cx = 0, cz = 0;
    for (const p of base) { cx += p[0] / M; cz += p[1] / M; }
    const lv = [{ y: 0, f: botInset }, { y: hgt * 0.42, f: 1.0 + bulge }, { y: hgt, f: 0.84 }];
    const rings = lv.map((L) => base.map((p) => xf([cx + (p[0] - cx) * L.f, L.y, cz + (p[1] - cz) * L.f])));
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < M; i++) {
        const j = (i + 1) % M;
        quadS(rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i], 'cushion');
      }
    }
    const top = xf([cx, hgt - dent, cz]);
    const bot = xf([cx, 0, cz]);
    for (let i = 0; i < M; i++) {
      const j = (i + 1) % M;
      tri(top, rings[2][i], rings[2][j], 'cushion');
      if (capBottom) tri(bot, rings[0][j], rings[0][i], 'cushion');
    }
  };

  {
    const dz = P.lived * 0.030;
    const base = [];
    for (let i = 0; i < 12; i++) {
      const phi = i * TAU / 12;
      const st = station(phi);
      const r = st.rPan - 0.022;
      base.push([Math.sin(phi) * r, Math.cos(phi) * r + st.zPan]);
    }
    pillow(base, 0.125 - P.lived * 0.038, P.lived * 0.06, P.lived * 0.034,
      (v) => [v[0], v[1] + 0.325, v[2] + dz], 0.94, false);
  }
  {
    const st = station(Math.PI);
    const wallRake = Math.atan2((-innerBackZ(st.wallTop)) - (-innerBackZ(Y_PAN)), st.wallTop - Y_PAN);
    const rake = wallRake + P.lived * 13 * D2R;
    const ca = Math.cos(-rake), sa = Math.sin(-rake);
    const y0 = 0.425 - P.lived * 0.048;
    const B = 0.075;
    const hgt = Math.min(0.300 - P.lived * 0.030, Math.max(0.16, (rimHeight(Math.PI) - 0.055 - y0) / ca));
    const yTop = y0 + hgt * ca + 0.84 * B * sa;
    const zTopLocal = hgt * sa - 0.84 * B * ca;
    const z0 = innerBackZ(yTop) - (0.022 - P.lived * 0.016) - zTopLocal;
    const xf = (v) => [v[0], v[1] * ca - v[2] * sa + y0, v[1] * sa + v[2] * ca + z0];
    const base = [];
    for (let i = 0; i < 12; i++) {
      const phi = i * TAU / 12;
      const r = planR(phi, 0.215, B, 3.4);
      base.push([Math.sin(phi) * r, Math.cos(phi) * r]);
    }
    pillow(base, hgt, P.lived * 0.05, P.lived * 0.018, xf);
  }

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { shellOuter: at(pal, 'shellOuter'), shellInner: at(pal, 'shellInner'), cushion: at(pal, 'cushion'), leg: at(pal, 'leg') },
  });
}
