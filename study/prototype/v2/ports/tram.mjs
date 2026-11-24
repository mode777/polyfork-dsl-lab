// Tram track tile — geometric port of the reference straight grooved piece.
// The road is one swept cross-section; rails are the steel polyline inside it.
import { faceSink } from './_facekit.mjs';

const SIZE = 4.0, HALF = SIZE / 2, TOP_Y = 0.0, BOT_Y = -0.05, COURSE_Y = -0.04;
const GUT = -0.016, CH = -0.004, LIP = -0.008, FLG = -0.034;
const STEEL = [
  [-0.224, CH], [-0.212, 0], [-0.151, 0], [-0.139, LIP],
  [-0.139, FLG], [-0.077, FLG], [-0.077, LIP], [-0.065, 0],
  [0.065, 0], [0.077, CH], [0.077, GUT],
];
const GAUGE = 1.370;
const PALETTE = {
  'city-asphalt': { asphalt: '#3C4145', rail: '#D8DADD', stone: '#6B7278', base: '#4E5459', paint: '#F0EFEC' },
  'fresh-blacktop': { asphalt: '#2E3134', rail: '#E4E6E6', stone: '#6B7278', base: '#1B1D20', paint: '#F7F5EF' },
  'sun-faded': { asphalt: '#6B7278', rail: '#F0EFEC', stone: '#D8DADD', base: '#8A9197', paint: '#F7F5EF' },
  'wet-slate': { asphalt: '#2E3134', rail: '#8A9197', stone: '#4E5459', base: '#1B1D20', paint: '#E4E6E6' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'city-asphalt', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'city-asphalt' });

  const g2 = GAUGE / 2;
  const inB = g2 - 0.269;
  const outB = g2 + 0.122;
  const halfPts = [[0, TOP_Y]];
  const halfCols = [];
  const seg = (x, y, c) => { halfPts.push([x, y]); halfCols.push(c); };
  seg(inB, TOP_Y, 'asphalt');
  seg(inB, GUT, 'asphalt');
  seg(g2 + STEEL[0][0], GUT, 'asphalt');
  for (const [dx, y] of STEEL) seg(g2 + dx, y, 'rail');
  seg(outB, GUT, 'asphalt');
  seg(outB, TOP_Y, 'asphalt');
  seg(HALF, TOP_Y, 'asphalt');

  const n = halfCols.length;
  const pts = [], cols = [];
  for (let i = n; i >= 1; i--) pts.push([-halfPts[i][0], halfPts[i][1]]);
  for (let i = n - 1; i >= 0; i--) cols.push(halfCols[i]);
  for (let i = 0; i <= n; i++) pts.push(halfPts[i]);
  for (let i = 0; i < n; i++) cols.push(halfCols[i]);
  const W = HALF;

  const F = faceSink();
  const quad = (a, b, c, d, zone) => F.quad(a, b, c, d, zone);

  // Top sweep, -Z to +Z.
  for (let i = 0; i < cols.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    if (Math.abs(x0 - x1) < 1e-9 && Math.abs(y0 - y1) < 1e-9) continue;
    quad([x0, y0, -HALF], [x0, y0, HALF], [x1, y1, HALF], [x1, y1, -HALF], cols[i]);
  }

  const spans = [];
  for (let i = 0; i < cols.length; i++) {
    const a = pts[i], b = pts[i + 1];
    spans.push([a[0], b[0], a[1], b[1], cols[i]]);
  }
  for (const sign of [1, -1]) {
    const z = sign * HALF;
    for (const [x0, x1, y0, y1, col] of spans) {
      if (x1 - x0 < 1e-9) continue;
      if (sign > 0) quad([x0, COURSE_Y, z], [x1, COURSE_Y, z], [x1, y1, z], [x0, y0, z], col);
      else quad([x0, y0, z], [x1, y1, z], [x1, COURSE_Y, z], [x0, COURSE_Y, z], col);
    }
  }
  for (const sign of [1, -1]) {
    const x = sign * HALF;
    if (sign > 0) quad([x, 0, -HALF], [x, 0, HALF], [x, COURSE_Y, HALF], [x, COURSE_Y, -HALF], 'asphalt');
    else quad([x, COURSE_Y, -HALF], [x, COURSE_Y, HALF], [x, 0, HALF], [x, 0, -HALF], 'asphalt');
  }

  // Slab shell.
  const B = 'base';
  quad([-HALF, BOT_Y, HALF], [HALF, BOT_Y, HALF], [HALF, COURSE_Y, HALF], [-HALF, COURSE_Y, HALF], B);
  quad([-HALF, COURSE_Y, -HALF], [HALF, COURSE_Y, -HALF], [HALF, BOT_Y, -HALF], [-HALF, BOT_Y, -HALF], B);
  quad([HALF, COURSE_Y, -HALF], [HALF, COURSE_Y, HALF], [HALF, BOT_Y, HALF], [HALF, BOT_Y, -HALF], B);
  quad([-HALF, COURSE_Y, HALF], [-HALF, COURSE_Y, -HALF], [-HALF, BOT_Y, -HALF], [-HALF, BOT_Y, HALF], B);
  quad([-HALF, BOT_Y, -HALF], [HALF, BOT_Y, -HALF], [HALF, BOT_Y, HALF], [-HALF, BOT_Y, HALF], B);

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { asphalt: at(pal, 'asphalt'), rail: at(pal, 'rail'), stone: at(pal, 'stone'), base: at(pal, 'base'), paint: at(pal, 'paint') },
  });
}
