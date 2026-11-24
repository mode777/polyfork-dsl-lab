// Stylized pumpkin: deep 8-rib revolve and a tapered stem.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const prof = [[0.008, 0], [0.1, 0.01], [0.16, 0.06], [0.185, 0.13], [0.17, 0.21], [0.11, 0.27], [0.035, 0.29]];
  const body = g.revolve({ profile: prof, seg: 32, zone: 'rind', mod: `(x,y,z,i,k)=>x*(1+0.095*Math.cos(i*8))*(1+0.02*Math.sin(y*40))` });
  const stem = g.cylinder({ r1: 0.032, r2: 0.018, h: 0.11, seg: 7, y: 0.28, zone: 'stem' });
  return g.mesh(g.join([body, stem]), { zones: { rind: P.rind ?? '#df7b24', stem: P.stem ?? '#4d6b32' } });
}
