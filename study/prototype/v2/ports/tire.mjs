// Port: tire — revolve around Z with per-segment tread modulation, plus hub, caps, lugs.
import { graph } from '../dsl.mjs';
const TAU = Math.PI * 2, PI = Math.PI;
const R_OUT = 0.35, R_SHLD = 0.30, HW = 0.135, GROOVE = 0.030, BLOCK = 0.013;
const BORE0 = 0.21, HUB0 = 0.135, DISH_Z = 0.042, BACK_R = 0.72, BACK_Z = -0.105, APEX_Z = 0.142;

export default function build(g, P = {}) {
  g.input('facets', 'int', 14, { min: 12, max: 16 });
  g.input('width', 'float', 1, { min: 0.7, max: 1.35 });
  g.input('rimSize', 'float', 1, { min: 0.85, max: 1.2 });
  const N = Math.round(P.facets ?? 14), W = P.width ?? 1, RS = P.rimSize ?? 1;
  const BORE = BORE0 * RS, HUBR = HUB0 * RS, WWI = BORE + 0.014, BKR = BORE * BACK_R, LUG_R = 0.105 * RS;
  const CY = R_OUT * Math.cos(PI / N), ZOFF = -((APEX_Z - HW) / 2) * W;
  const PROF = [
    [BKR, BACK_Z, 0, 0, 'rim'], [BKR, -0.135, 0, 0, 'rub'], [R_SHLD, -0.135, 0, 0, 'rub'],
    [R_OUT, -0.112, BLOCK, 0, 'rub'], [R_OUT, -0.062, BLOCK, 0, 'rub'], [R_OUT - GROOVE, -0.040, 0, 0, 'rub'],
    [R_OUT, -0.018, BLOCK, 1, 'rub'], [R_OUT, 0.018, BLOCK, 1, 'rub'], [R_OUT - GROOVE, 0.040, 0, 0, 'rub'],
    [R_OUT, 0.062, BLOCK, 0, 'rub'], [R_OUT, 0.112, BLOCK, 0, 'rub'], [R_SHLD, 0.135, 0, 0, 'ww'],
    [WWI, 0.135, 0, 0, 'rub'], [BORE, DISH_Z, 0, 0, 'rim'], [HUBR, DISH_Z, 0, 0, null],
  ];
  const profile = PROF.map((r) => [r[0], r[1] * W + ZOFF]);
  const zones = PROF.slice(0, -1).map((r) => r[4] ?? 'rim');
  const mod = `(x,y,z,i,k) => { const R=${JSON.stringify(PROF)}, N=${N}; const row=R[k]; return row[2] ? (Math.min(i,N-1-i)%2===row[3] ? row[0]-row[2] : row[0]) : row[0]; }`;

  const shell = g.revolve({ profile, seg: N, axis: 'z', phase: -PI / 2 + PI / N, zone: zones, mod });

  const backCap = g.fanRing({ r: BKR, y: BACK_Z * W + ZOFF, n: N, phase: -PI / 2 + PI / N, apex: [0, 0, BACK_Z * W + ZOFF], axis: 'z', zone: 'rim', flip: true });
  const dishCap = g.fanRing({ r: HUBR, y: DISH_Z * W + ZOFF, n: N, phase: -PI / 2 + PI / N, apex: [0, 0, DISH_Z * W + ZOFF], axis: 'z', zone: 'rim' });

  const CAP = [[HUBR, DISH_Z], [0.118 * RS, 0.098], [0.066 * RS, 0.128]];
  const dome = g.revolve({ profile: CAP.map(([r, z]) => [r, z * W + ZOFF]), seg: N, axis: 'z', phase: -PI / 2 + PI / N, zone: 'chrome' });
  const domeCap = g.fanRing({ r: 0.066 * RS, y: 0.128 * W + ZOFF, n: N, phase: -PI / 2 + PI / N, apex: [0, 0, APEX_Z * W + ZOFF], axis: 'z', zone: 'chrome' });

  const lug = g.cone({ n: 6, r: 0.023 * RS, h: 0.018 * W, x: LUG_R, y: 0, z: DISH_Z * W + ZOFF, axis: 'z', zone: 'chrome' });
  const lugs = g.arrayPolar({ geom: lug, count: 5, axis: 'z', start: PI / 2 });

  const geo = g.join([shell, backCap, dishCap, dome, domeCap, lugs]);
  const body = g.center({ geom: geo, y: false });
  return g.mesh(body, { zones: { rub: P.rubber ?? '#2a2d35', ww: P.sidewall ?? '#f1f2ef', rim: P.rim ?? '#999ca3', chrome: P.chrome ?? '#c2c7cd' } });
}
