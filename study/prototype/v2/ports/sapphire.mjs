// Rough sapphire — exact geometric port as a pure node graph. The layout is a
// random value stream, mapped section points, a bevel, mapped stations/rings,
// tip points, and a switch over the three terminations.
import { graph, expr, field } from '../dsl.mjs';

const GEM = {
  'royal-blue': '#536aaa',
  'ruby-red': '#a2222d',
  'golden-yellow': '#dbbf57',
  green: '#50a14f',
  white: '#dddbdb',
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'royal-blue', { options: Object.keys(GEM), label: 'Colorway' });
  const gem = g.input('gem', 'color', '', { label: 'Gem' });
  const length = g.input('length', 'float', 1.0, { min: 0.5, max: 1.8, step: 0.05, label: 'Prism length' });
  const barrel = g.input('barrel', 'float', 0.0, { min: 0, max: 1, step: 0.05, label: 'Barrel bulge' });
  const ends = g.input('ends', 'enum', 'pointed', { options: ['pointed', 'truncated', 'broken'], label: 'Terminations' });
  const chamfer = g.input('chamfer', 'float', 0.3, { min: 0, max: 1, step: 0.05, label: 'Edge bevel' });
  const irregularity = g.input('irregularity', 'float', 0.0, { min: 0, max: 1, step: 0.05, label: 'Natural irregularity' });

  const nStations = g.value({ expr: '(clamp(s.barrel,0,1) > 0.001 || clamp(s.irregularity,0,1) > 0.001) ? 3 : 2' });
  const nDraws = g.value({ args: { nStations }, expr: '12 + 2 * nStations' });
  const rng = g.random({ seed: 20261103, count: nDraws });
  const v = at(rng, 'values');

  // 1. Jittered hexagonal section (2 draws per point, in order).
  g.define('gem-section', (h) => {
    const item = h.input('item', 'any', null);
    h.input('v', 'any', null);
    const p = h.value({
      expr: `let base = [[0.034, 0.023], [0.017, 0.046], [-0.017, 0.046], [-0.034, 0.023], [-0.017, 0], [0.017, 0]],
        jit = [[0.00408, 0.00414], [0.00612, 0.00276], [0.00612, 0.00276], [0.00408, 0.00414], [0.00544, 0], [0.00544, 0]],
        irr = clamp(s.irregularity, 0, 1)
      in [base[item][0] + (v[2*item]*2 - 1) * jit[item][0] * irr,
          base[item][1] + (v[2*item+1]*2 - 1) * jit[item][1] * irr]`,
    });
    h.out('out', p);
  });
  const six = g.range({ from: 0, to: 6 });
  const sec = g.map({ list: six, graph: 'gem-section', v });

  const beveled = g.bevelProfile({ profile: sec, dist: expr('clamp(s.chamfer,0,1) * 0.2 * 0.034') });
  const profile = g.cond({ cond: expr('clamp(s.chamfer,0,1) > 0.001'), then: beveled, else: sec });

  // 2. Stations (2 or 3) with the same stream, continuing after the section.
  g.define('gem-station', (h) => {
    const item = h.input('item', 'any', null);
    h.input('v', 'any', null);
    const n = h.input('n', 'any', null);
    const s = h.value({
      expr: `let irr = clamp(s.irregularity, 0, 1), bar = clamp(s.barrel, 0, 1), pl = 0.074 * clamp(s.length, 0.5, 1.8),
        x = (n === 3 && item === 1) ? 0 : (item === 0 ? -pl/2 : pl/2),
        base = (n === 3 && item === 1) ? 1 + 0.18 * bar : 1
      in { x, s: base * (1 + (v[12+2*item]*2 - 1) * 0.1 * irr), dz: (v[13+2*item]*2 - 1) * 0.1 * 0.034 * irr }`,
    });
    h.out('out', s);
  });
  const stationIdx = g.range({ from: 0, to: nStations });
  const stations = g.map({ list: stationIdx, graph: 'gem-station', v, n: nStations });

  // 3. Rings: map each station over the profile.
  g.define('gem-ring-point', (h) => {
    const item = h.input('item', 'any', null);
    const st = h.input('st', 'any', null);
    const p = h.value({ expr: '[st.x, item[1] * st.s, item[0] * st.s + st.dz]' });
    h.out('out', p);
  });
  g.define('gem-ring', (h) => {
    const item = h.input('item', 'any', null);
    const prof = h.input('profile', 'any', null);
    const r = h.map({ list: prof, graph: 'gem-ring-point', st: item });
    h.out('out', r);
  });
  const rings = g.map({ list: stations, graph: 'gem-ring', profile });

  const firstRing = g.value({ args: { rings }, expr: 'rings[0]' });
  const lastRing = g.value({ args: { rings }, expr: 'rings[rings.length - 1]' });

  // 4. Tips. Each mode restarts the stream at the post-section state.
  const tipRng = g.random({ seed: at(rng, 'state'), count: 6 });
  const t = at(tipRng, 'values');
  const tipTop = g.value({
    args: { ring: lastRing, t },
    expr: `let c = centroid(ring), irr = clamp(s.irregularity, 0, 1) in
      [c[0] + 0.033 * (1 + 0.3 * (t[0]*2 - 1) * irr),
       c[1] + (t[1]*2 - 1) * 0.25 * 0.023 * irr,
       c[2] + (t[2]*2 - 1) * 0.25 * 0.034 * irr]`,
  });
  const tipBottom = g.value({
    args: { ring: firstRing, t },
    expr: `let c = centroid(ring), irr = clamp(s.irregularity, 0, 1) in
      [c[0] - 0.033 * (1 + 0.3 * (t[3]*2 - 1) * irr),
       c[1] + (t[4]*2 - 1) * 0.25 * 0.023 * irr,
       c[2] + (t[5]*2 - 1) * 0.25 * 0.034 * irr]`,
  });

  const pointed = g.loftProfile({
    profile, stations, capTop: tipTop, capBottom: tipBottom,
    zones: { band: 'gem', capTop: 'gem', capBottom: 'gem' }, orient: true,
  });

  // 5. Truncated: a 55% cap ring plus a fan on each end.
  g.define('gem-cap-ring', (h) => {
    const item = h.input('item', 'any', null);
    const apex = h.input('apex', 'any', null);
    const p = h.value({ expr: '[item[0] + 0.55*(apex[0]-item[0]), item[1] + 0.55*(apex[1]-item[1]), item[2] + 0.55*(apex[2]-item[2])]' });
    h.out('out', p);
  });
  g.define('gem-mirror-point', (h) => {
    const item = h.input('item', 'any', null);
    const p = h.value({ expr: '[-item[0], item[1], item[2]]' });
    h.out('out', p);
  });
  g.define('gem-mirror-ring', (h) => {
    const item = h.input('item', 'any', null);
    const r = h.map({ list: item, graph: 'gem-mirror-point' });
    h.out('out', r);
  });

  const topCap = g.map({ list: lastRing, graph: 'gem-cap-ring', apex: tipTop });
  const bottomCap = g.map({ list: firstRing, graph: 'gem-cap-ring', apex: tipBottom });
  const topFan = g.value({ args: { ring: topCap }, expr: 'centroid(ring)' });
  const bottomFan = g.value({ args: { ring: bottomCap }, expr: 'centroid(ring)' });

  const truncated = g.join([
    g.loft({ rings, zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: g.list([lastRing, topCap]), zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: g.list([topCap]), capTop: topFan, zones: { capTop: 'gem' }, orient: true }),
    g.loft({ rings: g.list([firstRing, bottomCap]), zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: g.list([bottomCap]), capBottom: bottomFan, zones: { capBottom: 'gem' }, orient: true }),
  ]);

  // 6. Broken: plane-cut the first ring, mirror the whole crystal.
  g.define('gem-cut-point', (h) => {
    const item = h.input('item', 'any', null);
    const r0 = h.input('r0', 'any', null);
    const r1 = h.input('r1', 'any', null);
    const p = h.value({
      expr: `let p0 = r0[item], p1 = r1[item], d = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]],
        yc = centroid(r0)[1], xc = r0[0][0] + 0.3*(r1[0][0]-r0[0][0]),
        num = xc + 0.45*(p0[1]-yc) + 0.3*p0[2] - p0[0],
        den = d[0] - 0.45*d[1] - 0.3*d[2],
        tt = clamp(num/den, 0.04, 0.9)
      in [p0[0] + tt*d[0], p0[1] + tt*d[1], p0[2] + tt*d[2]]`,
    });
    h.out('out', p);
  });
  const ringLen = g.value({ args: { ring: firstRing }, expr: 'ring.length' });
  const cutIdx = g.range({ from: 0, to: ringLen });
  const cut = g.map({ list: cutIdx, graph: 'gem-cut-point', r0: firstRing, r1: g.value({ args: { rings }, expr: 'rings[1]' }) });
  const cutMirrored = g.map({ list: cut, graph: 'gem-mirror-point' });
  const ringsMirrored = g.map({ list: rings, graph: 'gem-mirror-ring' });
  const ringsBroken = g.value({ args: { cut: cutMirrored, rings: ringsMirrored }, expr: '[cut].concat(rings.slice(1))' });
  const brokenTopRing = g.value({ args: { rings: ringsBroken }, expr: 'rings[rings.length - 1]' });
  const brokenTopApex = g.value({ args: { apex: tipTop }, expr: '[-apex[0], apex[1], apex[2]]' });
  const brokenDent = g.value({
    args: { ring: cutMirrored },
    expr: 'let c = centroid(ring) in [c[0] - 0.3*0.033, c[1] + 0.2*0.023, c[2] - 0.2*0.034]',
  });
  const brokenBottom = g.reverse({
    geom: g.loft({ rings: g.list([cutMirrored]), capBottom: brokenDent, zones: { capBottom: 'gem' }, orient: true }),
  });
  const broken = g.join([
    g.loft({ rings: ringsBroken, zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: g.list([brokenTopRing]), capTop: brokenTopApex, zones: { capTop: 'gem' }, orient: true }),
    brokenBottom,
  ]);

  const body = g.switch({ on: ends, cases: { pointed, truncated, broken } });
  const gemColor = expr(`s.gem || (${JSON.stringify(GEM)})[s.colorway] || '#536aaa'`);
  return g.mesh(g.center({ geom: body }), {
    zones: { gem: gemColor },
    materials: { gem: { roughness: 0.22, metalness: 0.2 } },
  });
}
