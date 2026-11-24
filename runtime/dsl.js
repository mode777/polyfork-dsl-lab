// Compact authoring DSL over the v2 IR. Every call records a node; scalars,
// refs, arrays and field expressions all serialise (fields as source strings).
import { Graph, field, isField, expr } from './runtime.js?v=3';

const F = (v) => (isField(v) || typeof v !== 'string' && typeof v !== 'function' ? v : field(v));
const strip = (o, ks) => { const q = { ...o }; for (const k of ks) delete q[k]; return q; };

export function graph(name, meta) { return new Builder(new Graph(name, meta)); }

class Builder {
  constructor(g) { this.g = g; }
  input(name, type, def, extra = {}) { return this.g.input(name, type, def, extra); }
  define(name, fn) { const sg = new Graph(name, { group: true }); fn(new Builder(sg)); this.g.groups.set(name, sg); return name; }
  groupNode(name, inputs = {}) { return this.add('group', inputs, { graph: name }); }
  repeatNode(name, count, inputs = {}) { return this.add('repeat', { ...inputs, count }, { graph: name }); }
  add(type, inputs = {}, params = {}) { return this.g.add(type, inputs, params); }
  out(name, r) { this.g.out(name, r); return this; }
  get ir() { return this.g; }

  // sources
  ring(p) { return this.add('ring', {}, { ...p, radius: p.radius !== undefined ? F(p.radius) : undefined }); }
  profile(p) { return this.add('profile', {}, p); }
  path(p) { return this.add('path', {}, p); }
  grid(p) { return this.add('grid', {}, { ...p, position: p.position !== undefined ? F(p.position) : undefined }); }
  box(p = {}) { return this.add('box', {}, p); }
  boolean(p) { return this.add('boolean', { a: p.a, b: p.b }, { op: p.op, zone: p.zone }); }
  card(p = {}) { return this.add('card', {}, p); }
  plane(p = {}) { return this.add('plane', {}, p); }
  curl(p = {}) { return this.add('curl', {}, p); }
  scatterVolume(p = {}) { return this.add('scatterVolume', {}, { ...p, keep: p.keep !== undefined ? F(p.keep) : undefined, size: p.size !== undefined ? F(p.size) : undefined }); }
  pathOnSurface(p) { return this.add('pathOnSurface', { geom: p.geom }, { pts: p.pts, from: p.from, mode: p.mode }); }
  bandOnSurface(p) { return this.add('bandOnSurface', { geom: p.geom }, strip(p, ['geom'])); }
  ribbon(p) { return this.add('ribbon', { path: p.path }, { width: p.width, fold: p.fold, zone: p.zone }); }
  wrapShell(p) { return this.add('wrapShell', { rings: p.rings }, strip(p, ['rings'])); }
  text(p = {}) { return this.add('text', {}, p); }
  pointsGrid(p = {}) { return this.add('pointsGrid', {}, p); }
  chamferBox(p = {}) { return this.add('chamferBox', {}, p); }
  spline(p) { return this.add('spline', {}, p); }
  scatterSurface(p) { return this.add('scatterSurface', { geom: p.geom }, { count: p.count, minDist: p.minDist, seed: p.seed, size: p.size !== undefined ? F(p.size) : undefined }); }
  instancedMesh(p) { return this.add('instancedMesh', { geom: p.geom, points: p.points }, { color: p.color, yawSign: p.yawSign }); }
  cavity(p) { return this.add('cavity', { geom: p.geom }, strip(p, ['geom'])); }
  skeleton(p) { return this.add('skeleton', {}, p); }
  skin(p) { return this.add('skin', { geom: p.geom, skeleton: p.skeleton }, { soft: p.soft, zones: p.zones }); }
  pose(p) { return this.add('pose', { object: p.object }, { poses: p.poses }); }
  cylinder(p = {}) { return this.add('cylinder', {}, p); }
  sphere(p = {}) { return this.add('sphere', {}, p); }

