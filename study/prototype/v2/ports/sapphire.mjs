// Rough sapphire — exact geometric port. Named dimensions, a jittered section,
// a bevel, mapped stations/rings, tip points, and a switch over terminations.
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

  const dims = g.let({
    in: { length, barrel, irregularity, chamfer },
    binds: {
      pl: '0.074 * clamp(length, 0.5, 1.8)',
      irr: 'clamp(irregularity, 0, 1)',
      bar: 'clamp(barrel, 0, 1)',
      ch: 'clamp(chamfer, 0, 1)',
      n: '(bar > 0.001 || irr > 0.001) ? 3 : 2',
      draws: '12 + 2 * n',
    },
  });
  const pl = at(dims, 'pl'), irr = at(dims, 'irr'), bar = at(dims, 'bar'), ch = at(dims, 'ch');

  const rng = g.random({ seed: 20261103, count: at(dims, 'draws') });

  // 1. Jittered hexagonal section (2 draws per point, in order).
  const baseSection = g.value({ expr: '[[0.034, 0.023], [0.017, 0.046], [-0.017, 0.046], [-0.034, 0.023], [-0.017, 0], [0.017, 0]]' });
  const sectionAmps = g.value({ expr: '[[0.00408, 0.00414], [0.00612, 0.00276], [0.00612, 0.00276], [0.00408, 0.00414], [0.00544, 0], [0.00544, 0]]' });
  const sec = g.jitter({ points: baseSection, amps: sectionAmps, rng, offset: 0, dims: 2, amount: irr });
  const beveled = g.bevelProfile({ profile: sec, dist: expr('clamp(s.chamfer,0,1) * 0.2 * 0.034') });
  const profile = g.cond({ cond: expr('clamp(s.chamfer,0,1) > 0.001'), then: beveled, else: sec });

  // 2. Stations: 2 or 3 records, jittered from the same stream after the section.
  g.define('gem-station', (h) => {
    const item = h.input('item', 'any', null);
    const rng = h.input('rng', 'any', null);
    const n = h.input('n', 'any', null);
    const pl = h.input('pl', 'any', null);
    const irr = h.input('irr', 'any', null);
    const bar = h.input('bar', 'any', null);
    const d = h.draws({ rng, item, n: 2, offset: 12 });
    const rec = h.let({
      in: { item, n, pl, irr, bar, d },
      binds: {
        x: '(n === 3 && item === 1) ? 0 : (item === 0 ? -pl/2 : pl/2)',
        base: '(n === 3 && item === 1) ? 1 + 0.18 * bar : 1',
        s: 'base * (1 + (d[0]*2 - 1) * 0.1 * irr)',
        dz: '(d[1]*2 - 1) * 0.1 * 0.034 * irr',
      },
    });
    h.out('out', rec);
  });
  const stations = g.map({
    list: g.range({ from: 0, to: at(dims, 'n') }), graph: 'gem-station',
    rng, n: at(dims, 'n'), pl, irr, bar,
  });

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
    h.out('out', h.map({ list: prof, graph: 'gem-ring-point', st: item }));
  });
  const rings = g.map({ list: stations, graph: 'gem-ring', profile });

  const firstRing = g.first({ list: rings });
  const lastRing = g.last({ list: rings });

  // 4. Tips. Each mode restarts the stream at the post-section state.
  const tipRng = g.random({ seed: at(rng, 'state'), count: 6 });
  const tipTop = g.value({
    args: { ring: lastRing, t: at(tipRng, 'values') },
    expr: `let c = centroid(ring), irr = clamp(s.irregularity, 0, 1) in
      [c[0] + 0.033 * (1 + 0.3 * (t[0]*2 - 1) * irr),
       c[1] + (t[1]*2 - 1) * 0.25 * 0.023 * irr,
       c[2] + (t[2]*2 - 1) * 0.25 * 0.034 * irr]`,
  });
  const tipBottom = g.value({
    args: { ring: firstRing, t: at(tipRng, 'values') },
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
    h.out('out', h.lerpPoint({ a: item, b: apex, t: 0.55 }));
  });
  const topCap = g.map({ list: lastRing, graph: 'gem-cap-ring', apex: tipTop });
  const bottomCap = g.map({ list: firstRing, graph: 'gem-cap-ring', apex: tipBottom });
  const topFan = g.centroid({ points: topCap });
  const bottomFan = g.centroid({ points: bottomCap });

  const truncated = g.join([
    g.loft({ rings, zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [lastRing, topCap], zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [topCap], capTop: topFan, zones: { capTop: 'gem' }, orient: true }),
    g.loft({ rings: [firstRing, bottomCap], zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [bottomCap], capBottom: bottomFan, zones: { capBottom: 'gem' }, orient: true }),
  ]);

  // 6. Broken: plane-cut the first ring, mirror the whole crystal.
  const secondRing = g.value({ args: { rings }, expr: 'rings[1]' });
  const yc = g.value({ args: { ring: firstRing }, expr: 'centroid(ring)[1]' });
  const xc = g.value({ args: { r0: firstRing, r1: secondRing }, expr: 'r0[0][0] + 0.3*(r1[0][0] - r0[0][0])' });
  const cut = g.planeCut({ r0: firstRing, r1: secondRing, a: 0.45, b: 0.3, xc, yc });
  g.define('gem-mirror-point', (h) => {
    const item = h.input('item', 'any', null);
    h.out('out', h.mirrorPoint({ point: item, axis: 'x' }));
  });
  g.define('gem-mirror-ring', (h) => {
    const item = h.input('item', 'any', null);
    h.out('out', h.map({ list: item, graph: 'gem-mirror-point' }));
  });
  const cutMirrored = g.map({ list: cut, graph: 'gem-mirror-point' });
  const ringsMirrored = g.map({ list: rings, graph: 'gem-mirror-ring' });
  const ringsBroken = g.concat({ lists: [[cutMirrored], g.slice({ list: ringsMirrored, from: 1 })] });
  const brokenTopRing = g.last({ list: ringsBroken });
  const brokenTopApex = g.mirrorPoint({ point: tipTop, axis: 'x' });
  const brokenDent = g.value({
    args: { ring: cutMirrored },
    expr: 'let c = centroid(ring) in [c[0] - 0.3*0.033, c[1] + 0.2*0.023, c[2] - 0.2*0.034]',
  });
  const broken = g.join([
    g.loft({ rings: ringsBroken, zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [brokenTopRing], capTop: brokenTopApex, zones: { capTop: 'gem' }, orient: true }),
    g.reverse({
      geom: g.loft({ rings: [cutMirrored], capBottom: brokenDent, zones: { capBottom: 'gem' }, orient: true }),
    }),
  ]);

  const body = g.switch({ on: ends, cases: { pointed, truncated, broken } });
  const pal = g.preset({ choice: colorway, presets: GEM, fallback: 'royal-blue' });
  return g.mesh(g.center({ geom: body }), {
    zones: { gem: g.coalesce({ value: gem, fallback: pal }) },
    materials: { gem: { roughness: 0.22, metalness: 0.2 } },
  });
}
