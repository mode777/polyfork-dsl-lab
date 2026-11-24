// Archetype templates for the third sample. Node-only: no script/module nodes.
import { graph } from './dsl.mjs';

const TAU = Math.PI * 2;

export function creature(g, o = {}) {
  g.input('height', 'float', o.height ?? 1.6);
  const H = o.height ?? 1.6, L = o.length ?? H * 0.9, W = o.width ?? H * 0.32;
  const biped = !!o.biped;
  const bodyY = H * (biped ? 0.62 : 0.6);
  const legLen = bodyY * 1.02;
  const skinCol = o.skin ?? '#b08d6a', cloth = o.cloth ?? '#6b7a8a';

  const rings = [];
  const nR = 8;
  for (let k = 0; k <= nR; k++) {
    const t = k / nR;
    const z = (t - 0.5) * L;
    const taper = 0.65 + 0.35 * Math.sin(t * Math.PI);
    const ring = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ring.push([Math.cos(a) * W * 0.5 * taper, bodyY + Math.sin(a) * W * 0.38 * taper, z]);
    }
    rings.push(ring);
  }
  const body = g.loft({ rings, capTop: [0, bodyY, L * 0.52], capBottom: [0, bodyY, -L * 0.52], zones: { band: 'skin', capTop: 'skin', capBottom: 'skin' } });

  const head = g.sphere({ r: W * 0.31, seg: 10, rings: 7, x: 0, y: bodyY + W * 0.42, z: L * 0.58, zone: 'skin' });
  const parts = [body, head];
  // muzzle / ears
  parts.push(g.box({ w: W * 0.26, h: W * 0.17, d: W * 0.3, x: 0, y: bodyY + W * 0.36, z: L * 0.58 + W * 0.27, zone: 'skin' }));
  parts.push(g.cylinder({ r1: W * 0.14, r2: W * 0.12, h: H * 0.22, seg: 8, x: 0, y: bodyY + W * 0.14, z: L * 0.47, rx: -0.85, zone: 'skin' }));
  for (const sx of [-1, 1]) parts.push(g.cone({ n: 4, r: W * 0.08, h: W * 0.24, x: sx * W * 0.16, y: bodyY + W * 0.62, z: L * 0.58, zone: 'skin' }));
  for (const sx of [-1, 1]) parts.push(g.cone({ n: 5, r: W * 0.035, h: W * 0.2, x: sx * W * 0.12, y: bodyY + W * 0.66, z: L * 0.6, rx: -0.55, zone: 'horn' }));

  const bones = [
    { name: 'Root', pos: [0, bodyY, 0] },
    { name: 'Spine', parent: 'Root', pos: [0, 0, -L * 0.22] },
    { name: 'Chest', parent: 'Root', pos: [0, 0, L * 0.22] },
    { name: 'Neck', parent: 'Chest', pos: [0, H * 0.1, L * 0.12] },
    { name: 'Head', parent: 'Neck', pos: [0, H * 0.08, L * 0.1] },
  ];
  const legAt = (sx, sz, name) => {
    parts.push(g.cylinder({ r1: W * 0.11, r2: W * 0.08, h: legLen * 0.55, seg: 6, x: sx * W * 0.3, y: bodyY - legLen * 0.55, z: sz * L * 0.32, zone: biped ? 'cloth' : 'skin' }));
    parts.push(g.cylinder({ r1: W * 0.08, r2: W * 0.06, h: legLen * 0.5, seg: 6, x: sx * W * 0.3, y: bodyY - legLen * 1.05, z: sz * L * 0.32, zone: biped ? 'cloth' : 'skin' }));
    parts.push(g.cylinder({ r1: W * 0.075, r2: W * 0.07, h: W * 0.055, seg: 6, x: sx * W * 0.3, y: 0.028, z: sz * L * 0.32, zone: 'hoof' }));
    bones.push({ name: name + 'Up', parent: 'Root', pos: [sx * W * 0.3, -legLen * 0.1, sz * L * 0.32] });
    bones.push({ name: name + 'Lo', parent: name + 'Up', pos: [0, -legLen * 0.5, 0] });
    bones.push({ name: name + 'Ft', parent: name + 'Lo', pos: [0, -legLen * 0.45, 0] });
  };
  legAt(-1, 1, 'FL'); legAt(1, 1, 'FR');
  legAt(-1, -1, 'HL'); legAt(1, -1, 'HR');
  if (biped) {
    for (const sx of [-1, 1]) parts.push(g.cylinder({ r1: W * 0.09, r2: W * 0.06, h: H * 0.35, seg: 6, x: sx * W * 0.42, y: bodyY + H * 0.05, z: L * 0.1, rz: sx * 0.25, zone: 'cloth' }));
  }
  parts.push(g.cone({ n: 5, r: W * 0.07, h: L * 0.25, x: 0, y: bodyY, z: -L * 0.6, rx: -1.2, zone: 'skin' }));

  for (const sx of [-1, 1]) {
    parts.push(g.sphere({ r: W * 0.055, seg: 6, rings: 4, x: sx * W * 0.16, y: bodyY + W * 0.38, z: L * 0.55 + W * 0.24, zone: 'eye' }));
    parts.push(g.cone({ n: 5, r: W * 0.05, h: W * 0.22, x: sx * W * 0.18, y: bodyY + W * 0.52, z: L * 0.55, rx: -0.2, zone: 'horn' }));
  }
  const skel = g.skeleton({ bones });
  const mesh = g.skin({ geom: g.join(parts), skeleton: skel, soft: true, zones: { skin: o.skin ?? '#b89a74', cloth: o.cloth ?? '#6b5a44', eye: '#1a1410', horn: '#e3d6bb', hoof: '#4a3b2c' } });
  return mesh;
}

