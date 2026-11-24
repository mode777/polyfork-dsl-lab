// Maxima clam — geometric port of the reference ribbed valve builder. The two
// valves share one column grid; the upper valve is baked in its open-hinge
// world position (the reference's hinge rotation is zero at default).
import { faceSink } from './_facekit.mjs';

const RX = 0.0702, RZ = 0.0621, HB = 0.052, HT = 0.062, YG = HB, RIBY = 0.010, ZC = -0.0004;

const PALETTE = {
  'maxima-blue': { shell: '#E8C88A', margin: '#B8894A', nacre: '#F6F2E8', mantle: '#3B5FC4', mantleDeep: '#2A3E8F', stripe: '#F6C13A', spot: '#2B2E33' },
  'crocea-teal': { shell: '#D4AC6A', margin: '#8C6236', nacre: '#F7F2E6', mantle: '#4E9AAE', mantleDeep: '#1B4E6B', stripe: '#7FD4A8', spot: '#2B2E33' },
  'squamosa-gold': { shell: '#C9B79B', margin: '#7E7059', nacre: '#E6DCC6', mantle: '#F6C13A', mantleDeep: '#E85F1E', stripe: '#FFF9EA', spot: '#2B2E33' },
  'derasa-violet': { shell: '#E8C88A', margin: '#B8894A', nacre: '#F6F2E8', mantle: '#6E4FA8', mantleDeep: '#2A3E8F', stripe: '#B0568C', spot: '#2B2E33' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'maxima-blue', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'maxima-blue' });

  const ribs = 9, flute = 0.17, dome = 1.0, nc = ribs * 2;
  const cols = [];
  for (let i = 0; i < nc; i++) {
    const psi = i * 2 * Math.PI / nc;
    const phi = Math.PI / 2 + psi;
    const cx = Math.cos(phi), cz = Math.sin(phi);
    const ell = 1 / Math.sqrt((cx / RX) ** 2 + (cz / RZ) ** 2);
    const j = Math.min(i, nc - i);
    cols.push({
      cx, cz, j,
      base: ell * (1 + (hash(j * 3.7) - 0.5) * 0.05),
      ribc: Math.cos(ribs * psi + Math.PI),
      fan: 0.55 + 0.45 * (1 + Math.cos(psi)) / 2,
      yj: (hash(j * 7.3 + 1) - 0.5) * 0.0030,
    });
  }
  const ring = (kr, ky, kb, kz = 0) => cols.map((c) => {
    const KR = typeof kr === 'function' ? kr(c) : kr;
    const KY = typeof ky === 'function' ? ky(c) : ky;
    const r = c.base * KR * (1 + flute * c.ribc * kb * c.fan);
    return [r * c.cx, KY + (RIBY * c.ribc + c.yj) * kb, r * c.cz + kz * RZ + ZC];
  });

  const F = faceSink();
  const band = (A, B, zoneFn) => {
    for (let i = 0; i < A.length; i++) {
      const k = (i + 1) % A.length;
      F.quad(A[i], A[k], B[k], B[i], zoneFn(i));
    }
  };
  const cap = (R, centre, up, zone) => {
    for (let i = 0; i < R.length; i++) {
      const k = (i + 1) % R.length;
      if (up) F.tri(centre, R[k], R[i], zone);
      else F.tri(centre, R[i], R[k], zone);
    }
  };

  const KR = { roll: 1.045, flank: 1.000, mid: 0.890, mid2: 0.730, shoulder: 0.500, crown: 0.300, lip: 0.860, floor: 0.26 };
  const KT = { roll: 0.165, flank: 0.365, mid: 0.565, mid2: 0.745, shoulder: 0.870, crown: 1.000 };
  const KZ = { roll: -0.012, flank: -0.050, mid: -0.088, mid2: -0.124, shoulder: -0.158, crown: -0.185 };
  const KB = { rim: 1.0, roll: 1.0, flank: 0.95, mid: 0.84, mid2: 0.60, shoulder: 0.33, crown: 0.13, lip: 0.90, floor: 0.26 };

  function valve(s) {
    const H = s < 0 ? HB : HT * dome;
    const rimY = YG;
    const lipY = YG + s * 0.012;
    const up = s > 0;
    const yAt = (k) => rimY + s * KT[k] * H;
    const rim = ring(1.0, rimY, KB.rim, 0);
    const roll = ring(KR.roll, yAt('roll'), KB.roll, KZ.roll);
    const flank = ring(KR.flank, yAt('flank'), KB.flank, KZ.flank);
    const mid = ring(KR.mid, yAt('mid'), KB.mid, KZ.mid);
    const mid2 = ring(KR.mid2, yAt('mid2'), KB.mid2, KZ.mid2);
    const shoulder = ring(KR.shoulder, yAt('shoulder'), KB.shoulder, KZ.shoulder);
    const crown = ring(KR.crown, yAt('crown'), up ? KB.crown : 0, KZ.crown);
    const crownC = [0, up ? rimY + 1.06 * H : 0, KZ.crown * RZ + ZC];
    const lip = s < 0 ? null : ring(KR.lip, lipY, KB.lip, 0);

    if (s < 0) {
      band(rim, roll, () => 'margin');
      band(roll, flank, () => 'shell');
      band(flank, mid, () => 'shell');
      band(mid, mid2, () => 'shell');
      band(mid2, shoulder, () => 'shell');
      band(shoulder, crown, () => 'shell');
      cap(crown, crownC, false, 'shell');
    } else {
      const fy = 0.62;
      const floor = ring(KR.floor, rimY + fy * H, KB.floor, KZ.crown);
      const floorC = [0, rimY + (fy + 0.07) * H, KZ.crown * RZ + ZC];
      band(rim, lip, () => 'margin');
      band(lip, floor, () => 'nacre');
      cap(floor, floorC, false, 'nacre');
      cap(crown, crownC, true, 'shell');
      band(crown, shoulder, () => 'shell');
      band(shoulder, mid2, () => 'shell');
      band(mid2, mid, () => 'shell');
      band(mid, flank, () => 'shell');
      band(flank, roll, () => 'shell');
      band(roll, rim, () => 'margin');
    }
  }

  const rimRing = ring(1.0, YG, KB.rim, 0);

  function mantle() {
    const capC = [0, YG - 0.038, -0.11 * RZ + ZC];
    const k1 = ring(0.20, YG - 0.030, 0.10, -0.090);
    const k2 = ring(0.41, YG - 0.019, 0.22, -0.050);
    const k3 = ring(0.58, YG - 0.011, 0.34, -0.030);
    const k4 = ring(0.71, YG - 0.008, 0.60, -0.026);
    const k5 = ring(0.84, YG - 0.014, 0.60, -0.028);
    const k6 = ring(0.90, YG - 0.017, 0.95, -0.030);
    const qs = (i) => Math.min(i, nc - 1 - i);
    const cRay = (i) => (qs(i) % 4 === 0 ? 'stripe' : 'mantle');
    const cLip = (i) => (qs(i) % 4 === 2 ? 'spot' : 'stripe');
    cap(k1, capC, true, 'mantleDeep');
    band(k1, k2, () => 'mantleDeep');
    band(k2, k3, cRay);
    band(k3, k4, cRay);
    band(k4, k5, cLip);
    band(k5, k6, () => 'mantleDeep');
    band(k6, rimRing, () => 'nacre');
  }

  valve(-1);
  mantle();
  valve(1);

  return g.mesh(g.faces({ faces: F.faces }), {
    zones: { shell: at(pal, 'shell'), margin: at(pal, 'margin'), nacre: at(pal, 'nacre'), mantle: at(pal, 'mantle'), mantleDeep: at(pal, 'mantleDeep'), stripe: at(pal, 'stripe'), spot: at(pal, 'spot') },
  });
}
