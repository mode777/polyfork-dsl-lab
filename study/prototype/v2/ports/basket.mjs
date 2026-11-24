// Woven storage basket — checkered weave courses, braided foot/collar/mouth,
// rope handles, and optional lid/fill. The body is a stack of generic lofts;
// the checker is the reference's alternating radius, not a face dump.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp, lerp, poly } from './_kit.mjs';

const PALETTE = {
  'natural-seagrass': { seagrass: '#E3CBA5', braid: '#B8946A', blanket: '#F8F4EF' },
  'bleached-cane': { seagrass: '#F3EEE8', braid: '#B4AAA0', blanket: '#FAF8F3' },
  'walnut-willow': { seagrass: '#B8946A', braid: '#6B4A32', blanket: '#F0F2F1' },
  'sage-cord': { seagrass: '#D2B084', braid: '#8A6244', blanket: '#7E9179' },
};

const SEG = 12, step = TAU / SEG, AN = (i) => (i + 0.5) * step;
const Y_FOOT = 0.026, H_NECK = 0.028, H_COL_UP = 0.016, H_COL_DN = 0.014, H_UNECK = 0.020, H_MROLL = 0.012, Y_FLOOR = 0.032;
const R_BASE = 0.152, R_NECK = 0.163, D_CELL = 0.004, OFF_FOOT = 0.008, H_FLEDGE = 0.004;
const R_COLLAR = 0.175, R_UNECK = 0.152, R_MOUTH = 0.147, R_MOUTH_IN = 0.128, WALL_IN = 0.022;

