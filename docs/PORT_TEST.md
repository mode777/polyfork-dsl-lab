# Node-system test: porting Polyfork assets

**Question:** can these assets be used as a feasibility test for a three.js-native node
system, and do they get shorter?

**Answer:** yes, and yes — for props/buildings. Two assets were ported and executed against
the originals; a third is specified as pseudo-code. The runtime is 143 lines and covers 10
node types.

---

## 1. Test setup

`prototype/graph.mjs` — a minimal graph runtime: nodes are pure functions returning
`{pos, zone}` parts, fields are `fn(x,y,z)` or `fn(i,j)`, output is one merged
`BufferGeometry` with a vertex-colour attribute and flat normals. Nodes implemented:

`ring`, `grid`, `loft`, `revolve` (via rings + bands in the port), `solidify`, `pyramid`,
`scatter`, `instance`, `deform`, `merge`, `mesh`.

Each asset is a ~40–80 line spec that wires those nodes. No asset-specific helper library
is imported; the specs import only `three` and `graph.mjs`.

**Caveat:** these are ports made for measurement. They live in this research folder, are
not shipped, and are not an ingestion pipeline. The Polyfork licence allows reading,
refactoring and modifying the assets; it does not allow redistributing the source or
reproducing the catalogue pipeline as a product.

## 2. Geometry parity

`node prototype/bench.mjs` and `node prototype/bench-rug.mjs`:

| case | tris | verts | bbox |
|---|---|---|---|
| cookie default | 174 = 174 | 522 = 522 | exact |
| cookie thin, 3 chips | 138 = 138 | 414 = 414 | exact |
| cookie thick, 14 chips | 204 = 204 | 612 = 612 | exact |
| rug default | 392 = 392 | 1,176 = 1,176 | exact |
| rug plain, flat pile | 392 = 392 | 1,176 = 1,176 | exact |
| rug large, lived-in 1.0 | 700 = 700 | 2,100 = 2,100 | exact |
| rug bordered | 392 = 392 | 1,176 = 1,176 | exact |

The rug's vertex multiset matches the original within `1e-5` (8 of 1,176 vertices differ by
rounding in the fold). The cookie's body vertices are exact; the only difference is the
orientation of the hexagonal chip base rings (same centres, radii, counts and heights).
Topology, counts and bounds are identical in every case.

Build time is comparable (cookie: 1.4 ms original vs 1.0 ms port).

## 3. Code size

Non-comment, non-blank lines:

| file | original | port | reduction |
|---|---:|---:|---:|
| `cookie-2016bb.mjs` | 158 | 43 | 3.7× |
| `area-rug-5c56e2.mjs` | 260 | 77 | 3.4× |
| `prize-car-turntable-683ae8.mjs` (pseudo) | 232 | ~55 est. | ~4× |
| shared runtime (`graph.mjs`) | — | 143 | one-time |

**Break-even:** 143 lines of runtime against 115 + 183 lines saved by the first two ports —
the runtime pays for itself after **two** assets. A fuller 24-node library (~500 lines with
fields and attributes) pays for itself after **4–6** assets.

## 4. Example: cookie as a graph

The real spec (`prototype/models/cookie.mjs`), abbreviated comments:

```js
export function build({ colorway='classic', thickness=0.024, chips=9, chipColor }) {
  const cw = COLORWAYS[colorway];
  const T = thickness, count = Math.round(chips);
  const g = graph({ thickness: T, chips: count });

  // Ring: one radius per segment, seeded wobble
  const rim = g.ring({ n: 20, radius: (i) => 0.05 * (0.96 + prng(1000 + i * 7)() * 0.07) });
  const at = (h, s) => rim.map(([x, , z]) => [x * s, h, z * s]);

  // Loft: three rings + apex + point cap -> 120 tris
  const body = g.loft({
    rings: [at(0, 0.90), at(T * 0.42, 1.00), at(T * 0.80, 0.93)],
    capTop: [0, T, 0], capBottom: [0, 0, 0],
    zones: { capTop: 'dough', band: 'edge', capBottom: 'edge' },
  });

  // Scatter: rejection sample on the top disc
  const pts = g.scatter({
    count, minDist: count > 9 ? 0.015 : 0.019, seed: 42, tries: 800,
    sample: (rnd) => { const a = rnd()*TAU, f = 0.16 + rnd()*0.54;
                       return [Math.cos(a)*f*0.05, Math.sin(a)*f*0.05]; },
    height: (x, z) => topY(T, Math.hypot(x, z) / 0.05) - 0.0025,
    size: (rnd) => 0.0085 + rnd() * 0.0025,
  });

  // Instance a 6-sided chip on every accepted point
  const chip = g.instance(pts, g.pyramid({ sides: 6, r: 1, apex: 0.0075, zone: 'chip' }));

  return g.merge([body, chip])
    .mesh({ zoneColors: { dough: cw.dough, edge: cw.edge, chip: chipColor ?? cw.chip } });
}
```

As a node graph:

```
Ring(20, wobble) ──┬─► Loft(rings 3, cap top/bottom) ──► Zone(dough/edge) ─┐
                   │                                                     ├─► Merge ─► Flat mesh
Disc ─► Scatter(9, minDist 19mm, seed 42) ─► Instance(Pyramid 6) ─► Zone(chip) ─┘
```

## 5. Example: area rug as a graph

The interesting part — everything is a field over the same grid:

