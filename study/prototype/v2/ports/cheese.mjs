// Port: cheese wedge — an extruded triangular prism with a rind zone.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const W = 0.34, H = 0.16, D = 0.26;
  const profile = [[-W / 2, 0], [W / 2, 0], [W / 2 - 0.02, H], [-W / 2 + 0.01, H]];
  const body = g.extrude({ profile, depth: D, z0: -D / 2, cap: true });
  return g.mesh(g.join([body]), { zones: { a: P.cheese ?? '#e8c46a' } });
}
