// Area rug — exact geometric port. The code node builds the reference's
// deformed top/bottom lattice; solidify and mesh do the slab and zone colours.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  'linen-sage': { field: '#F3EEE8', border: '#7E9179', motif: '#B8946A', backing: '#A89A85' },
  'oat-terracotta': { field: '#F8F4EF', border: '#C4623F', motif: '#CFC3B0', backing: '#B4AAA0' },
  'walnut-ochre': { field: '#E3CBA5', border: '#6B4A32', motif: '#D9A02B', backing: '#8A6244' },
  'slate-teal': { field: '#F0F2F1', border: '#3E7C86', motif: '#B4AAA0', backing: '#8C837A' },
};

const GRID_SRC = `
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SIZES = { small: { W: 2.00, D: 1.50, NX: 10, NZ: 8 }, large: { W: 3.00, D: 2.00, NX: 15, NZ: 10 } };
const RC = 0.30, CH = 0.07, WOB = 0.024, KRUCK = 3;
const { W, D, NX, NZ } = SIZES[size] || SIZES.small;
const pileAmt = clamp(pile, 0, 1), lived = clamp(lived_in, 0, 1);
const px = W / NX, pz = D / NZ;
const TH = 0.014 + pileAmt * 0.024;
const AMP = pileAmt * 0.011;
const wob = rng(7681).grid(NX + 1, NZ + 1);

const top = [], bot = [];
for (let i = 0; i <= NX; i++) {
  top.push([]); bot.push([]);
  for (let j = 0; j <= NZ; j++) {
    let x = -W / 2 + i * px, z = -D / 2 + j * pz;
    const s = (NX - i) + (NZ - j);
    const ax = clamp((Math.abs(x) - (W / 2 - RC)) / RC, 0, 1);
    const az = clamp((Math.abs(z) - (D / 2 - RC)) / RC, 0, 1);
    const cut = CH * Math.max(0, ax + az - 1);
    x -= Math.sign(x) * cut;
    z -= Math.sign(z) * cut;
    if (s !== KRUCK) {
      const w = wob[i][j] * WOB;
      if (i === 0) x += w; else if (i === NX) x -= w;
      if (j === 0) z += w; else if (j === NZ) z -= w;
    }
    const cn = Math.exp(-Math.pow(z / 0.32, 2));
    const rel = AMP * (0.55 * Math.sin(x * 11.3 + z * 4.1) + 0.45 * Math.sin(x * 5.7 - z * 13.9 + 2.1));
    const y = TH + rel * (1 - 0.7 * cn) - lived * 0.006 * cn;
    top[i].push([x, y, z]);
    bot[i].push([x, 0, z]);
  }
}

const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vnorm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vrot = (p, pivot, axis, phi) => {
  const v = vsub(p, pivot), k = vcross(axis, v), d = vdot(axis, v);
  const c = Math.cos(phi), s = Math.sin(phi);
  return vadd(pivot, [v[0] * c + k[0] * s + axis[0] * d * (1 - c),
                      v[1] * c + k[1] * s + axis[1] * d * (1 - c),
                      v[2] * c + k[2] * s + axis[2] * d * (1 - c)]);
};

const foldV = (m) => [NX - KRUCK + m, NZ - m];
{
  const [a0, b0] = foldV(0), [a1, b1] = foldV(KRUCK);
  const y0 = top[a0][b0][1], y1 = top[a1][b1][1];
  for (let m = 1; m < KRUCK; m++) {
    const [a, b] = foldV(m);
    top[a][b][1] = y0 + (y1 - y0) * (m / KRUCK);
  }
}

if (lived > 0) {
  const PHI = lived * (95 * Math.PI / 180);
  const [a0, b0] = foldV(0), [a1, b1] = foldV(KRUCK);
  const d = vsub(top[a1][b1], top[a0][b0]); d[1] = 0;
  const axis = vnorm(d);
  for (let m = 1; m <= KRUCK; m++) {
    const phi = -PHI * Math.pow(m / KRUCK, 1.5);
    const hs = KRUCK - m + 1;
    const pivot = top[NX - hs][NZ];
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) {
      if ((NX - i) + (NZ - j) > KRUCK - m) continue;
      top[i][j] = vrot(top[i][j], pivot, axis, phi);
      bot[i][j] = vrot(bot[i][j], pivot, axis, phi);
    }
  }
}
`;
const GRID_OUTS = [
  { name: 'top', expr: 'top' },
  { name: 'bot', expr: 'bot' },
  { name: 'NX', expr: 'NX' },
  { name: 'NZ', expr: 'NZ' },
];

export default function build(g, P = {}) {
  const colorway = g.input('colorway', 'enum', 'linen-sage', { options: Object.keys(PALETTE), label: 'Colorway' });
  const fieldColor = g.input('field', 'color', '', { label: 'Field' });
  const border = g.input('border', 'color', '', { label: 'Border' });
  const motif = g.input('motif', 'color', '', { label: 'Motif' });
  const backing = g.input('backing', 'color', '', { label: 'Backing' });
  const pattern = g.input('pattern', 'enum', 'geometric', { options: ['plain', 'bordered', 'geometric'], label: 'Pattern' });
  const size = g.input('size', 'enum', 'small', { options: ['small', 'large'], label: 'Size' });
  const pile = g.input('pile', 'float', 0.25, { min: 0, max: 1, step: 0.05, label: 'Pile' });
  const livedIn = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });

  const layoutInputs = [
    { name: 'size', type: 'enum', default: 'small' },
    { name: 'pile', type: 'float', default: 0.25 },
    { name: 'lived_in', type: 'float', default: 0.35 },
  ];
  g.defineLayout('rug-grid', { inputs: layoutInputs, src: GRID_SRC, outs: GRID_OUTS });
  const data = g.layoutNode('rug-grid', { size, pile, lived_in: livedIn });
  const get = (key) => ({ __ref: `${data.__ref}.${key}` });
  const slab = g.solidify({
    grid: data,
    NX: get('NX'), NZ: get('NZ'), pattern,
    topZoneField: field("i===0 || i===s.NX-1 || k===0 || k===s.NZ-1 ? (s.pattern==='plain' ? 'field' : 'border') : (s.pattern==='geometric' && Math.floor(Math.abs(i+0.5-s.NX/2)+Math.abs(k+0.5-s.NZ/2)) % 3 === 1 ? 'motif' : 'field')"),
    botZone: 'backing', wallZone: 'backing',
    diagonal: 'ref', wallOrder: 'ref',
  });

  const color = (key) => expr(`s => s.${key} || (${JSON.stringify(PALETTE)})[s.colorway].${key}`);
  return g.mesh(slab, {
    zones: {
      field: color('field'), border: color('border'),
      motif: color('motif'), backing: color('backing'),
    },
  });
}
