// Port: cheese wedge with real boolean craters (Manifold).
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const W = 0.225, H = 0.12, D = 0.07;
  const profile = [[-W / 2, 0], [W / 2, 0], [W / 2 - 0.02, H], [-W / 2 + 0.01, H]];
  let body = g.extrude({ profile, depth: D, z0: -D / 2, cap: true });
  const craters = [
    [-0.045, H - 0.004, -0.005, 0.03], [0.05, H - 0.008, 0.012, 0.024],
    [0.01, H - 0.012, -0.02, 0.02], [-0.07, H - 0.014, 0.015, 0.018],
  ];
  for (const [x, y, z, r] of craters) {
    const s = g.sphere({ r, seg: 12, rings: 8, x, y, z });
    body = g.boolean({ a: body, b: s, op: 'subtract', zone: 'a' });
  }
  return g.mesh(body, { zones: { a: P.cheese ?? '#e8c46a' } });
}
