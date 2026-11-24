// Port: adjustable bay stilt — four posts, a deck, a cabin box and a pitched roof.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const W = 3.2, D = 2.6, H = 2.2, parts = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    parts.push(g.cylinder({ r1: 0.09, r2: 0.07, h: H, seg: 6, x: sx * W * 0.42, y: 0, z: sz * D * 0.42, zone: 'post' }));
  }
  parts.push(g.box({ w: W, h: 0.12, d: D, y: H, zone: 'deck' }));
  parts.push(g.box({ w: W * 0.8, h: H * 0.75, d: D * 0.75, y: H + 0.12, zone: 'cabin' }));
  const roof = g.loft({
    rings: [
      [[-W * 0.48, H + H * 0.87, -D * 0.45], [W * 0.48, H + H * 0.87, -D * 0.45], [W * 0.48, H + H * 0.87, D * 0.45], [-W * 0.48, H + H * 0.87, D * 0.45]],
      [[-W * 0.38, H + H * 1.05, -D * 0.3], [W * 0.38, H + H * 1.05, -D * 0.3], [W * 0.38, H + H * 1.05, D * 0.3], [-W * 0.38, H + H * 1.05, D * 0.3]],
    ],
    capTop: [0, H + H * 1.16, 0], capBottom: [0, H + H * 0.87, 0], zones: { band: 'roof', capTop: 'roof', capBottom: 'roof' },
  });
  parts.push(roof);
  return g.mesh(g.join(parts), { zones: { post: '#6b5236', deck: '#8b7048', cabin: '#b9a98a', roof: '#4a4d52' } });
}