function makeBody(P) {
  const H = P.height, BELLY = P.belly, L = P.lived_in;
  const yMouth = H, yRollBot = yMouth - H_MROLL, yColTop = yRollBot - H_UNECK;
  const yCrest = yColTop - H_COL_DN, yNeckTop = yCrest - H_COL_UP, yNeckBot = yNeckTop - H_NECK;
  const yShoulder = clamp(0.54 * H, Y_FOOT + 0.049, yNeckBot - 0.035);
  const R_SH = R_NECK + 0.046 * BELLY;
  const RA = (y) => (y <= yShoulder ? R_BASE + (R_SH - R_BASE) * (Math.max(0, y) / yShoulder)
    : (y >= yNeckBot ? R_NECK : R_SH + (R_NECK - R_SH) * ((y - yShoulder) / (yNeckBot - yShoulder))));
  const OVAL = 0.042 * L, DIP = -0.008 * L;
  const ovalF = (y, i) => 1 + OVAL * clamp(y / yMouth, 0, 1) * Math.cos(2 * AN(i));
  const dipF = (y, i) => { const f = Math.max(0, Math.cos(AN(i))); return DIP * f * f * clamp((y - yShoulder) / (yMouth - yShoulder), 0, 1); };
  const P3 = (r, y, i) => { const rr = r * ovalF(y, i), a = AN(i); return [rr * Math.sin(a), y + dipF(y, i), rr * Math.cos(a)]; };
  const ring = (rf, yf) => Array.from({ length: SEG }, (_, i) => [rf(i), yf(i)]);
  const flatRing = (r, y) => ring(() => r, () => y);
  const yField = Y_FOOT + H_FLEDGE;
  return { H, L, yMouth, yRollBot, yColTop, yCrest, yNeckTop, yNeckBot, yShoulder, RA, P3, ring, flatRing, yField, R_SH };
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'natural-seagrass', { options: Object.keys(PALETTE), label: 'Colorway' });
  const seagrass = g.input('seagrass', 'color', '', { label: 'Seagrass weave' });
  const braid = g.input('braid', 'color', '', { label: 'Braided cord' });
  const blanket = g.input('blanket', 'color', '', { label: 'Blanket' });

  const P = { fill: 'empty', lidded: false, height: 0.28, belly: 1.0, lived_in: 0.35, ...params };
  const B = makeBody(P);
  const { H, L, yMouth, yRollBot, yColTop, yCrest, yNeckTop, yNeckBot, yShoulder, RA, P3, ring, flatRing, yField, R_SH } = B;
  const parts = [];
  const band = (A, B2, zone, opts = {}) => {
    const ra = A.map((q, i) => P3(q[0], q[1], i)), rb = B2.map((q, i) => P3(q[0], q[1], i));
    parts.push(g.loft({ rings: [ra, rb], zones: { band: zone }, ...opts }));
  };
  const cap = (A, y, zone, up) => {
    const ra = A.map((q, i) => P3(q[0], q[1], i));
    // fanDown uses apex,next,current; fanUp uses apex,current,next. Both are
    // the raw reference order, so do not let the loft cap orient them.
    const key = up ? 'capBottom' : 'capTop';
    parts.push(g.loft({ rings: [ra], [key]: [0, y, 0], [key + 'Raw']: true, zones: { [key]: zone } }));
  };

  const rFoot0 = flatRing(R_BASE + OFF_FOOT, 0), rFoot1 = flatRing(RA(Y_FOOT) + D_CELL, Y_FOOT);
  cap(rFoot0, 0, 'cord', false);
  band(rFoot0, rFoot1, 'cord');
  band(rFoot1, flatRing(RA(yField), yField), 'cord');

  const courseY = [yField];
  const NCB = clamp(Math.round((yShoulder - yField) / 0.058), 2, 3);
  for (let k = 1; k <= NCB; k++) courseY.push(yField + (yShoulder - yField) * k / NCB);
  const NCU = clamp(Math.round((yNeckTop - yShoulder) / 0.045), 2, 3);
  for (let k = 1; k <= NCU; k++) courseY.push(yShoulder + (yNeckTop - yShoulder) * k / NCU);
  const sg = (i, k) => ((((i % SEG) + SEG) % SEG) + k) % 2 ? 1 : -1;
  for (let k = 0; k < courseY.length - 1; k++) {
    const y0 = courseY[k], y1 = courseY[k + 1], ym = (y0 + y1) / 2;
    const rMid = ring((i) => RA(ym) + sg(i, k) * D_CELL, () => ym);
    band(flatRing(RA(y0), y0), rMid, 'weave');
    band(rMid, flatRing(RA(y1), y1), 'weave');
  }

  const rCrest = flatRing(R_COLLAR, yCrest), rColTop = flatRing(R_UNECK, yColTop);
  band(flatRing(RA(yNeckTop), yNeckTop), rCrest, 'cord');
  band(rCrest, rColTop, 'cord');
  const rUNeckT = flatRing(R_UNECK, yRollBot);
  band(rColTop, rUNeckT, 'weave');
  const rMouth = flatRing(R_MOUTH, yMouth), rMouthIn = flatRing(R_MOUTH_IN, yMouth - 0.002);
  band(rUNeckT, rMouth, 'cord');
  band(rMouth, rMouthIn, 'cord');

  const rNeckIn = flatRing(R_MOUTH_IN, yNeckBot), rShIn = flatRing(R_SH - WALL_IN, yShoulder), rFloor = flatRing(RA(Y_FLOOR) - WALL_IN, Y_FLOOR);
  band(rMouthIn, rNeckIn, 'weave');
  band(rNeckIn, rShIn, 'weave');
  band(rShIn, rFloor, 'weave');
  cap(rFloor, Y_FLOOR, 'weave', true);

  const yCap = P.lidded ? H - 0.026 : Infinity;
  if (P.fill === 'rolled-blanket') {
    const R_ROLL = 0.112, yTop = Math.min(H + 0.070, yCap), yBot = Y_FLOOR + 0.004, lean = 0.016 * L;
    const sh = (y) => lean * (y - yBot) / Math.max(0.01, yTop - yBot);
    const Q = (r, y, i) => [r * Math.sin(AN(i)), y, r * Math.cos(AN(i)) + sh(y)];
    const rollRing = (r, y) => Array.from({ length: SEG }, (_, i) => Q(r, y, i));
    const A = rollRing(R_ROLL, yBot), Bt = rollRing(R_ROLL - 0.004, yTop - 0.014), Cc = rollRing(0.050, yTop - 0.012);
    const cB = [0, yBot, sh(yBot)], cT = [0, yTop - 0.026, sh(yTop - 0.026)];
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      parts.push(poly(g, [cB, A[j], A[i]], undefined, 'blanket'));
      parts.push(poly(g, [A[i], A[j], Bt[j], Bt[i]], undefined, 'blanket'));
      parts.push(poly(g, [Bt[i], Bt[j], Cc[j], Cc[i]], undefined, 'blanket'));
      parts.push(poly(g, [cT, Cc[i], Cc[j]], undefined, 'blanket'));
    }
  } else if (P.fill === 'folded-throw') {
    const yA = Y_FLOOR + 0.004, A = flatRing(0.126, yA), Rm = flatRing(0.119, Math.min(yMouth - 0.004, yCap)), Cw = flatRing(0.082, Math.min(yMouth + 0.008, yCap));
    cap(A, yA, 'blanket', false);
    band(A, Rm, 'blanket');
    band(Rm, Cw, 'blanket');
    cap(Cw, Math.min(yMouth + 0.014, yCap), 'blanket', true);
    if (!P.lidded) {
      const AZ = Math.PI / 2, SIDES = 4;
      const drape = [[0.035, yMouth + 0.004, 0.062, 0.007, 0.000], [0.100, yMouth + 0.003, 0.060, 0.007, 0.008], [0.160, yMouth + 0.014, 0.052, 0.007, 0.020], [0.184, yMouth - 0.024, 0.040, 0.006, 0.034], [0.191, yMouth - 0.060, 0.026, 0.005, 0.046]];
      const pts = drape.map(([r, y, , , rk]) => [r * Math.sin(AZ), y, r * Math.cos(AZ) + rk]);
      const Bv = [0, 0, 1];
      const rows = pts.map((pt, k) => {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
        const T = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), N = norm3(cross3(Bv, T)), Bn = neg3(norm3(cross3(N, T)));
        const HW = drape[k][2], TH = drape[k][3], out = [];
        for (let s = 0; s < SIDES; s++) {
          const ph = (s + 0.5) * (TAU / SIDES);
          out.push([pt[0] + N[0] * Math.cos(ph) * TH + Bn[0] * Math.sin(ph) * HW, pt[1] + N[1] * Math.cos(ph) * TH + Bn[1] * Math.sin(ph) * HW, pt[2] + N[2] * Math.cos(ph) * TH + Bn[2] * Math.sin(ph) * HW]);
        }
        return out;
      });
      for (let k = 0; k < rows.length - 1; k++) for (let s = 0; s < SIDES; s++) {
        const t = (s + 1) % SIDES;
        parts.push(poly(g, [rows[k][s], rows[k][t], rows[k + 1][t], rows[k + 1][s]], undefined, 'blanket'));
      }
      const e = rows[rows.length - 1];
      parts.push(poly(g, [e[0], e[1], e[2], e[3]], undefined, 'blanket'));
    }
  }

  // Rope loop handles.
  {
    const S = 0.046, RISE = 0.115, SEC = 0.010, SIDES = 6, R_ATT = R_COLLAR + 0.006;
    const ZA = Math.sqrt(Math.max(1e-4, R_ATT * R_ATT - S * S));
    const yT1 = yNeckBot - 0.026, rT1 = RA(yNeckBot - 0.026) - 0.024, Bv = [0, 0, 1];
    for (const side of [1, -1]) {
      const yOff = side > 0 ? -0.008 * L : 0, splay = (side > 0 ? 0.014 : 0.006) * L;
      const tail = (x, y, r) => [x, y + yOff, side * Math.sqrt(Math.max(1e-4, r * r - x * x))];
      const path = [tail(-S * 0.99, yT1, rT1)];
      for (const u of [0, 1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7, 1]) path.push([-S * Math.cos(Math.PI * u), yCrest + RISE * Math.sin(Math.PI * u) + yOff, side * (ZA + splay * Math.sin(Math.PI * u))]);
      path.push(tail(S * 0.99, yT1, rT1));
      const rings = path.map((pt, k) => {
        const a = path[Math.max(0, k - 1)], b = path[Math.min(path.length - 1, k + 1)];
        const T = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), N = norm3(cross3(Bv, T)), Bn = neg3(norm3(cross3(N, T)));
        return Array.from({ length: SIDES }, (_, s) => {
          const ph = (s + 0.5) * (TAU / SIDES);
          return [pt[0] + N[0] * Math.cos(ph) * SEC + Bn[0] * Math.sin(ph) * SEC, pt[1] + N[1] * Math.cos(ph) * SEC + Bn[1] * Math.sin(ph) * SEC, pt[2] + N[2] * Math.cos(ph) * SEC + Bn[2] * Math.sin(ph) * SEC];
        });
      });
      parts.push(g.loft({ rings, zones: { band: 'cord' } }));
    }
  }

  // Optional lid.
  if (P.lidded) {
    const yU = H - 0.012, tilt = 1.4 * Math.PI / 180 * L, R_UND = R_MOUTH_IN - 0.008, R_OUT = 0.158, R_CR = 0.062;
    const yE = yU + 0.020, yC = yU + 0.046;
    const lidP = (r, y, i) => { const a = AN(i), x = r * Math.sin(a), z = r * Math.cos(a); return [x, y + x * Math.sin(tilt) + 0.004 * L, z]; };
    const lidRing = (r, y) => Array.from({ length: SEG }, (_, i) => lidP(r, y, i));
    const U = lidRing(R_UND, yU), E = lidRing(R_OUT, yE), Cr = lidRing(R_CR, yC);
    const cU = [0, yU + 0.004 * L, 0], cC = [0, yC + 0.004 * L, 0];
    for (let i = 0; i < SEG; i++) {
      const j = (i + 1) % SEG;
      parts.push(poly(g, [cU, U[j], U[i]], undefined, 'cord'));
      parts.push(poly(g, [U[i], U[j], E[j], E[i]], undefined, 'cord'));
      parts.push(poly(g, [E[i], E[j], Cr[j], Cr[i]], undefined, 'weave'));
      parts.push(poly(g, [cC, Cr[i], Cr[j]], undefined, 'weave'));
    }
    const S = 0.032, RISE = 0.030, SEC = 0.008, SIDES = 4, y0 = yC - 0.004, Bv = [0, 0, 1], path = [];
    for (const u of [0, 1 / 3, 2 / 3, 1]) { const x = -S * Math.cos(Math.PI * u); path.push([x, y0 + RISE * Math.sin(Math.PI * u) + x * Math.sin(tilt) + 0.004 * L, 0]); }
    const rings = path.map((pt, k) => {
      const a = path[Math.max(0, k - 1)], b = path[Math.min(path.length - 1, k + 1)];
      const T = norm3([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), N = norm3(cross3(Bv, T)), Bn = neg3(norm3(cross3(N, T)));
      return Array.from({ length: SIDES }, (_, s) => {
        const ph = (s + 0.5) * (TAU / SIDES);
        return [pt[0] + N[0] * Math.cos(ph) * SEC + Bn[0] * Math.sin(ph) * SEC, pt[1] + N[1] * Math.cos(ph) * SEC + Bn[1] * Math.sin(ph) * SEC, pt[2] + N[2] * Math.cos(ph) * SEC + Bn[2] * Math.sin(ph) * SEC];
      });
    });
    parts.push(g.loft({ rings, zones: { band: 'cord' } }));
  }

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'natural-seagrass',
    overrides: { seagrass, braid, blanket },
  });
  return g.mesh(g.join(parts), {
    zones: { weave: at(pal, 'seagrass'), cord: at(pal, 'braid'), blanket: at(pal, 'blanket') },
  });
}

function norm3(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function neg3(a) { return [-a[0], -a[1], -a[2]]; }
