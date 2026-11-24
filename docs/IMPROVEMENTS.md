# Mature improvements + research notes

This pass implemented only the changes that are clearly mature, and investigated the
topics that were still unclear. Runtime is now **92 node types**.

> **Parity pass (24 Nov 2026):** the runtime now has a first-class Three bridge
> (`geometry`/`mesh` accept `BufferGeometry`/`Mesh`/`Group`), a consumable `random`
> stream, non-uniform `instance` scale, `loft.diagonal`/`bandZones`/`flip`,
> `scatter.lazy`/`yawScale`/`rng`, `arrayPolar.spin`, `cone.flip` and `mesh.crease`.
> `cookie`, `sapphire` and `tire` pass an order-independent geometric parity check at
> `1e-4`; see `docs/STATUS.md` and `t-all.mjs`.

Run: `node t-sample3.mjs`, `node t-cheese2.mjs`, `node t-cookie2.mjs`, `node t-cache.mjs`,
`node t-bool.mjs`.

---

## 1. Implemented

| improvement | what it does | evidence |
|---|---|---|
| **`boolean` node** | real CSG via `manifold-3d` (union / subtract / intersect), scaled to integer units | cube − sphere = 440 tris; cheese with 4 spherical craters = **666 tris vs 608 original**, bounds within 1 mm |
| **`card` / `plane`** | 2-triangle quad (tapered/bent card for fur, flat quad for roof tiles) | roof tile is now 2 tris |
| **`pointsGrid`** | regular point lattice with normals | roof uses 100 instances in 3 nodes |
| **`instancedMesh`** | `THREE.InstancedMesh` with normal orientation | roof: **200 rendered tris, 1 draw call, 3 nodes** (was 4,400 tris / 102 nodes) |
| **cache (`cache.mjs`)** | content-addressed array pool + Float32 base64, hash-consing | 768-tri baked graph: **19.0 KB JSON → 2.97 KB cache (84% smaller)**, 4 arrays deduplicated, round-trip exact |
| **parametric cookie (`ports/cookie2.mjs`)** | rings, caps, scatter sample/height/size all cook from graph inputs | 174 / 138 / 204 tris for default / 3-chip thin / 14-chip thick without rebuilding the graph |
| **input-expr evaluation** | expression params and expression socket values are resolved per cook | enables the cookie and the parametric `loftProfile` stations |
| **group/repeat serialization** | `group … end`, `repeat count= graph=` | round-trip tested for groups, repeat, script and plain graphs |
| **extrude winding fix** | side quads now outward, caps triangulated | makes extruded solids manifold, so Manifold accepts them |

### CSG decision

| library | status | verdict |
|---|---|---|
| **Manifold 3.5.5** | Apache-2.0, active (Nov 2026), 283k weekly downloads, WASM, guaranteed manifold | **chosen** |
| three-bvh-csg 0.0.18 | MIT, active, pure JS, but README says “experimental, in progress”; a 2026 browser benchmark found it watertight on 22/1000 large pairs | fast alternative for small scenes, not the default |
| trueform 0.9.8 | WASM, exact integer kernel, fastest in the same benchmark, watertight 1000/1000 | strongest option if speed at scale matters; newer/less deployed |

Costs accepted with Manifold: async WASM init (`await initManifold()` before evaluate),
manual `delete()` of every Manifold object, and scaling to integer-friendly units
(`×1000`, rounded) to avoid marginal-geometry failures. Multi-material boolean output is
not wired yet; the result is one zone.

---

## 2. Research: unclear topics

### 2.1 Text / glyphs

**Finding.** The mature three.js option is **troika-three-text**: it parses `.ttf/.otf/.woff`
with Typr, generates per-glyph SDFs in a worker, handles kerning/ligatures/RTL, and returns
a `Mesh` with a patched material. It is not geometry in the merged sense — it is a textured
object, and it needs a font asset. Raw `TextGeometry` needs a pre-baked typeface JSON and
does not handle layout.

**Decision.** A `text` node should output an `object` (never merged), with `font` as an
asset input. Not implemented: it adds a dependency and a font asset to a pipeline that
currently has zero textures. The two text assets in sample 3 remain “ink bar” sketches.

### 2.2 Hair / fur

**Finding.** The state of the art is Blender’s hair-curves + Geometry Nodes stack: guide
curves, `Interpolate Hair Curves` with Poisson-disk density, `Frizz`, `Clump`, `Curl`,
`Braid`, surface attachment and rest-position deformation. The data model is **curves with
per-point radius**, not triangles; the nodes are modifiers over that curve set.

