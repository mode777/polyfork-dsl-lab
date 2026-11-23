# Polyfork .mjs generators → declarative node system

**Feasibility study** · 23 Nov 2026 · sample of 20 assets (seed `20261123`)

---

## TL;DR

**Verdict: feasible, with one hard tail.** A declarative, geometry-nodes-style graph is a
good fit for Polyfork's static assets — and by extension for roughly 86% of the
catalogue. The geometry vocabulary collapses to **24 micro-operations**, which merge into
**12 compound operations**. Five static assets exercise 10 of those 12; nine operations
cover 87% of all coded requirements in the sample.

Three caveats decide the real cost:

1. **No CSG is used anywhere.** Recesses are modelled as inset walls + floors, so a
   boolean node is not needed — an `Inset/Extrude/Solidify` group is.
2. **Ranges are not purely continuous.** 20 of 53 range knobs (38%) change topology —
   count knobs, resolution knobs and detail gates. A graph needs a **Repeat Zone** and
   count-from-size expressions, not just a field on fixed topology.
3. **Rigged assets are 3/20 of the sample but 64% of its triangles.** Skin weights,
   bone layouts and pose are a separate node family; Blender Geometry Nodes cannot
   author them well, a custom graph can.

The bigger cost is not the node set but the **bespoke layout maths**: about 30% of each
asset's code (median; up to 76%) sits in one straight-line `createAsset` builder full of
domain constants. That code becomes either a subgraph with parameters or a script node.

Score: **7.3 / 10** — build it for props/buildings/terrain first, treat characters as a
phase-two problem.

---

## 1. What was sampled and how

The catalogue API returned 3,529 unique published assets
(`prop` 2,200 · `building` 465 · `animal` 277 · `vehicle` 223 · `character` 206 ·
`ultra` 86 · `attachment` 48 · `terrain` 22 · `hand` 2).

A uniform random sample of 20 was drawn **without replacement** from all 3,529 rows with a
fixed seed (`random.Random(20261123).sample(rows, 20)`), then each asset's
`/cdn/{id}.mjs` and `/{id}-params.json` were downloaded. No curation, no filtering by
class or size — this is what random looks like.

| asset | class | tris | build ms | params | rig |
|---|---|---:|---:|---:|---|
| thermocycler-514a6d | prop | 522 | 42.0 | 11 | – |
| raised-pit-platform-8fd586 | prop | 180 | 31.2 | 8 | – |
| sidearm-f35bb5 | prop | 684 | 15.7 | 13 | 2 groups |
| orc-brute-08c6ca | character | 2,633 | 61.4 | 18 | 31 bones / 6 skinned meshes |
| clockwork-hand-adornments-loadout | hand | 11,191 | 321.3 | 24 | 26 bones / 10 skinned meshes |
| compacted-hardcore-tile-a7a8ee | prop | 694 | 29.9 | 10 | – |
| volantin-398e88 | prop | 442 | 12.8 | 12 | – |
| prize-car-turntable-683ae8 | prop | 768 | 8.2 | 8 | – |
| breath-scorch-mark-73fc72 | prop | 578 | 30.6 | 9 | – |
| players-tunnel-4a210b | building | 1,176 | 13.9 | 12 | – |
| wooden-wreck-stern-section | prop | 921 | 12.7 | 9 | – |
| interior-door-leaf-a02f28 | prop | 402 | 28.0 | 8 | 1 group |
| keyboard-bench-564d56 | prop | 698 | 9.6 | 8 | – |
| table-game-chair-ffa6c1 | prop | 848 | 14.5 | 9 | – |
| cookie-2016bb | ultra | 174 | 5.1 | 4 | – |
| area-rug-5c56e2 | prop | 392 | 4.1 | 9 | – |
| side-dock-458f18 | prop | 804 | 6.7 | 14 | – |
| bloom-elemental-base | animal | 4,997 | 343.0 | 16 | 22 bones / 3 skinned meshes |
| cafe-table-set-1868d1 | prop | 540 | 14.6 | 9 | – |
| lookout-watchtower-f1a5ce | building | 962 | 15.8 | 11 | – |

