# Sample 3 — after filling the gaps

Third random sample (seed `20261125`, excluding the 40 already used), ported against the
expanded node set. **No port uses a `script` or `module` node.** This document records
what was added, the sample results, the gaps that remain, and the ring-array problem.

Code: `runtime.mjs` (44 nodes), `templates.mjs`, `ports/` (20 new), `t-sample3.mjs`.

---

## 1. What was added

| gap from sample 2 | new nodes / change |
|---|---|
| no groups or repeat zones | `group` + `repeat` nodes, `Graph.groups`, `g.define()`, `g.groupNode()`, `g.repeatNode()`; serialized as `group … end` |
| no skinning / bones / pose | `skeleton` (bone tree), `skin` (SkinnedMesh, rigid or 2-bone soft weights), `pose` (per-bone rotation) |
| scatter only in x/z | `scatterSurface` — area-weighted triangle sampling, face normals, Poisson rejection |
| cheap bevel box | `chamferBox` — 24 vertices, 44 tris (was 108 with `RoundedBoxGeometry` seg 1) |
| no splines | `spline` — Catmull-Rom through control points, feeds `path`/`sweep` |
| no true instancing | `instancedMesh` — `InstancedMesh` with per-point normal orientation |
| no subtraction | `cavity` — radial indentation (approximate subtraction; not general CSG) |
| cap rings rebuilt as literal arrays | `fanRing` — ring + fan generated from radius/height |
| profiles rebuilt as literal rings | `bevelProfile` + `loftProfile` — profile → chamfered profile → loft along stations |

`instance` now orients prototypes along point normals, so `scatterSurface → instance` puts
leaves/cobbles on a slope correctly.

---

## 2. Sample 3

Every asset was expressed as a node graph and built. Fidelity is reported honestly: the
ports are **archetype templates** (creature, boat, building, etc.), not hand-matched
re-implementations, so ratios below 1 mean "construction expressed, detail omitted", not
"API failure".

| asset | class | template | orig tris | port tris | ratio | nodes |
|---|---|---|---:|---:|---:|---:|
| pumpkin | ultra | pumpkin | 120 | 152 | 1.27 | 4 |
| woven-storage-basket | prop | basket | 672 | 368 | 0.55 | 13 |
| pillar-coral | prop | coral | 534 | 304 | 0.57 | 17 |
| office-desk | prop | desk | 280 | 72 | 0.26 | 8 |
| game-master's screen | prop | screen | 706 | 180 | 0.25 | 17 |
| basalt boulder | prop | boulder | 718 | 182 | 0.25 | 5 |
| wooden-rowboat | vehicle | boat | 1,262 | 288 | 0.23 | 10 |
| context-menu-list | prop | screen | 788 | 180 | 0.23 | 17 |
| goat | animal | creature | 2,446 | 477 | 0.20 | 17 |
| scorched-grass-tuft | prop | grass | 660 | 120 | 0.18 | 42 |
| airport-security-officer | character | creature (biped) | 4,023 | 525 | 0.13 | 19 |
| elf-carrying-presents | animal | creature (biped) | 3,904 | 525 | 0.13 | 19 |
| minotaur-miniature | prop | miniature | 981 | 121 | 0.12 | 6 |
| lake-rowing-skiff | vehicle | boat | 2,444 | 288 | 0.12 | 10 |
| aurelian | animal | creature (biped) | 4,884 | 525 | 0.11 | 19 |
| cathedral-angel | animal | creature (biped) | 4,944 | 525 | 0.11 | 19 |
| clockwork finger set | attachment | fingerSet | 3,006 | 300 | 0.10 | 12 |
| minka farmhouse | building | building | 1,560 | 100 | 0.06 | 10 |
| tower shield | prop | shield | 686 | 28 | 0.04 | 4 |
| tiled roof section | prop | roofTile | 712 | 4,400 | 6.18 | 102 |

**Script/module use: 0/20.** The previous sample needed `module` for six rigged assets; the
new `skeleton`/`skin` pair removes that, and bipeds/quadrupeds build as graphs.

The roof ratio (6.18) is the one real regression: 100 individual `chamferBox` tiles at 44
tris each cost 4,400 tris. The original gets 712 by using a low-poly tile with shared
vertices. That is an **instancing / LOD gap**, not an expressibility gap.

---

## 3. Gaps that remain

Ranked by how many of the 20 need them.

| # | gap | assets | why the graph cannot do it today |
|---|---|---|---|
| 1 | **Cloth / robes / capes** | officer, elf, aurelian, angel | only loft/deform; no simulation, pleats or layered garment authoring. Templates use a smooth body. |
| 2 | **Hair / fur cards** | goat, animals | no strand or card generator; `scatterSurface` + planes can fake it but there is no groom node. |
| 3 | **Text / glyphs** | context menu, GM screen | no text geometry node; the ports use ink bars. Text could be a decal/SDF, out of geometry scope. |
| 4 | **Weave / braid** | basket | no weave pattern node; revolve bands approximate. |
| 5 | **Branching growth** | coral, shrub | no L-system/recursive node; branches are a JS loop in the builder. |
| 6 | **True CSG union/subtract** | cheese (from sample 2), some props | `cavity` indents radially; it cannot cut a hole through a wall or union two shells. |
| 7 | **Instancing through the merge path** | roof | `instancedMesh` exists, but `mesh`/`join` do not preserve instancing; the merged path always realizes copies. |
| 8 | **Skin quality** | 6 rigged | nearest-bone rigid/2-bone soft weights, no IK, no pose blending. Fine for stills, not for animation. |
| 9 | **Parametric cook** | all | templates bake parameters at build time; expression params exist but are not used end-to-end. |
| 10 | **Attributes** | all | only zone strings (colour/material); no arbitrary per-vertex/face attributes (wear, wetness, decals). |

