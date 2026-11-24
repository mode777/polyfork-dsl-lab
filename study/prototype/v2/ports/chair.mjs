// Table game chair — a swivel drum seat, tufted back pad, four splayed legs,
// nailhead row and footring. Curved/tufted surfaces are explicit poly faces;
// the seat and legs use lofts.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp } from './_kit.mjs';

const PALETTE = {
  'walnut-brass': { wood: '#644628', trim: '#B3883A' },
  'honey-champagne': { wood: '#9F7130', trim: '#D29F53' },
  'espresso-nickel': { wood: '#50341E', trim: '#E3E3E0' },
};
const UPH = { crimson: '#923629', black: '#2A2A28', emerald: '#4F7237' };
const D2R = Math.PI / 180;
const SEAT_N = 24, R = 0.228, SEAT_T = 0.10, CH = 0.02, WALL_TOP = 0.028, ROLL1 = [0.009, 0.008], TOP_IN = 0.034, DOME = 0.004;
const NAIL_N = 56, NAIL_A = 0.0095, NAIL_H = 0.004, NAIL_LIFT = 0.002, NAIL_BED = 0.002;
const PAD_W = 0.36, PAD_RC = 0.03, PAD_RI = 0.012, PAD_WS = 0.05, PAD_WF = 0.07, PAD_FI = 0.022, PAD_RECLINE = 7 * D2R, PAD_GAP = 0.035, PAD_Z0 = -(R + 0.035);
const PUFF = 0.005, PIT_D = 0.012, SAD_D = 0.002, BEV = 0.007, BTN_A = 0.0105, BTN_H = 0.02, COL_OUT = 0.25, ROW_MID = 0.106, ROW_MIN = 0.065;
const BAR_HW = 0.028, BAR_T = 0.012, BAR_BED = 0.001, BAR_BOT = 0.09, BAR_INTO = 0.04;
const LEG_R0 = 0.148, SPLAY = 0.148, LEG_HT = 0.023, LEG_HB = 0.018, LEG_CT = 0.005, LEG_CB = 0.004, LEG_UP = 0.02;
const RING_N = 16, RING_DROP = 0.38, RING_MIN = 0.16, RING_HW = 0.012, RING_HY = 0.012;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const addv = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const UP = [0, 1, 0], DOWN = [0, -1, 0];

function T(g, zone, a, b, c, hint) { g.poly({ pts: [a, b, c], hint, zone }); }
function Q(g, zone, a, b, c, d, hint) {
  if (len(sub(a, c)) <= len(sub(b, d)) + 1e-9) { T(g, zone, a, b, c, hint); T(g, zone, a, c, d, hint); }
  else { T(g, zone, a, b, d, hint); T(g, zone, b, c, d, hint); }
}
const P = (r, y, t) => [r * Math.sin(t), y, -r * Math.cos(t)];
const RAD = (t) => [Math.sin(t), 0, -Math.cos(t)];
const TAN = (t) => [Math.cos(t), 0, Math.sin(t)];