Totals: 29,606 triangles, median 698; 247 knobs (119 colour, 67 choice, 53 range,
8 toggle); 20/20 deterministic on rebuild.

**Method.** Three passes, all reproducible with the scripts in `tools/`:

1. **Runtime trace** (`tools/trace.mjs`) — imported each module in Node with three r180,
   patched `BufferGeometry` methods and `ShapeUtils.triangulateShape` to count operations,
   measured triangles/vertices/meshes/materials/build time, hashed every rebuild for
   determinism, and swept every non-colour knob between two settings to see whether
   topology or only vertex positions changed.
2. **Static analysis** (`tools/callgraph.mjs`, `tools/choicecheck.mjs`,
   `tools/rangecheck2.mjs`) — helper inventory, call-graph depth and reuse, choice-option
   topology diversity, full range sweeps.
3. **Manual coding** of the 20 assets against the micro/compound operation vocabulary.
   The operation counts in §4–5 are this coding, not an automated metric; the code that
   produced the other numbers is included.

---

## 2. What the generators actually are

- **Self-contained ES modules.** Every asset is one `.mjs` that imports only
  `three` and `mergeGeometries` from `three/addons`. No loaders, no textures, no CSG
  library, no `InstancedMesh` (0 across all 20).
- **Triangle soup, built in JavaScript.** Every module builds `BufferGeometry` by hand
  (`tri()`/`quad()` into flat arrays); 19/20 call `toNonIndexed()`, delete normals, write a
  vertex-colour attribute, merge, `computeVertexNormals()`. 18/20 use a byte-identical
  `MeshStandardMaterial({vertexColors, flatShading, roughness: 0.85, metalness: 0})`.
- **One draw call by construction.** 15 assets end as one material; 5 use two or three
  (glass, glow, decal surfaces). Merging, not instancing, is the performance strategy.
- **Deterministic.** 20/20 produce an identical vertex hash on a second `createAsset()`.
  Where randomness is used it is a seeded LCG (`prng` in 4 files) or a hash function.
- **Fast.** Median 14.2 ms per build, worst 343 ms. Regenerating on every knob drag is
  realistic.
- **Generated, not hand-written.** The two largest modules (`orc`, `clockwork-hand`)
  contain 114 and 55 inlined inlined library blocks library blocks and 283 / 267
  unreachable top-level helpers — evidence that the authoring pipeline already composes modules
  and exports a flattened bundle per asset. A node graph would be a front-end to a
  modular system that already exists, not a rewrite of a monolith.

---

## 3. Why "declarative" is a real question

The code is imperative: mutable zone buffers (`bag()`, `S.wall`, `S.plinth`), nested
symmetry loops, per-course cuts computed from previous cuts. Nothing is a pure DAG at the
top level. But the *leaf* builders are pure functions of numbers → geometry, and the
helpers are reused inside a file (median 5 helpers called from ≥2 sites). So the question
is not "can it be expressed declaratively" but "where is the boundary between graph and
code".

Measured:

| property | result |
|---|---|
| Top-level helper functions per asset | 3 – 76 reachable, median 18 |
| Call-graph depth | 1 – 9, median 4 |
| Helpers reused ≥2× within a file | median 5 |
| Share of code in the single top-level builder | median 30% (range 0–76%) |
| Unique helper names across 20 files | 741 |
| Helper names shared by ≥2 files | 83 (11%) |
| Identical `prep()` helper in different files | bit-identical across files |

So **the vocabulary converges at the bottom (tri/quad/prep/merge) and diverges at the
top (one-off layout maths)**. That is the exact shape a node system handles well if it has
subgraphs and a script escape hatch, and badly if every asset must be a flat graph.

---

## 4. The smallest operations (24)

Grouped by what they do to data. "Evidence" is where the op appears in the 20 files;
counts are lexical/runtime, not exact per-call totals.

### A. Data generators (make vertices)

