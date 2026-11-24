// Cache form: canonical JSON with numeric arrays pooled and packed as base64 Float32.
// Content-addressed: identical arrays are stored once. Text remains the authoring form.
import { toJSON, fromJSON } from './format.js?v=9';

const hasBuf = typeof Buffer !== 'undefined';
const b64 = (arr) => {
  const f = Float32Array.from(arr);
  const bytes = new Uint8Array(f.buffer, f.byteOffset, f.byteLength);
  if (hasBuf) return Buffer.from(bytes).toString('base64');
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => {
  const bytes = hasBuf ? Buffer.from(s, 'base64') : Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
};

const isNums = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number');
const isPoints = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => Array.isArray(x) && x.every((y) => typeof y === 'number'));

export function toCache(graph) {
  const pool = [], seen = new Map();
  const add = (flat, shape) => {
    const key = flat.map((x) => Math.round(x * 1e5)).join(',');
    if (seen.has(key)) return { __pool: seen.get(key), ...(shape ? { __shape: shape } : {}) };
    const id = pool.length;
    seen.set(key, id);
    pool.push({ b64: b64(flat), n: flat.length, ...(shape ? { __shape: shape } : {}) });
    return { __pool: id, ...(shape ? { __shape: shape } : {}) };
  };
  const walk = (v) => {
    if (isNums(v) && v.length >= 9) return add(v);
    if (isPoints(v) && v.length * v[0].length >= 9) return add(v.flat(), [v.length, v[0].length]);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !v.__field && !v.__expr && !v.__ref && !v.isObject3D) {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = walk(x);
      return o;
    }
    return v;
  };
  const convert = (j) => {
    const out = { ...j };
    out.nodes = j.nodes.map((n) => ({ ...n, in: walk(n.in), p: walk(n.p) }));
    out.groups = Object.fromEntries(Object.entries(j.groups ?? {}).map(([k, v]) => [k, convert(v)]));
    return out;
  };
  const j = convert(toJSON(graph));
  j.cache = { format: 'polyfork-graph-cache', version: 2, encoding: 'f32-base64' };
  j.pool = pool;
  return j;
}

export function fromCache(obj) {
  const pool = (obj.pool ?? []).map((p) => {
    const flat = Array.from(unb64(p.b64));
    return p.__shape ? Array.from({ length: p.__shape[0] }, (_, i) => flat.slice(i * p.__shape[1], (i + 1) * p.__shape[1])) : flat;
  });
  const expand = (v) => {
    if (v && typeof v === 'object') {
      if ('__pool' in v) return pool[v.__pool];
      if (Array.isArray(v)) return v.map(expand);
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = expand(x);
      return o;
    }
    return v;
  };
  const expandTree = (j) => ({ ...j, nodes: j.nodes.map((n) => ({ ...n, in: expand(n.in), p: expand(n.p) })), groups: Object.fromEntries(Object.entries(j.groups ?? {}).map(([k, v]) => [k, expandTree(v)])) });
  const g = fromJSON(expandTree(obj));
  return g;
}

export const cacheSize = (obj) => JSON.stringify(obj).length;
