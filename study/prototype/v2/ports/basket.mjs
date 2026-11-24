// Stylized basket: corrugated revolved wall, rolled rim, two handles.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2;
const circle = (r, n = 6) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * TAU) * r, Math.sin(i / n * TAU) * r]);
export default function build(g, P = {}) {
  const H = 0.4, R = 0.2;
  const prof = [];
  for (let i = 0; i <= 22; i++) {
    const y = (i / 22) * H;
    const flare = 0.72 + 0.28 * Math.sin(Math.min(1, (y / H) * 1.35) * Math.PI / 2);
    prof.push([R * flare + 0.011 * Math.sin(y * 52), y]);
  }
  prof.push([R * 0.94, H + 0.008], [R * 0.99, H + 0.03], [R * 0.93, H + 0.045]);
  const body = g.revolve({ profile: prof, seg: 18, zone: 'weave' });
  const bottom = g.fanRing({ r: R * 0.73, y: 0.002, n: 18, apex: [0, 0, 0], zone: 'weave', flip: true });
  const rim = g.revolve({ profile: [[R * 0.94, H + 0.03], [R * 1.02, H + 0.045], [R * 0.94, H + 0.06]], seg: 18, zone: 'handle' });
  const handles = [];
  for (const sx of [-1, 1]) {
    const x = sx * 0.19;
    const path = g.spline({ pts: [[x, H + 0.04, -0.13], [x, H + 0.16, -0.1], [x, H + 0.26, 0], [x, H + 0.16, 0.1], [x, H + 0.04, 0.13]], samples: 4 });
    handles.push(g.sweep({ path, section: g.profile({ pts: circle(0.013, 6) }), caps: true, zone: 'handle' }));
  }
  return g.mesh(g.join([body, bottom, rim, ...handles]), { zones: { weave: P.weave ?? '#c9a46a', handle: P.handle ?? '#b58a50' } });
}
