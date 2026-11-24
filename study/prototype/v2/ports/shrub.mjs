// Port: flowering shrub — stems, blade leaves, and open/shut flowers.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
export default function build(g, P = {}) {
  const parts = [g.cylinder({ r1: 0.03, r2: 0.02, h: 0.9, seg: 6, zone: 'stem' })];
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 10; i++) {
    const a = rnd() * TAU, r = 0.15 + rnd() * 0.35, y = 0.25 + rnd() * 0.55;
    parts.push(g.box({ w: 0.22, h: 0.015, d: 0.08, x: Math.cos(a) * r, y, z: Math.sin(a) * r, ry: -a, rz: -0.5 - rnd() * 0.4, zone: 'leaf' }));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, r = 0.2;
    parts.push(g.cone({ n: 5, r: 0.06, h: 0.08, x: Math.cos(a) * r, y: 0.88, z: Math.sin(a) * r, zone: i % 2 ? 'flowerA' : 'flowerB' }));
  }
  return g.mesh(g.join(parts), { zones: { stem: '#5f7f5f', leaf: '#6f9a5f', flowerA: '#e8d8a0', flowerB: '#d9a0a0' } });
}
