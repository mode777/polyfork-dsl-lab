// Runtime tracer: measures what each Polyfork module actually builds.
// Research instrumentation only. Does not modify the assets.
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MODELS = JSON.parse(fs.readFileSync('data/sample.json', 'utf8'));

const seen = new WeakSet();
let cur = null;
function bump(k, v = 1) { if (cur) cur[k] = (cur[k] || 0) + v; }
function mark(g) { if (!g) return; if (!seen.has(g)) { seen.add(g); bump('geometry_objects'); bump('geom_' + (g.type || 'unknown')); } }

const P = THREE.BufferGeometry.prototype;
for (const m of ['setAttribute', 'setIndex']) {
  const orig = P[m];
  P[m] = function (...a) { mark(this); return orig.apply(this, a); };
}
for (const m of ['translate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'applyMatrix4', 'center', 'computeVertexNormals', 'toNonIndexed', 'deleteAttribute', 'setFromPoints']) {
  const orig = P[m];
  if (!orig) continue;
  P[m] = function (...a) { bump('op_' + m); return orig.apply(this, a); };
}
const tri0 = THREE.ShapeUtils.triangulateShape;
THREE.ShapeUtils.triangulateShape = function (...a) { bump('op_triangulateShape'); return tri0.apply(this, a); };

function walk(obj, acc) {
  obj.traverse?.((o) => {
    if (o.isMesh) {
      acc.meshes++;
      if (o.isSkinnedMesh) acc.skinnedMeshes++;
      const g = o.geometry;
      if (g) {
        const n = g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
        acc.triangles += Math.round(n);
        acc.vertices += g.attributes.position?.count || 0;
        if (g.attributes.color) acc.colorAttrs++;
        if (g.attributes.uv) acc.uvAttrs++;
        acc.geoTypes.add(g.type);
      }
      if (o.material) acc.materials.add(o.material.uuid);
    }
    if (o.isBone) acc.bones++;
    if (o.isGroup) acc.groups++;
  });
  return acc;
}

function hash(scene) {
  const h = crypto.createHash('sha1');
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry?.attributes?.position;
    if (!a) return;
    h.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
  });
  return h.digest('hex').slice(0, 16);
}

async function load(id) {
  const url = path.resolve(`scripts/${id}.mjs`) + `?v=${Math.random()}`;
  return await import(url);
}

const out = [];
for (const id of MODELS) {
  const mod = await load(id);
  const rec = { id, params: [], variants: {} };
  // param schema summary
  const params = mod.params || {};
  for (const [k, s] of Object.entries(params)) {
    rec.params.push({ name: k, type: s.type, default: s.default, affects: s.affects ?? null, options: s.options?.length ?? null, optionsList: s.options ? [...s.options] : null });
  }
  rec.exports = ['createAsset', 'params', 'presets', 'rig', 'detach', 'night', 'decals', 'materials'].filter((k) => mod[k] != null);
  rec.rigParts = mod.rig ? Object.keys(mod.rig).length : 0;
  rec.detachParts = mod.detach ? mod.detach.length : 0;
  rec.presets = mod.presets ? Object.keys(mod.presets).length : 0;
  rec.decalZones = mod.decals ? mod.decals.length : 0;

  cur = { geometry_objects: 0, op_translate: 0, op_rotateX: 0, op_rotateY: 0, op_rotateZ: 0, op_scale: 0, op_applyMatrix4: 0, op_center: 0, op_computeVertexNormals: 0, op_toNonIndexed: 0, op_deleteAttribute: 0, op_triangulateShape: 0 };
  const t0 = performance.now();
  const obj = mod.createAsset();
  const ms = performance.now() - t0;
  rec.buildMs = Math.round(ms * 10) / 10;
  rec.ops = cur; cur = null;
  const acc = walk(obj, { meshes: 0, skinnedMeshes: 0, triangles: 0, vertices: 0, colorAttrs: 0, uvAttrs: 0, bones: 0, groups: 0, materials: new Set(), geoTypes: new Set() });
  rec.meshes = acc.meshes; rec.skinnedMeshes = acc.skinnedMeshes; rec.bones = acc.bones; rec.groups = acc.groups;
  rec.triangles = acc.triangles; rec.vertices = acc.vertices; rec.materials = acc.materials.size;
  rec.colorAttrs = acc.colorAttrs; rec.uvAttrs = acc.uvAttrs; rec.geoTypes = [...acc.geoTypes];
  rec.hashes = [hash(obj)];

  // second build: determinism
  const obj2 = mod.createAsset();
  rec.hashes.push(hash(obj2));
  rec.deterministic = rec.hashes[0] === rec.hashes[1];

  // param sweeps: structural vs surface
  for (const p of rec.params) {
    if (p.type !== 'range' && p.type !== 'choice' && p.type !== 'toggle') continue;
    const vals = p.type === 'range' ? [p.min ?? p.default, p.max ?? p.default] : p.type === 'choice' ? [p.optionsList?.[0], p.optionsList?.[p.optionsList.length - 1]] : [true, false];
    const stats = [];
    for (const v of vals) {
      try {
        const o = mod.createAsset({ [p.name]: v });
        const a = walk(o, { meshes: 0, skinnedMeshes: 0, triangles: 0, vertices: 0, colorAttrs: 0, uvAttrs: 0, bones: 0, groups: 0, materials: new Set(), geoTypes: new Set() });
        stats.push({ v, tris: a.triangles, meshes: a.meshes, verts: a.vertices });
      } catch (e) { stats.push({ v, error: String(e).slice(0, 80) }); }
    }
    if (stats.length === 2 && !stats[0].error && !stats[1].error) {
      rec.variants[p.name] = { type: p.type, a: stats[0], b: stats[1], structural: stats[0].tris !== stats[1].tris || stats[0].meshes !== stats[1].meshes };
    }
  }
  out.push(rec);
  console.error('done', id);
}
fs.writeFileSync('data/runtime.json', JSON.stringify(out, null, 1));
console.log('wrote', out.length);