| # | micro-op | what it is | evidence (approx.) |
|---|---|---|---|
| 1 | **Face emit** | `tri`/`quad`/`poly` appends to a flat array; optional normal-side correction | 18/20 files; 329 call sites |
| 2 | **Profile** | 2-D closed polygon: rect, rounded rect, n-gon, superellipse, stadium | `rect`, `ngon`, `superPts`, `stadium`, `octSquare` in 12 files |
| 3 | **Ring** | n points on a circle/rect/superellipse at a transform | 12 files; ~1,000 lexical hits |
| 4 | **Box** | axis-aligned cuboid, often chamfered/bevelled | `box`, `block`, `bevelBox`, `roundedBlock`, `obox` in 12 files |
| 5 | **Tube/cylinder** | capped tube between two radii, sometimes along an axis | `tube`, `tubeY`, `limbY`, `rod`, `pipe` in 6 files |
| 6 | **Blob** | sphere/ellipsoid/rounded hull from rings | `ballGeo`, `blob`, `dome`, `head` in 5 files |
| 7 | **Grid** | regular 2-D lattice of vertices | `area-rug`, `tile`, `breath-scorch`, `wooden-wreck` |
| 8 | **Path** | polyline or sampled spline used as a sweep spine | `spline`, `path`, `curve`, `bowStations` in 6 files |

### B. Surface constructors (turn profiles into shells)

| # | micro-op | what it is | evidence (approx.) |
|---|---|---|---|
| 9 | **Loft** | stack rings → quads → cap ends; optional split by band | 6/20 (M2); `loftClosed`, `loftX`, `loftZ`, `loftRings`, `bakeLoft` |
| 10 | **Sweep** | section swept along a path with frame construction | 5/20 (M3); `sweep`, `sweepStrip`, `sweepTube`, `cordTube` |
| 11 | **Revolve** | profile rotated around an axis (bolt, cog, wheel, vase) | `revolve`, `lathe`, `boltLathe`, `turned` in 7 files |
| 12 | **Prism/extrude** | closed profile → constant-depth solid, caps included | `prism`, `prismZ`, `xPrism`, `slab`, `cslab` in 8 files |
| 13 | **Inset/offset** | inward polygon offset with mitre clamping | `inset`, `insetVar`, `insetPoly` in 5 files |
| 14 | **Pocket/recess** | inset + walls down + sunken floor (boolean-free hole) | `pocket`, `bore`, `groove`, `carved` in 5 files |
| 15 | **Bevel/chamfer** | edge band between two offset loops | `bevelBox`, `cham`, `bevH`, `kerf` in 6 files |

### C. Shape modifiers

| # | micro-op | what it is | evidence (approx.) |
|---|---|---|---|
| 16 | **Deform** | taper, bend, twist, squash, fold — position remap | `scalePts`, `squashPts`, `twist`, `curl`, `fold` in 7 files |
| 17 | **Noise/jitter** | value noise or seeded per-vertex offset | `vnoise`, `hash01`, `hash2`, `jitter` in 7 files |
| 18 | **Subdivide/smooth** | insert rings, Chaikin corner cutting, relax | `chaikin`, `subdivideRings`, `insertRings`, `smooth` in 6 files |
| 19 | **Transform** | translate / rotate / scale / aim by matrix | 349 translates, 301 rotations, 100 `applyMatrix4` |
| 20 | **Mirror** | duplicate with sign flip (left/right pairs, 4-way symmetry) | `mirrorX`, `mirrorZ`, `flankPair` in 7 files |

### D. Combinators and outputs

| # | micro-op | what it is | evidence (approx.) |
|---|---|---|---|
| 21 | **Repeat/array** | linear, polar or grid repetition with per-instance params | 10/20 assets; counts from size or knob |
| 22 | **Scatter** | seeded rejection sampling with minimum separation on a surface | 7/20: cookie chips, tile stones, rug wobble, rivets, nails, leaves |
| 23 | **Merge + colour** | concatenate geometries, write per-zone vertex colour, flat normals | 20/20 |
| 24 | **Skin/rig** | bone trees, rigid + soft weights, bend chains | 3/20 assets, 26–31 bones each |

Notably absent: **boolean/CSG**, **textures/UV** (none of the 20 keeps a UV set), **instancing**,
**procedural noise textures**. The system is pure geometry + vertex colour + a rigid/skinned
transform hierarchy.

---

## 5. Operations that are commonly used together (12 compounds)

These are the merges that matter: micro-ops that co-occur in the same builder, with a
measurable lift over chance.

