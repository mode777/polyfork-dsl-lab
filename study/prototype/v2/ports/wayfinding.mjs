// Overhead wayfinding sign — exact geometric port. A chamfered cabinet with
// recessed lit faces, a row of flat legend glyphs, galvanised hanger rods,
// ceiling channel, tie bar and knee braces. Width/drop/end lights and every
// legend option stay live.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'terminal-slate': { housing: '#282f3f', field: '#3a4d6b', steel: '#948f8f' },
  'warm-charcoal': { housing: '#575451', field: '#282f3f', steel: '#948f8f' },
  navy: { housing: '#3a4d6b', field: '#282f3f', steel: '#8fa5b1' },
  'pale-steel': { housing: '#8fa5b1', field: '#282f3f', steel: '#7b787c' },
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const TL = (x, y) => [[x, y + 5], [x + 1, y + 5], [x + 1, y + 6]];
const BL = (x, y) => [[x, y + 1], [x + 1, y], [x + 1, y + 1]];
const TR = (x, y) => [[x, y + 5], [x + 1, y + 5], [x, y + 6]];
const BR = (x, y) => [[x, y], [x + 1, y + 1], [x, y + 1]];
const NOTCH = [[[3, 2.5], [4, 2.5], [3, 3]], [[3, 3], [4, 3.5], [3, 3.5]]];
const FONT = {
  A: { w: 4, p: [R(0, 0, 1, 5), R(3, 0, 4, 5), R(1, 5, 3, 6), TL(0, 0), TR(3, 0), R(1, 2.4, 3, 3.4)] },
  B: { w: 4, p: [R(0, 0, 1, 6), R(1, 5, 3, 6), R(1, 2.5, 3, 3.5), R(1, 0, 3, 1), R(3, 3.5, 4, 5), TR(3, 0), R(3, 1, 4, 2.5), BR(3, 0), ...NOTCH] },
  C: { w: 4, p: [R(0, 1, 1, 5), TL(0, 0), R(1, 5, 4, 6), BL(0, 0), R(1, 0, 4, 1), R(3, 4.1, 4, 5), R(3, 1, 4, 1.9)] },
  D: { w: 4, p: [R(0, 0, 1, 6), R(1, 5, 2.8, 6), R(1, 0, 2.8, 1), R(3, 1.2, 4, 4.8), [[2.8, 5], [3, 4.8], [4, 4.8], [2.8, 6]], [[2.8, 1], [3, 1.2], [4, 1.2], [2.8, 0]]] },
  E: { w: 3.6, p: [R(0, 0, 1, 6), R(1, 5, 3.6, 6), R(1, 2.5, 3.2, 3.5), R(1, 0, 3.6, 1)] },
};

