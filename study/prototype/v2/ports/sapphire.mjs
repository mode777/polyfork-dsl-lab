// Rough sapphire — exact geometric port. A code node computes the reference's
// layout data (profile, stations, rings, tips) once, and the graph builds the
// surfaces with loft/switch/center/mesh nodes. All reference params are wired.
import { graph, expr } from '../dsl.mjs';

const GEM = {
  'royal-blue': '#536aaa',
  'ruby-red': '#a2222d',
  'golden-yellow': '#dbbf57',
  'green': '#50a14f',
  'white': '#dddbdb',
};

const DATA_SRC = `
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const R = 0.034, Hh = 0.023, PT = 0.033;
const PL = 0.074 * clamp(inputs.length, 0.5, 1.8);
const irr = clamp(inputs.irregularity, 0, 1);
const bar = clamp(inputs.barrel, 0, 1);
const ch = clamp(inputs.chamfer, 0, 1);
let seed = 20261103;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const j = () => rnd() * 2 - 1;

const sec = [[R, Hh], [0.5 * R, 2 * Hh], [-0.5 * R, 2 * Hh], [-R, Hh], [-0.5 * R, 0], [0.5 * R, 0]];
const jit = [[0.12 * R, 0.18 * Hh], [0.18 * R, 0.12 * Hh], [0.18 * R, 0.12 * Hh], [0.12 * R, 0.18 * Hh], [0.16 * R, 0], [0.16 * R, 0]];
for (let i = 0; i < 6; i++) { sec[i][0] += j() * jit[i][0] * irr; sec[i][1] += j() * jit[i][1] * irr; }

let ring2d = sec;
if (ch > 0.001) {
  const c = ch * 0.2 * R;
  ring2d = [];
  for (let i = 0; i < 6; i++) {
    const a = sec[(i + 5) % 6], b = sec[i], d = sec[(i + 1) % 6];
    const ta = [a[0] - b[0], a[1] - b[1]], td = [d[0] - b[0], d[1] - b[1]];
    const la = Math.hypot(...ta), ld = Math.hypot(...td);
    ring2d.push([b[0] + (ta[0] / la) * c, b[1] + (ta[1] / la) * c]);
    ring2d.push([b[0] + (td[0] / ld) * c, b[1] + (td[1] / ld) * c]);
  }
}

const st = (bar > 0.001 || irr > 0.001)
  ? [[-PL / 2, 1, 0], [0, 1 + 0.18 * bar, 0], [PL / 2, 1, 0]]
  : [[-PL / 2, 1, 0], [PL / 2, 1, 0]];
for (const s of st) { s[1] *= 1 + j() * 0.1 * irr; s[2] += j() * 0.1 * R * irr; }

const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
const rings = st.map(([x, s, dz]) => ring2d.map(([z, y]) => [x, y * s, z * s + dz]));
const ringsBroken = rings.map((r) => r.map((p) => [p[0], p[1], p[2]]));

if (inputs.ends === 'broken') {
  const r0 = rings[0], r1 = rings[1];
  const yc = centroid(r0)[1];
  const xc = r0[0][0] + 0.3 * (r1[0][0] - r0[0][0]);
  const a = 0.45, b = 0.3;
  ringsBroken[0] = r0.map((p0, i) => {
    const p1 = r1[i], d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const num = xc + a * (p0[1] - yc) + b * p0[2] - p0[0];
    const den = d[0] - a * d[1] - b * d[2];
    const t = clamp(num / den, 0.04, 0.9);
    return [p0[0] + t * d[0], p0[1] + t * d[1], p0[2] + t * d[2]];
  });
}

const state = seed;
const jFrom = (s0) => { let q = s0; return () => { q = (q * 16807) % 2147483647; return (q / 2147483647) * 2 - 1; }; };
const tip = (ring, dir, jj) => {
  const c = centroid(ring);
  return [c[0] + dir * PT * (1 + 0.3 * jj() * irr), c[1] + jj() * 0.25 * Hh * irr, c[2] + jj() * 0.25 * R * irr];
};

const jp = jFrom(state);
const pointedTop = tip(rings[rings.length - 1], 1, jp);
const pointedBottom = tip(rings[0], -1, jp);

const jt = jFrom(state);
const truncTopApex = tip(rings[rings.length - 1], 1, jt);
const truncBottomApex = tip(rings[0], -1, jt);
const capAt = (ring, apex) => ring.map((p) => [p[0] + 0.55 * (apex[0] - p[0]), p[1] + 0.55 * (apex[1] - p[1]), p[2] + 0.55 * (apex[2] - p[2])]);
const truncTopRing = rings[rings.length - 1], truncBottomRing = rings[0];
const truncTopCap = capAt(truncTopRing, truncTopApex), truncBottomCap = capAt(truncBottomRing, truncBottomApex);
const truncTopFan = centroid(truncTopCap), truncBottomFan = centroid(truncBottomCap);

const jb = jFrom(state);
const brokenTopApex = tip(rings[rings.length - 1], 1, jb);
// The reference mirrors the whole broken crystal in X after assembling it.
for (const r of ringsBroken) for (const p of r) p[0] *= -1;
brokenTopApex[0] *= -1;
const brokenBottomRing = ringsBroken[0];
const bc = centroid(brokenBottomRing);
const brokenDent = [bc[0] - 0.3 * PT, bc[1] + 0.2 * Hh, bc[2] - 0.2 * R];

return {
  profile: ring2d,
  stations: st,
  rings,
  ringsBroken,
  pointedTop, pointedBottom,
  truncTopRing, truncBottomRing, truncTopCap, truncBottomCap, truncTopFan, truncBottomFan,
  brokenTopRing: ringsBroken[ringsBroken.length - 1], brokenTopApex, brokenBottomRing, brokenDent,
};
`;