| # | compound op | merges | used by | graph shape |
|---|---|---|---:|---|
| M1 | **Shell** | profile → inset → wall → floor/cap (→ pocket) | 10/20 | Extrude + Solidify + Inset |
| M2 | **Loft Limb** | stations → rings → loft → caps + smooth | 6/20 | Curve to Points → Instance on Points → Skin |
| M3 | **Swept Trim** | path → frames → section sweep + caps | 5/20 | Curve to Mesh (section profile) |
| M4 | **Lathed Hardware** | profile → revolve N segments | 7/20 | Screw/Lathe modifier equivalent |
| M5 | **Bevel Box Cluster** | box → chamfer → place/aim → mirror | 12/20 | Cube + Bevel + Transform + Mirror |
| M6 | **Surface Field** | grid/mesh → position(noise, taper, fold) → solidify | 8/20 | Set Position(field) + Solidify |
| M7 | **Scatter Detail** | surface → rejection sample → instance → realize | 7/20 | Distribute Points on Faces + Instance + Realize |
| M8 | **Repeat Array** | linear/polar repetition, count from size | 10/20 | Duplicate Elements / Instance on Points |
| M9 | **Mirror Pair** | build half → mirror → weld | 7/20 | Mirror + Merge by Distance |
| M10 | **Zone Merge** | join → set colour per zone → flat normals → merge | 20/20 | Join Geometry + Store Named Attribute + Merge |
| M11 | **Layout Solve** | params → proportion/dimension solve → stations/bones | 5/20 | Math node group (pure arithmetic) |
| M12 | **Skin Bind** | part + bone → rigid/soft weights → SkinnedMesh | 3/20 | Custom: vertex groups + armature |

**Co-occurrence lift** (observed − expected, out of 20): `FIELD+SCAT` +2.2,
`BOX+ARR` +2.0, `LOFT+SKIN` +2.1, `SWEEP+SKIN` +2.2, `LATHE+BOX` +1.8,
`LATHE+ARR` +1.5. That is why the compounds above are grouped the way they are, and not
e.g. `LATHE+SCAT`.

**Coverage.** Coding 20 assets against the 12 compounds gives 100 requirements, median 4
compounds per asset, max 10 (the clockwork hand). Greedy set cover:

| ops | coverage |
|---:|---:|
| 1 | 20% |
| 3 | 42% |
| 5 | 60% |
| 7 | 74% |
| 9 | 87% |
| 10 | 92% |
| 12 | 100% |

Every asset needs M10 (merge/colour), so the curve starts high; the meaningful result is
that **the last two ops are the only ones that outgrow a geometry node set**: M11 layout
solve is pure arithmetic and fits a math node group, while M12 skin bind is the only true
non-geometry operation — and both exist to serve 3 assets.

---

## 6. Mapping to a declarative graph

### 6.1 What maps cleanly (high confidence)

| Polyfork pattern | node-graph equivalent | notes |
|---|---|---|
| `topY(x,z)` sampled per chip | **Set Position by field** on a grid/mesh | textbook geometry nodes |
| area rug: grid + wobble + fold + rounded-rect clamp | **Grid → Set Position(noise/curve) → Set Material** | 1:1 |
| vertex-colour zones from `color` knobs | **Store Named Attribute(int/color) → material Color Attribute** | perfect fit; replaces 119 colour knobs |
| `pocket()` / `bore()` | **Extrude + Inset + Solidify** group | no boolean needed |
| seeded scatter with min distance | **Distribute Points on Faces** (Poisson) + **Instance on Points** | statistical match; not bit-exact unless PRNG is replicated |
| `loftClosed(rings)` | **Curve to Mesh** or **Instance rings → Skin** | caps need a small group |
| mirror / 4-way symmetry | **Mirror** + **Merge by Distance** | direct |
| choice knobs (`action`, `style`, `seats`) | **Switch (Geometry)** on an enum | must build all branches; fine at ≤ 11k tris |
| `mergeGeometries` + single material | **Join Geometry** → realise → one material | direct |
| `rig` groups (`trigger`, `slide`) | **Transform Geometry** driven by a named attribute | direct |

### 6.2 What needs graph features beyond a naive node list

