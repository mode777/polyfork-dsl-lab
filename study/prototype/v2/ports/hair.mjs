// Stylized hair: clip-on cap, a ponytail, and solid curl primitives on the back.
import { graph, field, expr } from '../dsl.mjs';
export default function build(g, P = {}) {
  const count = g.input('curlCount', 'int', 90, { min: 20, max: 300 });
  const curlSize = g.input('curlSize', 'float', 0.018, { min: 0.008, max: 0.032 });
  const head = g.sphere({ r: 0.11, seg: 14, rings: 10, y: 0.06, zone: 'skin' });
  const neck = g.cylinder({ r1: 0.05, r2: 0.045, h: 0.12, seg: 8, y: -0.06, zone: 'skin' });
  const shoulders = g.loft({
    rings: [g.ring({ n: 14, r: 0.09, y: 0.0, sz: 0.7 }), g.ring({ n: 14, r: 0.16, y: -0.03, sz: 0.6 }), g.ring({ n: 14, r: 0.19, y: -0.06, sz: 0.55 })],
    zones: { band: 'shirt' },
  });
  const cap = g.sphere({ r: 0.114, seg: 14, rings: 10, y: 0.078, zone: 'hair' });
  const cut = g.clip({ geom: cap, nx: 0, ny: 0.15, nz: 1, d: 0.036, cap: true, zone: 'hair' });
  const tie = g.cylinder({ r1: 0.035, r2: 0.032, h: 0.035, seg: 8, x: 0, y: 0.01, z: -0.12, rx: 0.55, zone: 'ribbon' });
  const tail = g.cylinder({ r1: 0.034, r2: 0.012, h: 0.2, seg: 7, x: 0, y: -0.045, z: -0.165, rx: 0.55, zone: 'hair' });
  const pts = g.scatterVolume({
    count, minDist: expr('s => s.curlSize * 0.95'), seed: 7, center: [0, 0.06, 0], radius: [0.108, 0.126, 0.108],
    keep: field('(z < 0.015 || y > 0.12) && y > 0.015'),
    size: field('s.curlSize'),
  });
  const curls = g.instance({ points: pts, proto: g.curl({ size: 1, tip: 0.34, sink: 0.04, zone: 'hair' }) });
  return g.mesh(g.join([shoulders, neck, head, cut, tie, tail, curls]), { zones: { skin: '#c29a78', hair: '#4a2f22', shirt: '#3f4a5a', ribbon: '#2a303a' } });
}