export function boat(g, o = {}) {
  g.input('length', 'float', o.length ?? 3.4);
  const L = o.length ?? 3.4, W = o.width ?? 1.2, H = o.height ?? 0.8;
  const rings = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8, z = (t - 0.5) * L;
    const w = W * 0.5 * Math.sin(Math.PI * (0.15 + 0.7 * t)) + 0.05;
    const ring = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const y = H * 0.5 + Math.sin(a) * H * 0.5 * (Math.sin(a) > 0 ? 0.35 : 1);
      ring.push([Math.cos(a) * w, Math.max(0, y), z]);
    }
    rings.push(ring);
  }
  const hull = g.loft({ rings, capTop: [0, H * 0.55, L * 0.5], capBottom: [0, H * 0.55, -L * 0.5], zones: { band: 'hull', capTop: 'hull', capBottom: 'hull' } });
  const parts = [hull];
  for (const z of [-L * 0.25, 0, L * 0.25]) parts.push(g.box({ w: W * 0.75, h: 0.06, d: 0.26, y: H * 0.55, z, zone: 'seat' }));
  for (const sx of [-1, 1]) parts.push(g.box({ w: 0.06, h: 0.05, d: L * 0.5, x: sx * W * 0.4, y: H * 0.9, z: 0, zone: 'trim' }));
  for (const sx of [-1, 1]) parts.push(g.cylinder({ r1: 0.03, r2: 0.03, h: L * 0.7, seg: 6, x: sx * W * 0.5, y: H * 0.75, z: 0, rz: Math.PI / 2, zone: 'oar' }));
  return g.mesh(g.join(parts), { zones: { hull: o.hull ?? '#8a6a48', seat: '#a98a5f', trim: '#5a4632', oar: '#c2a15a' } });
}

export function building(g, o = {}) {
  g.input('width', 'float', o.width ?? 8);
  const W = o.width ?? 8, D = o.depth ?? 6, H = o.height ?? 4;
  const parts = [g.box({ w: W, h: 0.2, d: D, y: 0, zone: 'floor' })];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(g.box({ w: 0.25, h: H, d: 0.25, x: sx * W * 0.42, y: H / 2, z: sz * D * 0.42, zone: 'post' }));
  parts.push(g.box({ w: W * 0.9, h: H * 0.65, d: D * 0.88, y: H * 0.45, zone: 'wall' }));
  const roof = g.loft({
    rings: [
      [[-W * 0.55, H * 0.8, -D * 0.55], [W * 0.55, H * 0.8, -D * 0.55], [W * 0.55, H * 0.8, D * 0.55], [-W * 0.55, H * 0.8, D * 0.55]],
      [[-W * 0.45, H * 1.1, -D * 0.4], [W * 0.45, H * 1.1, -D * 0.4], [W * 0.45, H * 1.1, D * 0.4], [-W * 0.45, H * 1.1, D * 0.4]],
    ],
    capTop: [0, H * 1.25, 0], capBottom: [0, H * 0.8, 0], zones: { band: 'roof', capTop: 'roof', capBottom: 'roof' },
  });
  parts.push(roof);
  parts.push(g.box({ w: 1.1, h: 2.1, d: 0.1, y: 1.05, z: D * 0.44, zone: 'door' }));
  return g.mesh(g.join(parts), { zones: { floor: '#7a6a55', post: '#5a4632', wall: '#c2b08a', roof: '#4a4d52', door: '#3a2f26' } });
}