1. **Repeat Zone / variable-count loops.** 20/53 range knobs change topology:
   `chips 3–14`, `chairs 1–4`, `slots`, `potholes`, `tendrils`, `length` (more planks as
   it grows), `facets` (segment count), `width`/`backHeight` (detail appears at a
   threshold). A fixed-topology graph cannot express these.
2. **Geometry Switch with different topologies.** 42/67 choice knobs change triangle
   count (223 options → 152 distinct topologies). The switch must accept branches that
   produce different meshes, not just different transforms.
3. **Shared derived scalars.** `topY()` feeds chip placement *and* chip height; door hinge
   positions feed both leaf and frame. The graph must let one scalar node feed many
   consumers without duplication (free in a DAG, painful in flat node lists).
4. **Per-instance attributes.** Deck planks, brick courses, railings and cog teeth vary
   per instance (length, tone, cut). Needs an index/instance attribute + a field.
5. **Non-manifold tolerance.** The output is triangle soup with duplicated vertices by
   design (`toNonIndexed` + flat normals). A graph runtime that insists on welded,
   manifold meshes will fight this content.
6. **Exact winding control.** `quadN`/`triN` flip faces to match a desired normal; 23
   `computeVertexNormals` calls. If flat shading is derived from face normals, winding
   bugs are invisible until export.

### 6.3 The hard tail

- **Up to 76% of code is one bespoke builder.** `players-tunnel` has 251 of 550 code lines in
  `createAsset__asBuilt`: nested symmetry loops, brick courses with per-course cut lists,
  hard-coded metre constants. `wooden-wreck` is 547/743. As a graph this is either a
  large parameterised subgraph or a script node. There is no third option.
- **Characters.** 31 bones / 6 skinned meshes (orc), 26/10 (hand), 22/3 (bloom). The
  geometry is still loft/sweep/box, but the rig requires bone trees, rigid weights per
  part, soft blended weights at joints, and a pose/IK layer. Blender Geometry Nodes has no
  skin-weight authoring; a custom system would need a first-class `Bind Skin` node family.
  This is 3/20 assets but 64% of sampled triangles.
- **Layout solvers.** `bloom`'s `solve(cfg)` is ~200 lines computing bone positions from
  species proportions (`withers`, `build`, `legs`, `crest`, `neck`, `head`, `winter`,
  `length`, `depth`, `width`, `blaze`, `feather`, `facets`). It is pure arithmetic — a
  perfect (if large) node group — but it is anatomy knowledge, not a geometry primitive.
- **Domain constants.** Thousands of metre values (hard-coded metre offsets,
  similar per-asset constants) that only make sense for one asset. A generic library cannot absorb
  them; they belong in the asset's group parameters.

---

## 7. Scorecard

| criterion | weight | score | rationale |
|---|---:|---:|---|
| Composability / purity of leaves | 15% | 9 | leaf builders are pure number→geometry; deterministic |
| Topology stability | 10% | 6 | 38% of range knobs change topology; needs repeat zones |
| Dependency footprint | 10% | 10 | three.js only, no loaders/textures/CSG |
| Data model fit | 10% | 10 | single vertex-colour material, merged geometry, flat normals |
| Coverage by small op set | 15% | 8 | 9 of 12 compounds = 87%; 5 assets test 10/12 |
| Bespoke authoring tail | 15% | 4 | median 30% of code in one straight-line builder |
| Rig / skin / pose | 10% | 5 | separate node family; 64% of sampled triangles |
| Performance | 5% | 9 | median 14.2 ms; worst 343 ms, cacheable |
| Fidelity / round-trip | 5% | 7 | behaviour yes; bit-exact only if PRNG and float order preserved |
| Authoring ergonomics | 5% | 6 | mesh-level inset/pocket and per-instance attributes need care |
| **Weighted** | | **7.3** | **feasible, phase the rig work** |

---

## 8. Recommended node library

**Core (24 primitive nodes, 6 groups):**

- *Inputs*: Float, Int, Colour, Enum, Seed, Vector
- *Generators*: Box, Bevel Box, Cylinder/Tube, Sphere/Blob, Grid, Profile (2-D), Ring,
  Path (polyline/spline)
