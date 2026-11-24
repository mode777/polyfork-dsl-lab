// Lookout watchtower — a timber trestle, planked shaft, glazed octagonal cabin,
// railing and conical roof. The reference helpers are translated to generic
// loft/block/beam/opening/prism nodes; only small trim caps stay as polygons.
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

function skipFor(faces) {
  const out = [];
  if (!(faces & FX0)) out.push('nx');
  if (!(faces & FX1)) out.push('px');
  if (!(faces & FY0)) out.push('ny');
  if (!(faces & FY1)) out.push('py');
  if (!(faces & FZ0)) out.push('nz');
  if (!(faces & FZ1)) out.push('pz');
  return out.join(' ');
}
function openBox(g, x0, y0, z0, x1, y1, z1, faces, zone) {
  const ax = Math.min(x0, x1), bx = Math.max(x0, x1), ay = Math.min(y0, y1), by = Math.max(y0, y1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
  g.block({ x0: ax, x1: bx, y0: ay, y1: by, z0: az, z1: bz, skip: skipFor(faces), zone });
}
function obox(g, x0, y0, z0, x1, y1, z1, faces, zone) { openBox(g, x0, y0, z0, x1, y1, z1, faces, zone); }
function prism(g, y0, y1, b, t, caps, zone) {
  const bd = b.hd === undefined ? b.hw : b.hd, td = t.hd === undefined ? t.hw : t.hd;
  const bx = b.x || 0, bz = b.z || 0, tx = t.x || 0, tz = t.z || 0;
  const B = [[bx - b.hw, y0, bz + bd], [bx + b.hw, y0, bz + bd], [bx + b.hw, y0, bz - bd], [bx - b.hw, y0, bz - bd]];
  const T = [[tx - t.hw, y1, tz + td], [tx + t.hw, y1, tz + td], [tx + t.hw, y1, tz - td], [tx - t.hw, y1, tz - td]];
  g.loft({ rings: [B, T], zones: { band: zone } });
  if (caps & 1) g.poly({ pts: B, hint: [0, -1, 0], zone });
  if (caps & 2) g.poly({ pts: T, hint: [0, 1, 0], zone });
}
function strutTo(g, a, b, t, d, nrm, faces, zone) {
  g.beam({ a, b, t, d, up: nrm, skip: skipFor(faces), zone });
}
function ngonPts(N, ap, y) {
  const R = ap / Math.cos(Math.PI / N), p = [];
  for (let k = 0; k < N; k++) { const a = (k + 0.5) * TAU / N; p.push([R * Math.sin(a), y, R * Math.cos(a)]); }
  return p;
}
function loftRings(g, A, B, zone) { g.loft({ rings: [A, B], zones: { band: zone } }); }
function annulusRing(g, In, Out, up, zone) { g.loft({ rings: [In, Out], flip: up > 0, zones: { band: zone } }); }
function apexFan(g, R, apex, zone) { g.loft({ rings: [R], capTop: apex, capTopFlip: true, zones: { capTop: zone } }); }
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
  const skipIds = new Set();
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
    const rot = face === 'z+' ? 0 : face === 'z-' ? Math.PI : face === 'x+' ? Math.PI / 2 : -Math.PI / 2;
    const pos = face === 'z+' ? [0, cy, SH] : face === 'z-' ? [0, cy, -SH] : face === 'x+' ? [SH, cy, 0] : [-SH, cy, 0];
    const geo = g.opening({ outer, inner, proud: 0.06, sink: 0.05, backset: 0.04, ringZone, panelZone });
    skipIds.add(geo.__ref);
    g.transform({ geom: geo, tx: pos[0], ty: pos[1], tz: pos[2], ry: rot });
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
    const mull = g.block({ x0: -0.05, x1: 0.05, y0: -h, y1: h, z0: -0.05, z1: 0.05, skip: 'py ny', zone: 'timber' });
    skipIds.add(mull.__ref);
    g.transform({ geom: mull, ry: a, tx: RG * Math.sin(a), ty: (SILL_Y + HEAD_Y0) / 2, tz: RG * Math.cos(a) });
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
    const along = (v) => [cl * v, FOOT_Z - sl * v];
    for (const sx of [-1, 1]) {
      const [y, z] = along(LEN / 2);
      const rail = g.block({ x0: sx * 0.25 - 0.05, x1: sx * 0.25 + 0.05, y0: -LEN / 2, y1: LEN / 2, z0: -0.04, z1: 0.04, zone: 'timber' });
      skipIds.add(rail.__ref);
      g.transform({ geom: rail, rx: -LEAN, ty: yOff + y, tz: z });
    }
    const NR = 9;
    for (let i = 0; i < NR; i++) {
      const v = 0.34 + i * ((LEN - 0.60) / (NR - 1));
      const [y, z] = along(v);
      const rung = g.block({ x0: -0.29, x1: 0.29, y0: -0.0375, y1: 0.0375, z0: -0.0325, z1: 0.0325, skip: 'px nx', zone: 'timber' });
      skipIds.add(rung.__ref);
      g.transform({ geom: rung, rx: -LEAN, ty: yOff + y, tz: z });
    }
  }

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'weathered-oak', overrides: { timber, plank, deck, roof, trim, pane, doorway } });
  const geomTypes = new Set(['poly', 'prim', 'block', 'loft', 'pill', 'revolve', 'prism', 'plate', 'fanRing', 'sweep', 'frustum', 'beam', 'opening', 'transform']);
  const allGeom = g.ir.nodes.filter((n) => geomTypes.has(n.type) && !skipIds.has(n.id)).map((n) => ({ __ref: n.id }));
  return g.mesh(g.join(allGeom), {
    zones: { timber: at(pal, 'timber'), plank: at(pal, 'plank'), deck: at(pal, 'deck'), roof: at(pal, 'roof'), trim: at(pal, 'trim'), pane: at(pal, 'pane'), doorway: at(pal, 'doorway') },
  });
}