export function basket(g, o = {}) {
  const R = 0.2, H = 0.4;
  const prof = [[R * 0.75, 0], [R, H * 0.12], [R, H * 0.85], [R * 0.95, H]];
  const body = g.revolve({ profile: prof, seg: 16, zone: 'weave' });
  const parts = [body];
  for (let k = 1; k < 8; k++) parts.push(g.revolve({ profile: [[R * 0.99, H * k / 8], [R * 1.03, H * k / 8]], seg: 16, zone: 'band' }));
  for (const sx of [-1, 1]) parts.push(g.box({ w: 0.04, h: 0.24, d: 0.02, x: sx * R * 0.9, y: H * 1.05, z: 0, zone: 'handle' }));
  parts.push(g.cylinder({ r1: 0.02, r2: 0.02, h: R * 1.8, seg: 6, y: H * 1.15, rz: Math.PI / 2, zone: 'handle' }));
  return g.mesh(g.join(parts), { zones: { weave: o.weave ?? '#b08d57', band: '#8a6a3f', handle: '#6b4f2f' } });
}

export function pumpkin(g, o = {}) {
  const R = 0.16, H = 0.24;
  const prof = [[0.01, 0], [R * 0.7, 0.03], [R, H * 0.45], [R * 0.8, H], [0.02, H * 1.02]];
  const body = g.revolve({ profile: prof, seg: 16, zone: 'rind', mod: `(x,y,z,i,k)=>{ const base=x; return base*(1+0.06*Math.cos(i*5)); }` });
  const stem = g.cylinder({ r1: 0.025, r2: 0.02, h: 0.08, seg: 6, y: H, zone: 'stem' });
  return g.mesh(g.join([body, stem]), { zones: { rind: o.rind ?? '#d9822b', stem: '#5f6b3a' } });
}

export function coral(g, o = {}) {
  const parts = [g.cylinder({ r1: 0.1, r2: 0.08, h: 0.2, seg: 6, zone: 'coral' })];
  let s = 9;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const a = rnd() * TAU, r = 0.08 + rnd() * 0.28, y = 0.2 + rnd() * 1.1;
    parts.push(g.cylinder({ r1: 0.035, r2: 0.02, h: 0.3 + rnd() * 0.5, seg: 5, x: Math.cos(a) * r, y, z: Math.sin(a) * r, rx: (rnd() - 0.5) * 0.6, rz: (rnd() - 0.5) * 0.6, zone: 'coral' }));
  }
  return g.mesh(g.join(parts), { zones: { coral: o.coral ?? '#c27a6a' } });
}

export function desk(g, o = {}) {
  const W = 1.4, D = 0.7, H = 0.75;
  const parts = [g.box({ w: W, h: 0.05, d: D, y: H, zone: 'top' })];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push(g.box({ w: 0.06, h: H, d: 0.06, x: sx * (W / 2 - 0.06), y: H / 2, z: sz * (D / 2 - 0.06), zone: 'leg' }));
  parts.push(g.box({ w: W * 0.4, h: 0.16, d: D * 0.8, x: W * 0.18, y: H - 0.1, zone: 'drawer' }));
  return g.mesh(g.join(parts), { zones: { top: o.top ?? '#8a6a48', leg: '#5a4632', drawer: '#6b5236' } });
}

