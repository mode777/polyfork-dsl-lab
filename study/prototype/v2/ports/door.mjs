// Interior door leaf — geometric port of the reference glazed leaf in its
// closed state: moulded stiles/rails, sunken panels, glass, brass lever and
// three hinges. The reference's lived-in shear is baked into the points.
import { faceSink, applyMat4 } from './_facekit.mjs';

const H = 2.10, T = 0.045, STILE = 0.115, BOT_RAIL = 0.205, TOP_RAIL = 0.135;
const LEVER_Y = 1.00, MR = 0.022, PD = 0.011, GR = 0.025, GZ = 0.008, GT = 0.003, GBURY = 0.004;
const HINGE_Y = [0.28, 1.05, 1.82];
const PALETTE = {
  'pale-oak': { leaf: '#E3CBA5', panel: '#D2B084', glass: '#47423C', brass: '#C9A24B' },
  'chalk-white': { leaf: '#FAF8F3', panel: '#F3EEE8', glass: '#47423C', brass: '#C9A24B' },
  walnut: { leaf: '#8A6244', panel: '#6B4A32', glass: '#2E2A26', brass: '#E0C078' },
  'sage-painted': { leaf: '#7E9179', panel: '#5B8551', glass: '#47423C', brass: '#E0C078' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function mixHex(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round((((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'pale-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'pale-oak' });

  const W = 0.90, lived = 0.35;
  const CH = 0.008 + lived * 0.004, SAG = lived * 0.009;
  const wear = mixHex(PALETTE['pale-oak'].leaf, '#8C837A', 0.20 * lived);
  const brassWear = mixHex(PALETTE['pale-oak'].brass, '#8A6E2E', 0.22 * lived);

  const layout = {
    cols: [CH, STILE, W - STILE, W - CH],
    rows: [CH, BOT_RAIL, 0.625, 0.725, 0.905, 1.085, H - TOP_RAIL, H - CH],
    cells: { '1,1': 'panel', '3,1': 'panel', '5,1': 'glass' },
  };

  const F = faceSink();
  const pane = faceSink();
  const quad = (sink, a, b, c, d, zone) => sink.quad(a, b, c, d, zone);
  const tri = (sink, a, b, c, zone) => sink.tri(a, b, c, zone);
  const openBox = (sink, x0, y0, z0, x1, y1, z1, skip = '', zone = 'leaf') => {
    const off = new Set(skip.split(' ').filter(Boolean));
    const q = (n, a, b, c, d) => { if (!off.has(n)) quad(sink, a, b, c, d, zone); };
    q('px', [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    q('nx', [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
    q('py', [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
    q('ny', [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    q('pz', [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    q('nz', [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  };
  const prismZ = (sink, cx, cy, z0, z1, r, seg, phase = 0, zone = 'leaf') => {
    const ring = [];
    for (let i = 0; i < seg; i++) {
      const a = phase + (i / seg) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    for (let i = 0; i < seg; i++) {
      const p = ring[i], q = ring[(i + 1) % seg];
      quad(sink, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], zone);
    }
    for (let i = 1; i < seg - 1; i++) {
      tri(sink, [ring[0][0], ring[0][1], z1], [ring[i][0], ring[i][1], z1], [ring[i + 1][0], ring[i + 1][1], z1], zone);
    }
  };

  const ZF = T / 2, ZS = T / 2 - CH;
  for (const s of [1, -1]) {
    const P = (x, y, z) => [x, y, s * z];
    const Q = (sink, a, b, c, d, zone) => { if (s > 0) quad(sink, a, b, c, d, zone); else quad(sink, d, c, b, a, zone); };
    const R = (x0, y0, x1, y1, z) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];
    const band = (sink, A, B, zone) => { for (let i = 0; i < 4; i++) Q(sink, A[i], A[(i + 1) % 4], B[(i + 1) % 4], B[i], zone); };

    for (let r = 0; r < layout.rows.length - 1; r++) {
      const zone = r === 0 ? 'wear' : 'leaf';
      let c = 0;
      while (c < layout.cols.length - 1) {
        if (layout.cells[`${r},${c}`]) { c++; continue; }
        let e = c;
        while (e < layout.cols.length - 1 && !layout.cells[`${r},${e}`]) e++;
        Q(F, ...R(layout.cols[c], layout.rows[r], layout.cols[e], layout.rows[r + 1], ZF), zone);
        c = e + 1;
      }
    }
    for (const k of Object.keys(layout.cells)) {
      const [r, c] = k.split(',').map(Number);
      const x0 = layout.cols[c], x1 = layout.cols[c + 1], y0 = layout.rows[r], y1 = layout.rows[r + 1];
      const A = R(x0, y0, x1, y1, ZF);
      if (layout.cells[k] === 'glass') {
        band(F, A, R(x0 + GR, y0 + GR, x1 - GR, y1 - GR, GZ), 'leaf');
        Q(pane, ...R(x0 + GR - GBURY, y0 + GR - GBURY, x1 - GR + GBURY, y1 - GR + GBURY, GT), 'glass');
      } else {
        const B = R(x0 + MR, y0 + MR, x1 - MR, y1 - MR, ZF - PD);
        band(F, A, B, 'leaf');
        Q(F, ...B, 'panel');
      }
    }
    band(F, R(0, 0, W, H, ZS), R(CH, CH, W - CH, H - CH, ZF), 'leaf');
  }

  const P4 = [[0, 0], [W, 0], [W, H], [0, H]];
  for (let i = 0; i < 4; i++) {
    const a = P4[i], b = P4[(i + 1) % 4];
    quad(F, [a[0], a[1], -ZS], [b[0], b[1], -ZS], [b[0], b[1], ZS], [a[0], a[1], ZS], i === 0 ? 'wear' : 'leaf');
  }
  for (const k of Object.keys(layout.cells)) {
    if (layout.cells[k] !== 'glass') continue;
    const [r, c] = k.split(',').map(Number);
    const x0 = layout.cols[c] + GR, x1 = layout.cols[c + 1] - GR, y0 = layout.rows[r] + GR, y1 = layout.rows[r + 1] - GR;
    const Fq = [[x0, y0, GZ], [x1, y0, GZ], [x1, y1, GZ], [x0, y1, GZ]];
    const Bq = Fq.map(([x, y]) => [x, y, -GZ]);
    for (let i = 0; i < 4; i++) quad(F, Fq[i], Fq[(i + 1) % 4], Bq[(i + 1) % 4], Bq[i], 'leaf');
  }

  // Brass hardware.
  const leverSet = (droop) => {
    const cx = W - 0.070, z0 = T / 2 - 0.001;
    openBox(F, W - 0.105, LEVER_Y - 0.115, z0, W - 0.035, LEVER_Y + 0.115, T / 2 + 0.004, 'nz', 'brass');
    prismZ(F, cx, LEVER_Y, z0, T / 2 + 0.028, 0.020, 8, Math.PI / 8, 'brass');
    const start = F.faces.length;
    openBox(F, W - 0.185, LEVER_Y - 0.014, T / 2 + 0.016, cx + 0.014, LEVER_Y + 0.013, T / 2 + 0.050, '', 'brass');
    openBox(F, W - 0.185, LEVER_Y - 0.044, T / 2 + 0.022, W - 0.157, LEVER_Y - 0.008, T / 2 + 0.048, 'py nz', 'brass');
    // translate(-cx,-LEVER_Y,0) * rotateZ(droop) * translate(cx,LEVER_Y,0)
    const c = Math.cos(droop), s = Math.sin(droop);
    for (let i = start; i < F.faces.length; i++) {
      F.faces[i].pts = F.faces[i].pts.map(([x, y, z]) => {
        const dx = x - cx, dy = y - LEVER_Y;
        return [cx + dx * c - dy * s, LEVER_Y + dx * s + dy * c, z];
      });
    }
  };
  const mirrorFaces = (faces) => {
    const out = [];
    for (const f of faces) {
      for (let i = 1; i + 1 < f.pts.length; i++) {
        const pts = [f.pts[0], f.pts[i], f.pts[i + 1]].map(([x, y, z]) => [x, y, -z]);
        out.push({ ...f, pts: [pts[0], pts[2], pts[1]] });
      }
    }
    return out;
  };
  const before = F.faces.length;
  leverSet(lived * 4 * Math.PI / 180);
  const mirrored = mirrorFaces(F.faces.slice(before));
  F.faces.push(...mirrored);

  // Hinges: two mirrored plates per hinge plus a real THREE cylinder knuckle.
  const prims = [];
  for (const y of HINGE_Y) {
    const start = F.faces.length;
    openBox(F, 0.014, y - 0.065, T / 2 - 0.001, 0.078, y + 0.065, T / 2 + 0.003, 'nz', 'brass');
    F.faces.push(...mirrorFaces(F.faces.slice(start)));
    const knuckle = g.prim({ type: 'CylinderGeometry', args: [0.010, 0.010, 0.130, 8], x: 0.008, y, z: T / 2, ry: Math.PI / 8, zone: 'brass' });
    prims.push(g.deform({ geom: knuckle, expr: `[x - ${W / 2}, y - ${SAG / W}*x + ${SAG}, z]` }));
  }

  // Latch forend.
  openBox(F, W - 0.002, LEVER_Y - 0.055, -0.008, W + 0.002, LEVER_Y + 0.055, 0.008, 'nx', 'brass');

  // Lived-in shear and leaf placement.
  const M = [1, -SAG / W, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, SAG, 0, 1];
  const finish = (sink) => sink.faces.map((f) => ({
    ...f, pts: f.pts.map((p) => { const q = applyMat4(p, M); return [q[0] - W / 2, q[1], q[2]]; }),
  }));
  const bodyFaces = finish(F);
  const paneFaces = finish(pane);
  const all = g.join([g.faces({ faces: [...bodyFaces, ...paneFaces] }), ...prims]);
  return g.mesh(all, {
    zones: { leaf: at(pal, 'leaf'), panel: at(pal, 'panel'), glass: at(pal, 'glass'), brass: at(pal, 'brass'), wear },
    materials: { glass: { slot: 'glass', transparent: true, opacity: 0.6, roughness: 0.25, metalness: 0 } },
    name: 'interior-door-leaf',
  });
}
