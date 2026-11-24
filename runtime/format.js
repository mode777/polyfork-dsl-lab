// Compact text + canonical JSON storage for v2 graphs.
// Text is line-oriented, diffable, and keeps all wiring explicit.
import { Graph } from './runtime.js?v=5';

const isRef = (v) => v && typeof v === 'object' && '__ref' in v;
const isField = (v) => v && typeof v === 'object' && '__field' in v;
const isExpr = (v) => v && typeof v === 'object' && '__expr' in v;
const hasRef = (v) => {
  if (isRef(v)) return true;
  if (Array.isArray(v)) return v.some(hasRef);
  if (v && typeof v === 'object' && !isField(v) && !isExpr(v) && !v.isObject3D) return Object.values(v).some(hasRef);
  return false;
};

// ---------------------------------------------------------------- JSON
export function toJSON(g) {
  return {
    format: 'polyfork-graph',
    version: 2,
    name: g.name,
    inputs: g.inputs.map((i) => ({ ...i })),
    nodes: g.nodes.map((n) => ({ id: n.id, type: n.type, in: n.in, p: n.p })),
    outputs: g.outputs,
    groups: Object.fromEntries([...g.groups.entries()].map(([k, v]) => [k, toJSON(v)])),
    layouts: Object.fromEntries([...g.layouts.entries()].map(([k, v]) => [k, v])),
  };
}

export function fromJSON(o) {
  const g = new Graph(o.name);
  g.inputs = (o.inputs ?? []).map((i) => ({ ...i }));
  g.nodes = (o.nodes ?? []).map((n) => ({ id: n.id, type: n.type, in: n.in ?? {}, p: n.p ?? {} }));
  g.byId = new Map(g.nodes.map((n) => [n.id, n]));
  g.outputs = o.outputs ?? {};
  for (const [k, v] of Object.entries(o.groups ?? {})) g.groups.set(k, fromJSON(v));
  for (const [k, v] of Object.entries(o.layouts ?? {})) g.layouts.set(k, v);
  g._seq = g.nodes.length;
  return g;
}

// ---------------------------------------------------------------- values
function quote(s) { return JSON.stringify(s); }
function ser(v) {
  if (v === undefined) return null;
  if (v === null) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '0';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') return /^[A-Za-z0-9_.#$@/+-]+$/.test(v) ? v : quote(v);
  if (isRef(v)) return v.__ref.startsWith('$') ? v.__ref : '@' + v.__ref;
  if (isField(v)) return '`' + v.__field.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n') + '`';
  if (isExpr(v)) return '~`' + v.__expr.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n') + '`';
  if (Array.isArray(v)) return '[' + v.map((x) => ser(x) ?? 'null').join(',') + ']';
  if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => `${k}:${ser(x)}`).join(',') + '}';
  return quote(String(v));
}

function splitTop(s) {
  const out = [];
  let cur = '', depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '`' || c === '"' || c === "'") { q = c; cur += c; continue; }
    if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
    if (/\s/.test(c) && depth === 0) { if (cur) out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function parseVal(s) {
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('@')) return { __ref: s.slice(1) };
  if (s.startsWith('$')) return { __ref: s };
  if (s.startsWith('~`') && s.endsWith('`')) return { __expr: unesc(s.slice(2, -1)) };
  if (s.startsWith('`') && s.endsWith('`')) return { __field: unesc(s.slice(1, -1)) };
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1);
    return inner ? splitTop(inner).flatMap((x) => splitComma(x)).map(parseVal) : [];
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1), o = {};
    for (const part of splitComma(inner)) {
      const i = part.indexOf(':');
      o[part.slice(0, i)] = parseVal(part.slice(i + 1));
    }
    return o;
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return JSON.parse(s.startsWith("'") ? JSON.stringify(s.slice(1, -1)) : s);
  return s;
}
function unesc(s) { return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\`/g, '`').replace(/\\\\/g, '\\'); }
function splitComma(s) {
  const out = [];
  let cur = '', depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === q && s[i - 1] !== '\\') q = null; continue; }
    if (c === '`' || c === '"' || c === "'") { q = c; cur += c; continue; }
    if ('[{('.includes(c)) depth++;
    else if (']})'.includes(c)) depth--;
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

