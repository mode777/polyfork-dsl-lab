// Graph node wrappers for the pure reference builders in builders.mjs.
// Keeping the builders separate lets ports stay short and lets the .pfn show
// the construction at asset/part level instead of a raw face dump.
import { buildPlaza, buildClam, buildTram, buildArmchair, buildWattle, buildQuiver, buildDoor, buildTaxiway, buildRoof, buildCarousel } from './builders.js?v=13';

export function registerParts({ node, V, geom, part, tri, triOut }) {
  const facesToGeom = (faces) => {
    const buckets = new Map();
    for (const f of faces) {
      let P = f.pts.map((q) => [q[0], q[1], q[2]]);
      if (f.flip) P = P.slice().reverse();
      const Q = [];
      for (const q of P) {
        const r = Q[Q.length - 1];
        if (r && Math.abs(q[0] - r[0]) < 1e-9 && Math.abs(q[1] - r[1]) < 1e-9 && Math.abs(q[2] - r[2]) < 1e-9) continue;
        Q.push(q);
      }
      while (Q.length > 1) {
        const a = Q[0], b = Q[Q.length - 1];
        if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9) Q.pop();
        else break;
      }
      P = Q;
      if (P.length < 3) continue;
      let hint = f.hint;
      const inside = f.inside;
      if (!hint && inside) {
        const mid = P.reduce((a, q) => [a[0] + q[0] / P.length, a[1] + q[1] / P.length, a[2] + q[2] / P.length], [0, 0, 0]);
        hint = [mid[0] - inside[0], mid[1] - inside[1], mid[2] - inside[2]];
      }
      if (hint) {
        const n = [0, 0, 0];
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i + 1) % P.length];
          n[0] += (a[1] - b[1]) * (a[2] + b[2]);
          n[1] += (a[2] - b[2]) * (a[0] + b[0]);
          n[2] += (a[0] - b[0]) * (a[1] + b[1]);
        }
        if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) P = P.slice().reverse();
      }
      if (!buckets.has(f.zone)) buckets.set(f.zone, []);
      const out = buckets.get(f.zone);
      if (inside) for (let i = 1; i + 1 < P.length; i++) triOut(out, P[0], P[i], P[i + 1], inside);
      else for (let i = 1; i + 1 < P.length; i++) tri(out, P[0], P[i], P[i + 1]);
    }
    return geom([...buckets.entries()].map(([zone, pos]) => part(pos, zone)));
  };

  node('plazaTile', { in: { seams: V.string, strips: V.string, socket: V.bool }, out: V.geom }, ({ p }) => {
    const faces = buildPlaza({ seams: p.seams ?? 'twin', strips: p.strips ?? 'all', socket: p.socket !== false });
    return facesToGeom(faces);
  });

  node('clamAnimal', { in: { ribs: V.int, flute: V.number, dome: V.number }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildClam({ ribs: p.ribs, flute: p.flute, dome: p.dome }));
  });

  node('tramTile', { in: { gauge: V.number }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildTram({ gauge: p.gauge }));
  });

  node('armchair', { in: { wing: V.bool, lived: V.number, armLine: V.number }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildArmchair({ wing: p.wing, lived: p.lived, armLine: p.armLine }));
  });

  node('wattleFence', { in: { height: V.number, unevenness: V.number }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildWattle({ height: p.height, unevenness: p.unevenness }));
  });

  node('quiver', { in: { length: V.number, taper: V.number, strap: V.bool }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildQuiver({ length: p.length, taper: p.taper, strap: p.strap }));
  });

  node('doorLeaf', { in: { width: V.number, lived: V.number }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildDoor({ width: p.width, lived: p.lived }));
  });

  node('taxiwaySign', { in: { panels: V.int, footing: V.bool }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildTaxiway({ panels: p.panels, footing: p.footing }));
  });

  node('roofGable', { in: { pitch: V.number, ribs: V.int, courses: V.int }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildRoof({ pitch: p.pitch, ribs: p.ribs, courses: p.courses }));
  });

  node('carousel', { in: { load: V.string }, out: V.geom }, ({ p }) => {
    return facesToGeom(buildCarousel({ load: p.load }));
  });
}
