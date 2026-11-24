// Graph spec for the Polyfork cookie, used as the feasibility port.
// Compare with scripts/cookie-2016bb.mjs (158 non-comment lines).
import { graph } from '../graph.mjs';

const R = 0.05;
const TAU = Math.PI * 2;
const prng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const topY = (T, f) => T * (0.80 + 0.20 * (1 - f / 0.93));

const COLORWAYS = {
  classic:            { dough: '#e0aa5e', edge: '#c4843c', chip: '#3d2113' },
  'double-chocolate': { dough: '#43291a', edge: '#301b0e', chip: '#ecdfc0' },
  'oatmeal-raisin':   { dough: '#c9a468', edge: '#9f7a44', chip: '#552418' },
  matcha:             { dough: '#8aa85c', edge: '#6c8644', chip: '#f2e9d2' },
};

export function build({ colorway = 'classic', thickness = 0.024, chips = 9, chipColor } = {}) {
  const cw = COLORWAYS[colorway];
  const T = thickness, count = Math.round(chips);
  const g = graph({ thickness: T, chips: count });

  // ring profile: one radius per segment, wobbled by a seeded value
  const rim = g.ring({
    n: 20,
    radius: (i) => R * (0.96 + prng(1000 + i * 7)() * 0.07),
  });
  const at = (h, s) => rim.map(([x, , z]) => [x * s, h, z * s]);

  // body: three rings, apex cap, point cap -> 120 tris
  const body = g.loft({
    rings: [at(0, 0.90), at(T * 0.42, 1.00), at(T * 0.80, 0.93)],
    capTop: [0, T, 0],
    capBottom: [0, 0, 0],
    zones: { capTop: 'dough', band: 'edge', capBottom: 'edge' },
  });

  // scatter: rejection sample on the top disc, then instance a 6-sided chip
  const pts = g.scatter({
    count,
    minDist: count > 9 ? 0.015 : 0.019,
    seed: 42,
    tries: 800,
    sample: (rnd) => {
      const a = rnd() * TAU, f = 0.16 + rnd() * 0.54;
      return [Math.cos(a) * f * R, Math.sin(a) * f * R];
    },
    height: (x, z) => topY(T, Math.hypot(x, z) / R) - 0.0025,
    size: (rnd) => 0.0085 + rnd() * 0.0025,
  });
  const chip = g.instance(pts, g.pyramid({ sides: 6, r: 1, apex: 0.0075, zone: 'chip' }));

  return g.merge([body, chip]).mesh({
    zoneColors: { dough: cw.dough, edge: cw.edge, chip: chipColor ?? cw.chip },
  });
}
