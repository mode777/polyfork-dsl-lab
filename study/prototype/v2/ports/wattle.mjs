// Port: wattle fence run — posts, two rails, and a woven panel of thin rods.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
export default function build(g, P = {}) {
  const L = 3, H = 1.1, parts = [];
  for (let i = 0; i <= 6; i++) {
    const x = -L / 2 + (i / 6) * L;
    parts.push(g.cylinder({ r1: 0.05, r2: 0.045, h: H + 0.1, seg: 6, x, y: 0, zone: 'stake' }));
  }
  for (const y of [0.35, 0.75]) parts.push(g.cylinder({ r1: 0.035, r2: 0.035, h: L, seg: 6, y, rz: Math.PI / 2, zone: 'rail' }));
  for (let i = 0; i < 16; i++) {
    const x = -L / 2 + 0.1 + (i / 15) * (L - 0.2);
    parts.push(g.cylinder({ r1: 0.018, r2: 0.018, h: H * 0.75, seg: 4, x, y: 0.15, rz: i % 2 ? 0.35 : -0.35, zone: 'weave' }));
  }
  return g.mesh(g.join(parts), { zones: { stake: '#6b5236', rail: '#7d6242', weave: '#8b7048' } });
}
