// Port: small rock — deformed sphere clipped by three planes, with capped faces.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  let s = 5;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const lump = g.sphere({ r: 0.31, seg: 7, rings: 5 });
  const d = g.deform({ geom: lump, expr: (x, y, z) => {
    const k = 1 + 0.28 * Math.sin(3 * x + 1.7) * Math.cos(2.4 * z - 0.4) + 0.14 * Math.sin(7 * y + 0.5);
    return [x * k, y * k * 0.72, z * k];
  } });
  let geo = d;
  geo = g.clip({ geom: geo, nx: 0.2, ny: 1, nz: 0.2, d: 0.11, cap: true, zone: 'rock' });
  geo = g.clip({ geom: geo, nx: -1, ny: 0.2, nz: 0.25, d: 0.18, cap: true, zone: 'rock' });
  geo = g.clip({ geom: geo, nx: 0.35, ny: 0.25, nz: 1, d: 0.17, cap: true, zone: 'rock' });
  return g.mesh(g.center({ geom: geo, y: false }), { zones: { rock: P.rock ?? '#8a8578' } });
}
