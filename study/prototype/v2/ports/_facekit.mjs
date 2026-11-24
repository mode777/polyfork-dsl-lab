// Small face-soup helpers shared by the reference ports. A port collects the
// polygons its construction emits, then hands them to the `faces` node once.
// This keeps the graph a single readable source instead of hundreds of `poly`
// nodes, while every face still carries its own zone and orientation hint.

export function faceSink() {
  const faces = [];
  const add = (pts, zone = 'a', hint, inside) => {
    const face = { pts: pts.map((p) => [p[0], p[1], p[2]]), zone };
    if (hint) face.hint = hint;
    if (inside) face.inside = inside;
    faces.push(face);
    return face;
  };
  const tri = (a, b, c, zone = 'a', hint, inside) => add([a, b, c], zone, hint, inside);
  const quad = (a, b, c, d, zone = 'a', hint, inside) => {
    // Reference quad helpers orient each triangle independently by the hint.
    // Keep that behaviour for non-planar quads by splitting before the node.
    if (hint) {
      tri(a, b, c, zone, hint, inside);
      tri(a, c, d, zone, hint, inside);
      return;
    }
    add([a, b, c, d], zone, undefined, inside);
  };
  const poly = (pts, zone = 'a', hint, inside) => add(pts, zone, hint, inside);
  return { faces, add, tri, quad, poly };
}

export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

export function mat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function multiply(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
export function translation(x, y, z) {
  const m = mat4();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}
export function rotationX(a) {
  const m = mat4(), c = Math.cos(a), s = Math.sin(a);
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}
export function rotationY(a) {
  const m = mat4(), c = Math.cos(a), s = Math.sin(a);
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}
export function applyMat4(p, m) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}
export function mapFaces(faces, m) {
  return faces.map((f) => ({ ...f, pts: f.pts.map((p) => applyMat4(p, m)) }));
}
export function emitFaces(g, sink, zones, o = {}) {
  return g.mesh(g.faces({ faces: sink.faces }), { zones, ...o });
}
export function emitParts(g, parts, zones, o = {}) {
  const faces = parts.flatMap((p) => p.faces);
  return g.mesh(g.faces({ faces }), { zones, ...o });
}