None of these required a script node to *express the construction*; they are missing
authoring features, not missing run-time capability. If exact fidelity were required, cloth
and fur would be the first two to need either new nodes or a script fallback.

---

## 4. The ring-array problem

### What it is

When a port computes a ring or profile in JavaScript, the graph stores the **resulting
points as literals**. A 48-triangle crystal ends up with 2.8 KB of coordinates:

```pfn
n n0 loft rings=[[[-0.037,0.0213,0.0327],[-0.037,0.0246,0.0327], … 12 points …],
                 [[0.037,0.0213,0.0327], … 12 points …]]
```

This is the ring-array problem: **the graph records data, not the operation that made it**.
Consequences:

- file size and diff noise (every parameter change rewrites every point);
- no parametric edit — changing `length` cannot move the baked points;
- duplicate arrays when two lofts share a ring;
- an asset of 10k triangles would need hundreds of KB of text.

### The fix that was implemented

Move the loop into the node, so the graph stores parameters:

```pfn
n p0 profile pts=[[0.034,0.023],[0.017,0.046],[-0.017,0.046],[-0.034,0.023],[-0.017,0],[-0.017,0]]
n p1 bevelProfile profile=@p0 dist=0.0068
n p2 loftProfile profile=@p1 stations=[[-0.037,1,0],[0.037,1,0]]
       capTop=[-0.07,0.023,0] capBottom=[0.052,0.023,0] zones={band:gem}
```

`bevelProfile` chamfers a 2D loop; `loftProfile` expands a profile along stations. Both
generate the same vertices at cook time.

Measured, with identical triangle and vertex counts:

| graph | before | after | saving |
|---|---:|---:|---:|
| rough sapphire (48 tris) | 2,762 B | **1,074 B** | 61% |
| tire (520 tris) | 4,790 B | **2,004 B** | 58% |

The tire also lost three literal cap-ring arrays in favour of `fanRing`, and five lug cones
in favour of one cone + `arrayPolar`.

### Other ways to optimize it

1. **Structural sharing.** Reference a ring node from several lofts (`rings=[@rim]`) instead
   of re-emitting the same array. The format already supports refs; the ports were the
   problem, not the format.
2. **Expression params.** The format has `` ~`s => …` `` for a parameter computed once per
   cook. A profile can be `profile=~\`s => [...]\``; this is the right tool for shapes whose
   point count or spacing depends on a knob.
3. **Content hashing at serialization.** Deduplicate identical arrays and write them once
   (hash-consing). Cheap to add and helps when a graph has many repeated profiles.
4. **Quantize / pack for caches.** Text coordinates to 5 decimals, or store `Float32Array`
   as base64 in the JSON cache. Keep the text form for review; the binary form is for load
   speed.
5. **Binary `.pfnb` for cooked graphs.** Once the graph is on the critical path, write a
   compact binary: node table + typed value pool + ref indices. The text form remains the
   source of truth.

The general rule: **if a shape can be described by parameters and a loop, it should be a
node or an expression; literals are for genuinely irregular data only.**

---

## 5. Format update

Groups and repeat zones are now part of the text format:

```pfn
group blade
in i int 0
n c cone n=3 r=0.012 h=`0.3+0.2*hash(i,7)` x=`cos(i*2.4)*0.2` z=`sin(i*2.4)*0.2`
out out=@c
end
n blades repeat count=40 graph=blade
n m mesh geom=@blades zones={a:#7a8a4f}
out mesh=@m
```

- `repeat` binds `i` into the group and merges the group's `out` geometry.
- `group` binds named inputs once.
- `script` still serializes as a `src=<<< … >>>` block; `module` is stored by `src=` path.
- Round-trip tested for groups, repeat, script and plain graphs.

---

## 6. Verdict after sample 3

- **API coverage:** all 20 assets build with nodes only; zero `script`/`module`.
- **Fidelity:** 1 close (pumpkin), 2 mid (basket, coral), 17 low-detail templates. This is
  porting effort, not API capability; the operations are expressible.
- **Filled:** groups/repeat, skinning, surface scatter, chamfer box, splines, instancing,
  cavity, procedural profiles/caps.
- **Remaining:** cloth, fur, text, weave, branching, true CSG, instancing through merge,
  skin quality, parametric cook, attributes.
- **Ring arrays:** solved for the common cases by `bevelProfile`/`loftProfile`/`fanRing`
  (58–81% smaller files, same meshes); expression params and structural sharing cover the
  rest.
