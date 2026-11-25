// Composite plaza tile — deck slabs and socket cap are isolated quads; seam
// grooves, socket rings and edge skirts are lofts; lit bars are blocks.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'gallery-white': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#5fb3e0', edge: '#3f4a58', ring: '#6e7f92', cap: '#a9b6c4' },
  'atrium-mint': { deck: '#ffffff', seam: '#c8d2dc', strip: '#7fe7da', edge: '#2a323d', ring: '#7b8a9c', cap: '#a9b6c4' },
  'promenade-violet': { deck: '#e6ecf2', seam: '#a9b6c4', strip: '#b7a6f5', edge: '#2a323d', ring: '#5d6b7c', cap: '#8e9eae' },
  'transit-blossom': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#ff9ec7', edge: '#1b212a', ring: '#5d6b7c', cap: '#9aa8b8' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const PL_HALF = 2.000, PL_DECK_Y = 0.050, PL_FIELD_Y = 0.085, PL_TROUGH_Y = 0.0355;
const PL_CHAN_Y = 0.0245, PL_BEVEL = 0.018, PL_SEAM_HW = 0.090, PL_SEAM_CH = 0.022;
const PL_CHAN_HW = 0.036, PL_CHAN_CH = 0.012, PL_BAR_HW = 0.034;
const PL_BAR_Y0 = 0.0265, PL_BAR_Y1 = 0.0335, PL_FX = 1.640, PL_FXC = 1.618;
const PL_SOC_HW = 0.220, PL_SOC_X = 1.300;

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'gallery-white', { options: Object.keys(PALETTE), label: 'Colorway' });
  const deck = g.input('deck', 'color', '', { label: 'Deck' });
  const seam = g.input('seam', 'color', '', { label: 'Seam' });
  const strip = g.input('strip', 'color', '', { label: 'Light strip' });
  const edge = g.input('edge', 'color', '', { label: 'Underside' });
  const ring = g.input('ring', 'color', '', { label: 'Socket rim' });
  const cap = g.input('cap', 'color', '', { label: 'Socket cap' });
  const seams = params.seams ?? 'twin', strips = params.strips ?? 'all', socketOn = params.socket !== false;

  const stations = seams === 'single' ? [0] : seams === 'quad' ? [-1.5, -0.5, 0.5, 1.5] : [-1, 1];
  const lit = stations.map((_, i) => strips === 'all' || (strips === 'one' && i === stations.length - 1));
  const parts = [];
  const poly = (pts, zone, hint) => parts.push(g.poly({ pts, zone, hint }));
  const slab = (x0, x1, z0, z1, y, zone = 'deck') =>
    poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], zone, [0, 1, 0]);
  const loft = (A, B, zone, skip, flip = false) => parts.push(g.loft({
    rings: [A, B], diagonal: 'abba', skipEdges: skip === undefined ? [] : [skip], flip, zones: { band: zone },
  }));
  const ringOut = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  const ringAt = (a0, y0, a1, y1, cx, cz) => {
    const A = [[-a0, -a0], [a0, -a0], [a0, a0], [-a0, a0]].map(([x, z]) => [cx + x, y0, cz + z]);
    const B = [[-a1, -a1], [a1, -a1], [a1, a1], [-a1, a1]].map(([x, z]) => [cx + x, y1, cz + z]);
    loft(A, B, 'ring', undefined, true);
  };

  const cuts = [-PL_HALF];
  for (const s of stations) cuts.push(s - PL_SEAM_HW, s + PL_SEAM_HW);
  cuts.push(PL_HALF);
  const regions = [];
  for (let i = 0; i < cuts.length; i += 2) regions.push({ z0: cuts[i], z1: cuts[i + 1], raised: i > 0 && i < cuts.length - 2 });
  const hAt = (r, x) => {
    if (!r.raised) return PL_DECK_Y;
    const a = Math.abs(x);
    if (a <= PL_FXC) return PL_FIELD_Y;
    if (a >= PL_FX) return PL_DECK_Y;
    return PL_FIELD_Y + (PL_DECK_Y - PL_FIELD_Y) * ((a - PL_FXC) / (PL_FX - PL_FXC));
  };
  let soc = null;
  if (socketOn) {
    const want = 1.40;
    let best = null;
    for (const r of regions) {
      if (r.z1 - r.z0 < 2 * PL_SOC_HW + 0.16) continue;
      const d = Math.max(r.z0 - want, 0, want - r.z1);
      if (!best || d < best.d) best = { r, d };
    }
    if (best) {
      const r = best.r;
      const z = Math.min(Math.max(r.z0 + 0.30, r.z0 + PL_SOC_HW + 0.06), r.z1 - PL_SOC_HW - 0.06);
      soc = { r, z, y: hAt(r, PL_SOC_X) };
    }
  }

  for (const r of regions) {
    const spans = r.raised ? [[-PL_HALF, -PL_FX, PL_DECK_Y], [-PL_FXC, PL_FXC, PL_FIELD_Y], [PL_FX, PL_HALF, PL_DECK_Y]] : [[-PL_HALF, PL_HALF, PL_DECK_Y]];
    for (const [x0, x1, y] of spans) {
      if (soc && soc.r === r && x0 < PL_SOC_X - PL_SOC_HW && x1 > PL_SOC_X + PL_SOC_HW) {
        const sx0 = PL_SOC_X - PL_SOC_HW, sx1 = PL_SOC_X + PL_SOC_HW;
        const sz0 = soc.z - PL_SOC_HW, sz1 = soc.z + PL_SOC_HW;
        slab(x0, sx0, r.z0, r.z1, y); slab(sx1, x1, r.z0, r.z1, y);
        slab(sx0, sx1, r.z0, sz0, y); slab(sx0, sx1, sz1, r.z1, y);
      } else slab(x0, x1, r.z0, r.z1, y);
    }
    if (r.raised) for (const s of [-1, 1]) poly([
      [s * PL_FXC, PL_FIELD_Y, r.z0], [s * PL_FXC, PL_FIELD_Y, r.z1],
      [s * PL_FX, PL_DECK_Y, r.z1], [s * PL_FX, PL_DECK_Y, r.z0],
    ], 'deck', [s * 0.7, 0.7, 0]);
  }

  const XS = [-PL_HALF, -PL_FX, -PL_FXC, PL_FXC, PL_FX, PL_HALF];
  for (let si = 0; si < stations.length; si++) {
    const s = stations[si], L = regions[si], R = regions[si + 1];
    const prof = (x) => {
      const pts = [[-PL_SEAM_HW, hAt(L, x)], [-PL_SEAM_HW + PL_SEAM_CH, PL_TROUGH_Y]];
      if (lit[si]) pts.push([-PL_CHAN_HW - PL_CHAN_CH, PL_TROUGH_Y], [-PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW + PL_CHAN_CH, PL_TROUGH_Y]);
      pts.push([PL_SEAM_HW - PL_SEAM_CH, PL_TROUGH_Y], [PL_SEAM_HW, hAt(R, x)]);
      return pts;
    };
    for (let k = 0; k < XS.length - 1; k++) {
      const xa = XS[k], xb = XS[k + 1], pa = prof(xa), pb = prof(xb);
      const A = pa.map(([z, y]) => [xa, y, s + z]), B = pb.map(([z, y]) => [xb, y, s + z]);
      loft(A, B, 'seam', pa.length - 1);
    }
    if (lit[si]) {
      parts.push(g.block({
        x0: -PL_HALF, x1: PL_HALF, y0: PL_BAR_Y0, y1: PL_BAR_Y1,
        z0: s - PL_BAR_HW, z1: s + PL_BAR_HW, zone: 'strip',
      }));
    }
  }

  if (soc) {
    const y = soc.y, wellY = y - 0.018;
    ringAt(PL_SOC_HW, y, 0.196, wellY, PL_SOC_X, soc.z);
    ringAt(0.196, wellY, 0.150, wellY, PL_SOC_X, soc.z);
    ringAt(0.150, wellY, 0.150, y - 0.005, PL_SOC_X, soc.z);
    slab(PL_SOC_X - 0.150, PL_SOC_X + 0.150, soc.z - 0.150, soc.z + 0.150, y - 0.005, 'cap');
  }

  for (const sg of [-1, 1]) {
    const z = sg * PL_HALF;
    poly([[-PL_HALF, PL_BEVEL, z], [PL_HALF, PL_BEVEL, z], [PL_HALF, PL_DECK_Y, z], [-PL_HALF, PL_DECK_Y, z]], 'edge', [0, 0, sg]);
  }
  for (const sg of [-1, 1]) {
    const x = sg * PL_HALF;
    const line = [[-PL_HALF, PL_DECK_Y]];
    for (let si = 0; si < stations.length; si++) {
      const s = stations[si];
      const pts = [[-PL_SEAM_HW, PL_DECK_Y], [-PL_SEAM_HW + PL_SEAM_CH, PL_TROUGH_Y]];
      if (lit[si]) pts.push([-PL_CHAN_HW - PL_CHAN_CH, PL_TROUGH_Y], [-PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW, PL_CHAN_Y], [PL_CHAN_HW + PL_CHAN_CH, PL_TROUGH_Y]);
      pts.push([PL_SEAM_HW - PL_SEAM_CH, PL_TROUGH_Y], [PL_SEAM_HW, PL_DECK_Y]);
      for (const [dz, y] of pts) line.push([s + dz, y]);
    }
    line.push([PL_HALF, PL_DECK_Y]);
    const A = line.map(([z]) => [x, PL_BEVEL, z]);
    const B = line.map(([z, y]) => [x, y, z]);
    loft(A, B, 'edge', line.length - 1, sg < 0);
  }

  const inner = PL_HALF - PL_BEVEL;
  ringAt(PL_HALF, PL_BEVEL, inner, 0, 0, 0);
  poly([[-inner, 0, -inner], [-inner, 0, inner], [inner, 0, inner], [inner, 0, -inner]], 'edge', [0, -1, 0]);

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'gallery-white',
    overrides: { deck, seam, strip, edge, ring, cap },
  });
  return g.mesh(g.join(parts), {
    zones: { deck: at(pal, 'deck'), seam: at(pal, 'seam'), strip: at(pal, 'strip'), edge: at(pal, 'edge'), ring: at(pal, 'ring'), cap: at(pal, 'cap') },
  });
}
