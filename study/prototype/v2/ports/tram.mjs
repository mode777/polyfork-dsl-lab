// Port: tram track tile — road slab, two rail pairs built from an extruded rail profile.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const parts = [g.box({ w: 2, h: 0.08, d: 2, y: -0.08, zone: 'asphalt' })];
  for (const x of [-0.72, 0.72]) {
    parts.push(g.box({ w: 0.18, h: 0.02, d: 2, x, y: 0.0, zone: 'groove' }));
    parts.push(g.box({ w: 0.07, h: 0.09, d: 2, x, y: 0.02, zone: 'rail' }));
    for (let z = -0.9; z <= 0.9; z += 0.6) parts.push(g.box({ w: 0.44, h: 0.05, d: 0.1, x, y: -0.02, z, zone: 'sleeper' }));
  }
  return g.mesh(g.join(parts), { zones: { asphalt: '#4a4d52', groove: '#3a3c40', rail: '#b8bcc2', sleeper: '#6a5a4a' } });
}