// ---------------------------------------------------------------- text
export function toText(g) {
  const L = [];
  L.push(`# polyfork graph v2 — ${g.name}`);
  L.push(`graph ${g.name}`);
  const emitInterface = (gg) => {
    for (const i of gg.inputs) {
      let line = `in ${i.name} ${i.type} ${ser(i.default)}`;
      if (i.min !== undefined) line += ` min=${i.min}`;
      if (i.max !== undefined) line += ` max=${i.max}`;
      if (i.step !== undefined) line += ` step=${i.step}`;
      if (i.options) line += ` options=${i.options.join('|')}`;
      if (i.label) line += ` label=${ser(i.label)}`;
      L.push(line);
    }
  };
  const emitNodes = (gg) => {
    for (const n of gg.nodes) {
      const pairs = [];
      const seen = new Set();
      for (const [k, v] of Object.entries(n.in ?? {})) { if (v === undefined) continue; pairs.push(`${k}=${ser(v)}`); seen.add(k); }
      const script = n.type === 'script' && typeof n.p?.src === 'string' ? n.p.src : null;
      for (const [k, v] of Object.entries(n.p ?? {})) {
        if (v === undefined || seen.has(k) || (script && k === 'src')) continue;
        pairs.push(`${k}=${ser(v)}`);
      }
      if (script) { L.push(`n ${n.id} ${n.type}${pairs.length ? ' ' + pairs.join(' ') : ''} src=<<<`); L.push(script.trimEnd()); L.push('>>>'); }
      else L.push(`n ${n.id} ${n.type}${pairs.length ? ' ' + pairs.join(' ') : ''}`);
    }
    for (const [k, v] of Object.entries(gg.outputs)) L.push(`out ${k}=${ser(v)}`);
  };
  for (const [name, lay] of g.layouts) {
    L.push(`layout ${name}`);
    for (const i of lay.inputs) {
      let line = `in ${i.name} ${i.type} ${ser(i.default)}`;
      if (i.min !== undefined) line += ` min=${i.min}`;
      if (i.max !== undefined) line += ` max=${i.max}`;
      if (i.step !== undefined) line += ` step=${i.step}`;
      if (i.options) line += ` options=${i.options.join('|')}`;
      if (i.label) line += ` label=${ser(i.label)}`;
      L.push(line);
    }
    for (const line of String(lay.src ?? '').split('\n')) L.push(line);
    for (const o of lay.outs ?? []) L.push(`out ${o.name}=${o.expr}`);
    L.push('end');
  }
  for (const [name, sg] of g.groups) { L.push(`group ${name}`); emitInterface(sg); emitNodes(sg); L.push('end'); }
  for (const i of g.inputs) {
    let line = `in ${i.name} ${i.type} ${ser(i.default)}`;
    if (i.min !== undefined) line += ` min=${i.min}`;
    if (i.max !== undefined) line += ` max=${i.max}`;
    if (i.step !== undefined) line += ` step=${i.step}`;
    if (i.options) line += ` options=${i.options.join('|')}`;
    if (i.label) line += ` label=${ser(i.label)}`;
    L.push(line);
  }
  emitNodes(g);
  L.push('end');
  return L.join('\n') + '\n';
}

export function parseText(src) {
  let g = null;
  const stack = [];
  const scripts = [];
  src = src.replace(/<<<\n?([\s\S]*?)>>>/g, (_, code) => {
    scripts.push(code.trim());
    return `__script_${scripts.length - 1}__`;
  });
  const deref = (v) => {
    if (typeof v === 'string') {
      const m = /^__script_(\d+)__$/.exec(v);
      return m ? scripts[+m[1]] : v;
    }
    if (Array.isArray(v)) return v.map(deref);
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = deref(x); return o; }
    return v;
  };
  let layout = null;
  const parseInput = (tok) => {
    const i = { name: tok[1], type: tok[2], default: parseVal(tok[3]) };
    for (const t of tok.slice(4)) {
      const k = t.slice(0, t.indexOf('=')), v = t.slice(t.indexOf('=') + 1);
      if (k === 'min') i.min = Number(v); else if (k === 'max') i.max = Number(v);
      else if (k === 'options') i.options = v.split('|');
      else if (k === 'step') i.step = Number(v);
      else if (k === 'label') i.label = parseVal(v);
    }
    return i;
  };
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (layout) {
      if (line === 'end') { layout.src = layout.src.join('\n').trim(); g.layouts.set(layout.name, layout); layout = null; continue; }
      if (line.startsWith('in ')) { layout.inputs.push(parseInput(splitTop(line))); continue; }
      if (line.startsWith('out ')) {
        const body = line.slice(4), eq = body.indexOf('=');
        if (eq > 0) layout.outs.push({ name: body.slice(0, eq).trim(), expr: body.slice(eq + 1).trim() });
        continue;
      }
      layout.src.push(raw);
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    const tok = splitTop(line);
    if (tok[0] === 'graph') { g = new Graph(tok[1]); stack.push(g); continue; }
    if (!g) throw new Error('parse: node before graph header');
    if (tok[0] === 'layout') { layout = { name: tok[1], inputs: [], src: [], outs: [] }; continue; }
    if (tok[0] === 'group') { const sg = new Graph(tok[1], { group: true }); stack[stack.length - 1].groups.set(tok[1], sg); stack.push(sg); continue; }
    if (tok[0] === 'end') { if (stack.length > 1) stack.pop(); continue; }
    const cur = stack[stack.length - 1];
    if (tok[0] === 'in') {
      cur.inputs.push(parseInput(tok));
      continue;
    }
    if (tok[0] === 'n') {
      const id = tok[1], type = tok[2], inp = {}, p = {};
      for (const t of tok.slice(3)) {
        const eq = t.indexOf('=');
        if (eq < 0) continue;
        const k = t.slice(0, eq), v = deref(parseVal(t.slice(eq + 1)));
        if (hasRef(v)) inp[k] = v; else p[k] = v;
      }
      const node = { id, type, in: inp, p };
      cur.nodes.push(node); cur.byId.set(id, node);
      continue;
    }
    if (tok[0] === 'out') {
      const eq = tok[1].indexOf('=');
      cur.outputs[tok[1].slice(0, eq)] = parseVal(tok[1].slice(eq + 1));
    }
  }
  if (!g) throw new Error('parse: no graph');
  for (const gg of stack) gg._seq = gg.nodes.length;
  return g;
}
