// Shared authoring helpers for the ports. These are plain JS geometry
// calculations; the graph is still made of the generic runtime nodes
// (loft/prism/block/plate/poly/fanRing/prim), never per-asset node types.
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, v) => { const t = clamp((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const prng = (seed = 1) => { let s = seed >>> 0; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export const rect = (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
export const rectAt = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const ngon = (n, r, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (i / n) * TAU;
  return [Math.cos(a) * r, Math.sin(a) * r];
});
export const ngonXZ = (n, r, y, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (i / n) * TAU;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
});
export const ngonZX = (n, r, y, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (i / n) * TAU;
  return [Math.sin(a) * r, y, Math.cos(a) * r];
});
export const stadium = (cx, cy, hx, r, seg = 8) => {
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const a = (Math.PI / 2) + (i / seg) * Math.PI;
    pts.push([cx + hx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  for (let i = 0; i <= seg; i++) {
    const a = (Math.PI * 1.5) + (i / seg) * Math.PI;
    pts.push([cx - hx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
};
export const roundRect = (cx, cy, w, h, r, seg = 4) => {
  const hx = w / 2 - r, hy = h / 2 - r, pts = [];
  for (const [x, y, a0] of [[hx, hy, 0], [-hx, hy, 90], [-hx, -hy, 180], [hx, -hy, 270]]) {
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + (90 * i) / seg) * DEG;
      pts.push([cx + x + Math.cos(a) * r, cy + y + Math.sin(a) * r]);
    }
  }
  return pts;
};
export const offsetPoly = (P, d) => {
  const area = P.reduce((s, p, i) => s + p[0] * P[(i + 1) % P.length][1] - P[(i + 1) % P.length][0] * p[1], 0) / 2;
  const sg = area < 0 ? -1 : 1;
  return P.map((p, i) => {
    const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length];
    const e1 = norm([p[0] - a[0], p[1] - a[1], 0]), e2 = norm([b[0] - p[0], b[1] - p[1], 0]);
    const n1 = [-e1[1] * sg, e1[0] * sg], n2 = [-e2[1] * sg, e2[0] * sg];
    const k = d / Math.max(0.35, 1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k];
  });
};

// Emit a loft from explicit 3D rings. Caps are apex points; a one-ring loft is
// just a fan, which is the common reference `fan` helper.
export function loft(g, rings, opts = {}) {
  return g.loft({
    rings,
    capTop: opts.capTop,
    capBottom: opts.capBottom,
    zones: opts.zones,
    bandZones: opts.bandZones,
    zoneField: opts.zoneField,
    values: opts.values,
    skipEdges: opts.skipEdges,
    diagonal: opts.diagonal,
    flip: opts.flip,
    orient: opts.orient,
    orientCenter: opts.orientCenter,
    capTopFlip: opts.capTopFlip,
    capBottomFlip: opts.capBottomFlip,
    capTopRaw: opts.capTopRaw,
    capBottomRaw: opts.capBottomRaw,
  });
}
export function fan(g, ring, apex, zone, flip = false) {
  return loft(g, [ring], { capTop: apex, zones: { capTop: zone }, flip });
}
export function band(g, A, B, zone, opts = {}) {
  return loft(g, [A, B], { zones: { band: zone }, ...opts });
}
export function bandHint(g, A, B, zone, hint, opts = {}) {
  const n = cross(sub(A[1], A[0]), sub(B[1], A[0]));
  return band(g, A, B, zone, { ...opts, flip: dot(n, hint) < 0 });
}
export function prism(g, profile, axis, from, to, opts = {}) {
  return g.prism({ profile, axis, from, to, cap: opts.cap ?? true, capOrient: opts.capOrient, zone: opts.zone });
}
export function block(g, x0, x1, y0, y1, z0, z1, zone, skip = '') {
  return g.block({ x0, x1, y0, y1, z0, z1, skip, zone });
}
export function poly(g, pts, hint, zone = 'a') {
  return g.poly({ pts, hint, zone });
}
export function plate(g, profile, holes, z0, z1, opts = {}) {
  return g.plate({ profile, holes, z0, z1, cap: opts.cap ?? true, walls: opts.walls ?? 'both', skipWalls: opts.skipWalls, zone: opts.zone ?? 'a' });
}
export function prim(g, type, args, opts = {}) {
  return g.prim({ type, args, ...opts });
}

// Frame a polyline the way the reference prop builders do: tangent, a stable
// up reference, and the resulting normal/binormal. Used by tubes, handles,
// rails and bevel bands.
export function frames(pts, up = [0, 1, 0]) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const T = norm(sub(b, a));
    let N = norm(cross(T, Math.abs(T[1]) > 0.9 ? [0, 0, 1] : up));
    const B = norm(cross(T, N));
    out.push({ o: pts[i], T, N, B });
  }
  return out;
}
export function tubeRings(pts, section, opts = {}) {
  const F = frames(pts, opts.up ?? [0, 1, 0]);
  return F.map((f) => section.map(([u, v]) => add(f.o, add(mul(f.N, u), mul(f.B, v)))));
}
export function beam(g, a, b, section, opts = {}) {
  const A = frames([a, b], opts.up ?? [0, 1, 0]);
  const rings = A.map((f) => section.map(([u, v]) => add(f.o, add(mul(f.N, u), mul(f.B, v)))));
  return loft(g, rings, opts);
}
export function beamC(g, a, b, section, opts = {}) {
  const A = frames([a, b], opts.up ?? [0, 1, 0]);
  const rings = A.map((f) => section.map(([u, v]) => add(f.o, add(mul(f.N, u), mul(f.B, v)))));
  return loft(g, rings, { capTop: opts.capTop ?? b, capBottom: opts.capBottom ?? a, zones: opts.zones, flip: opts.flip, orient: opts.orient });
}

export const at = (p, k) => ({ __ref: `${p.__ref}.${k}` });
