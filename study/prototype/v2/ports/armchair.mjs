// Stylized tub armchair: a curved back band, seat and back cushions, four splayed legs.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
export default function build(g, P = {}) {
  const R = 0.29, path = [];
  for (let a = 198; a <= 342; a += 12) {
    const r = (a * Math.PI) / 180;
    path.push([Math.cos(r) * R, 0.65, Math.sin(r) * R]);
  }
  const back = g.bandOnSurface({ pts: path, width: 0.12, height: 0.4, ease: 0, zone: 'fabric' });
  const base = g.box({ w: 0.5, h: 0.06, d: 0.44, y: 0.39, z: 0.03, zone: 'wood' });
  const seat = g.box({ w: 0.54, h: 0.12, d: 0.46, y: 0.47, z: 0.0, bevel: 0.05, seg: 1, zone: 'cushion' });
  const backCushion = g.box({ w: 0.44, h: 0.26, d: 0.12, y: 0.64, z: -0.14, bevel: 0.04, seg: 1, zone: 'cushion' });
  const legs = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    legs.push(g.cylinder({ r1: 0.021, r2: 0.015, h: 0.4, seg: 6, x: sx * 0.3, y: 0.2, z: sz * 0.24, rx: -sz * 0.16, rz: sx * 0.16, zone: 'wood' }));
  }
  return g.mesh(g.join([back, base, seat, backCushion, ...legs]), {
    zones: { fabric: '#f1ece2', cushion: P.cushion ?? '#e0a92f', wood: '#6b4a2f' },
  });
}
