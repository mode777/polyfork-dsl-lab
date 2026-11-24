// Graph spec for the Polyfork area rug: grid -> position field -> fold -> colour field -> solidify.
// Compare with scripts/area-rug-5c56e2.mjs (260 non-comment lines).
import * as THREE from 'three';
import { graph } from '../graph.mjs';

const SIZES = {
  small: { W: 2.00, D: 1.50, NX: 10, NZ: 8 },
  large: { W: 3.00, D: 2.00, NX: 15, NZ: 10 },
};
const RC = 0.30, CH = 0.07, WOB = 0.024, KRUCK = 3, BAND = 3;

const COLORWAYS = {
  'linen-sage':      { field: '#F3EEE8', border: '#7E9179', motif: '#B8946A', backing: '#A89A85' },
  'oat-terracotta':  { field: '#F8F4EF', border: '#C4623F', motif: '#CFC3B0', backing: '#B4AAA0' },
  'walnut-ochre':    { field: '#E3CBA5', border: '#6B4A32', motif: '#D9A02B', backing: '#8A6244' },
  'slate-teal':      { field: '#F0F2F1', border: '#3E7C86', motif: '#B4AAA0', backing: '#8C837A' },
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const prng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export function build({ colorway = 'linen-sage', pattern = 'geometric', size = 'small', pile = 0.25, lived_in = 0.35, ...over } = {}) {
  const cw = COLORWAYS[colorway];
  const C = { field: over.field ?? cw.field, border: over.border ?? cw.border, motif: over.motif ?? cw.motif, backing: over.backing ?? cw.backing };
  const { W, D, NX, NZ } = SIZES[size];
  const px = W / NX, pz = D / NZ;
  const TH = 0.014 + pile * 0.024, AMP = pile * 0.011;

  const rnd = prng(7681);
  const wob = [];
  for (let i = 0; i <= NX; i++) { wob.push([]); for (let j = 0; j <= NZ; j++) wob[i].push(rnd()); }

  // Grid node: rounded-rect cut + edge wobble + pile relief + walking-line sag
  const g = graph({ size, pile, lived_in });
  const grid = g.grid({
    nx: NX, nz: NZ, w: W, d: D,
    position: (x, z, i, j) => {
      const s = (NX - i) + (NZ - j);
      const ax = clamp((Math.abs(x) - (W / 2 - RC)) / RC, 0, 1);
      const az = clamp((Math.abs(z) - (D / 2 - RC)) / RC, 0, 1);
      const cut = CH * Math.max(0, ax + az - 1);
      x -= Math.sign(x) * cut; z -= Math.sign(z) * cut;
      if (s !== KRUCK) {
        const w = wob[i][j] * WOB;
        if (i === 0) x += w; else if (i === NX) x -= w;
        if (j === 0) z += w; else if (j === NZ) z -= w;
      }
      const cn = Math.exp(-Math.pow(z / 0.32, 2));
      const rel = AMP * (0.55 * Math.sin(x * 11.3 + z * 4.1) + 0.45 * Math.sin(x * 5.7 - z * 13.9 + 2.1));
      return [x, TH + rel * (1 - 0.7 * cn) - lived_in * 0.006 * cn, z];
    },
  });

  // straighten the rucked corner's diagonal before folding it
  const foldV = (m) => [NX - KRUCK + m, NZ - m];
  const [a0, b0] = foldV(0), [a1, b1] = foldV(KRUCK);
  const y0 = grid.top[a0][b0][1], y1 = grid.top[a1][b1][1];
  for (let m = 1; m < KRUCK; m++) {
    const [a, b] = foldV(m);
    grid.top[a][b][1] = y0 + (y1 - y0) * (m / KRUCK);
  }

  // Deform node: rotate the corner progressively around its fold line
  if (lived_in > 0) {
    const PHI = lived_in * (95 * Math.PI / 180);
    const axis = new THREE.Vector3(
      grid.top[a1][b1][0] - grid.top[a0][b0][0], 0,
      grid.top[a1][b1][2] - grid.top[a0][b0][2],
    ).normalize();
    for (let m = 1; m <= KRUCK; m++) {
      const phi = -PHI * Math.pow(m / KRUCK, 1.5);
      const pivot = new THREE.Vector3(...grid.top[NX - (KRUCK - m + 1)][NZ]);
      g.deform(grid, (p, i, j) => {
        if ((NX - i) + (NZ - j) > KRUCK - m) return p;
        const v = new THREE.Vector3(...p).sub(pivot).applyAxisAngle(axis, phi).add(pivot);
        return [v.x, v.y, v.z];
      });
    }
  }

  // Colour field: border ring, diamond bands, field
  const cellColor = (i, j) => {
    if (pattern !== 'plain' && (i === 0 || i === NX - 1 || j === 0 || j === NZ - 1)) return 'border';
    if (pattern === 'geometric') {
      const d = Math.abs(i + 0.5 - NX / 2) + Math.abs(j + 0.5 - NZ / 2);
      if (Math.floor(d) % BAND === 1) return 'motif';
    }
    return 'field';
  };

  return g.merge(g.solidify({ top: grid.top, bot: grid.bot, topZone: cellColor, botZone: 'backing', wallZone: 'backing' }))
    .mesh({ zoneColors: C });
}
