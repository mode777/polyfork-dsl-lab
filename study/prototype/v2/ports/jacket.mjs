// Stylized zip jacket on a mannequin: closed lofted body, placket, sleeves, collar.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const rings = [0.96, 1.08, 1.24, 1.4].map((y, i) => g.ring({ n: 16, r: 0.15 + [0, 0.02, 0.015, -0.045][i], y, sz: [0.72, 0.78, 0.74, 0.66][i] }));
  const body = g.loft({ rings, capTop: [0, 1.43, 0], capBottom: [0, 0.94, 0], zones: { band: 'jacket', capTop: 'jacket', capBottom: 'jacket' } });
  const placket = g.box({ w: 0.04, h: 0.44, d: 0.02, y: 1.18, z: 0.125, zone: 'trim' });
  const buttons = [];
  for (let i = 0; i < 3; i++) buttons.push(g.sphere({ r: 0.012, seg: 6, rings: 4, y: 1.02 + i * 0.13, z: 0.14, zone: 'button' }));
  const sleeves = [];
  for (const sx of [-1, 1]) sleeves.push(g.cylinder({ r1: 0.052, r2: 0.036, h: 0.36, seg: 8, x: sx * 0.2, y: 1.08, z: 0, rz: sx * 0.5, zone: 'jacket' }));
  const collarPath = [];
  for (const a of [-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4]) collarPath.push([Math.sin(a) * 0.09, 1.43, Math.cos(a) * 0.07 - 0.01]);
  const collar = g.bandOnSurface({ pts: collarPath, width: 0.055, height: 0.035, ease: 0.01, zone: 'trim' });
  const neck = g.cylinder({ r1: 0.045, r2: 0.04, h: 0.1, y: 1.43, zone: 'skin' });
  const head = g.sphere({ r: 0.082, seg: 10, rings: 7, y: 1.565, zone: 'skin' });
  return g.mesh(g.join([body, placket, ...buttons, ...sleeves, collar, neck, head]), {
    zones: { jacket: '#3f4a5a', trim: '#222833', button: '#b9a15a', skin: '#c29a78' },
  });
}
