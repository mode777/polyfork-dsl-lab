// Cafe table set — faceted table top/column/foot, three chairs with square
// seats, apron/back boards, and two mugs. The lathes use revolve; boxes use
// block; the chair back is a prism. Default term is the reference 0.6.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp } from './_kit.mjs';

const PALETTE = {
  'union-oak': { timber: '#c59a73', frame: '#523f34', base: '#5b4f45', cups: '#efeae3', coffee: '#936e4b', device: '#70757e' },
  'charcoal-pedestal': { timber: '#a37d5b', frame: '#5b4f45', base: '#404349', cups: '#eae2dc', coffee: '#523f34', device: '#b4a9a3' },
  'pale-birch': { timber: '#efeae3', frame: '#9d9287', base: '#70757e', cups: '#f0b051', coffee: '#5b4f45', device: '#404349' },
  'walnut-sage': { timber: '#936e4b', frame: '#404349', base: '#697544', cups: '#efeae3', coffee: '#523f34', device: '#b4a9a3' },
};

const TOP_Y = 0.75, TOP_T = 0.05, TOP_CH = 0.015, TOP_IN = 0.39;
const SQ_HALF = 0.38, SQ_CORNER = 0.06, COL_R0 = 0.058, COL_R1 = 0.034, COL_Y0 = 0.03, COL_Y1 = TOP_Y - TOP_T + 0.012;
const FOOT_IN = 0.20, FOOT_BAND = 0.028, FOOT_H = 0.046, FOOT_CH = 0.024;
const SEAT_W = 0.42, SEAT_D = 0.42, SEAT_Y = 0.45, SEAT_T = 0.03, SEAT_CH = 0.010;
const LEG = 0.035, LEG_IN = 0.015, RAIL_H = 0.06, RAIL_T = 0.02, RAIL_SET = 0.006;
const BACK_Y0 = 0.69, BACK_Y1 = 0.85, BACK_CH = 0.010, BACK_PROUD = 0.005, BACK_SIDE = 0.010;
const TERM_DOWN = 0.2, RHO_IN = 0.46, RHO_OUT = 0.72, YAW = (14 * Math.PI) / 180, UP_X = 0.255, UP_LIFT = 0.002;
const CUP_R0 = 0.032, CUP_R1 = 0.039, CUP_H = 0.085, CUP_RIM = 0.007;

const ngon = (n, rin) => {
  const rc = rin / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i) => { const a = ((i + 0.5) / n) * TAU; return [Math.sin(a) * rc, Math.cos(a) * rc]; });
};
const octSquare = (h, c) => [[h - c, h], [h, h - c], [h, c - h], [h - c, -h], [c - h, -h], [-h, c - h], [-h, h - c], [c - h, h]];
const at3 = (plan, y) => plan.map((p) => [p[0], y, p[1]]);

function skipFaces(skip) {
  const map = { x: 'px', y: 'py', z: 'pz' };
  return String(skip).split(/\s+/).filter(Boolean).map((s) => {
    const axis = s[0], sign = s[1];
    return map[axis] + (sign === '+' ? '' : '');
  }).join(' ');
}
function box(g, zone, x0, x1, y0, y1, z0, z1, skip = '') {
  const sk = [];
  for (const s of String(skip).split(/\s+/).filter(Boolean)) {
    const ax = s[0], sg = s[1];
    const n = { x: 'px', y: 'py', z: 'pz' }[ax];
    sk.push(sg === '+' ? n : { x: 'nx', y: 'ny', z: 'nz' }[ax]);
  }
  return g.block({ x0, x1, y0, y1, z0, z1, skip: sk.join(' '), zone });
}

function extrudeX(g, zone, prof, x0, x1) {
  const out = [], n = prof.length;
  const cy = prof.reduce((s, q) => s + q[1], 0) / n, cz = prof.reduce((s, q) => s + q[0], 0) / n;
  for (let i = 0; i < n; i++) {
    const a = prof[i], b = prof[(i + 1) % n];
    out.push(g.poly({ pts: [[x0, a[1], a[0]], [x0, b[1], b[0]], [x1, b[1], b[0]], [x1, a[1], a[0]]], hint: [0, (a[1] + b[1]) / 2 - cy, (a[0] + b[0]) / 2 - cz], zone }));
  }
  for (const [x, d] of [[x0, -1], [x1, 1]]) {
    for (let i = 1; i + 1 < n; i++) out.push(g.poly({ pts: [[x, prof[0][1], prof[0][0]], [x, prof[i][1], prof[i][0]], [x, prof[i + 1][1], prof[i + 1][0]]], hint: [d, 0, 0], zone }));
  }
  return out;
}

