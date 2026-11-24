// Table game chair — swivel drum seat, quilted back pad, studded nail row,
// four splayed legs and a footring. The regular parts use loft/block/bridge;
// the back is one reusable quiltedPad node, each nail is one stud, and the
// alternating lower seat ring is a closed `bridge`.
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

const addv = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
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
  const st = (k) => (k + 0.5) * (360 / SEAT_N) * D2R;
  const ring = (r, y) => Array.from({ length: SEAT_N }, (_, k) => P(r, y, st(k)));

  // Seat drum: regular profile bands as one loft, top fan, and the small
  // alternating lower ring which is genuinely a zipper.
  {
    const S = L.S, yU = L.yU, prof = [[R, yU + CH], [R, S - WALL_TOP], [R - ROLL1[0], S - ROLL1[1]], [R - TOP_IN, S]];
    parts.push(g.loft({
      rings: prof.map(([r, y]) => ring(r, y)), diagonal: 'abba',
      capTop: [0, S + DOME, 0], capTopFlip: true,
      zones: { band: seatZone, capTop: seatZone },
    }));
    const lo = (j) => P(R - CH, yU, j * 30 * D2R), hi = (k) => P(R, yU + CH, st(k));
    const loRing = Array.from({ length: SEAT_N / 2 }, (_, j) => lo(j));
    const hiRing = Array.from({ length: SEAT_N }, (_, k) => hi(k));
    parts.push(g.bridge({ a: loRing, b: hiRing, closed: true, inside: [0, yU, 0], zone: seatZone }));
    parts.push(g.loft({ rings: [loRing], capBottom: [0, yU, 0], zones: { capBottom: seatZone } }));
  }

  // Nailhead row: one stud per nail.
  {
    const S = L.S, a = [R, S - WALL_TOP], b = [R - ROLL1[0], S - ROLL1[1]], rMid = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
    const sl = Math.hypot(b[0] - a[0], b[1] - a[1]), cr = (b[1] - a[1]) / sl, cy = (a[0] - b[0]) / sl, half = (180 / SEAT_N) * D2R;
    for (let i = 0; i < NAIL_N; i++) {
      const phi = (i + 0.5) * (360 / NAIL_N) * D2R, tc = Math.round(phi / (2 * half)) * 2 * half;
      const r = rMid * Math.cos(half) / Math.cos(phi - tc), rd = RAD(phi), t = TAN(phi);
      const n = addv([0, cy, 0], rd, cr), s = addv([0, cr, 0], rd, -cy), cpt = P(r, y, phi);
      if (L.back && Math.abs(cpt[0]) - NAIL_A < BAR_HW - 0.003 && cpt[2] < 0) continue;
      parts.push(g.stud({
        x: cpt[0], y: cpt[1], z: cpt[2], nx: n[0], ny: n[1], nz: n[2],
        ux: s[0], uy: s[1], uz: s[2], r: NAIL_A, h: NAIL_H, n: 4, phase: 0,
        bed: -NAIL_BED, ax: s[0] * NAIL_LIFT, ay: s[1] * NAIL_LIFT, az: s[2] * NAIL_LIFT,
        zone: trimZone,
      }));
    }
  }

  // Quilted back pad.
  if (L.back) {
    parts.push(g.quiltedPad({
      x: 0, y: L.yP0, z: 0, width: PAD_W, height: L.PH, radius: PAD_RC, inset: PAD_RI,
      side: PAD_WS, front: PAD_WF, fi: PAD_FI, recline: PAD_RECLINE, gap: 0, z0: PAD_Z0,
      puff: PUFF, pit: PIT_D, sad: SAD_D, bevel: BEV, btnA: BTN_A, btnH: BTN_H,
      colOut: COL_OUT, rowMid: ROW_MID, rowMin: ROW_MIN, rows: L.rowsV, cols: L.colsU,
      zone: seatZone,
    }));
    const S = L.S, d = R * Math.cos((180 / SEAT_N) * D2R), zi = -(d - BAR_BED), zo = zi - BAR_T;
    const y1 = L.yP0 + BAR_INTO, y0 = S - BAR_BOT, x0 = -BAR_HW, x1 = BAR_HW;
    parts.push(g.block({ x0, x1, y0, y1, z0: zo, z1: zi, skip: 'py', zone: trimZone }));
  }

  // Legs.
  {
    const yU = L.yU, yTop = yU + LEG_UP, atY = (y) => { const f = y / yU; return { r: LEG_R0 + (yU - y) * SPLAY, h: LEG_HB + (LEG_HT - LEG_HB) * f, c: LEG_CB + (LEG_CT - LEG_CB) * f }; };
    const sect = ({ h, c }) => [[h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c], [-h + c, -h], [h - c, -h]];
    for (const t of [45, 135, 225, 315].map((a) => a * D2R)) {
      const rd = RAD(t), tg = TAN(t), ringAt = (y) => { const s = atY(y); return sect(s).map(([a, b]) => addv(addv([0, y, 0], rd, s.r + a), tg, b)); };
      const lo = ringAt(0), hi = ringAt(yTop);
      parts.push(g.loft({ rings: [lo, hi], diagonal: 'short', flip: true, zones: { band: frameZone } }));
      parts.push(g.poly({ pts: lo, zone: frameZone }));
    }
  }

  // Footring: outer face, inner face and bottom face.
  {
    const yU = L.yU, yRing = L.yRing, rc = LEG_R0 + (yU - yRing) * SPLAY, r0 = rc - RING_HW, r1 = rc + RING_HW, y0 = yRing - RING_HY, y1 = yRing + RING_HY;
    const rr = (r, y) => Array.from({ length: RING_N }, (_, k) => P(r, y, (360 / RING_N) * k * D2R));
    const outer = rr(r1, y0), inner = rr(r0, y0), crest = rr(rc, y1);
    parts.push(g.loft({ rings: [outer, crest], flip: true, zones: { band: trimZone } }));
    parts.push(g.loft({ rings: [inner, crest], zones: { band: trimZone } }));
    parts.push(g.loft({ rings: [inner, outer], diagonal: 'abba', zones: { band: trimZone } }));
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'walnut-brass', overrides: { wood, trim } });
  const geomTypes = new Set(['poly', 'loft', 'block', 'prism', 'pill', 'revolve', 'fanRing', 'stud', 'quiltedPad', 'bridge']);
  const allGeom = g.ir.nodes.filter((n) => geomTypes.has(n.type)).map((n) => ({ __ref: n.id }));
  return g.mesh(g.join(allGeom), { zones: { vinyl: C.vinyl, wood: at(pal, 'wood'), trim: at(pal, 'trim') } });
}