export default function build(g, P = {}) {
  const colorway = g.input('colorway', 'enum', 'royal-blue', { options: Object.keys(GEM), label: 'Colorway' });
  const gem = g.input('gem', 'color', '', { label: 'Gem' });
  const length = g.input('length', 'float', 1.0, { min: 0.5, max: 1.8, step: 0.05, label: 'Prism length' });
  const barrel = g.input('barrel', 'float', 0.0, { min: 0, max: 1, step: 0.05, label: 'Barrel bulge' });
  const ends = g.input('ends', 'enum', 'pointed', { options: ['pointed', 'truncated', 'broken'], label: 'Terminations' });
  const chamfer = g.input('chamfer', 'float', 0.3, { min: 0, max: 1, step: 0.05, label: 'Edge bevel' });
  const irregularity = g.input('irregularity', 'float', 0.0, { min: 0, max: 1, step: 0.05, label: 'Natural irregularity' });

  const data = g.script({ inputs: { length, barrel, ends, chamfer, irregularity }, src: DATA_SRC });
  const pick = (key) => g.get({ object: data, key });
  const zones = { band: 'gem', capTop: 'gem', capBottom: 'gem' };

  const pointed = g.loftProfile({
    profile: pick('profile'), stations: pick('stations'),
    capTop: pick('pointedTop'), capBottom: pick('pointedBottom'),
    zones, orient: true,
  });

  const truncated = g.join([
    g.loft({ rings: pick('rings'), zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [pick('truncTopRing'), pick('truncTopCap')], zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [pick('truncTopCap')], capTop: pick('truncTopFan'), zones: { capTop: 'gem' }, orient: true }),
    g.loft({ rings: [pick('truncBottomRing'), pick('truncBottomCap')], zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [pick('truncBottomCap')], capBottom: pick('truncBottomFan'), zones: { capBottom: 'gem' }, orient: true }),
  ]);

  // The reference's dished fracture cap is wound opposite to the convex caps;
  // reverse just that fan so the broken end matches its face normals.
  const brokenBottom = g.reverse({
    geom: g.loft({ rings: [pick('brokenBottomRing')], capBottom: pick('brokenDent'), zones: { capBottom: 'gem' }, orient: true }),
  });
  const broken = g.join([
    g.loft({ rings: pick('ringsBroken'), zones: { band: 'gem' }, orient: true }),
    g.loft({ rings: [pick('brokenTopRing')], capTop: pick('brokenTopApex'), zones: { capTop: 'gem' }, orient: true }),
    brokenBottom,
  ]);

  const body = g.switch({ on: ends, cases: { pointed, truncated, broken } });
  const gemColor = expr(`s => s.gem || (${JSON.stringify(GEM)})[s.colorway] || '#536aaa'`);
  return g.mesh(g.center({ geom: body }), {
    zones: { gem: gemColor },
    materials: { gem: { roughness: 0.22, metalness: 0.2 } },
  });
}
