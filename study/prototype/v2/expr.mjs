// A small, parsed expression language for graph fields and parameters.
// There is deliberately no eval / new Function here: the text is tokenised and
// evaluated by this module. Backends can implement the same grammar without a
// JavaScript engine.

const PUNCT = ['**', '===', '!==', '==', '!=', '<=', '>=', '&&', '||', '=>', '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '(', ')', '[', ']', '{', '}', ',', '.', '='];

export function tokenize(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") {
      const q = c; let s = ''; i++;
      while (i < n && src[i] !== q) {
        if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; }
        s += src[i++];
      }
      if (src[i] !== q) throw new Error('expr: unterminated string');
      i++; out.push({ t: 'str', v: s }); continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < n && /[0-9.]/.test(src[j])) j++;
      if (src[j] === 'e' || src[j] === 'E') { j++; if (src[j] === '+' || src[j] === '-') j++; while (j < n && /[0-9]/.test(src[j])) j++; }
      out.push({ t: 'num', v: Number(src.slice(i, j)) }); i = j; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) }); i = j; continue;
    }
    const p = PUNCT.find((q) => src.startsWith(q, i));
    if (!p) throw new Error(`expr: unexpected character ${JSON.stringify(c)} at ${i}`);
    out.push({ t: 'p', v: p }); i += p.length;
  }
  return out;
}

export function parseExpr(src) {
  const tk = tokenize(String(src));
  let k = 0;
  const peek = () => tk[k];
  const eat = (v) => { const q = tk[k]; if (!q || q.v !== v) throw new Error(`expr: expected ${v}`); k++; return q; };
  const isP = (v) => tk[k]?.t === 'p' && tk[k].v === v;
  const maybe = (v) => { if (isP(v)) { k++; return true; } return false; };

  function ternary() {
    const c = or();
    if (!maybe('?')) return c;
    const a = ternary();
    eat(':');
    const b = ternary();
    return { t: 'cond', c, a, b };
  }
  function or() {
    let l = and();
    while (isP('||')) { k++; l = { t: 'bin', op: '||', l, r: and() }; }
    return l;
  }
  function and() {
    let l = eq();
    while (isP('&&')) { k++; l = { t: 'bin', op: '&&', l, r: eq() }; }
    return l;
  }
  function eq() {
    let l = rel();
    while (isP('==') || isP('!=') || isP('===') || isP('!==')) { const op = tk[k++].v; l = { t: 'bin', op, l, r: rel() }; }
    return l;
  }
  function rel() {
    let l = add();
    while (isP('<') || isP('<=') || isP('>') || isP('>=')) { const op = tk[k++].v; l = { t: 'bin', op, l, r: add() }; }
    return l;
  }
  function add() {
    let l = mul();
    while (isP('+') || isP('-')) { const op = tk[k++].v; l = { t: 'bin', op, l, r: mul() }; }
    return l;
  }
  function mul() {
    let l = unary();
    while (isP('*') || isP('/') || isP('%')) { const op = tk[k++].v; l = { t: 'bin', op, l, r: unary() }; }
    return l;
  }
  function unary() {
    if (isP('-') || isP('+') || isP('!')) { const op = tk[k++].v; return { t: 'un', op, e: unary() }; }
    return power();
  }
  function power() {
    const l = postfix();
    if (isP('**')) { k++; return { t: 'bin', op: '**', l, r: unary() }; }
    return l;
  }
  function postfix() {
    let e = primary();
    for (;;) {
      if (isP('.')) { k++; const id = tk[k++]; if (!id || id.t !== 'id') throw new Error('expr: expected property'); e = { t: 'mem', o: e, k: id.v }; continue; }
      if (isP('[')) { k++; const i = ternary(); eat(']'); e = { t: 'idx', o: e, i }; continue; }
      if (isP('(')) {
        k++; const args = [];
        if (!isP(')')) { args.push(ternary()); while (maybe(',')) args.push(ternary()); }
        eat(')'); e = { t: 'call', f: e, a: args }; continue;
      }
      return e;
    }
  }
  function primary() {
    const q = tk[k++];
    if (!q) throw new Error('expr: unexpected end');
    if (q.t === 'num' || q.t === 'str') return { t: 'lit', v: q.v };
    if (q.v === 'let') {
      const binds = [];
      while (true) {
        const nameTok = tk[k++];
        if (nameTok.t !== 'id') throw new Error('expr: expected binding name');
        if (nameTok.v === 'in') { throw new Error('expr: let needs a binding'); }
        eat('=');
        binds.push([nameTok.v, ternary()]);
        if (maybe(',')) continue;
        break;
      }
      const inTok = tk[k++];
      if (!inTok || inTok.v !== 'in') throw new Error('expr: expected in');
      return { t: 'let', binds, body: ternary() };
    }
    if (q.t === 'id') {
      if (q.v === 'true') return { t: 'lit', v: true };
      if (q.v === 'false') return { t: 'lit', v: false };
      if (q.v === 'null') return { t: 'lit', v: null };
      return { t: 'id', v: q.v };
    }
    if (q.v === '(') { const e = ternary(); eat(')'); return e; }
    if (q.v === '[') {
      const items = [];
      if (!isP(']')) { items.push(ternary()); while (maybe(',')) { if (isP(']')) break; items.push(ternary()); } }
      eat(']'); return { t: 'arr', items };
    }
    if (q.v === '{') {
      const entries = [];
      if (!isP('}')) {
        for (;;) {
          const keyTok = tk[k++];
          const key = keyTok.t === 'str' || keyTok.t === 'id' || keyTok.t === 'num' ? String(keyTok.v) : (() => { throw new Error('expr: bad key'); })();
          if (isP(':')) {
            k++;
            entries.push([key, ternary()]);
          } else {
            entries.push([key, { t: 'id', v: key }]);
          }
          if (!maybe(',')) break;
        }
      }
      eat('}'); return { t: 'obj', entries };
    }
    throw new Error(`expr: unexpected token ${q.v}`);
  }

  const ast = ternary();
  if (k < tk.length) throw new Error(`expr: trailing token ${tk[k].v}`);
  return ast;
}