const mirrorV = (poly) => poly.map(([u, v]) => [u, -v]);
const PLANE = (() => {
  const wing = [[2.2, 0.4], [3.6, 0.4], [1.8, 3.0], [1.1, 3.0]];
  const tail = [[0.3, 0.4], [1.0, 0.4], [0.4, 1.5], [0.0, 1.5]];
  return [[[-0.2, 0], [0.3, -0.4], [5.0, -0.4], [5.9, 0], [5.0, 0.4], [0.3, 0.4]], wing, mirrorV(wing), tail, mirrorV(tail)];
})();
const disc = (cx, cy, r, n = 8) => Array.from({ length: n }, (_, i) => {
  const t = (i / n) * Math.PI * 2 + Math.PI / n;
  return [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
});
function fit(pieces, deg = 0) {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  const rot = pieces.map((p) => p.map(([u, v]) => [u * c - v * s, u * s + v * c]));
  const all = rot.flat();
  const u0 = Math.min(...all.map((q) => q[0])), v0 = Math.min(...all.map((q) => q[1]));
  const k = 6 / (Math.max(...all.map((q) => q[1])) - v0);
  const p = rot.map((poly) => poly.map(([u, v]) => [(u - u0) * k, (v - v0) * k]));
  return { w: (Math.max(...all.map((q) => q[0])) - u0) * k, p };
}
const ICON = {
  departures: fit(PLANE, 35),
  arrivals: fit(PLANE, -35),
  toilets: { w: 6, p: [
    disc(1.1, 5.3, 0.65), [[0.1, 1.6], [2.1, 1.6], [1.5, 4.4], [0.7, 4.4]], R(0.55, 0, 0.95, 1.6), R(1.25, 0, 1.65, 1.6),
    R(2.75, 0, 3.05, 6),
    disc(4.8, 5.3, 0.65), R(4.1, 2.2, 5.5, 4.4), R(4.15, 0, 4.7, 2.2), R(4.9, 0, 5.45, 2.2),
    R(3.6, 2.4, 3.95, 4.4), R(5.65, 2.4, 6.0, 4.4)] },
  baggage: { w: 5, p: [
    [[0, 0.5], [0.5, 0], [4.5, 0], [5, 0.5], [5, 4], [4.5, 4.5], [0.5, 4.5], [0, 4]],
    R(1.6, 4.5, 2.1, 5.5), R(2.9, 4.5, 3.4, 5.5), R(1.6, 5.5, 3.4, 6)] },
  bagPickup: { w: 6.4, p: [
    [[0.5, 0], [5.9, 0], [6.4, 0.5], [5.9, 1], [0.5, 1], [0, 0.5]],
    [[1.6, 1.5], [1.9, 1.2], [4.5, 1.2], [4.8, 1.5], [4.8, 4.3], [4.5, 4.6], [1.9, 4.6], [1.6, 4.3]],
    R(2.5, 4.6, 2.9, 5.6), R(3.5, 4.6, 3.9, 5.6), R(2.5, 5.6, 3.9, 6)] },
};
const ICON_SETS = {
  departures: ['departures'], arrivals: ['arrivals'], toilets: ['toilets'], baggage: ['baggage'], 'bag-pickup': ['bagPickup'],
  'departures-toilets': ['departures', 'toilets'], 'arrivals-bag-pickup': ['arrivals', 'bagPickup'],
};
const ARROW = {
  right: { w: 6, p: [R(0, 2.3, 3.4, 3.7), [[3.4, 0.6], [6, 3], [3.4, 5.4]]] },
  left: { w: 6, p: [R(2.6, 2.3, 6, 3.7), [[2.6, 0.6], [0, 3], [2.6, 5.4]]] },
  up: { w: 5, p: [R(1.8, 0, 3.2, 3.4), [[0, 3.4], [2.5, 6], [5, 3.4]]] },
};
const item = (g) => ({ w: g.w, p: g.p });
const fontItems = Object.fromEntries(Object.entries(FONT).map(([k, v]) => [k, [item(v)]]));
const iconItems = Object.fromEntries(Object.entries(ICON_SETS).map(([k, keys]) => [k, keys.map((x) => item(ICON[x]))]));
const arrowItems = Object.fromEntries(Object.entries(ARROW).map(([k, v]) => [k, [item(v)]]));

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'terminal-slate', { options: Object.keys(PALETTE), label: 'Colorway' });
  const housing = g.input('housing', 'color', '', { label: 'Housing' });
  const field = g.input('field', 'color', '', { label: 'Sign field' });
  const light = g.input('light', 'color', '', { label: 'Light ring' });
  const steel = g.input('steel', 'color', '', { label: 'Steel' });
  const width = g.input('width', 'float', 2.4, { min: 2, max: 6, step: 0.1, label: 'Width' });
  const drop = g.input('drop', 'float', 0.8, { min: 0.4, max: 1.2, step: 0.05, label: 'Drop' });
  const endLights = g.input('endLights', 'bool', true, { label: 'Lit ends' });
  const arrow = g.input('arrow', 'enum', 'right', { options: ['none', 'right', 'left', 'up'], label: 'Arrow' });
  const letters = g.input('letters', 'enum', 'A', { options: ['none', 'A', 'B', 'C', 'D', 'E'], label: 'Letter' });
  const icons = g.input('icons', 'enum', 'departures-toilets', { options: ['none', 'departures', 'arrivals', 'toilets', 'baggage', 'bag-pickup', 'departures-toilets', 'arrivals-bag-pickup'], label: 'Icons' });
  const legend = g.input('legend', 'color', '', { label: 'Legend' });
  const wear = g.input('wear', 'float', 0.2, { min: 0, max: 1, step: 0.1, label: 'Wear' });

  const dims = g.let({
    in: { width, drop },
    binds: {
      W: 'width',
      H: '0.6',
      D: '0.32',
      CH: '0.03',
      CHAN: '0.041',
      PITCH: '2.4',
      ROD_R: '0.022',
      y1: '4 - drop',
      y0: '4 - drop - 0.6',
      cy: '4 - drop - 0.3',
      halfW: 'width/2',
      halfD: '0.16',
      xo: 'width/2 - 0.45',
      count: 'max(2, ceil(2*(width/2 - 0.45)/2.4 - 1e-6) + 1)',
      yt: '4 - drop + 0.3*drop',
      k: 'min(0.22, 0.4*drop)',
      fieldW: 'width - 0.26',
      legendW: 'width - 0.42',
    },
  });
  const d = (k) => at(dims, k);

  // Cabinet shell with the lit faces removed; the recessed panels below fill
  // those openings. The chamfered border around each opening stays.
  const skip = g.value({ args: { endLights }, expr: "endLights ? 'px nx pz nz' : 'pz nz'" });
  const shell = g.chamferBox({ w: d('W'), h: d('H'), d: d('D'), c: d('CH'), y: d('cy'), skip, zone: 'housing' });

  // One recessed face panel: outer ring -> reveal wall -> light ring ->
  // field wall -> field face. Built in local XY with the face at z=0. The
  // rings are explicit mitred quads so the winding matches the reference.
  const neg = (v) => (typeof v === 'number' ? -v : g.value({ args: { v }, expr: '-v' }));
  const sub = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : g.value({ args: { a, b }, expr: 'a - b' }));
  const rect = (x, y, z) => [[neg(x), neg(y), z], [x, neg(y), z], [x, y, z], [neg(x), y, z]];
  const quad = (zone, pts, hint) => g.poly({ pts, zone, hint });
  const panel = (ox, oy, ix, iy, ring, recess, raise) => {
    const fx = sub(ix, ring), fy = sub(iy, ring);
    const O = rect(ox, oy, 0), I = rect(ix, iy, 0);
    const I2 = rect(ix, iy, -recess), F = rect(fx, fy, -recess), F2 = rect(fx, fy, -recess + raise);
    const side = [[0, -1, 0], [1, 0, 0], [0, 1, 0], [-1, 0, 0]];
    const q = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      q.push(quad('housing', [O[i], O[j], I[j], I[i]], [0, 0, 1]));
      q.push(quad('housing', [I[i], I[j], I2[j], I2[i]], side[i]));
      q.push(quad('light', [I2[i], I2[j], F[j], F[i]], [0, 0, 1]));
      q.push(quad('field', [F[i], F[j], F2[j], F2[i]], side[i]));
    }
    q.push(quad('field', F2, [0, 0, 1]));
    return g.join(q);
  };

  const frontPanel = panel(
    g.value({ args: { W: d('W'), H: d('H'), CH: d('CH') }, expr: 'W/2 - CH' }),
    g.value({ args: { W: d('W'), H: d('H'), CH: d('CH') }, expr: 'H/2 - CH' }),
    g.value({ args: { W: d('W') }, expr: 'W/2 - 0.08' }),
    g.value({ args: { H: d('H') }, expr: 'H/2 - 0.08' }),
    0.05, 0.025, 0.01,
  );
  const front = g.transform({ geom: frontPanel, ty: d('cy'), tz: d('halfD') });
  const back = g.transform({ geom: frontPanel, ry: Math.PI, ty: d('cy'), tz: neg(d('halfD')) });

  const endPanel = panel(
    g.value({ args: { D: d('D'), CH: d('CH') }, expr: 'D/2 - CH' }),
    g.value({ args: { H: d('H'), CH: d('CH') }, expr: 'H/2 - CH' }),
    g.value({ args: { D: d('D') }, expr: 'D/2 - 0.08' }),
    g.value({ args: { H: d('H') }, expr: 'H/2 - 0.12' }),
    0.035, 0.025, 0.01,
  );
  const endRight = g.transform({ geom: endPanel, ry: Math.PI / 2, tx: d('halfW'), ty: d('cy') });
  const endLeft = g.transform({ geom: endPanel, ry: -Math.PI / 2, tx: neg(d('halfW')), ty: d('cy') });
  const ends = g.cond({ cond: endLights, then: g.join([endRight, endLeft]), else: g.join([]) });

  // Flat legend rows on both faces. Items are selected by the three choice
  // inputs, then packed with the reference scale and 4-unit gap.
  const arrowSel = g.switch({ on: arrow, cases: { none: [], ...arrowItems } });
  const arrowBackSel = g.switch({ on: arrow, cases: { none: [], right: arrowItems.left, left: arrowItems.right, up: arrowItems.up } });
  const letterSel = g.switch({ on: letters, cases: { none: [], ...fontItems } });
  const iconSel = g.switch({ on: icons, cases: { none: [], ...iconItems } });
  const itemsFront = g.concat({ lists: [arrowSel, letterSel, iconSel] });
  const itemsBack = g.concat({ lists: [arrowBackSel, letterSel, iconSel] });
  const legendFront = g.pack({
    items: itemsFront, gap: 4, maxScale: 0.23 / 6, maxWidth: d('legendW'),
    y: d('cy'), z: 0.1475, side: 1, unitHeight: 6, zone: 'legend',
  });
  const legendBack = g.pack({
    items: itemsBack, gap: 4, maxScale: 0.23 / 6, maxWidth: d('legendW'),
    y: d('cy'), z: 0.1475, side: -1, unitHeight: 6, zone: 'legend',
  });

  // Hanger rods: a base plate, four bolts, a hex collar, the rod and the
  // ceiling-side collar. The count follows the reference 2.4 m pitch rule.
  g.define('hanger', (h) => {
    const i = h.input('item', 'any', 0);
    const xo = h.input('xo', 'any', 0), count = h.input('count', 'any', 2);
    const y1 = h.input('y1', 'any', 3.2), chan = h.input('CHAN', 'any', 0.041);
    const x = h.value({ args: { i, xo, count }, expr: 'count <= 1 ? 0 : -xo + 2*xo*i/(count-1)' });
    const PL = 0.07, PT = 0.012;
    const hex = (r) => Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI / 6 + (k / 6) * Math.PI * 2;
      return [h.value({ args: { x, a, r }, expr: 'x + cos(a)*r' }), h.value({ args: { a, r }, expr: 'sin(a)*r' })];
    });
    const parts = [
      h.block({ x0: h.value({ args: { x, PL }, expr: 'x - PL' }), x1: h.value({ args: { x, PL }, expr: 'x + PL' }), y0: y1, y1: h.value({ args: { y1, PT }, expr: 'y1 + PT' }), z0: -PL, z1: PL, skip: 'ny', zone: 'steel' }),
    ];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      parts.push(h.cone({ n: 6, r: 0.011, h: 0.007, x: h.value({ args: { x, sx, PL }, expr: 'x + sx*(PL - 0.022)' }), y: h.value({ args: { y1, PT }, expr: 'y1 + PT' }), z: sz * (PL - 0.022), flip: true, zone: 'steel' }));
    }
    parts.push(h.prism({ profile: hex(0.034), axis: 'y', from: h.value({ args: { y1, PT }, expr: 'y1 + PT' }), to: h.value({ args: { y1, PT }, expr: 'y1 + PT + 0.03' }), cap: 'top', capOrient: true, zone: 'steel' }));
    parts.push(h.cylinder({ r1: 0.022, r2: 0.022, h: h.value({ args: { y1, PT, chan }, expr: '4 - chan - (y1 + PT)' }), seg: 8, x, y: h.value({ args: { y1, PT }, expr: 'y1 + PT' }), z: 0, caps: false, zone: 'steel' }));
    parts.push(h.prism({ profile: hex(0.034), axis: 'y', from: h.value({ args: { chan }, expr: '4 - chan - 0.03' }), to: h.value({ args: { chan }, expr: '4 - chan' }), cap: 'bottom', capOrient: true, zone: 'steel' }));
    h.out('out', h.join(parts));
  });

  const hangers = g.map({
    list: g.range({ from: 0, to: d('count') }), graph: 'hanger',
    xo: d('xo'), count: d('count'), y1: d('y1'), chan: d('CHAN'),
  });
  const channel = g.block({
    x0: g.value({ args: { xo: d('xo') }, expr: '-xo - 0.15' }),
    x1: g.value({ args: { xo: d('xo') }, expr: 'xo + 0.15' }),
    y0: g.value({ args: { chan: d('CHAN') }, expr: '4 - chan' }), y1: 4,
    z0: -0.0205, z1: 0.0205, zone: 'steel',
  });
  const tie = g.block({
    x0: g.value({ args: { xo: d('xo') }, expr: '-xo' }),
    x1: d('xo'),
    y0: g.value({ args: { yt: d('yt') }, expr: 'yt - 0.025' }),
    y1: g.value({ args: { yt: d('yt') }, expr: 'yt + 0.025' }),
    z0: -0.006, z1: 0.006, skip: 'nx px', zone: 'steel',
  });
  const brace = (side) => {
    const A = [g.value({ args: { xo: d('xo'), k: d('k'), side }, expr: 'side*(xo - k)' }), d('yt')];
    const B = [g.value({ args: { xo: d('xo'), side }, expr: 'side*xo' }), g.value({ args: { yt: d('yt'), k: d('k') }, expr: 'yt + k' })];
    const dx = g.value({ args: { ax: A[0], bx: B[0] }, expr: 'bx - ax' });
    const dy = g.value({ args: { ay: A[1], by: B[1] }, expr: 'by - ay' });
    const L = g.value({ args: { dx, dy }, expr: 'hypot(dx, dy)' });
    const nx = g.value({ args: { dx, dy, L }, expr: '-dy/L*0.02' });
    const ny = g.value({ args: { dx, dy, L }, expr: 'dx/L*0.02' });
    const pt = (ax, ay) => [g.value({ args: { a: ax, n: nx }, expr: 'a + n' }), g.value({ args: { a: ay, n: ny }, expr: 'a + n' })];
    const p0 = pt(A[0], A[1]), p1 = pt(B[0], B[1]);
    const p2 = [g.value({ args: { a: B[0], n: nx }, expr: 'a - n' }), g.value({ args: { a: B[1], n: ny }, expr: 'a - n' })];
    const p3 = [g.value({ args: { a: A[0], n: nx }, expr: 'a - n' }), g.value({ args: { a: A[1], n: ny }, expr: 'a - n' })];
    return g.prism({ profile: [p3, p2, p1, p0], axis: 'z', from: -0.004, to: 0.004, cap: false, zone: 'steel' });
  };

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'terminal-slate',
    overrides: { housing, field, light, steel, legend },
  });
  const housingWear = g.value({ args: { c: at(pal, 'housing'), wear }, expr: "mixColor(c, '#7b787c', wear*0.18)" });
  const steelWear = g.value({ args: { c: at(pal, 'steel'), wear }, expr: "mixColor(c, '#696568', wear*0.25)" });

  const all = g.join([shell, front, back, ends, legendFront, legendBack, hangers, channel, tie, brace(-1), brace(1)]);
  return g.mesh(all, {
    zones: {
      housing: housingWear,
      field: at(pal, 'field'),
      light: at(pal, 'light'),
      steel: steelWear,
      legend: at(pal, 'legend'),
    },
  });
}