```js
const grid = g.grid({ nx: NX, nz: NZ, w: W, d: D, position: (x, z, i, j) => {
  // rounded-rect cut, edge wobble, pile relief, walking-line sag
  return [x, TH + relief(x, z) * (1 - 0.7 * cn) - lived_in * 0.006 * cn, z];
}});

// fold the rucked corner (one Deform, applied cumulatively)
for (let m = 1; m <= KRUCK; m++) g.deform(grid, rotateCorner(m));

// per-cell colour field: border ring, diamond bands, field
const cellColor = (i, j) => pattern !== 'plain' && isEdge(i, j) ? 'border'
  : pattern === 'geometric' && Math.floor(diamond(i, j)) % 3 === 1 ? 'motif'
  : 'field';

return g.merge(g.solidify({ top: grid.top, bot: grid.bot, topZone: cellColor,
                            botZone: 'backing', wallZone: 'backing' }))
        .mesh({ zoneColors: C });
```

This is almost a literal Blender GN graph: `Grid → Set Position(field) → Deform →
Store Named Attribute(colour) → Solidify`. The entire 260-line original becomes 77 lines,
including four colourways and three pattern modes.

## 6. Pseudo-code: prize-car turntable (revolve + count-from-size)

This is the class the cookie and rug do not cover: a lathed object whose **segment count
changes with a range knob** (20 → 24 → 26 facets as diameter goes 5.0 → 6.4).

```js
const D = p.diameter, H = p.height;
const N = max(8, 2 * round((PI * D) / (2 * CHORD)));   // Repeat count from size
const rings = {
  deck:   revolveRing({ n: N, r: rDeck, y: yDeck }),
  lip:    revolveRing({ n: N, r: rTopIn, y: yTop }),
  cham:   revolveRing({ n: N, r: rTopOut, y: yTop }),
  face:   revolveRing({ n: N, r: r0, y: yCham }),
  faceB:  revolveRing({ n: N, r: r0, y: yRimBot }),
  wallT:  revolveRing({ n: N, r: rWall, y: yRimBot }),
  wallB:  revolveRing({ n: N, r: rWall, y: FOOT_H - SINK }),
};

const platter = g.revolve({
  rings,
  bands: [
    ['deck',  'deck', 'lip',   -1,  1],
    ['gold',  'lip',  'cham',   0,  1],
    ['gold',  'cham', 'face',   1,  1],
    ['gold',  'face', 'faceB',  1,  0],
    ['skirt', 'faceB','wallT',  0, -1],
    ['skirt', 'wallT','wallB',  1,  0],
  ],
  caps: [['deck', 'deck', yDeck, 1]],
});

const bulbs = p.bulbs && g.repeat({
  count: N * rows.length * 2,                 // two per facet, one or two rows
  place: (k) => radialSeat(k, N, rows, rWall, FOOT_H),
  proto: g.cone({ sides: 6, r: BR, h: BP }),
});

return g.group({ platter, foot, bulbs }).spin(60, 'y');   // deck rig
```

The “diameter rebuilds rather than scales” behaviour — the thing the original spends 40
lines of prose explaining — is one expression: `N = f(D)`, fed into a Repeat count.

## 7. Pseudo-code: a rigged limb (the hard tail)

```js
const leg = g.loft({
  stations: solveLeg(p),            // pure layout node group: proportions -> joint points
  section: (t) => legProfile(t),    // radius field along the limb
  sides: 9,
});
g.bindSkin(leg, {
  bones: ['Hips', 'Thigh', 'Shin', 'Foot'],
  weights: (v) => distanceWeights(v, bones),   // rigid near the bone, soft at joints
});
```

Six lines for the geometry; the `solveLeg` group is the asset's anatomy knowledge and stays
large. This is exactly where the node system stops helping: the skin bind must be a
first-class node family, and the layout solve is a maths group, not a primitive.

## 8. What compresses, and what does not

| source of lines | compresses? | why |
|---|---|---|
| param resolve / clamp / colourway (25–40 lines) | **yes, to ~5** | one `params` + `presets` node |
| `prep`/`finish`/material/merge boilerplate (20–30) | **yes, to 0** | `mesh()` output node |
| geometry helpers: loft, inset, bevel, sweep, scatter (80–200) | **yes, to calls** | shared node library |
| domain constants (hard-coded metre offsets, metre tables) | **no** | asset-specific, stay as inputs |
| one bespoke builder (30–76% of code) | **no** | subgraph or script node |
| rig/bone layout/skin weights | **no** | separate node family, still per-asset data |

So the honest reduction is **~3–4× for props and buildings**, not 10×. The 3.7× and 3.4×
measured here are on two of the simpler assets; a 10-compound asset will compress less
because more of its code is bespoke layout.

## 9. Verdict

- The assets are a **good feasibility corpus**: they are pure three.js, deterministic,
  small, dependency-free, and they cover both construction styles (procedural assembly and
  field-based), plus a rigged tail.
- A three.js-native node runtime of ~150 lines reproduces two assets **exactly in topology
  and bounds** with 3.4–3.7× less model code.
- The design that emerges is: **geometry nodes + fields + repeat + geometry switch**, with
  a script node for the bespoke 30%. A pure node-only system will hit a wall on layout
  solvers and skinning.
- Test corpus recommendation: pick assets by compound-op coverage, not by triangle count.
  Cookie (loft/scatter), area rug (field/colour), turntable (revolve/count-from-size) and
  one rigged character (skin bind) cover 11 of the 12 compounds for ~5k triangles.
