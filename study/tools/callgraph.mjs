// Approximate call-graph depth of each Polyfork module.
// Top-level helper functions only; nested locals are ignored.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'scripts';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort();

function topLevelFns(src) {
  const out = new Map();
  const re = /^(?:export\s+)?(?:function\s+([A-Za-z_$][\w$]*)\s*\(|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/gm;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1] || m[2];
    // skip the parameter list, including destructuring/default braces
    let p = src.indexOf('(', m.index), pd = 0, i = -1;
    for (let j = p; j < src.length; j++) {
      if (src[j] === '(') pd++;
      else if (src[j] === ')') { pd--; if (pd === 0) { i = src.indexOf('{', j); break; } }
    }
    if (i < 0) continue;
    let depth = 0, end = src.length;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
    }
    out.set(name, src.slice(i, end));
  }
  return out;
}

const rows = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const fns = topLevelFns(src);
  const names = new Set(fns.keys());
  const calls = new Map();
  for (const [n, body] of fns) {
    const cs = new Set();
    for (const c of body.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if (names.has(c[1]) && c[1] !== n) cs.add(c[1]);
    calls.set(n, cs);
  }
  const roots = ['createAsset', 'createCharacter', 'createAnimal', 'createHand', 'createHandItem', 'createAsset__asBuilt'].filter((r) => names.has(r));
  const depth = new Map();
  const visiting = new Set();
  let recursion = 0;
  function d(n) {
    if (depth.has(n)) return depth.get(n);
    if (visiting.has(n)) { recursion++; return 0; }
    visiting.add(n);
    let best = 0;
    for (const c of calls.get(n) || []) best = Math.max(best, 1 + d(c));
    visiting.delete(n);
    depth.set(n, best);
    return best;
  }
  const reachable = new Set();
  const stack = [...roots];
  while (stack.length) {
    const n = stack.pop();
    if (reachable.has(n)) continue;
    reachable.add(n);
    for (const c of calls.get(n) || []) stack.push(c);
  }
  const depths = [...reachable].map((n) => d(n));
  const inbound = new Map();
  for (const [n, cs] of calls) for (const c of cs) inbound.set(c, (inbound.get(c) || 0) + 1);
  const reuse = [...reachable].filter((n) => (inbound.get(n) || 0) >= 2).length;
  rows.push({
    file: f.replace('.mjs', ''),
    topFns: fns.size,
    reachable: reachable.size,
    depth: Math.max(0, ...depths),
    recursion,
    reuse,
    unusedFns: fns.size - reachable.size,
  });
}
const hdr = ['file', 'topFns', 'reachable', 'depth', 'recursion', 'reuse', 'unusedFns'];
console.log(hdr.join('\t'));
for (const r of rows) console.log(hdr.map((h) => r[h]).join('\t'));
fs.writeFileSync('data/callgraph.json', JSON.stringify(rows, null, 1));
