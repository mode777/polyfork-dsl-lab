// Port: baggage carousel — a belt ring, posts, and bags placed around it.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
export default function build(g, P = {}) {
  const R = 1.6, belt = g.revolve({ profile: [[R - 0.22, 0.35], [R + 0.22, 0.35], [R + 0.22, 0.43], [R - 0.22, 0.43], [R - 0.22, 0.35]], seg: 20, zone: 'belt' });
  const legs = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; legs.push(g.box({ w: 0.1, h: 0.35, d: 0.1, x: Math.cos(a) * R, y: 0, z: Math.sin(a) * R,  zone: 'metal' })); }
  const bags = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.3, r = R + (i % 2 ? 0.08 : -0.05);
    bags.push(g.box({ w: 0.5, h: 0.28, d: 0.34, x: Math.cos(a) * r, y: 0.43, z: Math.sin(a) * r, ry: -a, zone: i % 3 === 0 ? 'bagB' : 'bagA' }));
  }
  return g.mesh(g.join([belt, ...legs, ...bags]), { zones: { belt: P.belt ?? '#3b3f46', metal: P.metal ?? '#6d737b', bagA: P.bagA ?? '#8a5a3c', bagB: P.bagB ?? '#3f5b7a' } });
}
