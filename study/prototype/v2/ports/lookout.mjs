// Lookout watchtower — a timber trestle, planked shaft, glazed octagonal cabin,
// railing and conical roof. The reference helpers are translated to generic
// poly/prim/loft nodes, keeping every opening and brace as a real face.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp, add, sub, mul, dot, cross, norm } from './_kit.mjs';

const PALETTE = {
  'weathered-oak': { timber: '#6B4526', plank: '#9C6B3C', deck: '#A88458', roof: '#C9975C', trim: '#C4A46A', pane: '#1C6B84', doorway: '#2A2320' },
  'sun-bleached': { timber: '#9C6B3C', plank: '#C4A46A', deck: '#DCCBA6', roof: '#E8D6A8', trim: '#C9975C', pane: '#58C8C0', doorway: '#3E4348' },
  'tarred-storm': { timber: '#3E4348', plank: '#5A6462', deck: '#7C8683', roof: '#8A8071', trim: '#9AA3A0', pane: '#2E9CA8', doorway: '#2A2320' },
  'harbour-red': { timber: '#4A2E1B', plank: '#A88458', deck: '#C4A46A', roof: '#B0392E', trim: '#DCCBA6', pane: '#1C6B84', doorway: '#2A2320' },
};

const FALL = 63, FX0 = 1, FX1 = 2, FY0 = 4, FY1 = 8, FZ0 = 16, FZ1 = 32;
const FENDS_X = FALL & ~(FX0 | FX1), FCAPS_Y = FALL & ~(FY0 | FY1), FENDS_Z = FALL & ~(FZ0 | FZ1);
const FACETS = { square: 4, hex: 6, octagon: 8 };

function quadN(g, zone, a, b, c, d, hint) {
  const u = sub(b, a), v = sub(c, b), n = cross(u, v);
  const q = dot(n, hint) < 0 ? [d, c, b, a] : [a, b, c, d];
  g.poly({ pts: q, zone });
}
function triN(g, zone, a, b, c, hint) {
  const n = cross(sub(b, a), sub(c, a));
  g.poly({ pts: dot(n, hint) < 0 ? [a, c, b] : [a, b, c], zone });
}
function quad(g, zone, a, b, c, d) { g.poly({ pts: [a, b, c, d], zone }); }
function tri(g, zone, a, b, c) { g.poly({ pts: [a, b, c], zone }); }

