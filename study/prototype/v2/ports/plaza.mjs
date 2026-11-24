// Port: composite plaza tile — slab, raised field strips, recessed seams, service socket.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('seams', 'enum', 'twin', { options: ['single', 'twin', 'quad'] });
  const HALF = 2, DECK = 0.05, FIELD = 0.085;
  const sets = { single: [0], twin: [-1, 1], quad: [-1.5, -0.5, 0.5, 1.5] };
  const st = sets[P.seams ?? 'twin'];
  const parts = [g.box({ w: HALF * 2, h: DECK, d: HALF * 2, y: 0, zone: 'deck' })];
  for (const z of st) {
    for (const s of [-1, 1]) {
      parts.push(g.box({ w: 3.2, h: FIELD - DECK, d: 0.9, z: z + s * 0.62, y: DECK, zone: 'field' }));
    }
    parts.push(g.box({ w: 3.84, h: 0.02, d: 0.18, z, y: DECK, zone: 'seam' }));
  }
  if (P.socket !== false) {
    parts.push(g.box({ w: 0.44, h: 0.03, d: 0.44, x: 1.4, y: DECK, z: 1.4, zone: 'ring' }));
    parts.push(g.box({ w: 0.3, h: 0.02, d: 0.3, x: 1.4, y: DECK + 0.01, z: 1.4, zone: 'cap' }));
  }
  return g.mesh(g.center({ geom: g.join(parts), y: false }), {
    zones: { deck: P.deck ?? '#f4f7fa', field: P.field ?? '#e9eef4', seam: P.seam ?? '#b9c5d2', ring: P.ring ?? '#6e7f92', cap: P.cap ?? '#a9b6c4' },
  });
}
