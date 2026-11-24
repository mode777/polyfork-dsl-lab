// Stylized clam: a ribbed closed shell with a seam and hinge.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const R = 0.24, H = 0.17, prof = [];
  for (let i = 0; i <= 16; i++) {
    const y = -H + (2 * H * i) / 16;
    const r = Math.max(0.008, R * Math.sqrt(Math.max(0, 1 - (y / H) ** 2)));
    prof.push([Math.abs(y) < 0.013 ? r * 0.94 : r, y]);
  }
  const zones = prof.slice(0, -1).map((p, k) => (Math.abs(prof[k][1]) < 0.02 ? 'seam' : 'shell'));
  const body = g.revolve({ profile: prof, seg: 30, zone: zones, mod: `(x,y,z,i,k)=>x*(1+0.085*Math.cos(i*10))` });
  const squashed = g.deform({ geom: body, expr: `(x,y,z)=>[x,y,z*0.62]` });
  const hinge = g.cylinder({ r1: 0.02, r2: 0.02, h: 0.12, seg: 8, y: 0, z: -H * 0.62, rz: Math.PI / 2, zone: 'hinge' });
  return g.mesh(g.join([squashed, hinge]), { zones: { shell: P.shell ?? '#dcc9a4', seam: '#8a775a', hinge: '#7a6a52' } });
}