export function shield(g, o = {}) {
  const H = 1.3, W = 0.7;
  const prof = [[0, 0], [W * 0.5, 0.15], [W * 0.5, H * 0.7], [0, H], [-W * 0.5, H * 0.7], [-W * 0.5, 0.15]];
  const body = g.extrude({ profile: prof.map(([x, y]) => [x, y - H / 2]), depth: 0.06, z0: -0.03, cap: true });
  const boss = g.cone({ n: 8, r: 0.09, h: 0.07, y: 0.05, z: 0.05, rx: Math.PI / 2, zone: 'metal' });
  return g.mesh(g.join([body, boss]), { zones: { a: o.face ?? '#6b4f2f', metal: '#b8bcc2' } });
}

export function screen(g, o = {}) {
  const W = 0.84, H = 0.25;
  const parts = [];
  for (let i = -1; i <= 1; i++) parts.push(g.box({ w: W / 3, h: H, d: 0.02, x: i * W / 3, y: H / 2, z: Math.abs(i) * 0.08, ry: -i * 0.35, zone: 'panel' }));
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) parts.push(g.box({ w: W / 4, h: 0.01, d: 0.002, x: -W / 2 + W / 6 + i * W / 3, y: 0.06 + k * 0.045, z: 0.02 + Math.abs(i) * 0.08 + 0.012, zone: 'ink' }));
  return g.mesh(g.join(parts), { zones: { panel: '#5a4632', ink: '#d9d3c4' } });
}

export function grass(g, o = {}) {
  const parts = [];
  let s = 21;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i++) {
    const a = rnd() * TAU, r = rnd() * 0.18;
    parts.push(g.cone({ n: 3, r: 0.012, h: 0.3 + rnd() * 0.2, x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.5, zone: i % 4 ? 'grass' : 'dry' }));
  }
  return g.mesh(g.join(parts), { zones: { grass: o.grass ?? '#7a8a4f', dry: '#a89a5f' } });
}

export function roofTile(g, o = {}) {
  const W = 4, D = 4;
  const tile = g.plane({ w: W / 10 * 0.94, d: D / 10 * 0.94, zone: 'tileA' });
  const pts = g.pointsGrid({ nx: 10, nz: 10, w: W, d: D, y: 0.02 });
  const mesh = g.instancedMesh({ geom: tile, points: pts, color: o.tileA ?? '#9a5a45' });
  return mesh;
}

export function boulder(g, o = {}) {
  const lump = g.sphere({ r: 0.5, seg: 12, rings: 8 });
  const d = g.deform({ geom: lump, expr: `let k = 1 + 0.2*sin(3*x+1)*cos(2*z) in [x*k, y*k*0.75, z*k]` });
  const c = g.clip({ geom: d, nx: 0.2, ny: 1, nz: 0.1, d: 0.3, cap: true, zone: 'rock' });
  return g.mesh(g.center({ geom: c, y: false }), { zones: { rock: o.rock ?? '#6a6a66' } });
}

export function miniature(g, o = {}) {
  const parts = [g.chamferBox({ w: 0.07, h: 0.012, d: 0.05, c: 0.004, y: 0, zone: 'base' })];
  parts.push(g.cylinder({ r1: 0.012, r2: 0.009, h: 0.045, seg: 6, y: 0.012, zone: 'body' }));
  parts.push(g.sphere({ r: 0.011, seg: 6, rings: 4, y: 0.06 }));
  parts.push(g.cone({ n: 5, r: 0.012, h: 0.02, y: 0.065, zone: 'helm' }));
  return g.mesh(g.join(parts), { zones: { base: '#3a3f46', body: '#7a5a8a', a: '#b08d6a', helm: '#b8bcc2' } });
}

export function fingerSet(g, o = {}) {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.022;
    parts.push(g.cylinder({ r1: 0.008, r2: 0.007, h: 0.05 + (i === 0 ? -0.012 : 0), seg: 6, x, y: 0.01, zone: 'metal' }));
    parts.push(g.sphere({ r: 0.007, seg: 6, rings: 3, x, y: 0.065, zone: 'joint' }));
  }
  return g.mesh(g.join(parts), { zones: { metal: '#b08d57', joint: '#6b6f76' } });
}

export const TEMPLATES = { creature, boat, building, basket, pumpkin, coral, desk, shield, screen, grass, roofTile, boulder, miniature, fingerSet };
