// Port: cobbled street tile — a slab with a seeded scatter of low stone blocks.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('stones', 'int', 40, { min: 10, max: 90 });
  const n = Math.round(P.stones ?? 40), parts = [g.box({ w: 2, h: 0.06, d: 2, y: -0.06, zone: 'mortar' })];
  let s = 77;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const x = -0.9 + rnd() * 1.8, z = -0.9 + rnd() * 1.8;
    parts.push(g.box({ w: 0.18 + rnd() * 0.1, h: 0.05 + rnd() * 0.03, d: 0.18 + rnd() * 0.1, x, y: 0, z, ry: rnd() * 0.4,  zone: i % 5 === 0 ? 'stoneB' : 'stoneA' }));
  }
  return g.mesh(g.join(parts), { zones: { mortar: '#6e6a60', stoneA: '#9a958a', stoneB: '#7f7a70' } });
}
