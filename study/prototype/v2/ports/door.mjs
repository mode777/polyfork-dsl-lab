// Interior door leaf — generic-node graph. The leaf is a mirrored front-face
// build (frame runs, sunken panels, glass bead, arris), the edges and glazing
// sides are frustum bands, and the ironmongery is blocks, a prim cylinder and a
// mirrored lever set. No per-asset runtime node.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'pale-oak': { leaf: '#E3CBA5', panel: '#D2B084', glass: '#47423C', brass: '#C9A24B' },
  'chalk-white': { leaf: '#FAF8F3', panel: '#F3EEE8', glass: '#47423C', brass: '#C9A24B' },
  walnut: { leaf: '#8A6244', panel: '#6B4A32', glass: '#2E2A26', brass: '#E0C078' },
  'sage-painted': { leaf: '#7E9179', panel: '#5B8551', glass: '#47423C', brass: '#E0C078' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const H = 2.10, T = 0.045, STILE = 0.115, BOT_RAIL = 0.205, TOP_RAIL = 0.135;
const LEVER_Y = 1.00, MR = 0.022, PD = 0.011, GR = 0.025, GZ = 0.008, GT = 0.003, GBURY = 0.004;
const HINGE_Y = [0.28, 1.05, 1.82];
const ZF = T / 2;
const quad = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'pale-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const leaf = g.input('leaf', 'color', '', { label: 'Leaf' });
  const panel = g.input('panel', 'color', '', { label: 'Panel field' });
  const glass = g.input('glass', 'color', '', { label: 'Glazing' });
  const brass = g.input('brass', 'color', '', { label: 'Ironmongery' });
  const width = g.input('width', 'float', 0.90, { min: 0.70, max: 0.95, step: 0.05, label: 'Leaf width (m)' });
  const lived = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'pale-oak',
    overrides: { leaf, panel, glass, brass },
  });

  // All derived layout values: the leaf re-cuts its stiles and rails from the
  // requested width, and lived_in drives the arris, the sag and the lever droop.
  const binds = {
    W: 'min(0.95, max(0.70, width))',
    lived: 'min(1, max(0, lived_in))',
    CH: '0.008 + lived * 0.004',
    SAG: 'lived * 0.009',
    ZF: `${ZF}`,
    ZS: `${ZF} - CH`,
    mZS: '-ZS',
    c0: 'CH', c1: `${STILE}`, c2: `W - ${STILE}`, c3: 'W - CH',
    r0: 'CH', r1: `${BOT_RAIL}`, r2: '0.625', r3: '0.725', r4: '0.905', r5: '1.085', r6: `${H - TOP_RAIL}`, r7: `${H} - CH`,
    pX0: `c1 + ${MR}`, pX1: `c2 - ${MR}`, pY1a: `r1 + ${MR}`, pY1b: `r2 - ${MR}`, pY3a: `r3 + ${MR}`, pY3b: `r4 - ${MR}`,
    zPanel: `ZF - ${PD}`,
    gX0: `c1 + ${GR}`, gX1: `c2 - ${GR}`, gY0: `r5 + ${GR}`, gY1: `r6 - ${GR}`,
    paneX0: `c1 + ${GR} - ${GBURY}`, paneX1: `c2 - ${GR} + ${GBURY}`, paneY0: `r5 + ${GR} - ${GBURY}`, paneY1: `r6 - ${GR} + ${GBURY}`,
    aX1: 'W - CH', aY1: `${H} - CH`,
    cx: 'W - 0.070',
    droop: 'lived * 4 * PI / 180',
    ca: 'cos(droop)', sa: 'sin(droop)',
    tx: 'cx - (cx * ca - 1.0 * sa)', ty: '1.0 - (cx * sa + 1.0 * ca)',
    lvX0: 'W - 0.105', lvX1: 'W - 0.035',
    barX0: 'W - 0.185', barX1: 'cx + 0.014', bar2X1: 'W - 0.157',
    latchX0: 'W - 0.002', latchX1: 'W + 0.002',
  };
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    binds[`rx${i}`] = `cx + ${Math.cos(a)} * 0.020`;
    binds[`ry${i}`] = `1.0 + ${Math.sin(a)} * 0.020`;
  }
  const V = g.let({ binds });
  const v = (k) => at(V, k);
  const roseRing = (z) => Array.from({ length: 8 }, (_, i) => [v(`rx${i}`), v(`ry${i}`), z]);
  const wear = g.value({
    args: { base: at(pal, 'leaf'), t: v('lived') },
    expr: 'mixColor(base, "#8C837A", 0.20 * t)',
  });
  const brassWear = g.value({
    args: { base: at(pal, 'brass'), t: v('lived') },
    expr: 'mixColor(base, "#8A6E2E", 0.22 * t)',
  });

  // ---------------------------------------------------------------- leaf shell
  const front = [];
  const poly = (pts, zone) => front.push(g.poly({ pts, zone }));
  const band = (a, b, zone) => front.push(g.frustum({ a, b, capA: false, capB: false, zone }));

  // Front frame runs: one quad per uninterrupted run in the reference layout.
  poly(quad(v('c0'), v('r0'), v('c3'), v('r1'), v('ZF')), 'wear');
  for (const [ra, rb] of [['r1', 'r2'], ['r3', 'r4'], ['r5', 'r6']]) {
    poly(quad(v('c0'), v(ra), v('c1'), v(rb), v('ZF')), 'leaf');
    poly(quad(v('c2'), v(ra), v('c3'), v(rb), v('ZF')), 'leaf');
  }
  poly(quad(v('c0'), v('r2'), v('c3'), v('r3'), v('ZF')), 'leaf');
  poly(quad(v('c0'), v('r4'), v('c3'), v('r5'), v('ZF')), 'leaf');
  poly(quad(v('c0'), v('r6'), v('c3'), v('r7'), v('ZF')), 'leaf');

  // Sunken panels: a four-quad return and the recessed field.
  for (const [ya, yb, pya, pyb] of [['r1', 'r2', 'pY1a', 'pY1b'], ['r3', 'r4', 'pY3a', 'pY3b']]) {
    const A = quad(v('c1'), v(ya), v('c2'), v(yb), v('ZF'));
    const B = quad(v('pX0'), v(pya), v('pX1'), v(pyb), v('zPanel'));
    band(A, B, 'leaf');
    poly(B, 'panel');
  }

  // Glazed opening: stepped bead on the front and the pane behind it.
  band(quad(v('c1'), v('r5'), v('c2'), v('r6'), v('ZF')), quad(v('gX0'), v('gY0'), v('gX1'), v('gY1'), GZ), 'leaf');
  poly(quad(v('paneX0'), v('paneY0'), v('paneX1'), v('paneY1'), GT), 'glass');

  // Arris around the leaf perimeter.
  band(quad(0, 0, v('W'), H, v('ZS')), quad(v('CH'), v('CH'), v('aX1'), v('aY1'), v('ZF')), 'leaf');

  // Build one face and mirror it across the leaf thickness.
  const shell = g.mirror({ geom: g.join(front), axis: 'z' });

  // Leaf edges: three side quads from a frustum plus the wear-scuffed foot.
  const edge = g.join([
    g.frustum({ a: quad(0, 0, v('W'), H, v('mZS')), b: quad(0, 0, v('W'), H, v('ZS')), skip: '0', capA: false, capB: false, zone: 'leaf' }),
    g.poly({ pts: [[0, 0, v('mZS')], [v('W'), 0, v('mZS')], [v('W'), 0, v('ZS')], [0, 0, v('ZS')]], zone: 'wear' }),
  ]);

  // Glazing side band between the two panes.
  const glassSide = g.frustum({
    a: quad(v('gX0'), v('gY0'), v('gX1'), v('gY1'), GZ),
    b: quad(v('gX0'), v('gY0'), v('gX1'), v('gY1'), -GZ),
    capA: false, capB: false, zone: 'leaf',
  });

  // ---------------------------------------------------------------- ironmongery
  const hingePlate = g.block({
    x0: 0.014, x1: 0.078, y0: HINGE_Y[0] - 0.065, y1: HINGE_Y[0] + 0.065,
    z0: ZF - 0.001, z1: ZF + 0.003, skip: 'nz', zone: 'brass',
  });
  const knuckle = g.prim({
    type: 'CylinderGeometry', args: [0.010, 0.010, 0.130, 8],
    ry: Math.PI / 8, x: 0.008, y: HINGE_Y[0], z: ZF, zone: 'brass',
  });
  const hinges = g.arrayLinear({
    geom: g.join([g.mirror({ geom: hingePlate, axis: 'z' }), knuckle]),
    count: 3, dy: HINGE_Y[1] - HINGE_Y[0],
  });

  const leverPlate = g.block({
    x0: v('lvX0'), x1: v('lvX1'), y0: LEVER_Y - 0.115, y1: LEVER_Y + 0.115,
    z0: ZF - 0.001, z1: ZF + 0.004, skip: 'nz', zone: 'brassWear',
  });
  const rose = g.join([
    g.frustum({ a: roseRing(ZF - 0.001), b: roseRing(ZF + 0.028), capA: false, capB: false, zone: 'brassWear' }),
    g.poly({ pts: roseRing(ZF + 0.028), zone: 'brassWear' }),
  ]);
  const bar = g.transform({
    geom: g.join([
      g.block({ x0: v('barX0'), x1: v('barX1'), y0: LEVER_Y - 0.014, y1: LEVER_Y + 0.013, z0: ZF + 0.016, z1: ZF + 0.050, zone: 'brassWear' }),
      g.block({ x0: v('barX0'), x1: v('bar2X1'), y0: LEVER_Y - 0.044, y1: LEVER_Y - 0.008, z0: ZF + 0.022, z1: ZF + 0.048, skip: 'py nz', zone: 'brassWear' }),
    ]),
    rz: v('droop'), tx: v('tx'), ty: v('ty'),
  });
  const levers = g.mirror({ geom: g.join([leverPlate, rose, bar]), axis: 'z' });

  const latch = g.block({
    x0: v('latchX0'), x1: v('latchX1'), y0: LEVER_Y - 0.055, y1: LEVER_Y + 0.055,
    z0: -0.008, z1: 0.008, skip: 'nx', zone: 'brass',
  });

  // Reference shear and the leaf group's -W/2 offset.
  const door = g.deform({
    geom: g.join([shell, edge, glassSide, hinges, levers, latch]),
    values: V,
    expr: '[x - vals.W / 2, y + (-vals.SAG / vals.W) * x + vals.SAG, z]',
  });

  return g.mesh(door, {
    zones: { leaf: at(pal, 'leaf'), panel: at(pal, 'panel'), glass: at(pal, 'glass'), brass: at(pal, 'brass'), wear, brassWear },
    materials: { glass: { slot: 'glass', transparent: true, opacity: 0.6, roughness: 0.25, metalness: 0 } },
    name: 'interior-door-leaf',
  });
}
