// Port: rough-sapphire (48 tris) — loft along X with a hexagonal section and tip fans.
import { graph } from '../dsl.mjs';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const prng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export default function build(g, P = {}) {
  const length = g.input('length', 'float', 1.0, { min: 0.5, max: 1.8 });
  const barrel = g.input('barrel', 'float', 0.0, { min: 0, max: 1 });
  const ends = g.input('ends', 'enum', 'pointed', { options: ['pointed', 'truncated', 'broken'] });
  const chamfer = g.input('chamfer', 'float', 0.3, { min: 0, max: 1 });
  const irregularity = g.input('irregularity', 'float', 0.0, { min: 0, max: 1 });
  const gem = g.input('gem', 'color', '#536aaa');

  const R = 0.034, Hh = 0.023, PT = 0.033;
  const PL = 0.074 * clamp(P.length ?? 1.0, 0.5, 1.8);
  const irr = clamp(P.irregularity ?? 0, 0, 1);
  const bar = clamp(P.barrel ?? 0, 0, 1);
  const ch = clamp(P.chamfer ?? 0.3, 0, 1);
  const rand = prng(20261103);
  const j = () => rand() * 2 - 1;

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

  let rings = st.map(([x, s, dz]) => ring2d.map(([z, y]) => [x, y * s, z * s + dz]));

  const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);

  if (P.ends === 'broken') {
    const r0 = rings[0], r1 = rings[1];
    const yc = centroid(r0)[1];
    const xc = r0[0][0] + 0.3 * (r1[0][0] - r0[0][0]);
    const a = 0.45, b = 0.3;
    rings[0] = r0.map((p0, i) => {
      const p1 = r1[i], d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const num = xc + a * (p0[1] - yc) + b * p0[2] - p0[0];
      const den = d[0] - a * d[1] - b * d[2];
      const t = clamp(num / den, 0.04, 0.9);
      return [p0[0] + t * d[0], p0[1] + t * d[1], p0[2] + t * d[2]];
    });
  }

  const tip = (ring, dir) => {
    const c = centroid(ring);
    return [c[0] + dir * PT * (1 + 0.3 * j() * irr), c[1] + j() * 0.25 * Hh * irr, c[2] + j() * 0.25 * R * irr];
  };
  const endsMode = P.ends ?? 'pointed';
  const endGeo = (ring, dir) => {
    const apex = tip(ring, dir);
    if (endsMode === 'truncated') {
      const cap = ring.map((p) => [p[0] + 0.55 * (apex[0] - p[0]), p[1] + 0.55 * (apex[1] - p[1]), p[2] + 0.55 * (apex[2] - p[2])]);
      const band = g.loft({ rings: [ring, cap], zones: { band: 'gem' } });
      const fan = g.loft({ rings: [cap], capTop: centroid(cap), zones: { capTop: 'gem' } });
      return g.join([band, fan]);
    }
    return g.loft({ rings: [ring], capTop: apex, zones: { capTop: 'gem' } });
  };

  const pieces = [];
  if (endsMode === 'pointed') {
    const ct = tip(rings[rings.length - 1], 1), cb = tip(rings[0], -1);
    const prof = g.profile({ pts: ring2d });
    const body = g.loftProfile({ profile: prof, stations: st, capTop: ct, capBottom: cb, zones: { band: 'gem', capTop: 'gem', capBottom: 'gem' } });
    pieces.push(body);
  } else if (rings.length > 1) pieces.push(g.loft({ rings, zones: { band: 'gem' } }));

  if (endsMode === 'pointed') {
    // caps are part of loftProfile
  } else if (endsMode === 'broken') {
    const c = centroid(rings[0]);
    const dent = [c[0] + 0.3 * PT, c[1] + 0.2 * Hh, c[2] - 0.2 * R];
    pieces.push(g.loft({ rings: [rings[0]], capBottom: dent, zones: { capBottom: 'gem' } }));
  } else if (endsMode !== 'pointed') {
    pieces.push(endGeo(rings[0], -1));
  }
  if (endsMode !== 'pointed') pieces.push(endGeo(rings[rings.length - 1], 1));

  const body = g.center({ geom: g.join(pieces) });
  return g.mesh(body, { zones: { gem }, materials: { gem: { roughness: 0.15, metalness: 0.1 } } });
}
