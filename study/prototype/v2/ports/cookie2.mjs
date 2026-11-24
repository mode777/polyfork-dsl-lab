// Cookie: exact construction from the reference — 20-segment rim, three-ring
// loft, seeded PRNG scatter. The low-level controls (diagonal, lazy RNG draws,
// non-uniform instance scale, yaw sign) exist so this is a geometric port, not
// a lookalike.
import { graph, field, expr } from '../dsl.mjs';
export default function build(g, P = {}) {
  const thickness = g.input('thickness', 'float', 0.024, { min: 0.014, max: 0.034 });
  const chips = g.input('chips', 'int', 9, { min: 3, max: 14 });
  const chipColor = g.input('chipColor', 'color', '#3d2113');
  // three rings with the same seeded rim wobble
  const rings = [0.9, 1.0, 0.93].map((s, i) => g.ring({
    n: 20,
    radius: field('0.05*(0.96+rand(1000+i*7)()*0.07)'),
    y: expr(`s => s.thickness*${[0, 0.42, 0.8][i]}`),
    sx: s, sz: s,
  }));
  const body = g.loft({
    rings,
    capTop: expr('s => [0, s.thickness, 0]'),
    capBottom: [0, 0, 0],
    zones: { band: 'edge', capTop: 'dough', capBottom: 'edge' },
    diagonal: 'ba',
  });
  const pts = g.scatter({
    count: chips,
    minDist: expr('s => s.chips > 9 ? 0.015 : 0.019'),
    seed: 42, tries: 800, prng: true, lazy: true, yawScale: Math.PI,
    sample: field('[cos(r0*TAU)*(0.16+r1*0.54)*0.05, sin(r0*TAU)*(0.16+r1*0.54)*0.05]'),
    height: field('s.thickness*(0.8+0.2*(1-hypot(x,z)/0.05/0.93))-0.0025'),
    size: field('[0.0085+r2*0.0025, 0.0075, 0.0085+r2*0.0025]'),
  });
  const chip = g.instance({
    points: pts,
    proto: g.cone({ n: 6, r: 1, h: 1, zone: 'chip', flip: true }),
    yawSign: -1,
  });
  return g.mesh(g.join([body, chip]), { zones: { dough: '#e0aa5e', edge: '#c4843c', chip: chipColor } });
}
