// Scorched grass tuft — three-sided lofted blades with per-band scorch/char
// zones, plus a small pebble ring. The blade math is the reference sweep; the
// graph uses one generic loft per blade and poly for the root triangle.
import { graph } from '../dsl.mjs';
import { at, TAU, prng, add, sub, mul, dot, cross, norm, clamp } from './_kit.mjs';

const PALETTE = {
  'alpine-green': { blade: '#34512d', bladeLight: '#618843', scorch: '#c29c5f', char: '#2f2d35', ember: '#e72a29', pebble: '#8a5b4f' },
  'late-summer': { blade: '#4c6137', bladeLight: '#c29c5f', scorch: '#9c6e5c', char: '#26201d', ember: '#e72a29', pebble: '#6d5130' },
  'ashen-crag': { blade: '#34512d', bladeLight: '#4c6137', scorch: '#ae7b67', char: '#3b3b45', ember: '#e72a29', pebble: '#524b4e' },
};

const KNOTS = [0, 0.4, 0.68, 1];
const KINK = 0.68, EMBER_U = 0.9, CLUMPS = 4, CLUMP_R = 0.036;
const clumpCentre = (k) => {
  const a = Math.PI / 4 + k * Math.PI / 2;
  return [Math.cos(a) * CLUMP_R, 0, Math.sin(a) * CLUMP_R];
};

function traits(i, P) {
  const r = prng(9001 + i * 7919); r(); r();
  const hook = i < 2;
  const az = hook ? (i === 0 ? -0.4 : Math.PI - 0.4) : i * 2.39996323 + (r() - 0.5) * 0.5;
  const ox = Math.cos(az), oz = Math.sin(az), side = Math.abs(ox);
  const role = r();
  const inner = role < 0.25, outer = role > 0.7, sp = P.spread;
  let lean, curve, len;
  if (inner) { lean = 0.04 + r() * 0.16; curve = 0.05 + r() * 0.12; len = 0.88 + r() * 0.12; }
  else if (!outer) { lean = 0.25 + r() * 0.2; curve = 0.1 + r() * 0.2; len = 0.7 + r() * 0.18; }
  else { lean = 0.5 + r() * 0.2; curve = 0.15 + r() * 0.25; len = 0.5 + r() * 0.15; }
  const kinkRoll = r();
  const kinked = hook ? sp >= 0.15 : !inner && side > 0.55 && kinkRoll < sp * (outer ? 0.9 : 0.35) * side * 1.2;
  let beta = 0;
  if (kinked) { lean = 0.5 + r() * 0.1 + 0.15 * sp; curve = 0.04; len = (hook ? 0.86 : 0.74) + r() * 0.1; beta = 1.65 + r() * 0.3; }
  else lean *= (0.6 + 0.8 * sp) * (1 + 0.35 * side - 0.12 * (1 - side));
  const w0 = 0.026 + r() * 0.008;
  const twist = (r() - 0.5) * 0.6;
  const tone = r() < 0.45 ? 'blade' : 'bladeLight';
  const th = r() * 0.6;
  const emberRoll = r();
  const singe = r();
  const rootOut = 0.004 + r() * 0.024, rootSide = (r() - 0.5) * 0.03;
  return { az, ox, oz, lean, curve, len, kinked, beta, w0, twist, tone, th, emberRoll, singe, rootOut, rootSide };
}

function clumpOf(az) {
  const a = ((az - Math.PI / 4) % TAU + TAU) % TAU;
  return Math.round(a / (Math.PI / 2)) % CLUMPS;
}

function centreline(t, L, lean, curve, beta) {
  const o = [t.ox, 0, t.oz];
  const pts = [[0, 0, 0]], dirs = [];
  for (let j = 0; j < KNOTS.length - 1; j++) {
    const u = (KNOTS[j] + KNOTS[j + 1]) / 2;
    let phi = lean + curve * u * u * 1.6;
    if (beta && KNOTS[j] >= KINK) phi += beta;
    const d = add(mul(o, Math.sin(phi)), [0, Math.cos(phi), 0]);
    dirs.push(d);
    pts.push(add(pts[j], mul(d, L * (KNOTS[j + 1] - KNOTS[j]))));
  }
  return { pts, dirs, o };
}