  // surfaces
  loft(o) { return this.add('loft', { rings: o.rings, capTop: o.capTop, capBottom: o.capBottom }, strip(o, ['rings', 'capTop', 'capBottom'])); }
  extrude(o) { return this.add('extrude', { profile: o.profile }, { depth: o.depth, z0: o.z0, cap: o.cap }); }
  bevelProfile(o) { return this.add('bevelProfile', { profile: o.profile }, { dist: o.dist }); }
  loftProfile(o) { return this.add('loftProfile', { profile: o.profile, capTop: o.capTop, capBottom: o.capBottom }, strip(o, ['profile', 'capTop', 'capBottom'])); }
  fanRing(o) { return this.add('fanRing', {}, o); }
  revolve(o) { return this.add('revolve', { profile: o.profile }, { seg: o.seg, phase: o.phase, inRadius: o.inRadius, zone: o.zone, axis: o.axis, mod: o.mod !== undefined ? F(o.mod) : undefined }); }
  sweep(o) { return this.add('sweep', { path: o.path, section: o.section }, { twist: o.twist, scale: o.scale, caps: o.caps, zone: o.zone }); }
  inset(o) { return this.add('inset', { profile: o.profile }, { dist: o.dist }); }
  pocket(o) { return this.add('pocket', { profile: o.profile }, { depth: o.depth, bevel: o.bevel, zone: o.zone }); }
  solidify(o) {
    const tz = typeof o.topZone === 'function' ? o.topZone : o.topZone;
    return this.add('solidify', { grid: o.grid }, { topZone: tz, botZone: o.botZone, wallZone: o.wallZone });
  }

  // modifiers
  transform(o) { return this.add('transform', { geom: o.geom }, strip(o, ['geom'])); }
  fan(o) { return this.add('fan', { ring: o.ring }, { apex: o.apex, zone: o.zone, flip: o.flip }); }
  cone(o) { return this.add('cone', {}, o); }
  clip(o) { return this.add('clip', { geom: o.geom }, strip(o, ['geom'])); }
  cap(o) { return this.add('cap', { profile: o.profile, holes: o.holes }, strip(o, ['profile', 'holes'])); }
  center(o) { return this.add('center', { geom: o.geom }, { x: o.x, y: o.y, z: o.z }); }
  mirror(o) { return this.add('mirror', { geom: o.geom }, { axis: o.axis, weld: o.weld }); }
  deform(o) { return this.add('deform', { geom: o.geom }, { expr: F(o.expr) }); }
  join(list) { return this.add('join', { geoms: list }, {}); }
  scatter(o) {
    return this.add('scatter', o.rng ? { rng: o.rng } : {}, {
      ...o,
      sample: F(o.sample),
      height: o.height !== undefined ? F(o.height) : undefined,
      size: o.size !== undefined ? F(o.size) : undefined,
    });
  }
  instance(o) { return this.add('instance', { points: o.points, proto: o.proto }, { orient: o.orient, scale: o.scale, yawSign: o.yawSign }); }
  geometry(o) { return this.add('geometry', { object: o.object }, { zone: o.zone }); }
  random(o = {}) { return this.add('random', {}, o); }
  arrayPolar(o) { return this.add('arrayPolar', { geom: o.geom }, strip(o, ['geom'])); }
  arrayLinear(o) { return this.add('arrayLinear', { geom: o.geom }, strip(o, ['geom'])); }
  switch(o) { return this.add('switch', { cases: o.cases }, { on: o.on }); }

  // outputs
  mesh(geom, o = {}) {
    return this.add('mesh', { geom }, { zones: o.zones, materials: o.materials, flat: o.flat, crease: o.crease, name: o.name });
  }
  group(children, o = {}) { return this.add('group', { children }, o); }
  script(o) { return this.add('script', o.inputs ?? {}, { src: o.src, lang: 'js' }); }
  module(mod, params = {}) { return this.add('module', {}, { module: mod, params }); }
}
export { field, isField, expr };
