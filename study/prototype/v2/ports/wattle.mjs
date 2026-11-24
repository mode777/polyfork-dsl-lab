// Wattle fence run — geometric port of the reference straight piece. The
// module-edge stakes and lashings plus the mirrored sail line and 11 woven
// rows reproduce the default 1.2 m run.
import { faceSink } from './_facekit.mjs';

const MOD = 4.0, RP = 0.06, RS = 0.04, ROD_H = 0.068, ROD_W = 0.04;
const PITCH = 0.08, ROW_BOT = 0.12, SAIL_PITCH = 0.5;
const COS30 = Math.cos(Math.PI / 6);
const PALETTE = {
  seasoned: { stake: '#7f5430', withy: '#a88661', rope: '#b49970' },
  peeled: { stake: '#6b4326', withy: '#c8b89e', rope: '#b49970' },
  weathered: { stake: '#625249', withy: '#a9977e', rope: '#b8a88e' },
  'fresh-hazel': { stake: '#4e301c', withy: '#9b673d', rope: '#c8b89e' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const prng = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'seasoned', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'seasoned' });

  const H = 1.2, u = 0.5;
  const rand = prng(1307);
  const F = faceSink();

  const triOut = (a, b, c, zone, inside) => F.tri(a, b, c, zone, undefined, inside);
  const quadOut = (a, b, c, d, zone, inside) => F.quad(a, b, c, d, zone, undefined, inside);
  const fanOut = (ring, zone, inside) => { for (let k = 1; k < ring.length - 1; k++) triOut(ring[0], ring[k], ring[k + 1], zone, inside); };

  const hexRing = (x, z, r, rot, y) => {
    const ring = [];
    for (let k = 0; k < 6; k++) {
      const a = rot + k * Math.PI / 3;
      ring.push([x + r * Math.cos(a), typeof y === 'function' ? y(a) : y, z + r * Math.sin(a)]);
    }
    return ring;
  };
  const flatRot = (nx, nz) => Math.atan2(nz, nx) - Math.PI / 2;

  function stake(x, z, r, h, rot, top, y0 = 0, capBottom = true) {
    const bot = hexRing(x, z, r, rot, y0);
    let sideTop, cap;
    if (top.chamfer) {
      const c = top.chamfer;
      sideTop = hexRing(x, z, r, rot, h - c);
      cap = hexRing(x, z, r * 0.6, rot, h);
      for (let k = 0; k < 6; k++) {
        const k1 = (k + 1) % 6;
        quadOut(sideTop[k], sideTop[k1], cap[k1], cap[k], 'stake', [x, h - c * 2, z]);
      }
    } else {
      const [tilt, dir] = top.bevel;
      const t = Math.tan(tilt);
      sideTop = hexRing(x, z, r, rot, (a) => h + t * r * Math.cos(a - dir));
      cap = sideTop;
    }
    const mid = [x, (y0 + h) / 2, z];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      quadOut(bot[k], bot[k1], sideTop[k1], sideTop[k], 'stake', mid);
    }
    fanOut(cap, 'stake', [x, h - 0.1, z]);
    if (capBottom) fanOut(bot, 'stake', [x, y0 + 0.1, z]);
  }

  function lashing(x, z, r, rot, y, hh = 0.045) {
    const lo = hexRing(x, z, r * 0.97, rot, y - hh);
    const md = hexRing(x, z, r + 0.017, rot, y);
    const hi = hexRing(x, z, r * 0.97, rot, y + hh);
    const ax = [x, y, z];
    for (let k = 0; k < 6; k++) {
      const k1 = (k + 1) % 6;
      quadOut(lo[k], lo[k1], md[k1], md[k], 'rope', ax);
      quadOut(md[k], md[k1], hi[k1], hi[k], 'rope', ax);
    }
  }

  function rod(pts, w = ROD_W, h = ROD_H, closed = false) {
    const sec = pts.map((p) => {
      const Fp = [p.x + p.lx * w / 2, p.y + h / 2, p.z + p.lz * w / 2];
      const Bp = [p.x - p.lx * w / 2, p.y + h / 2, p.z - p.lz * w / 2];
      const A = [p.x, p.y - h / 2, p.z];
      const C = [(Fp[0] + Bp[0] + A[0]) / 3, (Fp[1] + Bp[1] + A[1]) / 3, (Fp[2] + Bp[2] + A[2]) / 3];
      return { F: Fp, B: Bp, A, C };
    });
    const n = sec.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const s = sec[i], t = sec[(i + 1) % n];
      const ax = [(s.C[0] + t.C[0]) / 2, (s.C[1] + t.C[1]) / 2, (s.C[2] + t.C[2]) / 2];
      quadOut(s.F, t.F, t.A, s.A, 'withy', ax);
      quadOut(s.B, t.B, t.A, s.A, 'withy', ax);
      quadOut(s.F, t.F, t.B, s.B, 'withy', ax);
    }
    if (!closed) {
      triOut(sec[0].F, sec[0].B, sec[0].A, 'withy', sec[1].C);
      triOut(sec[n - 1].F, sec[n - 1].B, sec[n - 1].A, 'withy', sec[n - 2].C);
    }
  }

  function weave(stakes, rowYs, o) {
    const N = stakes.length;
    const segN = [];
    for (let i = 0; i < N - 1; i++) {
      const dx = stakes[i + 1].x - stakes[i].x, dz = stakes[i + 1].z - stakes[i].z;
      const L = Math.hypot(dx, dz);
      segN.push({ nx: -dz / L, nz: dx / L, L });
    }
    const miter = stakes.map((_, i) => {
      if (i === 0) return [segN[0].nx, segN[0].nz];
      if (i === N - 1) return [segN[N - 2].nx, segN[N - 2].nz];
      const a = segN[i - 1], b = segN[i];
      const k = 1 / (1 + a.nx * b.nx + a.nz * b.nz);
      return [(a.nx + b.nx) * k, (a.nz + b.nz) * k];
    });
    const rr = o.rand, uu = o.u;
    rowYs.forEach((y0, j) => {
      const top = j === rowYs.length - 1;
      const jits = [];
      for (let i = 0; i < N; i++) {
        jits.push(o.mirror && i > N - 1 - i ? jits[N - 1 - i]
          : top ? (rr() * 0.055 - 0.005) * uu : (rr() - 0.5) * 0.011 * uu);
      }
      const pts = stakes.map((s, i) => {
        const side = ((i + j + (o.parity || 0)) % 2 === 0) ? 1 : -1;
        const d = COS30 * s.r + 0.004 + ROD_W / 2;
        const [mx, mz] = miter[i];
        return { x: s.x + side * d * mx, y: y0 + jits[i], z: s.z + side * d * mz, lx: mx, lz: mz };
      });
      const ext = (e, a, b, run) => {
        const f = e / run;
        a.x += (a.x - b.x) * f; a.z += (a.z - b.z) * f; a.y += (a.y - b.y) * f;
      };
      const e0 = typeof o.e0 === 'function' ? o.e0(rr) : o.e0;
      const e1 = o.mirror && o.e1 === o.e0 ? e0 : typeof o.e1 === 'function' ? o.e1(rr) : o.e1;
      ext(e0, pts[0], pts[1], segN[0].L);
      ext(e1, pts[N - 1], pts[N - 2], segN[N - 2].L);
      rod(pts);
    });
  }

  const rows = Math.floor((H - 0.2 - ROW_BOT - ROD_H) / PITCH) + 1;
  const rowYs = Array.from({ length: rows }, (_, j) => ROW_BOT + ROD_H / 2 + j * PITCH);
  const topRowY = rowYs[rows - 1];
  const postH = H + 0.06;

  const edgePost = (x, z, nx, nz) => {
    const rot = flatRot(nx, nz);
    stake(x, z, RP, postH, rot, { chamfer: 0.03 });
    lashing(x, z, RP, rot, topRowY);
  };
  const sailSpec = () => ({
    h: H + (rand() * 0.34 - 0.12) * u,
    tilt: (5 + rand() * 18 * u) * Math.PI / 180,
    dir: rand() * Math.PI * 2,
  });
  const sail = (x, z, nx, nz, sp) => stake(x, z, RS, sp.h, flatRot(nx, nz), { bevel: [sp.tilt, sp.dir] });
  const mirroredSails = (list) => {
    const specs = [];
    list.forEach((s, i) => {
      const j = list.length - 1 - i;
      if (i < j) specs[i] = sailSpec();
      else if (i === j) specs[i] = Object.assign(sailSpec(), { dir: Math.PI / 2 });
      else specs[i] = Object.assign({}, specs[j], { dir: Math.PI - specs[j].dir });
    });
    list.forEach((s, i) => sail(s.x, s.z, 0, 1, specs[i]));
  };
  const leg = (ax, az, bx, bz, minN = 1, even = false) => {
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(minN, even ? 2 * Math.round(L / SAIL_PITCH / 2) : Math.round(L / SAIL_PITCH));
    const out = [];
    for (let i = 1; i < n; i++) out.push({ x: ax + (bx - ax) * i / n, z: az + (bz - az) * i / n, r: RS });
    return out;
  };
  const E = MOD / 2 - RP - 0.018;
  const edgeExt = (r) => RP + 0.012 - r() * 0.04 * u;

  const sails = leg(-E, 0, E, 0, 2, true);
  const line = [{ x: -E, z: 0, r: RP }, ...sails, { x: E, z: 0, r: RP }];
  edgePost(-E, 0, 0, 1);
  edgePost(E, 0, 0, 1);
  mirroredSails(sails);
  weave(line, rowYs, { rand, u, e0: edgeExt, e1: edgeExt, mirror: true });

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { stake: at(pal, 'stake'), withy: at(pal, 'withy'), rope: at(pal, 'rope') },
  });
}