function openBox(g, x0, y0, z0, x1, y1, z1, faces, zone) {
  const P = (i, j, k) => [i ? x1 : x0, j ? y1 : y0, k ? z1 : z0];
  if (faces & FX0) quad(g, zone, P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0));
  if (faces & FX1) quad(g, zone, P(1, 0, 1), P(1, 0, 0), P(1, 1, 0), P(1, 1, 1));
  if (faces & FY0) quad(g, zone, P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1));
  if (faces & FY1) quad(g, zone, P(0, 1, 1), P(1, 1, 1), P(1, 1, 0), P(0, 1, 0));
  if (faces & FZ0) quad(g, zone, P(1, 0, 0), P(0, 0, 0), P(0, 1, 0), P(1, 1, 0));
  if (faces & FZ1) quad(g, zone, P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1));
}
function obox(g, x0, y0, z0, x1, y1, z1, faces, zone) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
  openBox(g, ax, ay, az, bx, by, bz, faces, zone);
}
function prism(g, y0, y1, b, t, caps, zone) {
  const bd = b.hd === undefined ? b.hw : b.hd, td = t.hd === undefined ? t.hw : t.hd;
  const bx = b.x || 0, bz = b.z || 0, tx = t.x || 0, tz = t.z || 0;
  const B = [[bx - b.hw, y0, bz + bd], [bx + b.hw, y0, bz + bd], [bx + b.hw, y0, bz - bd], [bx - b.hw, y0, bz - bd]];
  const T = [[tx - t.hw, y1, tz + td], [tx + t.hw, y1, tz + td], [tx + t.hw, y1, tz - td], [tx - t.hw, y1, tz - td]];
  const cx = (bx + tx) / 2, cz = (bz + tz) / 2;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const mx = (B[i][0] + B[j][0] + T[i][0] + T[j][0]) / 4 - cx, mz = (B[i][2] + B[j][2] + T[i][2] + T[j][2]) / 4 - cz;
    quadN(g, zone, B[i], B[j], T[j], T[i], [mx, 0, mz]);
  }
  if (caps & 1) quadN(g, zone, B[0], B[1], B[2], B[3], [0, -1, 0]);
  if (caps & 2) quadN(g, zone, T[0], T[1], T[2], T[3], [0, 1, 0]);
}
function strutTo(g, a, b, t, d, nrm, faces, zone) {
  const A = a, B = b, u = norm(sub(B, A)), len = Math.hypot(...sub(B, A));
  let n = norm(nrm), n2 = sub(n, mul(u, dot(n, u))); n2 = norm(n2);
  const v = norm(cross(n2, u));
  const mid = mul(add(A, B), 0.5);
  const P = (i, j, k) => {
    const x = (i ? len / 2 : -len / 2), y = (j ? t / 2 : -t / 2), z = (k ? d / 2 : -d / 2);
    return add(add(add(mid, mul(u, x)), mul(v, y)), mul(n2, z));
  };
  const face = (pts) => g.poly({ pts, zone });
  if (faces & FX0) face([P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0)]);
  if (faces & FX1) face([P(1, 0, 1), P(1, 0, 0), P(1, 1, 0), P(1, 1, 1)]);
  if (faces & FY0) face([P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)]);
  if (faces & FY1) face([P(0, 1, 1), P(1, 1, 1), P(1, 1, 0), P(0, 1, 0)]);
  if (faces & FZ0) face([P(1, 0, 0), P(0, 0, 0), P(0, 1, 0), P(1, 1, 0)]);
  if (faces & FZ1) face([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)]);
}
function ngonPts(N, ap, y) {
  const R = ap / Math.cos(Math.PI / N), p = [];
  for (let k = 0; k < N; k++) { const a = (k + 0.5) * TAU / N; p.push([R * Math.sin(a), y, R * Math.cos(a)]); }
  return p;
}
function loftRings(g, A, B, zone) {
  const N = A.length;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N, mx = (A[i][0] + A[j][0] + B[i][0] + B[j][0]) / 4, mz = (A[i][2] + A[j][2] + B[i][2] + B[j][2]) / 4;
    quadN(g, zone, A[i], A[j], B[j], B[i], [mx, 0, mz]);
  }
}
function annulusRing(g, In, Out, up, zone) {
  const N = In.length;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; quadN(g, zone, In[i], In[j], Out[j], Out[i], [0, up, 0]); }
}
function apexFan(g, R, apex, zone) {
  const N = R.length;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; triN(g, zone, R[i], R[j], apex, [(R[i][0] + R[j][0]) / 2, 0, (R[i][2] + R[j][2]) / 2]); }
}
function openingParts(g, outer, inner, proud, sink, backset, xf, ringZone, panelZone) {
  const F = proud, B = -backset, P = proud - sink, n = outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, o0 = outer[i], o1 = outer[j], i0 = inner[i], i1 = inner[j];
    quad(g, ringZone, xf([o0[0], o0[1], F]), xf([o1[0], o1[1], F]), xf([i1[0], i1[1], F]), xf([i0[0], i0[1], F]));
    quad(g, ringZone, xf([o0[0], o0[1], B]), xf([o1[0], o1[1], B]), xf([o1[0], o1[1], F]), xf([o0[0], o0[1], F]));
    quad(g, ringZone, xf([i0[0], i0[1], P]), xf([i0[0], i0[1], F]), xf([i1[0], i1[1], F]), xf([i1[0], i1[1], P]));
  }
  const panel = inner.map((q) => xf([q[0], q[1], P]));
  g.poly({ pts: panel, zone: panelZone });
}
function cap(g, su, sv, zone) {
  const cu = su * 0.150, cv = sv ? 0.250 : 0;
  const du = -su, dv = sv ? -1 : 1;
  const O = [cu - du * 0.0012, cv - dv * 0.0012], A = [cu + du * 0.030, cv - dv * 0.0012], B = [cu - du * 0.0012, cv + dv * 0.030];
  const wt = 0.006 / 2 + 0.0020, wc = 0.006 / 2 + 0.0020;
  for (const s of [1, -1]) g.poly({ pts: [[O[0], O[1], s * wc], [A[0], A[1], s * wt], [B[0], B[1], s * wt]], zone });
  quad(g, zone, [O[0], O[1], wc], [A[0], A[1], wt], [A[0], A[1], -wt], [O[0], O[1], -wc]);
  quad(g, zone, [O[0], O[1], wc], [B[0], B[1], wt], [B[0], B[1], -wt], [O[0], O[1], -wc]);
  quad(g, zone, [A[0], A[1], wt], [B[0], B[1], wt], [B[0], B[1], -wt], [A[0], A[1], -wt]);
}
function faceMatrix(face, coord, along, cy) {
  const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const c = Math.cos, s = Math.sin;
  if (face === 'z+') { m[12] = along; m[13] = cy; m[14] = coord; }
  else if (face === 'z-') { m[0] = -1; m[10] = -1; m[12] = along; m[13] = cy; m[14] = -coord; }
  else if (face === 'x+') { m[0] = 0; m[2] = -1; m[8] = 1; m[10] = 0; m[12] = coord; m[13] = cy; m[14] = along; }
  else { m[0] = 0; m[2] = 1; m[8] = -1; m[10] = 0; m[12] = -coord; m[13] = cy; m[14] = along; }
  return (p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}
const archLoop = (hw, hh) => [[-hw, -hh], [hw, -hh], [hw, hh * 0.60], [0, hh * 1.05], [-hw, hh * 0.60]];
const rectLoop = (hw, hh) => [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'weathered-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const timber = g.input('timber', 'color', '', { label: 'Structural timber' });
  const plank = g.input('plank', 'color', '', { label: 'Wall planking' });
  const deck = g.input('deck', 'color', '', { label: 'Deck boards' });
  const roof = g.input('roof', 'color', '', { label: 'Roof cone' });
  const trim = g.input('trim', 'color', '', { label: 'Window surrounds' });
  const pane = g.input('pane', 'color', '', { label: 'Glazing' });
  const doorway = g.input('doorway', 'color', '', { label: 'Hatch interior' });

  const P = { towerHeight: 1, legSplay: 1, platformWidth: 1, roofFlare: 1, cabinFacets: 'octagon', ...params };
  const S = clamp(P.towerHeight, 0.70, 1.06), SPL = clamp(P.legSplay, 0.55, 1.5), PW = clamp(P.platformWidth, 0.85, 1.25), RF = clamp(P.roofFlare, 0.6, 2.0), N = FACETS[P.cabinFacets] || 8;
  const SH = 0.75, LEG_HW = 0.15, LEG_TOP_C = SH + 0.04 - LEG_HW;
  const BASE_C = LEG_TOP_C + (1.25 - LEG_HW - LEG_TOP_C) * SPL, BASE_HALF = BASE_C + LEG_HW;
  const LEG_TOP = 4.15 * S, BELT_Y0 = 3.98 * S, BELT_Y1 = 4.30 * S, BELT_HW = 0.88;
  const DECK_TOP = 7.00 * S, SLAB_Y0 = DECK_TOP - 0.14, FAS_Y0 = DECK_TOP - 0.32, FAS_Y1 = DECK_TOP - 0.12;
  const SHAFT_Y0 = BELT_Y1 - 0.02, SHAFT_Y1 = SLAB_Y0 + 0.06, DH = 1.20 * PW;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    prism(g, 0, LEG_TOP, { x: sx * BASE_C, z: sz * BASE_C, hw: LEG_HW }, { x: sx * LEG_TOP_C, z: sz * LEG_TOP_C, hw: LEG_HW }, 1, 'timber');
    prism(g, LEG_TOP, SHAFT_Y1 + 0.04, { x: sx * LEG_TOP_C, z: sz * LEG_TOP_C, hw: LEG_HW }, { x: sx * LEG_TOP_C, z: sz * LEG_TOP_C, hw: LEG_HW - 0.01 }, 0, 'timber');
  }
  const legC = (y) => BASE_C + (LEG_TOP_C - BASE_C) * clamp(y / LEG_TOP, 0, 1);
  const BR_Y0 = 1.32 * S, BR_Y1 = 2.98 * S;
  const ELEV = [
    { n: [0, 0, 1], pt: (u, y) => [u * legC(y), y, legC(y)] },
    { n: [0, 0, -1], pt: (u, y) => [u * legC(y), y, -legC(y)] },
    { n: [1, 0, 0], pt: (u, y) => [legC(y), y, u * legC(y)] },
    { n: [-1, 0, 0], pt: (u, y) => [-legC(y), y, u * legC(y)] },
  ];
  for (const e of ELEV) for (const [u0, off] of [[-1, 0.065], [1, -0.065]]) {
    const a = e.pt(u0, BR_Y0), b = e.pt(-u0, BR_Y1), o = [e.n[0] * off, 0, e.n[2] * off];
    strutTo(g, add(a, o), add(b, o), 0.18, 0.12, e.n, FENDS_X, 'timber');
  }
  prism(g, BELT_Y0, BELT_Y1, { hw: BELT_HW }, { hw: BELT_HW }, 3, 'timber');
  prism(g, SHAFT_Y0, SHAFT_Y1, { hw: SH }, { hw: SH }, 0, 'plank');
  const opening = (face, cy, outer, inner, ringZone, panelZone) => {
    const m = faceMatrix(face, SH, 0, cy);
    openingParts(g, outer, inner, 0.06, 0.05, 0.04, m, ringZone, panelZone);
  };
  const windowAt = (face, cy, hw, hh) => opening(face, cy, archLoop(hw + 0.07, hh + 0.07), archLoop(hw, hh), 'trim', 'pane');
  for (const f of ['z+', 'z-', 'x+', 'x-']) windowAt(f, 6.05 * S, 0.20, 0.40 * S);
  for (const f of ['x+', 'x-']) windowAt(f, 4.85 * S, 0.18, 0.30 * S);
  opening('z+', 4.86 * S, rectLoop(0.36, 0.50 * S), rectLoop(0.28, 0.42 * S), 'timber', 'doorway');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) strutTo(g, [sx * LEG_TOP_C, DECK_TOP - 1.05, sz * LEG_TOP_C], [sx * (DH - 0.16), FAS_Y1 - 0.04, sz * (DH - 0.16)], 0.15, 0.15, [sx, 0, -sz], FENDS_X, 'timber');
  prism(g, FAS_Y0, FAS_Y1, { hw: DH - 0.05 }, { hw: DH - 0.05 }, 1, 'timber');
  prism(g, SLAB_Y0, DECK_TOP, { hw: DH }, { hw: DH }, 3, 'deck');
  const RAIL_TOP = DECK_TOP + 1.08, PC = DH - 0.12;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) obox(g, sx * PC - 0.08, DECK_TOP - 0.02, sz * PC - 0.08, sx * PC + 0.08, DECK_TOP + 1.12, sz * PC + 0.08, FALL & ~FY0, 'timber');
  const RO = DH - 0.06, RI = DH - 0.18, RE = DH - 0.19, BO = DH - 0.085, BI = DH - 0.155, BAL_U = [-0.72, -0.25, 0.25, 0.72];
  for (const s of [1, -1]) {
    obox(g, -RE, RAIL_TOP - 0.11, s * RI, RE, RAIL_TOP, s * RO, FENDS_X, 'timber');
    obox(g, -RE, DECK_TOP + 0.06, s * RI, RE, DECK_TOP + 0.19, s * RO, FENDS_X, 'timber');
    obox(g, s * RI, RAIL_TOP - 0.11, -RE, s * RO, RAIL_TOP, RE, FENDS_Z, 'timber');
    obox(g, s * RI, DECK_TOP + 0.06, -RE, s * RO, DECK_TOP + 0.19, RE, FENDS_Z, 'timber');
    for (const u of BAL_U) {
      obox(g, u * DH - 0.05, DECK_TOP + 0.15, s * BI, u * DH + 0.05, RAIL_TOP - 0.08, s * BO, FCAPS_Y, 'timber');
      obox(g, s * BI, DECK_TOP + 0.15, u * DH - 0.05, s * BO, RAIL_TOP - 0.08, u * DH + 0.05, FCAPS_Y, 'timber');
    }
  }
  const CAB_AP = 0.74, GLASS_AP = 0.67, HEAD_AP = 0.80;
  const CY0 = DECK_TOP - 0.06, SILL_Y = DECK_TOP + 1.14, HEAD_Y0 = DECK_TOP + 1.80, HEAD_Y1 = DECK_TOP + 2.00;
  loftRings(g, ngonPts(N, CAB_AP, CY0), ngonPts(N, CAB_AP, SILL_Y), 'plank');
  annulusRing(g, ngonPts(N, GLASS_AP, SILL_Y), ngonPts(N, CAB_AP, SILL_Y), 1, 'deck');
  loftRings(g, ngonPts(N, GLASS_AP, SILL_Y - 0.03), ngonPts(N, GLASS_AP, HEAD_Y0 + 0.03), 'pane');
  annulusRing(g, ngonPts(N, GLASS_AP, HEAD_Y0), ngonPts(N, HEAD_AP, HEAD_Y0), -1, 'timber');
  loftRings(g, ngonPts(N, HEAD_AP, HEAD_Y0), ngonPts(N, HEAD_AP, HEAD_Y1), 'timber');
  const RG = GLASS_AP / Math.cos(Math.PI / N);
  for (let k = 0; k < N; k++) {
    const a = (k + 0.5) * TAU / N, h = (HEAD_Y0 - SILL_Y + 0.24) / 2;
    const ca = Math.cos(a), sa = Math.sin(a), ox = RG * Math.sin(a), oy = (SILL_Y + HEAD_Y0) / 2, oz = RG * Math.cos(a);
    const M = (x, y, z) => [ox + x * ca + z * sa, oy + y, oz - x * sa + z * ca];
    const B = (i, j, k) => M(i ? 0.05 : -0.05, j ? h : -h, k ? 0.05 : -0.05);
    g.poly({ pts: [B(0,0,0), B(0,0,1), B(0,1,1), B(0,1,0)], zone: 'timber' });
    g.poly({ pts: [B(1,0,1), B(1,0,0), B(1,1,0), B(1,1,1)], zone: 'timber' });
    g.poly({ pts: [B(0,0,0), B(1,0,0), B(1,0,1), B(0,0,1)], zone: 'timber' });
    g.poly({ pts: [B(0,1,1), B(1,1,1), B(1,1,0), B(0,1,0)], zone: 'timber' });
  }
  const EAVE_AP = HEAD_AP + 0.33 * RF, RISE = 0.80 * EAVE_AP, SOF_Y = HEAD_Y1 - 0.04, EAVE_Y = SOF_Y + 0.18;
  annulusRing(g, ngonPts(N, HEAD_AP - 0.01, SOF_Y), ngonPts(N, EAVE_AP, SOF_Y), -1, 'roof');
  loftRings(g, ngonPts(N, EAVE_AP, SOF_Y), ngonPts(N, EAVE_AP, EAVE_Y), 'roof');
  const MY = EAVE_Y + RISE * 0.44, MAP = EAVE_AP * 0.59;
  loftRings(g, ngonPts(N, EAVE_AP, EAVE_Y), ngonPts(N, MAP, MY), 'roof');
  apexFan(g, ngonPts(N, MAP, MY), [0, EAVE_Y + RISE, 0], 'roof');

  // Ladder: two rails and nine rungs, rotated about X and set against the front.
  {
    const FOOT_Z = BASE_HALF + 0.30, TOP_Z = SH + 0.20, TOP_Y = 5.30 * S;
    const LEAN = Math.atan2(FOOT_Z - TOP_Z, TOP_Y), LEN = Math.hypot(FOOT_Z - TOP_Z, TOP_Y);
    const yOff = 0.04 * Math.sin(LEAN), cl = Math.cos(LEAN), sl = Math.sin(LEAN);
    const along = (s) => [cl * s, FOOT_Z - sl * s];
    const tf = (p) => [p[0], yOff + p[1] * cl - p[2] * sl, p[1] * sl + p[2] * cl];
    const boxT = (x0, y0, z0, x1, y1, z1, faces) => {
      const P = (i, j, k) => tf([i ? x1 : x0, j ? y1 : y0, k ? z1 : z0]);
      if (faces & FX0) quad(g, 'timber', P(0,0,0), P(0,0,1), P(0,1,1), P(0,1,0));
      if (faces & FX1) quad(g, 'timber', P(1,0,1), P(1,0,0), P(1,1,0), P(1,1,1));
      if (faces & FY0) quad(g, 'timber', P(0,0,0), P(1,0,0), P(1,0,1), P(0,0,1));
      if (faces & FY1) quad(g, 'timber', P(0,1,1), P(1,1,1), P(1,1,0), P(0,1,0));
      if (faces & FZ0) quad(g, 'timber', P(1,0,0), P(0,0,0), P(0,1,0), P(1,1,0));
      if (faces & FZ1) quad(g, 'timber', P(0,0,1), P(1,0,1), P(1,1,1), P(0,1,1));
    };
    for (const sx of [-1, 1]) {
      const [y, z] = along(LEN / 2);
      const yl = (j) => j ? LEN / 2 : -LEN / 2, zl = (k) => k ? 0.04 : -0.04;
      const P = (i, j, k) => [sx * 0.25 + (i ? 0.05 : -0.05), yOff + y + yl(j) * cl + zl(k) * sl, z - yl(j) * sl + zl(k) * cl];
      const q = (a,b,c,d) => quad(g, 'timber', a,b,c,d);
      q(P(0,0,0), P(0,0,1), P(0,1,1), P(0,1,0));
      q(P(1,0,1), P(1,0,0), P(1,1,0), P(1,1,1));
      q(P(0,0,0), P(1,0,0), P(1,0,1), P(0,0,1));
      q(P(0,1,1), P(1,1,1), P(1,1,0), P(0,1,0));
      q(P(1,0,0), P(0,0,0), P(0,1,0), P(1,1,0));
      q(P(0,0,1), P(1,0,1), P(1,1,1), P(0,1,1));
    }
    const NR = 9;
    for (let i = 0; i < NR; i++) {
      const s = 0.34 + i * ((LEN - 0.60) / (NR - 1));
      const [y, z] = along(s);
      const yl = (b) => b ? 0.0375 : -0.0375, zl = (c) => c ? 0.0325 : -0.0325;
      const P = (a, b, c) => [a ? 0.29 : -0.29, yOff + y + yl(b) * cl + zl(c) * sl, z - yl(b) * sl + zl(c) * cl];
      quad(g, 'timber', P(0,0,0), P(0,0,1), P(0,1,1), P(0,1,0));
      quad(g, 'timber', P(1,0,1), P(1,0,0), P(1,1,0), P(1,1,1));
      quad(g, 'timber', P(0,0,0), P(1,0,0), P(1,0,1), P(0,0,1));
      quad(g, 'timber', P(0,1,1), P(1,1,1), P(1,1,0), P(0,1,0));
    }
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'weathered-oak', overrides: { timber, plank, deck, roof, trim, pane, doorway } });
  const geomTypes = new Set(['poly', 'prim', 'block', 'loft', 'pill', 'revolve', 'prism', 'plate', 'fanRing', 'sweep']);
  const allGeom = g.ir.nodes.filter((n) => geomTypes.has(n.type)).map((n) => ({ __ref: n.id }));
  return g.mesh(g.join(allGeom), {
    zones: { timber: at(pal, 'timber'), plank: at(pal, 'plank'), deck: at(pal, 'deck'), roof: at(pal, 'roof'), trim: at(pal, 'trim'), pane: at(pal, 'pane'), doorway: at(pal, 'doorway') },
  });
}