function bladeRows(t, P, root) {
  const H = P.height;
  const f = clamp(P.burn * 1.6 - t.th, 0, 1);
  const fs = clamp(P.burn * 1.6 - t.th + 0.3 * Math.min(1, P.burn * 5), 0, 1);
  const L = H * t.len * (1 - 0.26 * f * (0.6 + 0.4 * t.singe));
  let beta = t.kinked ? t.beta + 0.25 * f : 0;
  let lean = t.lean + 0.22 * f;
  let curve = t.curve + 0.35 * f;
  let cl = centreline(t, L, lean, curve, beta);
  const low = () => Math.min(...cl.pts.slice(1).map((p) => p[1]));
  for (let k = 0; k < 30 && low() < (beta > 0 ? 0.04 : 0.025); k++) {
    if (beta > 0) beta = Math.max(0, beta - 0.12);
    else { curve = Math.max(0, curve - 0.08); lean = Math.max(0, lean - 0.04); }
    cl = centreline(t, L, lean, curve, beta);
  }
  const { pts, dirs, o } = cl;
  const s0 = [t.oz, 0, -t.ox];
  const sT = add(mul(s0, Math.cos(t.twist)), mul(o, Math.sin(t.twist)));
  const ember = f > 0.22 && t.emberRoll < 0.25 + 0.55 * P.burn;
  const stations = ember ? [0, 0.4, KINK, EMBER_U, 1] : [0, 0.4, KINK, 1];
  const wK = t.w0 * (1 - 0.15 * KINK);
  const rows = [];
  for (const u of stations) {
    const p = add((u <= KINK ? pts[KNOTS.indexOf(u)] : add(pts[2], mul(dirs[2], L * (u - KINK)))), root);
    if (u === 1) { rows.push({ u, tip: p }); break; }
    const d = norm(u === 0 ? dirs[0] : u === 0.4 ? add(dirs[0], dirs[1]) : u === KINK ? add(dirs[1], dirs[2]) : dirs[2]);
    const s = norm(sub(sT, mul(d, dot(sT, d))));
    const n = norm(cross(s, d));
    const w = u <= KINK ? t.w0 * (1 - 0.15 * u) : wK * (1 - u) / (1 - KINK);
    const h = w * 0.38;
    const row = { u, L: add(p, mul(s, -w / 2)), R: add(p, mul(s, w / 2)), C: add(p, mul(n, h)), P: p, n, h };
    if (u === 0) for (const q of [row.L, row.R, row.C]) q[1] = 0;
    rows.push(row);
  }
  const zone = (um) => {
    if (f > 0 && um > 1 - f) return 'char';
    if (fs > 0 && um > 1 - fs) return 'scorch';
    return t.tone;
  };
  return { rows, zone, ember };
}

function pebble(g, zone, cx, cz, r, h, rnd) {
  const n = 5, rot = rnd() * TAU, base = [], mid = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU + (rnd() - 0.5) * 0.5;
    const rr = r * (0.85 + rnd() * 0.3);
    base.push([cx + Math.cos(a) * rr, 0, cz + Math.sin(a) * rr]);
    const b = a + Math.PI / n, rm = r * (0.62 + rnd() * 0.18);
    mid.push([cx + Math.cos(b) * rm, h * (0.5 + rnd() * 0.15), cz + Math.sin(b) * rm]);
  }
  const top = [cx + (rnd() - 0.5) * r * 0.4, h, cz + (rnd() - 0.5) * r * 0.4];
  const inside = [cx, h * 0.3, cz];
  const body = g.loft({
    rings: [base, mid], capTop: top, capTopFlip: true, orient: true, orientCenter: inside,
    zones: { band: zone, capTop: zone },
  });
  const foot = g.poly({ pts: base, zone, inside: [cx, 0.01, cz] });
  return g.join([body, foot]);
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'alpine-green', { options: Object.keys(PALETTE), label: 'Colorway' });
  const blade = g.input('blade', 'color', '', { label: 'Blade (dark)' });
  const bladeLight = g.input('bladeLight', 'color', '', { label: 'Blade (light)' });
  const scorch = g.input('scorch', 'color', '', { label: 'Scorch band' });
  const char = g.input('char', 'color', '', { label: 'Char' });
  const ember = g.input('ember', 'color', '', { label: 'Ember tips' });
  const pebbleColor = g.input('pebble', 'color', '', { label: 'Pebbles' });
  const pebbles = g.input('pebbles', 'bool', true, { label: 'Pebbles' });

  const P = {
    burn: 0, blades: 30, height: 0.4, spread: 0.55,
    ...params,
  };
  const parts = [];
  const count = Math.round(P.blades);
  for (let i = 0; i < count; i++) {
    const t = traits(i, P);
    const k = clumpOf(t.az);
    const c = clumpCentre(k);
    const root = add(c, [t.ox * t.rootOut + t.oz * t.rootSide, 0, t.oz * t.rootOut - t.ox * t.rootSide]);
    const { rows, zone, ember: hot } = bladeRows(t, P, root);
    const rings = [], bandZones = [];
    let tip = null, tipZone = null;
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      if (r.tip) { tip = r.tip; tipZone = hot ? 'ember' : zone((rows[j - 1].u + 1) / 2); break; }
      rings.push([r.L, r.C, r.R]);
      if (j < rows.length - 1) bandZones.push(zone((r.u + rows[j + 1].u) / 2));
    }
    parts.push(g.loft({
      rings, capTop: tip, capTopFlip: true, bandZones,
      zones: { capTop: tipZone },
    }));
    parts.push(g.poly({ pts: [rows[0].R, rows[0].C, rows[0].L], zone: zone(0.2) }));
  }

  const pebbleParts = [];
  if (pebbles) {
    const rnd = prng(424242), N = 12;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU + (rnd() - 0.5) * 0.45;
      const skip = rnd();
      if (i === 3 || i === 8) continue;
      const rad = 0.075 + rnd() * 0.055, big = skip > 0.55;
      const r = big ? 0.022 + rnd() * 0.01 : 0.011 + rnd() * 0.008;
      pebbleParts.push(pebble(g, 'pebble', Math.cos(a) * rad, Math.sin(a) * rad, r, r * (0.75 + rnd() * 0.35), rnd));
    }
  }
  const pebbleGroup = g.cond({ cond: pebbles, then: g.join(pebbleParts), else: g.join([]) });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'alpine-green',
    overrides: { blade, bladeLight, scorch, char, ember, pebble: pebbleColor },
  });
  return g.mesh(g.join([...parts, pebbleGroup]), {
    zones: {
      blade: at(pal, 'blade'), bladeLight: at(pal, 'bladeLight'), scorch: at(pal, 'scorch'),
      char: at(pal, 'char'), ember: at(pal, 'ember'), pebble: at(pal, 'pebble'),
    },
    materials: { ember: { slot: 'ember', roughness: 0.85 } },
  });
}
