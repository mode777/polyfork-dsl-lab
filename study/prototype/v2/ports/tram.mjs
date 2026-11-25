// Tram track tile — the reference cross-section swept along Z. The asphalt,
// rail and base bands are one zoned loft; the end curtains and base are quads.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'city-asphalt': { asphalt: '#3C4145', rail: '#D8DADD', stone: '#6B7278', base: '#4E5459', paint: '#F0EFEC' },
  'fresh-blacktop': { asphalt: '#2E3134', rail: '#E4E6E6', stone: '#6B7278', base: '#1B1D20', paint: '#F7F5EF' },
  'sun-faded': { asphalt: '#6B7278', rail: '#F0EFEC', stone: '#D8DADD', base: '#8A9197', paint: '#F7F5EF' },
  'wet-slate': { asphalt: '#2E3134', rail: '#8A9197', stone: '#4E5459', base: '#1B1D20', paint: '#E4E6E6' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const TR_HALF = 2.0, TR_TOP = 0, TR_COURSE = -0.04, TR_BOT = -0.05;
const TR_GUT = -0.016, TR_CH = -0.004, TR_LIP = -0.008, TR_FLG = -0.034;
const TR_STEEL = [
  [-0.224, TR_CH], [-0.212, 0], [-0.151, 0], [-0.139, TR_LIP],
  [-0.139, TR_FLG], [-0.077, TR_FLG], [-0.077, TR_LIP], [-0.065, 0],
  [0.065, 0], [0.077, TR_CH], [0.077, TR_GUT],
];
const GAUGE = { 'cape-1067': 1.067, 'tram-1370': 1.370, 'standard-1435': 1.435 };

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'city-asphalt', { options: Object.keys(PALETTE), label: 'Colorway' });
  const gauge = GAUGE[params.gauge] ?? params.gauge ?? 1.370;
  const g2 = gauge / 2, inB = g2 - 0.269, outB = g2 + 0.122;
  const halfPts = [[0, TR_TOP]], halfCols = [];
  const seg = (x, y, c) => { halfPts.push([x, y]); halfCols.push(c); };
  seg(inB, TR_TOP, 'asphalt'); seg(inB, TR_GUT, 'asphalt'); seg(g2 + TR_STEEL[0][0], TR_GUT, 'asphalt');
  for (const [dx, y] of TR_STEEL) seg(g2 + dx, y, 'rail');
  seg(outB, TR_GUT, 'asphalt'); seg(outB, TR_TOP, 'asphalt'); seg(TR_HALF, TR_TOP, 'asphalt');
  const n = halfCols.length, pts = [], cols = [];
  for (let i = n; i >= 1; i--) pts.push([-halfPts[i][0], halfPts[i][1]]);
  for (let i = n - 1; i >= 0; i--) cols.push(halfCols[i]);
  for (let i = 0; i <= n; i++) pts.push(halfPts[i]);
  for (let i = 0; i < n; i++) cols.push(halfCols[i]);

  const A = pts.map(([x, y]) => [x, y, -TR_HALF]), B = pts.map(([x, y]) => [x, y, TR_HALF]);
  const parts = [g.loft({
    rings: [A, B], diagonal: 'abba', skipEdges: [cols.length],
    zoneField: 'vals.cols[i]', values: { cols },
    zones: { band: 'asphalt' },
  })];

  for (const sign of [1, -1]) {
    const z = sign * TR_HALF;
    for (let i = 0; i < cols.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x1 - x0 < 1e-9) continue;
      const quad = sign > 0
        ? [[x0, TR_COURSE, z], [x1, TR_COURSE, z], [x1, y1, z], [x0, y0, z]]
        : [[x0, y0, z], [x1, y1, z], [x1, TR_COURSE, z], [x0, TR_COURSE, z]];
      parts.push(g.poly({ pts: quad, zone: cols[i] }));
    }
  }
  for (const sign of [1, -1]) {
    const x = sign * TR_HALF;
    parts.push(g.poly({
      pts: sign > 0
        ? [[x, 0, -TR_HALF], [x, 0, TR_HALF], [x, TR_COURSE, TR_HALF], [x, TR_COURSE, -TR_HALF]]
        : [[x, TR_COURSE, -TR_HALF], [x, TR_COURSE, TR_HALF], [x, 0, TR_HALF], [x, 0, -TR_HALF]],
      zone: 'asphalt',
    }));
  }
  const base = [
    [[-TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_COURSE, TR_HALF], [-TR_HALF, TR_COURSE, TR_HALF]],
    [[-TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_BOT, -TR_HALF], [-TR_HALF, TR_BOT, -TR_HALF]],
    [[TR_HALF, TR_COURSE, -TR_HALF], [TR_HALF, TR_COURSE, TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [TR_HALF, TR_BOT, -TR_HALF]],
    [[-TR_HALF, TR_COURSE, TR_HALF], [-TR_HALF, TR_COURSE, -TR_HALF], [-TR_HALF, TR_BOT, -TR_HALF], [-TR_HALF, TR_BOT, TR_HALF]],
    [[-TR_HALF, TR_BOT, -TR_HALF], [TR_HALF, TR_BOT, -TR_HALF], [TR_HALF, TR_BOT, TR_HALF], [-TR_HALF, TR_BOT, TR_HALF]],
  ];
  for (const quad of base) parts.push(g.poly({ pts: quad, zone: 'base' }));

  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'city-asphalt' });
  return g.mesh(g.join(parts), {
    zones: { asphalt: at(pal, 'asphalt'), rail: at(pal, 'rail'), stone: at(pal, 'stone'), base: at(pal, 'base'), paint: at(pal, 'paint') },
  });
}
