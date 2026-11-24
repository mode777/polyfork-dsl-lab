// Office desk — exact geometric port. Chamfered slab with a cable slot, two
// folded steel sleds, and a drawer / plain / pedestal undercarriage. Width and
// the lived-in wear axis stay live; the three undercarriage variants are the
// reference's three options.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'pale-oak-white': { top: '#E3CBA5', carcass: '#D2B084', frame: '#FAF8F3', recess: '#6B4A32' },
  'walnut-charcoal': { top: '#8A6244', carcass: '#6B4A32', frame: '#47423C', recess: '#2E2A26' },
  'oak-sage': { top: '#E3CBA5', carcass: '#B8946A', frame: '#7E9179', recess: '#4E3423' },
  'oak-brass': { top: '#E3CBA5', carcass: '#F8F4EF', frame: '#C9A24B', recess: '#8A6244' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const H = 0.750, TOP_T = 0.050, Y_BOT = H - TOP_T, DEPTH = 0.700, hZ = DEPTH / 2;
const FT = 0.045, F_INSET = 0.020, F_ZHALF = 0.320, F_TOP = 0.708;
const C_INSET = 0.050, C_ZF = 0.255, C_ZB = -0.200, C_Y0 = 0.572, C_Y1 = 0.710, C_T = 0.014;
const OP_M = 0.030, OP_CH = 0.014, REV = 0.006, FR_BACK = 0.018;
const NOTCH_HW = 0.075, NOTCH_H = 0.028;
const SLOT_HL = 0.150, SLOT_HW = 0.018, SLOT_Z = -0.265;
const PED_ZF = 0.245, PED_ZB = -0.180, PED_PLINTH = 0.060;

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'pale-oak-white', { options: Object.keys(PALETTE), label: 'Colorway' });
  const top = g.input('top', 'color', '', { label: 'Top' });
  const carcass = g.input('carcass', 'color', '', { label: 'Carcass' });
  const frame = g.input('frame', 'color', '', { label: 'Frame' });
  const recess = g.input('recess', 'color', '', { label: 'Recess' });
  const width = g.input('width', 'float', 1.40, { min: 1.00, max: 1.60, step: 0.05, label: 'Width' });
  const under = g.input('under', 'enum', 'drawer', { options: ['drawer', 'plain', 'pedestal'], label: 'Under the top' });
  const lived = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });

  const dims = g.let({
    in: { width, lived_in: lived, under },
    binds: {
      W: 'clamp(width, 1, 1.6)',
      L: 'clamp(lived_in, 0, 1)',
      w: 'L <= 0 ? 0 : pow(L, 0.6)',
      CH_T: '0.012 + w*0.010',
      CH_B: '0.008 + w*0.005',
      CORNER: '0.015 + w*0.045',
      FOOT: '0.004 + w*0.014',
      PROUD: 'w*0.055',
      SKEW: 'w*0.016',
      hX: 'W/2',
      CX: 'W/2 - 0.050',
      XI: 'W/2 - 0.080',
      ped: "under === 'pedestal'",
      pedW: "under === 'pedestal' ? min(0.400, (W/2 - 0.050)*2*0.42) : 0",
      pedX1: 'W/2 - 0.080',
      pedX0: "under === 'pedestal' ? (W/2 - 0.080) - min(0.400, (W/2 - 0.050)*2*0.42) : 0",
      ox1: "under === 'pedestal' ? min(W/2 - 0.080, (W/2 - 0.080) - min(0.400, (W/2 - 0.050)*2*0.42) - 0.030) : W/2 - 0.080",
      pMid: '(0.060 + 0.572)/2',
      yr1: '0',
      yr0: '0',
    },
  });
  const d = (k) => at(dims, k);
  const expr = (args, e) => g.value({ args, expr: e });
  const sub = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : expr({ a, b }, 'a - b'));
  const add = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a + b : expr({ a, b }, 'a + b'));
  const neg = (a) => (typeof a === 'number' ? -a : expr({ a }, '-a'));

  const plan = (depth) => g.outlineRect({
    hx: expr({ hX: d('hX'), depth }, 'hX - depth'),
    hz: expr({ hZ, depth }, 'hZ - depth'),
    c: d('CORNER'), nc: 2,
  });
  const slot = g.outlineRect({ hx: SLOT_HL, hz: SLOT_HW, c: 0.008, nc: 1, cz: SLOT_Z });

  const faceZ = (x0, y0, x1, y1, z, zone, hint = [0, 0, 1]) => g.poly({
    pts: [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], zone, hint,
  });
  const faceY = (profile, holes, y, up, zone) => {
    const p = g.plate({ profile, holes, z0: 0, z1: 0, cap: true, walls: 'none', zone });
    const placed = g.transform({ geom: p, rx: Math.PI / 2, ty: y });
    return up ? g.reverse({ geom: placed }) : placed;
  };
  const band = (lower, yl, upper, yu, zone, reverse = false, skipEdge = -1) =>
    g.band({ lower, upper, yl, yu, zone, reverse, skipEdge });
  const openBox = (x0, y0, z0, x1, y1, z1, skip = '', inward = false, zone = 'carcass') => {
    const b = g.block({ x0, y0, z0, x1, y1, z1, skip, zone });
    return inward ? g.reverse({ geom: b }) : b;
  };
  const bevelRing = (x0, y0, x1, y1, z, ch, zone) => {
    const O = (x, y) => [x, y, z], I = (x, y) => [x, y, sub(z, ch)];
    const q = (pts, hint) => g.poly({ pts, zone, hint });
    const xi0 = add(x0, ch), xi1 = sub(x1, ch), yi0 = add(y0, ch), yi1 = sub(y1, ch);
    return g.join([
      q([O(x1, y1), O(x0, y1), I(xi0, yi1), I(xi1, yi1)], [0, 1, 0]),
      q([O(x0, y0), O(x1, y0), I(xi1, yi0), I(xi0, yi0)], [0, -1, 0]),
      q([O(x0, y1), O(x0, y0), I(xi0, yi0), I(xi0, yi1)], [-1, 0, 0]),
      q([O(x1, y0), O(x1, y1), I(xi1, yi1), I(xi1, yi0)], [1, 0, 0]),
    ]);
  };
  const trayRim = (x0, x1, y, z0, z1, t, zone) => g.join([
    g.poly({ pts: [[x0, y, z1], [add(x0, t), y, z1], [add(x0, t), y, z0], [x0, y, z0]], zone, hint: [0, 1, 0] }),
    g.poly({ pts: [[sub(x1, t), y, z1], [x1, y, z1], [x1, y, z0], [sub(x1, t), y, z0]], zone, hint: [0, 1, 0] }),
  ]);

  const topFace = faceY(plan(d('CH_T')), [slot], H, true, 'top');
  const topChamfer = band(plan(0), sub(H, d('CH_T')), plan(d('CH_T')), H, 'top');
  const sideBand = band(plan(0), add(Y_BOT, d('CH_B')), plan(0), sub(H, d('CH_T')), 'top');
  const botChamfer = band(plan(d('CH_B')), Y_BOT, plan(0), add(Y_BOT, d('CH_B')), 'top');
  const underFace = faceY(plan(d('CH_B')), [slot], Y_BOT, false, 'top');
  const slotWalls = band(slot, Y_BOT, slot, H, 'recess', true);

  const sled = (side) => {
    const T = FT, zHalf = F_ZHALF, topY = F_TOP, foot = d('FOOT');
    const zi = sub(zHalf, T), ty = sub(topY, T);
    const outer = [[sub(zHalf, foot), 0], [zHalf, foot], [zHalf, topY], [-zHalf, topY], [-zHalf, foot], [neg(sub(zHalf, foot)), 0]];
    const hole = [[zi, T], [zi, ty], [neg(zi), ty], [neg(zi), T]];
    const p = g.plate({ profile: outer, holes: [hole], z0: 0, z1: T, cap: 'both', walls: 'both', skipWalls: 'o2', zone: 'frame' });
    return g.transform({ geom: p, ry: Math.PI / 2, tx: expr({ side, hX: d('hX'), FT }, 'side*(hX - 0.020 - FT/2) - FT/2') });
  };

  const drawer = (ox0, oy0, ox1, oy1, zf, zBack, proud, skew) => {
    const fx0 = add(ox0, REV), fx1 = sub(ox1, REV), fy0 = add(oy0, REV), fy1 = sub(oy1, REV);
    const zF = sub(zf, 0.005), zB = sub(zF, FR_BACK);
    const nx = expr({ a: fx0, b: fx1 }, 'min(0.075, (b - a)*0.22)');
    const cxm = expr({ a: fx0, b: fx1 }, '(a + b)/2');
    const yn = sub(fy1, NOTCH_H);
    const t = 0.010;
    const tx0 = add(fx0, 0.020), tx1 = sub(fx1, 0.020), ty0 = add(fy0, 0.006), ty1 = sub(yn, 0.004);
    const list = [
      openBox(fx0, fy0, zB, fx1, yn, zF, '', false, 'carcass'),
      openBox(fx0, yn, zB, sub(cxm, nx), fy1, zF, 'ny', false, 'carcass'),
      openBox(add(cxm, nx), yn, zB, fx1, fy1, zF, 'ny', false, 'carcass'),
      openBox(tx0, ty0, zBack, tx1, ty1, zB, 'py pz nz', false, 'recess'),
      openBox(add(tx0, t), add(ty0, t), add(zBack, t), sub(tx1, t), ty1, zB, 'py pz nz', true, 'recess'),
      trayRim(tx0, tx1, ty1, zBack, zB, t, 'recess'),
    ];
    return g.transform({ geom: g.join(list), tz: proud, ry: skew });
  };

  const plain = openBox(neg(sub(d('hX'), C_INSET)), 0.668, -0.175, sub(d('hX'), C_INSET), F_TOP, -0.130, 'px nx py', false, 'frame');

  const underBody = (() => {
    const ped = d('ped');
    const pedX1 = d('pedX1'), pedX0 = d('pedX0'), ox1 = d('ox1');
    const pedParts = [];
    const pY1 = add(C_Y0, 0.006);
    pedParts.push(openBox(pedX0, PED_PLINTH, PED_ZB, pedX1, pY1, PED_ZF, 'pz', false, 'carcass'));
    pedParts.push(openBox(add(pedX0, 0.030), 0, PED_ZB, sub(pedX1, 0.030), PED_PLINTH, sub(PED_ZF, 0.030), 'py pz', false, 'recess'));
    pedParts.push(openBox(add(pedX0, C_T), add(PED_PLINTH, C_T), add(PED_ZB, C_T), sub(pedX1, C_T), sub(pY1, C_T), PED_ZF, 'pz', true, 'recess'));
    const py0 = PED_PLINTH, py1 = C_Y0, pMid = d('pMid'), gap = 0.016;
    const px0 = add(pedX0, OP_M), px1 = sub(pedX1, OP_M);
    pedParts.push(faceZ(pedX0, py0, px0, py1, PED_ZF, 'carcass'));
    pedParts.push(faceZ(px1, py0, pedX1, py1, PED_ZF, 'carcass'));
    pedParts.push(faceZ(px0, sub(pMid, gap / 2), px1, add(pMid, gap / 2), PED_ZF, 'carcass'));
    pedParts.push(bevelRing(px0, add(pMid, gap / 2), px1, py1, PED_ZF, OP_CH, 'carcass'));
    pedParts.push(bevelRing(px0, py0, px1, sub(pMid, gap / 2), PED_ZF, OP_CH, 'carcass'));
    pedParts.push(drawer(add(px0, OP_CH), add(add(pMid, gap / 2), OP_CH), sub(px1, OP_CH), sub(py1, OP_CH), sub(PED_ZF, OP_CH), add(PED_ZB, C_T), expr({ p: d('PROUD') }, 'p*0.55'), 0));
    pedParts.push(drawer(add(px0, OP_CH), add(py0, OP_CH), sub(px1, OP_CH), sub(sub(pMid, gap / 2), OP_CH), sub(PED_ZF, OP_CH), add(PED_ZB, C_T), expr({ p: d('PROUD') }, 'p*0.25'), 0));

    const oy0 = C_Y0, oy1 = Y_BOT;
    const ox0 = neg(d('XI'));
    const body = g.join([
      openBox(neg(d('CX')), C_Y0, C_ZB, d('CX'), C_Y1, C_ZF, 'py pz', false, 'carcass'),
      openBox(add(neg(d('CX')), C_T), add(C_Y0, C_T), add(C_ZB, C_T), sub(d('CX'), C_T), Y_BOT, C_ZF, 'pz py', true, 'recess'),
      faceZ(neg(d('CX')), oy0, ox0, oy1, C_ZF, 'carcass'),
      faceZ(ox1, oy0, d('CX'), oy1, C_ZF, 'carcass'),
      bevelRing(ox0, oy0, ox1, oy1, C_ZF, OP_CH, 'carcass'),
      drawer(add(ox0, OP_CH), add(oy0, OP_CH), sub(ox1, OP_CH), sub(oy1, OP_CH), sub(C_ZF, OP_CH), add(C_ZB, C_T), d('PROUD'), expr({ sk: d('SKEW') }, '-sk*0.35')),
      g.cond({ cond: ped, then: g.join(pedParts), else: g.join([]) }),
    ]);
    return body;
  })();

  const underGeom = g.cond({ cond: expr({ u: under }, "u === 'plain'"), then: plain, else: underBody });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'pale-oak-white',
    overrides: { top, carcass, frame, recess },
  });

  const all = g.join([topFace, topChamfer, sideBand, botChamfer, underFace, slotWalls, sled(-1), sled(1), underGeom]);
  return g.mesh(all, {
    zones: { top: at(pal, 'top'), carcass: at(pal, 'carcass'), frame: at(pal, 'frame'), recess: at(pal, 'recess') },
  });
}