function layout(P0) {
  const S = clamp(P0.seatHeight ?? 0.58, 0.48, 0.78), PH = clamp(P0.backHeight ?? 0.31, 0.19, 0.43), back = P0.back !== false;
  const yU = S - SEAT_T, fh = PH - 2 * PAD_FI, nMid = Math.max(0, Math.floor((fh - 2 * ROW_MIN) / ROW_MID + 1e-9)), outer = (fh - nMid * ROW_MID) / 2;
  const rowsV = [PAD_FI, PAD_FI + outer];
  for (let i = 0; i < nMid; i++) rowsV.push(rowsV[rowsV.length - 1] + ROW_MID);
  rowsV.push(PH - PAD_FI);
  const fw = PAD_W - 2 * PAD_FI, colsU = [-fw / 2, -fw / 2 + COL_OUT * fw, fw / 2 - COL_OUT * fw, fw / 2];
  const yRing = Math.max(RING_MIN, S - RING_DROP);
  return { S, PH, back, yU, rowsV, colsU, yRing, yP0: S + PAD_GAP };
}
function padPoint(L, u, v, w) { const c = Math.cos(PAD_RECLINE), s = Math.sin(PAD_RECLINE); return [u, L.yP0 + v * c + w * s, PAD_Z0 - v * s + w * c]; }
function padDir(du, dv, dw) { const c = Math.cos(PAD_RECLINE), s = Math.sin(PAD_RECLINE); return [du, dv * c + dw * s, -dv * s + dw * c]; }

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'walnut-brass', { options: Object.keys(PALETTE), label: 'Colorway' });
  const upholstery = g.input('upholstery', 'enum', 'crimson', { options: Object.keys(UPH), label: 'Upholstery' });
  const vinyl = g.input('vinyl', 'color', '', { label: 'Vinyl' });
  const wood = g.input('wood', 'color', '', { label: 'Leg wood' });
  const trim = g.input('trim', 'color', '', { label: 'Metal trim' });

  const P0 = { seatHeight: 0.58, backHeight: 0.31, back: true, ...params };
  const L = layout(P0), C = { ...(PALETTE[P0.colorway] || PALETTE['walnut-brass']) };
  if (P0.wood) C.wood = P0.wood; if (P0.trim) C.trim = P0.trim;
  C.vinyl = P0.vinyl && P0.vinyl.toLowerCase() !== UPH.crimson.toLowerCase() ? P0.vinyl : (UPH[P0.upholstery] || UPH.crimson);
  const parts = [];
  const seatZone = 'vinyl', frameZone = 'wood', trimZone = 'trim';

  // Seat drum.
  {
    const S = L.S, yU = L.yU, prof = [[R, yU + CH], [R, S - WALL_TOP], [R - ROLL1[0], S - ROLL1[1]], [R - TOP_IN, S]];
    for (let e = 0; e < prof.length - 1; e++) {
      const a = prof[e], b = prof[e + 1], nr = b[1] - a[1], ny = -(b[0] - a[0]);
      for (let k = 0; k < SEAT_N; k++) {
        const t0 = (k + 0.5) * (360 / SEAT_N) * D2R, t1 = (k + 1.5) * (360 / SEAT_N) * D2R;
        Q(g, seatZone, P(a[0], a[1], t0), P(b[0], b[1], t0), P(b[0], b[1], t1), P(a[0], a[1], t1), addv([0, ny, 0], RAD((k + 1) * (360 / SEAT_N) * D2R), nr));
      }
    }
    const top = [0, S + DOME, 0], e = prof[prof.length - 1];
    for (let k = 0; k < SEAT_N; k++) T(g, seatZone, top, P(e[0], e[1], (k + 0.5) * (360 / SEAT_N) * D2R), P(e[0], e[1], (k + 1.5) * (360 / SEAT_N) * D2R), UP);
    const lo = (j) => P(R - CH, yU, j * 30 * D2R), hi = (k) => P(R, yU + CH, (k + 0.5) * (360 / SEAT_N) * D2R);
    const nr = CH, ny = -CH;
    for (let j = 0; j < SEAT_N / 2; j++) {
      const kPrev = (2 * j - 1 + SEAT_N) % SEAT_N, kA = 2 * j, kB = 2 * j + 1;
      T(g, seatZone, lo(j), hi(kPrev), hi(kA), addv([0, ny, 0], RAD(j * 30 * D2R), nr));
      Q(g, seatZone, lo(j), hi(kA), hi(kB), lo(j + 1), addv([0, ny, 0], RAD((j * 30 + 15) * D2R), nr));
    }
    const c = [0, yU, 0];
    for (let j = 0; j < SEAT_N / 2; j++) T(g, seatZone, c, lo(j), lo(j + 1), DOWN);
  }

  // Nails.
  {
    const S = L.S, a = [R, S - WALL_TOP], b = [R - ROLL1[0], S - ROLL1[1]], rMid = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const sl = Math.hypot(b[0] - a[0], b[1] - a[1]), cr = (b[1] - a[1]) / sl, cy = (a[0] - b[0]) / sl, half = (180 / SEAT_N) * D2R;
    for (let i = 0; i < NAIL_N; i++) {
      const phi = (i + 0.5) * (360 / NAIL_N) * D2R, tc = Math.round(phi / (2 * half)) * 2 * half;
      const r = rMid * Math.cos(half) / Math.cos(phi - tc), rd = RAD(phi), t = TAN(phi);
      const n = addv([0, cy, 0], rd, cr), s = addv([0, cr, 0], rd, -cy), cpt = P(r, y, phi);
      if (L.back && Math.abs(cpt[0]) - NAIL_A < BAR_HW - 0.003 && cpt[2] < 0) continue;
      const base = addv(cpt, n, -NAIL_BED), q = [addv(base, s, NAIL_A), addv(base, t, NAIL_A), addv(base, s, -NAIL_A), addv(base, t, -NAIL_A)], apex = addv(addv(cpt, n, NAIL_H), s, NAIL_LIFT);
      for (let k = 0; k < 4; k++) T(g, trimZone, apex, q[k], q[(k + 1) % 4], n);
    }
  }

  // Back pad.
  if (L.back) {
    const { PH, rowsV, colsU } = L, hw = PAD_W / 2, nR = rowsV.length - 1;
    const FWD = padDir(0, 0, 1), BACK = padDir(0, 0, -1), fb = [];
    const vIn = rowsV.slice(1, -1), uL = colsU[0], uR = colsU[3], vB = rowsV[0], vT = rowsV[nR];
    fb.push({ u: uL, v: vB, corner: [-1, -1] }, { u: colsU[1], v: vB, edge: 'b' }, { u: colsU[2], v: vB, edge: 'b' }, { u: uR, v: vB, corner: [1, -1] });
    for (const v of vIn) fb.push({ u: uR, v, edge: 'r' });
    fb.push({ u: uR, v: vT, corner: [1, 1] }, { u: colsU[2], v: vT, edge: 't' }, { u: colsU[1], v: vT, edge: 't' }, { u: uL, v: vT, corner: [-1, 1] });
    for (const v of vIn.slice().reverse()) fb.push({ u: uL, v, edge: 'l' });
    const ring = (ins) => {
      const pts = [], rc = PAD_RC - ins;
      fb.forEach((f, i) => {
        if (f.corner) {
          const [sx, sy] = f.corner, cu = sx * (hw - PAD_RC), cv = sy < 0 ? PAD_RC : PH - PAD_RC, a0 = sx < 0 ? (sy < 0 ? 180 : 90) : (sy < 0 ? 270 : 0);
          for (let k = 0; k < 3; k++) { const a = (a0 + 45 * k) * D2R; pts.push({ u: cu + rc * Math.cos(a), v: cv + rc * Math.sin(a), f: i }); }
        } else if (f.edge === 'b') pts.push({ u: f.u, v: ins, f: i });
        else if (f.edge === 't') pts.push({ u: f.u, v: PH - ins, f: i });
        else if (f.edge === 'r') pts.push({ u: hw - ins, v: f.v, f: i });
        else pts.push({ u: -hw + ins, v: f.v, f: i });
      });
      return pts;
    };
    const rear = ring(PAD_RI), full = ring(0), N = full.length;
    const out2 = (a, b) => { const du = b.u - a.u, dv = b.v - a.v, l = Math.hypot(du, dv) || 1; return padDir(dv / l, -du / l, 0); };
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, hint = addv(out2(full[i], full[j]), BACK, 0.2);
      Q(g, seatZone, padPoint(L, rear[i].u, rear[i].v, 0), padPoint(L, rear[j].u, rear[j].v, 0), padPoint(L, full[j].u, full[j].v, PAD_WS), padPoint(L, full[i].u, full[i].v, PAD_WS), hint);
    }
    const rc0 = padPoint(L, 0, PH / 2, 0);
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; T(g, seatZone, rc0, padPoint(L, rear[i].u, rear[i].v, 0), padPoint(L, rear[j].u, rear[j].v, 0), BACK); }
    const F = (i) => padPoint(L, fb[i].u, fb[i].v, PAD_WF);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, hint = addv(out2(full[i], full[j]), FWD, 1), a = padPoint(L, full[i].u, full[i].v, PAD_WS), b = padPoint(L, full[j].u, full[j].v, PAD_WS);
      if (full[i].f === full[j].f) T(g, seatZone, a, b, F(full[i].f), hint); else Q(g, seatZone, a, b, F(full[j].f), F(full[i].f), hint);
    }
    const border = (i, j) => i === 0 || i === 3 || j === 0 || j === nR;
    const node = (i, j) => padPoint(L, colsU[i], rowsV[j], border(i, j) ? PAD_WF : PAD_WF - PIT_D);
    for (let j = 0; j < nR; j++) for (let i = 0; i < 3; i++) {
      const ij = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], o = ij.map(([a, b]) => node(a, b));
      const u0 = colsU[i] + BEV, u1 = colsU[i + 1] - BEV, v0 = rowsV[j] + BEV, v1 = rowsV[j + 1] - BEV;
      const pn = [padPoint(L, u0, v0, PAD_WF + PUFF), padPoint(L, u1, v0, PAD_WF + PUFF), padPoint(L, u1, v1, PAD_WF + PUFF), padPoint(L, u0, v1, PAD_WF + PUFF)];
      Q(g, seatZone, pn[0], pn[1], pn[2], pn[3], FWD);
      for (let k = 0; k < 4; k++) {
        const m = (k + 1) % 4, [a0, b0] = ij[k], [a1, b1] = ij[m];
        if (!border(a0, b0) || !border(a1, b1)) {
          const s = padPoint(L, (colsU[a0] + colsU[a1]) / 2, (rowsV[b0] + rowsV[b1]) / 2, PAD_WF - SAD_D);
          T(g, seatZone, o[k], s, pn[k], FWD); T(g, seatZone, s, pn[m], pn[k], FWD); T(g, seatZone, s, o[m], pn[m], FWD);
        } else Q(g, seatZone, o[k], o[m], pn[m], pn[k], FWD);
      }
    }
    const du = padDir(1, 0, 0), dv = padDir(0, 1, 0);
    for (let j = 1; j < nR; j++) for (const i of [1, 2]) {
      const c = node(i, j), q = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([a, b]) => addv(addv(c, du, a * BTN_A), dv, b * BTN_A)), apex = addv(c, FWD, BTN_H);
      for (let k = 0; k < 4; k++) T(g, seatZone, apex, q[k], q[(k + 1) % 4], FWD);
    }

    // Back bar.
    const S = L.S, d = R * Math.cos((180 / SEAT_N) * D2R), zi = -(d - BAR_BED), zo = zi - BAR_T;
    const y1 = padPoint(L, 0, 0, 0)[1] + BAR_INTO, y0 = S - BAR_BOT, x0 = -BAR_HW, x1 = BAR_HW;
    Q(g, trimZone, [x0, y0, zo], [x1, y0, zo], [x1, y1, zo], [x0, y1, zo], [0, 0, -1]);
    Q(g, trimZone, [x0, y0, zi], [x1, y0, zi], [x1, y1, zi], [x0, y1, zi], [0, 0, 1]);
    Q(g, trimZone, [x0, y0, zi], [x0, y0, zo], [x0, y1, zo], [x0, y1, zi], [-1, 0, 0]);
    Q(g, trimZone, [x1, y0, zi], [x1, y0, zo], [x1, y1, zo], [x1, y1, zi], [1, 0, 0]);
    Q(g, trimZone, [x0, y0, zi], [x1, y0, zi], [x1, y0, zo], [x0, y0, zo], DOWN);
  }

  // Legs and footring.
  {
    const yU = L.yU, yTop = yU + LEG_UP, atY = (y) => { const f = y / yU; return { r: LEG_R0 + (yU - y) * SPLAY, h: LEG_HB + (LEG_HT - LEG_HB) * f, c: LEG_CB + (LEG_CT - LEG_CB) * f }; };
    const sect = ({ h, c }) => [[h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h]];
    for (const t of [45, 135, 225, 315].map((a) => a * D2R)) {
      const rd = RAD(t), tg = TAN(t), ring = (y) => { const s = atY(y); return sect(s).map(([a, b]) => addv(addv([0, y, 0], rd, s.r + a), tg, b)); };
      const lo = ring(0), hi = ring(yTop), sb = sect(atY(0));
      for (let k = 0; k < 8; k++) { const m = (k + 1) % 8, mid = [(sb[k][0] + sb[m][0]) / 2, (sb[k][1] + sb[m][1]) / 2], hint = addv(addv([0, 0, 0], rd, mid[0]), tg, mid[1]); Q(g, frameZone, lo[k], lo[m], hi[m], hi[k], hint); }
      for (let k = 1; k < 7; k++) T(g, frameZone, lo[0], lo[k], lo[k + 1], DOWN);
    }
    const yRing = L.yRing, rc = LEG_R0 + (yU - yRing) * SPLAY, r0 = rc - RING_HW, r1 = rc + RING_HW, y0 = yRing - RING_HY, y1 = yRing + RING_HY, st = (k) => (360 / RING_N) * k * D2R;
    for (let k = 0; k < RING_N; k++) {
      const t0 = st(k), t1 = st(k + 1), rd = RAD((t0 + t1) / 2);
      Q(g, trimZone, P(r1, y0, t0), P(r1, y0, t1), P(rc, y1, t1), P(rc, y1, t0), addv(UP, rd, 1));
      Q(g, trimZone, P(r0, y0, t0), P(r0, y0, t1), P(rc, y1, t1), P(rc, y1, t0), addv(UP, rd, -1));
      Q(g, trimZone, P(r0, y0, t0), P(r1, y0, t0), P(r1, y0, t1), P(r0, y0, t1), DOWN);
    }
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'walnut-brass', overrides: { wood, trim } });
  const geomTypes = new Set(['poly', 'loft', 'block', 'prism', 'pill', 'revolve', 'fanRing']);
  const allGeom = g.ir.nodes.filter((n) => geomTypes.has(n.type)).map((n) => ({ __ref: n.id }));
  return g.mesh(g.join(allGeom), { zones: { vinyl: C.vinyl, wood: at(pal, 'wood'), trim: at(pal, 'trim') } });
}
