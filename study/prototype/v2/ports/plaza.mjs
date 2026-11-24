// Composite plaza tile — geometric port of the reference face builder. The
// default build is twin seams with all light bars lit and the service socket
// on. Every face keeps the reference's zone and orientation hint.
import { faceSink } from './_facekit.mjs';

const HALF = 2.000;
const DECK_Y = 0.050;
const FIELD_Y = 0.085;
const TROUGH_Y = 0.0355;
const CHAN_Y = 0.0245;
const BEVEL = 0.018;
const SEAM_HW = 0.090;
const SEAM_CH = 0.022;
const CHAN_HW = 0.036;
const CHAN_CH = 0.012;
const BAR_HW = 0.034;
const BAR_Y0 = 0.0265;
const BAR_Y1 = 0.0335;
const FX = 1.640;
const FXC = 1.618;
const SOC_HW = 0.220;
const SOC_X = 1.300;
const STATIONS = [-1.0, 1.0];

const PALETTE = {
  'gallery-white': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#5fb3e0', edge: '#3f4a58', ring: '#6e7f92', cap: '#a9b6c4' },
  'atrium-mint': { deck: '#ffffff', seam: '#c8d2dc', strip: '#7fe7da', edge: '#2a323d', ring: '#7b8a9c', cap: '#a9b6c4' },
  'promenade-violet': { deck: '#e6ecf2', seam: '#a9b6c4', strip: '#b7a6f5', edge: '#2a323d', ring: '#5d6b7c', cap: '#8e9eae' },
  'transit-blossom': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#ff9ec7', edge: '#1b212a', ring: '#5d6b7c', cap: '#9aa8b8' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'gallery-white', { options: Object.keys(PALETTE), label: 'Colorway' });
  const deck = g.input('deck', 'color', '', { label: 'Deck' });
  const seam = g.input('seam', 'color', '', { label: 'Seam' });
  const strip = g.input('strip', 'color', '', { label: 'Light strip' });
  const edge = g.input('edge', 'color', '', { label: 'Underside' });
  const ring = g.input('ring', 'color', '', { label: 'Socket rim' });
  const cap = g.input('cap', 'color', '', { label: 'Socket cap' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'gallery-white',
    overrides: { deck, seam, strip, edge, ring, cap },
  });

  const F = faceSink();
  const face = (pts, zone, hint) => F.poly(pts, zone, hint);
  const slab = (x0, x1, z0, z1, y, zone = 'deck') =>
    face([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], zone, [0, 1, 0]);
  const ringOut = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  const ringAt = (a0, y0, a1, y1, cx, cz, ref) => {
    const A = [[-a0, -a0], [a0, -a0], [a0, a0], [-a0, a0]];
    const B = [[-a1, -a1], [a1, -a1], [a1, a1], [-a1, a1]];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      face([
        [cx + A[i][0], y0, cz + A[i][1]], [cx + A[j][0], y0, cz + A[j][1]],
        [cx + B[j][0], y1, cz + B[j][1]], [cx + B[i][0], y1, cz + B[i][1]],
      ], 'ring', ref || ringOut[i]);
    }
  };

  const cuts = [-HALF];
  for (const s of STATIONS) cuts.push(s - SEAM_HW, s + SEAM_HW);
  cuts.push(HALF);
  const regions = [];
  for (let i = 0; i < cuts.length; i += 2) {
    regions.push({ z0: cuts[i], z1: cuts[i + 1], raised: i > 0 && i < cuts.length - 2 });
  }
  const hAt = (r, x) => {
    if (!r.raised) return DECK_Y;
    const a = Math.abs(x);
    if (a <= FXC) return FIELD_Y;
    if (a >= FX) return DECK_Y;
    return FIELD_Y + (DECK_Y - FIELD_Y) * ((a - FXC) / (FX - FXC));
  };

  const soc = { r: regions[2], z: 1.39, y: DECK_Y };

  for (const r of regions) {
    const spans = r.raised
      ? [[-HALF, -FX, DECK_Y], [-FXC, FXC, FIELD_Y], [FX, HALF, DECK_Y]]
      : [[-HALF, HALF, DECK_Y]];
    for (const [x0, x1, y] of spans) {
      if (soc && soc.r === r && x0 < SOC_X - SOC_HW && x1 > SOC_X + SOC_HW) {
        const sx0 = SOC_X - SOC_HW, sx1 = SOC_X + SOC_HW;
        const sz0 = soc.z - SOC_HW, sz1 = soc.z + SOC_HW;
        slab(x0, sx0, r.z0, r.z1, y);
        slab(sx1, x1, r.z0, r.z1, y);
        slab(sx0, sx1, r.z0, sz0, y);
        slab(sx0, sx1, sz1, r.z1, y);
      } else {
        slab(x0, x1, r.z0, r.z1, y);
      }
    }
    if (r.raised) {
      for (const s of [-1, 1]) {
        face([
          [s * FXC, FIELD_Y, r.z0], [s * FXC, FIELD_Y, r.z1],
          [s * FX, DECK_Y, r.z1], [s * FX, DECK_Y, r.z0],
        ], 'deck', [s * 0.7, 0.7, 0]);
      }
    }
  }

  const XS = [-HALF, -FX, -FXC, FXC, FX, HALF];
  for (let si = 0; si < STATIONS.length; si++) {
    const s = STATIONS[si], L = regions[si], R = regions[si + 1];
    const prof = (x) => {
      const pts = [[-SEAM_HW, hAt(L, x)], [-SEAM_HW + SEAM_CH, TROUGH_Y]];
      pts.push([-CHAN_HW - CHAN_CH, TROUGH_Y], [-CHAN_HW, CHAN_Y],
        [CHAN_HW, CHAN_Y], [CHAN_HW + CHAN_CH, TROUGH_Y]);
      pts.push([SEAM_HW - SEAM_CH, TROUGH_Y], [SEAM_HW, hAt(R, x)]);
      return pts;
    };
    for (let k = 0; k < XS.length - 1; k++) {
      const xa = XS[k], xb = XS[k + 1], pa = prof(xa), pb = prof(xb);
      for (let j = 0; j < pa.length - 1; j++) {
        face([
          [xa, pa[j][1], s + pa[j][0]], [xb, pb[j][1], s + pb[j][0]],
          [xb, pb[j + 1][1], s + pb[j + 1][0]], [xa, pa[j + 1][1], s + pa[j + 1][0]],
        ], 'seam', [0, 1, 0]);
      }
    }
    const z0 = s - BAR_HW, z1 = s + BAR_HW;
    slab(-HALF, HALF, z0, z1, BAR_Y1, 'strip');
    face([[-HALF, BAR_Y0, z0], [HALF, BAR_Y0, z0], [HALF, BAR_Y0, z1], [-HALF, BAR_Y0, z1]], 'strip', [0, -1, 0]);
    for (const sg of [-1, 1]) {
      const z = s + sg * BAR_HW;
      face([[-HALF, BAR_Y0, z], [HALF, BAR_Y0, z], [HALF, BAR_Y1, z], [-HALF, BAR_Y1, z]], 'strip', [0, 0, sg]);
    }
    for (const sg of [-1, 1]) {
      const x = sg * HALF;
      face([[x, BAR_Y0, z0], [x, BAR_Y0, z1], [x, BAR_Y1, z1], [x, BAR_Y1, z0]], 'strip', [sg, 0, 0]);
    }
  }

  if (soc) {
    const y = soc.y, wellY = y - 0.018;
    ringAt(SOC_HW, y, 0.196, wellY, SOC_X, soc.z, [0, 1, 0]);
    ringAt(0.196, wellY, 0.150, wellY, SOC_X, soc.z, [0, 1, 0]);
    ringAt(0.150, wellY, 0.150, y - 0.005, SOC_X, soc.z, null);
    slab(SOC_X - 0.150, SOC_X + 0.150, soc.z - 0.150, soc.z + 0.150, y - 0.005, 'cap');
  }

  for (const sg of [-1, 1]) {
    const z = sg * HALF;
    face([[-HALF, BEVEL, z], [HALF, BEVEL, z], [HALF, DECK_Y, z], [-HALF, DECK_Y, z]], 'edge', [0, 0, sg]);
  }
  for (const sg of [-1, 1]) {
    const x = sg * HALF;
    const line = [[-HALF, DECK_Y]];
    for (const s of STATIONS) {
      const pts = [[-SEAM_HW, DECK_Y], [-SEAM_HW + SEAM_CH, TROUGH_Y],
        [-CHAN_HW - CHAN_CH, TROUGH_Y], [-CHAN_HW, CHAN_Y],
        [CHAN_HW, CHAN_Y], [CHAN_HW + CHAN_CH, TROUGH_Y],
        [SEAM_HW - SEAM_CH, TROUGH_Y], [SEAM_HW, DECK_Y]];
      for (const [dz, y] of pts) line.push([s + dz, y]);
    }
    line.push([HALF, DECK_Y]);
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i], b = line[i + 1];
      face([[x, BEVEL, a[0]], [x, BEVEL, b[0]], [x, b[1], b[0]], [x, a[1], a[0]]], 'edge', [sg, 0, 0]);
    }
  }
  const inner = HALF - BEVEL;
  ringAt(HALF, BEVEL, inner, 0, 0, 0, [0, -1, 0]);
  face([[-inner, 0, -inner], [-inner, 0, inner], [inner, 0, inner], [inner, 0, -inner]], 'edge', [0, -1, 0]);

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { deck: at(pal, 'deck'), seam: at(pal, 'seam'), strip: at(pal, 'strip'), edge: at(pal, 'edge'), ring: at(pal, 'ring'), cap: at(pal, 'cap') },
  });
}
