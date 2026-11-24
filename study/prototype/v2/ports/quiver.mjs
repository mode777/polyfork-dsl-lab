// Port: quiver — lathed leather tube with rim bands, arrows as thin cylinders + cones.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
export default function build(g, P = {}) {
  g.input('taper', 'float', 0.5, { min: 0, max: 1 });
  g.input('arrows', 'int', 5, { min: 3, max: 8 });
  const t = P.taper ?? 0.5, L = 0.9, rt = 0.068, rb = rt * (1 - 0.48 * t);
  const prof = [[0.02, 0], [rb, 0], [rb + 0.004, 0.03], [rb, 0.06], [rb + (rt - rb) * 0.6, 0.5], [rt, 0.86], [rt + 0.006, 0.9], [rt - 0.006, 0.92], [0.02, 0.92]];
  const tube = g.revolve({ profile: prof, seg: 12, zone: (k) => (k === 1 || k === 5 ? 'rim' : 'leather') });
  const arrows = [];
  const n = Math.round(P.arrows ?? 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = 0.03;
    arrows.push(g.cylinder({ r1: 0.004, r2: 0.004, h: 1.05, seg: 5, x: Math.cos(a) * rr, y: 0.86, z: Math.sin(a) * rr }));
    arrows.push(g.cone({ n: 4, r: 0.014, h: 0.05, x: Math.cos(a) * rr, y: 1.91, z: Math.sin(a) * rr, zone: 'fletch' }));
  }
  return g.mesh(g.join([tube, ...arrows]), { zones: { leather: P.leather ?? '#7a4f32', rim: P.rim ?? '#c2a15a', fletch: P.fletch ?? '#d9d3c4' } });
}