- *Surfaces*: Loft, Sweep, Revolve, Extrude/Prism, Inset, Pocket
- *Modifiers*: Set Position (field), Noise, Taper/Bend/Twist, Subdivide/Relax,
  Transform, Mirror, Merge by Distance
- *Combinators*: Join, Repeat (linear/polar), Scatter on Surface, Instance on Points,
  Switch (geometry)
- *Outputs*: Store Colour Zone, Set Flat Normals, Material, Object/Collection

**Macros (the 12 compounds above)** — shipped as node groups, not new node types. They are
where the authoring productivity comes from.

**Escape hatch:** a `Script` node that receives typed inputs and returns a geometry. This
is non-negotiable for the bespoke tail (30–76% of an asset's code) and for the layout
solvers.

---

## 9. Build plan and effort

| phase | scope | effort (1 senior dev) |
|---|---|---|
| 0 | Graph IR + evaluator + dirty caching + exporter | 2–3 w |
| 1 | 24 primitive nodes + fields + repeat zone | 3–4 w |
| 2 | 12 macro groups | 2–3 w |
| 3 | Pilot: 5 static assets (cookie, area-rug, lookout, side-dock, players-tunnel) → 10/12 compounds | 2–3 w |
| 4 | Rig/skin/pose node family | 3–5 w |
| 5 | Content: props 0.5–2 d each, buildings 3–5 d, characters 2–4 w | months (content-bound) |

**Cheapest useful path:** phase 0 + a graph that can host a *module node* wrapping the
existing `createAsset()` (link to `/cdn`, do not host). You get declarative composition of
whole assets immediately (placement, colourway, seed, merge), then re-implement the
internal graph only where editing is needed. This also stays inside the licence (linking,
not redistribution).

---

## 10. Risks

1. **Licensing is the first blocker, not the tech.** The `.mjs` source is under the
   Polyfork licence: free to use/link/modify, but *keeping copies on your servers and
   serving them to users is redistribution* and needs the Platform plan
   (from $299/mo). Reimplementing the generation pipeline as a commercial asset generator
   is explicitly prohibited. A node system that **links** to `/cdn/{id}.mjs` is fine; a
   node system that **rehosts or resells** the pipeline is not. Any plan to ship this
   needs `/platform` or legal review before phase 1.
2. **Fidelity drift.** Vertices will differ unless PRNG, float order and winding are
   replicated. If the goal is regenerating the catalogue exactly, port the arithmetic;
   if the goal is authoring new assets in the same style, accept statistical equivalence.
3. **Graph explosion.** 30% of code (median; up to 76%) is inline layout maths. Without
   subgraph parameters and a script node, graphs will be unmaintainable at ~100 nodes per
   asset.
4. **Rigging gap.** Skin weights and pose are the least "node-like" part and the most
   valuable (64% of sampled triangles). Budget for it explicitly or scope characters out.
5. **Reference divergence.** Polyfork ships 3,529 assets from a moving pipeline; a parallel
   node library will drift unless the node set is treated as the source of truth.

---

## 11. Bottom line

If the goal is a **declarative authoring system for the same class of low-poly,
flat-shaded, vertex-coloured props and buildings**, the answer is yes: the operation
vocabulary is small (24 micro, 12 compound), the data model is ideal (one material, merged
geometry, no textures, no CSG), it is deterministic and fast, and five assets are enough to
exercise 10 of 12 compounds.

If the goal is **a faithful graph behind every catalogue asset including characters**,
expect roughly a third to a half of the effort to go into the rig/skin/layout layer and
the bespoke per-asset maths, and plan a script-node escape hatch rather than pretending everything is
nodes.

---

### Reproduction

```bash
cd polyfork-node-study
npm i three@0.180.0
node tools/trace.mjs        # runtime metrics → data/runtime.json
node tools/callgraph.mjs    # helper graph → data/callgraph.json
node tools/rangecheck2.mjs  # range topology sweep → data/range.json
node tools/choicecheck.mjs  # choice topology sweep → data/choice.json
```

`data/compound.json` holds the manual 12-op coding and triangle table used for the set
cover; `data/catalogue.json` is the full catalogue index; `data/sample.json` is the seeded
sample.