const B = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  atan2: Math.atan2, sqrt: Math.sqrt, abs: Math.abs, min: Math.min, max: Math.max,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, pow: Math.pow, exp: Math.exp,
  log: Math.log, hypot: Math.hypot, sign: Math.sign,
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  smoothstep: (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); },
  fract: (v) => v - Math.floor(v),
  len: (v) => (v == null ? 0 : (Array.isArray(v) || typeof v === 'string') ? v.length : Object.keys(v).length),
  sum: (v) => (v ?? []).reduce((a, b) => a + b, 0),
  centroid: (pts) => {
    const a = [0, 0, 0];
    for (const p of pts ?? []) { a[0] += p[0] / pts.length; a[1] += p[1] / pts.length; a[2] += p[2] / pts.length; }
    return a;
  },
  vnorm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; },
  vrot: (p, pivot, axis, phi) => {
    const v = [p[0]-pivot[0], p[1]-pivot[1], p[2]-pivot[2]];
    const k = [axis[1]*v[2]-axis[2]*v[1], axis[2]*v[0]-axis[0]*v[2], axis[0]*v[1]-axis[1]*v[0]];
    const d = axis[0]*v[0]+axis[1]*v[1]+axis[2]*v[2];
    const c = Math.cos(phi), s = Math.sin(phi);
    return [pivot[0]+v[0]*c+k[0]*s+axis[0]*d*(1-c),
            pivot[1]+v[1]*c+k[1]*s+axis[1]*d*(1-c),
            pivot[2]+v[2]*c+k[2]*s+axis[2]*d*(1-c)];
  },
  darken: (hex, f) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },
  hash: (a, b = 0, c = 0) => { const h = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return h - Math.floor(h); },
  noise: (a, b = 0, c = 0) => {
    const xi = Math.floor(a), yi = Math.floor(b), zi = Math.floor(c);
    const xf = a - xi, yf = b - yi, zf = c - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const g = (i, j, l) => B.hash(i, j, l);
    const x00 = B.lerp(g(xi, yi, zi), g(xi + 1, yi, zi), u);
    const x10 = B.lerp(g(xi, yi + 1, zi), g(xi + 1, yi + 1, zi), u);
    const x01 = B.lerp(g(xi, yi, zi + 1), g(xi + 1, yi, zi + 1), u);
    const x11 = B.lerp(g(xi, yi + 1, zi + 1), g(xi + 1, yi + 1, zi + 1), u);
    return B.lerp(B.lerp(x00, x10, v), B.lerp(x01, x11, v), w);
  },
  rand: (seed = 1) => {
    let s = seed >>> 0;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  },
  PI: Math.PI, TAU: Math.PI * 2, E: Math.E,
};

const ARRAY_METHODS = {
  slice: (a, ...x) => a.slice(...x),
  concat: (a, ...x) => a.concat(...x),
  join: (a, ...x) => a.join(...x),
  includes: (a, ...x) => a.includes(...x),
  indexOf: (a, ...x) => a.indexOf(...x),
  reverse: (a) => [...a].reverse(),
};

export function evalExpr(ast, env0 = {}) {
  let env = env0;
  const get = (name) => (name in env ? env[name] : B[name]);
  const ev = (e) => {
    switch (e.t) {
      case 'lit': return e.v;
      case 'id': return get(e.v);
      case 'arr': return e.items.map(ev);
      case 'obj': return Object.fromEntries(e.entries.map(([k, v]) => [k, ev(v)]));
      case 'mem': {
        const o = ev(e.o);
        if (o == null) return undefined;
        if (e.k === 'length') return o.length;
        if (Array.isArray(o) && ARRAY_METHODS[e.k]) return (...a) => ARRAY_METHODS[e.k](o, ...a);
        if (typeof o === 'object' || typeof o === 'string') return o[e.k];
        return undefined;
      }
      case 'idx': { const o = ev(e.o); return o == null ? undefined : o[ev(e.i)]; }
      case 'call': {
        const f = ev(e.f);
        if (typeof f !== 'function') throw new Error('expr: not callable');
        return f(...e.a.map(ev));
      }
      case 'un': {
        const v = ev(e.e);
        if (e.op === '-') return -v;
        if (e.op === '+') return +v;
        return !v;
      }
      case 'bin': {
        if (e.op === '&&') { const l = ev(e.l); return l ? ev(e.r) : l; }
        if (e.op === '||') { const l = ev(e.l); return l || ev(e.r); }
        const a = ev(e.l), b = ev(e.r);
        switch (e.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': return a / b; case '%': return a % b; case '**': return a ** b;
          case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b;
          case '==': case '===': return a === b; case '!=': case '!==': return a !== b;
          default: throw new Error(`expr: unknown operator ${e.op}`);
        }
      }
      case 'cond': return ev(e.c) ? ev(e.a) : ev(e.b);
      case 'let': {
        const saved = env;
        env = { ...env };
        try {
          for (const [name, expr] of e.binds) env[name] = ev(expr);
          return ev(e.body);
        } finally { env = saved; }
      }
      default: throw new Error(`expr: unknown node ${e.t}`);
    }
  };
  return ev(ast);
}

export function compileExpr(src) {
  const ast = parseExpr(src);
  return (env) => evalExpr(ast, env);
}
