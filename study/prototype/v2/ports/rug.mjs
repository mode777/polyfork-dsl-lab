// Area rug — exact geometric port. Named dimensions (`let`), a random value
// stream, a position expression, a diagonal straighten, a fold threaded through
// a group with gridPoint/direction, and solidify with per-cell zones.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  'linen-sage': { field: '#F3EEE8', border: '#7E9179', motif: '#B8946A', backing: '#A89A85' },
  'oat-terracotta': { field: '#F8F4EF', border: '#C4623F', motif: '#CFC3B0', backing: '#B4AAA0' },
  'walnut-ochre': { field: '#E3CBA5', border: '#6B4A32', motif: '#D9A02B', backing: '#8A6244' },
  'slate-teal': { field: '#F0F2F1', border: '#3E7C86', motif: '#B4AAA0', backing: '#8C837A' },
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'linen-sage', { options: Object.keys(PALETTE), label: 'Colorway' });
  const fieldColor = g.input('field', 'color', '', { label: 'Field' });
  const border = g.input('border', 'color', '', { label: 'Border' });
  const motif = g.input('motif', 'color', '', { label: 'Motif' });
  const backing = g.input('backing', 'color', '', { label: 'Backing' });
  const pattern = g.input('pattern', 'enum', 'geometric', { options: ['plain', 'bordered', 'geometric'], label: 'Pattern' });
  const size = g.input('size', 'enum', 'small', { options: ['small', 'large'], label: 'Size' });
  const pile = g.input('pile', 'float', 0.25, { min: 0, max: 1, step: 0.05, label: 'Pile' });
  const livedIn = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });

  const dims = g.let({
    in: { size },
    binds: {
      nx: "size === 'large' ? 15 : 10",
      nz: "size === 'large' ? 10 : 8",
      w: "size === 'large' ? 3 : 2",
      d: "size === 'large' ? 2 : 1.5",
      count: '(nx + 1) * (nz + 1)',
    },
  });
  const NX = at(dims, 'nx'), NZ = at(dims, 'nz'), W = at(dims, 'w'), D = at(dims, 'd');

  const rng = g.random({ seed: 7681, count: at(dims, 'count') });
  const wob = at(rng, 'values');

  const grid = g.grid({
    nx: NX, nz: NZ, w: W, d: D,
    values: { NX, NZ, W, D, wob },
    position: field(`let px = vals.W / vals.NX, pz = vals.D / vals.NZ,
      x0 = -vals.W/2 + i*px, z0 = -vals.D/2 + j*pz,
      ax = clamp((abs(x0) - (vals.W/2 - 0.30)) / 0.30, 0, 1),
      az = clamp((abs(z0) - (vals.D/2 - 0.30)) / 0.30, 0, 1),
      cut = 0.07 * max(0, ax + az - 1),
      x1 = x0 - sign(x0) * cut, z1 = z0 - sign(z0) * cut,
      s0 = (vals.NX - i) + (vals.NZ - j),
      w = vals.wob[i * (vals.NZ + 1) + j] * 0.024,
      x2 = s0 !== 3 ? (i === 0 ? x1 + w : (i === vals.NX ? x1 - w : x1)) : x1,
      z2 = s0 !== 3 ? (j === 0 ? z1 + w : (j === vals.NZ ? z1 - w : z1)) : z1,
      cn = exp(-pow(z2 / 0.32, 2)),
      amp = s.pile * 0.011, th = 0.014 + s.pile * 0.024,
      rel = amp * (0.55 * sin(x2*11.3 + z2*4.1) + 0.45 * sin(x2*5.7 - z2*13.9 + 2.1)),
      y = th + rel * (1 - 0.7*cn) - s.lived_in * 0.006 * cn
    in [x2, y, z2]`),
  });

  // Straighten the ruck diagonal before folding it.
  const straightened = g.deform({
    geom: grid,
    values: { grid, NX, NZ },
    expr: field(`let y0 = vals.grid.top[vals.NX - 3][vals.NZ][1],
      y1 = vals.grid.top[vals.NX][vals.NZ - 3][1],
      m = i - (vals.NX - 3)
    in (side === 'top' && j === vals.NZ - m && m >= 1 && m < 3) ? [x, y0 + (y1 - y0) * (m / 3), z] : [x, y, z]`),
  });

  g.define('rug-fold', (h) => {
    const item = h.input('item', 'any', null);
    const acc = h.input('acc', 'any', null);
    const NX = h.input('NX', 'any', null);
    const NZ = h.input('NZ', 'any', null);
    const idx = h.let({
      in: { item, NX, NZ },
      binds: { pi: 'NX - (4 - item)', i0: 'NX - 3', j1: 'NZ - 3' },
    });
    const pivot = h.gridPoint({ grid: acc, i: at(idx, 'pi'), j: NZ });
    const p0 = h.gridPoint({ grid: acc, i: at(idx, 'i0'), j: NZ });
    const p1 = h.gridPoint({ grid: acc, i: NX, j: at(idx, 'j1') });
    const axis = h.direction({ a: p0, b: p1, flatten: 'y' });
    const phi = h.value({ expr: '-s.lived_in * (95 * PI / 180) * pow(item / 3, 1.5)' });
    const folded = h.deform({
      geom: acc,
      values: { pivot, axis, phi, NX, NZ, item },
      expr: field('((vals.NX - i) + (vals.NZ - j) <= 3 - vals.item) ? vrot([x, y, z], vals.pivot, vals.axis, vals.phi) : [x, y, z]'),
    });
    h.out('out', folded);
  });

  const folded = g.fold({
    list: g.range({ from: 1, to: 4 }), init: straightened, graph: 'rug-fold', NX, NZ,
  });

  const slab = g.solidify({
    grid: folded,
    values: { NX, NZ, pattern },
    topZoneField: field(`(i === 0 || i === vals.NX - 1 || k === 0 || k === vals.NZ - 1)
      ? (vals.pattern === 'plain' ? 'field' : 'border')
      : (vals.pattern === 'geometric' && floor(abs(i + 0.5 - vals.NX/2) + abs(k + 0.5 - vals.NZ/2)) % 3 === 1 ? 'motif' : 'field')`),
    botZone: 'backing', wallZone: 'backing',
    diagonal: 'ref', wallOrder: 'ref',
  });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'linen-sage',
    overrides: { field: fieldColor, border, motif, backing },
  });
  return g.mesh(slab, {
    zones: { field: at(pal, 'field'), border: at(pal, 'border'), motif: at(pal, 'motif'), backing: at(pal, 'backing') },
  });
}