**Decision.** A faithful version needs a `curve` value type with per-point radius and a
`groom` family (interpolate, clump, frizz, curl). The mature subset is already available:
`scatterSurface` (Poisson roots + normals) → `card` or tapered tube. Implemented `card`;
guide-curve interpolation is a larger feature and stays open.

### 2.3 Cloth / robes

**Finding.** Cloth is a physics simulation, not a procedural modelling node. Blender
Geometry Nodes does not simulate cloth; Houdini uses Vellum (a solver) and Marvelous
Designer is a dedicated simulator. Node graphs can *author* garments (panels, seams,
pleats), but the drape is simulated or baked.

**Decision.** Do not add a fake “cloth node”. Keep `loft`/`ribbon` approximations, and if
drapes are needed, bake a sim and import it via a module/asset node. This is the one gap
where “script node” would also be the wrong answer — the missing piece is a solver, not
code.

### 2.4 Safe expressions

**Finding.** The format currently evaluates fields/params with `new Function`, which is not
a sandbox. Mature alternatives:

- **CEL** (`@marcbachmann/cel-js`, 84 KB / 24 KB gzip): non-Turing-complete, typed,
  parse/check/evaluate phases, safe for untrusted input, same semantics across languages.
- **JSONLogic** (`json-logic-js`, 2 KB gzip): rules are JSON, no eval, no loops; smallest
  and easiest to emit from a visual editor, but no arithmetic-heavy geometry expressions.

**Decision.** Keep JS expressions for trusted local graphs (they need `Math`, vectors,
arrays, and closures like `rand`). For a multi-user or server-side deployment, compile
expressions to CEL or JSONLogic and reject `script`/`module` nodes. The format already
marks both as escape hatches, so a host can refuse them.

### 2.5 Binary / cache format

**Finding.** Text is right for review and diffs; binary is right for load speed. The
mature pattern is a **content-addressed pool**: node table + typed value pool + indices.
CBOR/MessagePack/FlatBuffers are the usual encodings; FlatBuffers avoids a parse pass.

**Decision.** Implemented the pool with Float32/base64 first (84% smaller, dedupes repeated
rings). Next step if needed: CBOR with a typed array extension, then FlatBuffers for
zero-copy. No need for a custom binary format yet.

### 2.6 Instancing

**Finding.** `InstancedMesh` is for many copies of **one** geometry; `BatchedMesh` is for
many **different** geometries under one material (multi-draw), with per-instance matrices
and colours. Merging is best for static geometry that never changes. The roof case is one
tile geometry × 100 placements → `InstancedMesh`, which is what the template now uses.

**Decision.** Keep `mesh` as the merged static path; use `instancedMesh` for repeated
detail. `BatchedMesh` is the right next node for mixed-geometry batches (e.g. a kit of
props), not yet implemented.

### 2.7 Branching growth

**Finding.** L-systems and recursive growth are well understood, but there is no mature
three.js node package; Blender/Houdini implement them as dedicated nodes/generators. A
`repeat` zone can express one level; recursion needs a graph that can call itself (or a
stack), which the current DAG evaluator does not allow.

**Decision.** Keep branching in the builder/script for now; a recursive `grow` node is a
design change (graph cycles or an explicit stack), not a quick win.

---

## 3. Remaining open items after this pass

| item | status | next step |
|---|---|---|
| text | open | `text` object node via troika + font asset |
| hair guides / clump / frizz | open | curve value type + `groom` group |
| cloth drape | not a node problem | baked sim or ribbon approximation |
| recursion / L-systems | open | explicit stack or recursive group |
| attributes (wear, wetness, decals) | open | named per-vertex attributes + field read |
| CSG multi-material | partial | per-zone boolean or material IDs from Manifold |
| skin IK / pose blending | partial | two-bone IK node; current skin is static |
| safe expressions for untrusted graphs | open | CEL/JSONLogic compile mode |
| BatchedMesh for mixed kits | open | `batch` node |
| binary graph encoding | partial | pool done; CBOR/FlatBuffers next |

## 4. Verdict

The mature items are in: robust booleans, instancing for repeated detail, cards for
fur/grass, content-addressed caching, and a fully parametric example. The unclear items are
now decisions rather than unknowns: **text is an object, hair is curves, cloth is a
solver, safe expressions are CEL/JSONLogic, binary is a pool**. None of them blocks the
hard-surface node system; they are separate subsystems with their own data types.