function lathe(g, zone, rings, cx, cz, capBottom, capTop, seg) {
  const prof = rings.map(([plan, y]) => plan.map((p) => [p[0] + cx, y, p[1] + cz]));
  const out = [g.loft({ rings: prof, zones: { band: zone } })];
  // The reference lathe fan uses ring[0] as the centre and stops one edge
  // short, unlike a closed loft cap; poly reproduces that exact fan.
  if (capBottom) out.push(g.poly({ pts: prof[0], hint: [0, -1, 0], zone }));
  if (capTop) out.push(g.poly({ pts: prof[prof.length - 1], hint: [0, 1, 0], zone }));
  return g.join(out);
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'union-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const timber = g.input('timber', 'color', '', { label: 'Table top and seats' });
  const frame = g.input('frame', 'color', '', { label: 'Chair frames' });
  const base = g.input('base', 'color', '', { label: 'Pedestal' });
  const cups = g.input('cups', 'color', '', { label: 'Mugs' });
  const coffee = g.input('coffee', 'color', '', { label: 'Coffee' });
  const device = g.input('device', 'color', '', { label: 'Laptop' });

  const P = { chairs: 3, term: 0.6, topShape: 'round', ...params };
  const chairs = Math.round(P.chairs), term = P.term, shape = P.topShape;
  const S = [], T = [];
  const topPlan = shape === 'square' ? (d) => octSquare(SQ_HALF - d, SQ_CORNER - d * (2 - Math.SQRT2)) : (d) => ngon(12, TOP_IN - d);
  S.push(lathe(g, 'timber', [[topPlan(0), TOP_Y - TOP_T], [topPlan(0), TOP_Y - TOP_CH], [topPlan(TOP_CH), TOP_Y]], 0, 0, true, true, 12));
  S.push(g.revolve({ profile: [[COL_R0, COL_Y0], [COL_R1, COL_Y1]], seg: 8, inRadius: true, zone: 'base' }));
  S.push(lathe(g, 'base', [[ngon(12, FOOT_IN), 0], [ngon(12, FOOT_IN), FOOT_BAND], [ngon(12, FOOT_IN - FOOT_CH), FOOT_H]], 0, 0, true, true, 12));

  const chair = () => {
    const out = [];
    const hx = SEAT_W / 2, hz = SEAT_D / 2, xo = hx - LEG_IN, xi = xo - LEG, zo = hz - LEG_IN, zi = zo - LEG, yb = SEAT_Y - SEAT_T;
    for (const s of [-1, 1]) {
      const [xa, xb] = s > 0 ? [xi, xo] : [-xo, -xi];
      out.push(box(g, 'frame', xa, xb, 0, yb + 0.012, zi, zo, 'y+'));
      out.push(box(g, 'frame', xa, xb, 0, BACK_Y0 + 0.02, -zo, -zi, 'y+'));
    }
    const sq = (d) => [[-hx + d, -hz + d], [hx - d, -hz + d], [hx - d, hz - d], [-hx + d, hz - d]];
    out.push(lathe(g, 'timber', [[sq(0), yb], [sq(0), SEAT_Y - SEAT_CH], [sq(SEAT_CH), SEAT_Y]], 0, 0, true, true, 4));
    const r0 = yb - RAIL_H, r1 = yb + 0.005, ro = zo - RAIL_SET, ri = ro - RAIL_T, rx = xi + 0.005;
    out.push(box(g, 'frame', -rx, rx, r0, r1, ri, ro, 'y+ x+ x-'));
    out.push(box(g, 'frame', -rx, rx, r0, r1, -ro, -ri, 'y+ x+ x-'));
    const so = xo - RAIL_SET, si = so - RAIL_T, rz = zi + 0.005;
    out.push(box(g, 'frame', si, so, r0, r1, -rz, rz, 'y+ z+ z-'));
    out.push(box(g, 'frame', -so, -si, r0, r1, -rz, rz, 'y+ z+ z-'));
    const zb = -zo - BACK_PROUD, zf = -zi + BACK_PROUD, bx = xo + BACK_SIDE;
    const prof = [[zb, BACK_Y0], [zf, BACK_Y0], [zf, BACK_Y1 - BACK_CH], [zf - BACK_CH, BACK_Y1], [zb + BACK_CH, BACK_Y1], [zb, BACK_Y1 - BACK_CH]];
    out.push(...extrudeX(g, 'timber', prof, -bx, bx));
    return g.join(out);
  };

  const SLOTS = { e: { az: Math.PI / 2, lat: [0, 1] }, w: { az: -Math.PI / 2, lat: [0, 1] }, s: { az: 0, lat: [1, 0] }, n: { az: Math.PI, lat: [-1, 0] } };
  const SEATINGS = [[], ['s'], ['e', 'w'], ['e', 'w', 's'], ['e', 'w', 's', 'n']];
  const seats = SEATINGS[chairs];
  const summer = term < TERM_DOWN - 1e-9, u = Math.min(1, Math.max(0, (term - TERM_DOWN) / (1 - TERM_DOWN)));
  if (summer) {
    const half = Math.ceil(seats.length / 2);
    for (const [list, sx] of [[seats.slice(0, half), 1], [seats.slice(half), -1]]) {
      const zs = list.length === 1 ? [0] : [SEAT_W / 2 + 0.01, -(SEAT_W / 2 + 0.01)];
      list.forEach((_, i) => {
        const geo = chair();
        S.push(g.transform({ geom: geo, tx: sx * UP_X, ty: TOP_Y + SEAT_Y + UP_LIFT, tz: zs[i], ry: (sx * Math.PI) / 2, rx: Math.PI }));
      });
    }
  } else {
    for (const key of seats) {
      const { az } = SLOTS[key];
      let rho = RHO_IN + (RHO_OUT - RHO_IN) * u, yaw = 0;
      if (key === 'e') yaw = YAW * u; else if (key === 'w') yaw = -YAW * u; else yaw = (key === 's' ? 0.7 : -0.5) * YAW * Math.max(0, 2 * u - 1 - 1e-9);
      if (key === 's') rho += 0.02 * Math.max(0, 2 * u - 1 - 1e-9);
      if (key === 'n') rho += 0.02 * Math.max(0, 2 * u - 1 - 1e-9);
      S.push(g.transform({ geom: chair(), tx: Math.sin(az) * rho, tz: Math.cos(az) * rho, ry: az + Math.PI + yaw }));
    }
  }

  if (!summer && seats.length) {
    const nCups = Math.round(u * seats.length + 1e-9);
    seats.slice(0, nCups).forEach((key) => {
      const { az, lat } = SLOTS[key], lap = false;
      const R = lap ? 0.22 : 0.26, L = lap ? 0.21 : 0.10;
      const cx = Math.sin(az) * R + lat[0] * L, cz = Math.cos(az) * R + lat[1] * L;
      const h = lat, w = [-lat[1], lat[0]];
      const ring = (r) => Array.from({ length: 6 }, (_, i) => { const a = ((i + 0.5) / 6) * TAU, rc = r / Math.cos(Math.PI / 6); return [cx + (Math.cos(a) * h[0] + Math.sin(a) * w[0]) * rc, cz + (Math.cos(a) * h[1] + Math.sin(a) * w[1]) * rc]; });
      const y1 = TOP_Y + CUP_H, outer = ring(CUP_R1), inner = ring(CUP_R1 - CUP_RIM);
      const lo = ring(CUP_R0).map((p) => [p[0], TOP_Y - 0.002, p[1]]), hi = outer.map((p) => [p[0], y1, p[1]]);
      T.push(g.loft({ rings: [lo, hi], zones: { band: 'cups' } }));
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        T.push(g.poly({ pts: [[outer[i][0], y1, outer[i][1]], [outer[j][0], y1, outer[j][1]], [inner[j][0], y1, inner[j][1]], [inner[i][0], y1, inner[i][1]]], hint: [0, 1, 0], zone: 'cups' }));
      }
      T.push(g.poly({ pts: inner.map((p) => [p[0], y1, p[1]]), hint: [0, 1, 0], zone: 'coffee' }));
      const hr0 = CUP_R0 - 0.002, hr1 = CUP_R1 + 0.018;
      const hc = [cx + h[0] * (hr0 + hr1) / 2, TOP_Y + 0.044, cz + h[1] * (hr0 + hr1) / 2];
      const ax = [[h[0], 0, h[1]], [0, 1, 0], [w[0], 0, w[1]]], half = [(hr1 - hr0) / 2, 0.024, 0.006];
      const P3 = (a, b, c) => [hc[0] + ax[0][0] * a * half[0] + ax[1][0] * b * half[1] + ax[2][0] * c * half[2], hc[1] + ax[0][1] * a * half[0] + ax[1][1] * b * half[1] + ax[2][1] * c * half[2], hc[2] + ax[0][2] * a * half[0] + ax[1][2] * b * half[1] + ax[2][2] * c * half[2]];
      const q = (a,b,c,d,hint) => T.push(g.poly({ pts: [P3(...a), P3(...b), P3(...c), P3(...d)], hint, zone: 'cups' }));
      const nw = [-w[0], 0, -w[1]], pw = [w[0], 0, w[1]], ph = [h[0], 0, h[1]];
      q([-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1], nw);
      q([-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1], pw);
      q([1,-1,-1],[1,-1,1],[1,1,1],[1,1,-1], ph);
      q([-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1], [0,-1,0]);
      q([-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1], [0,1,0]);
    });
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'union-oak', overrides: { timber, frame, base, cups, coffee, device } });
  const all = g.join([...S, ...T]);
  return g.mesh(all, {
    zones: { timber: at(pal, 'timber'), frame: at(pal, 'frame'), base: at(pal, 'base'), cups: at(pal, 'cups'), coffee: at(pal, 'coffee'), device: at(pal, 'device') },
  });
}
