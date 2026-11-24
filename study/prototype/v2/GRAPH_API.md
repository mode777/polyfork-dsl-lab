# v2 graph API — ports, gaps, and storage format

**Scope:** a second random sample of 20 Polyfork assets (seed `20261124`) ported to a
three.js-native node graph, the gaps those ports exposed, the nodes added to close them,
and a compact declarative storage format.

> **Update (24 Nov 2026):** the tables below are historical. The current parity contract is
> order-independent triangle/vertex/bbox comparison in `t-all.mjs` at `1e-4`. Only
> `cookie`, `sapphire`, `tire` and the six `module` wrappers pass; see
> `docs/PARITY.md`. The runtime now has a first-class Three bridge and the low-level
> controls listed there.

**Code:** `runtime.mjs` (57 node types after the Three-bridge/parity pass), `dsl.mjs`, `format.mjs`, `cache.mjs`,
`ports/` (20 ports), `templates.mjs` (20 more). See `SAMPLE3.md` for the third sample. Run `node t-all.mjs` for the order-independent geometric parity table.

---

## 1. API

### Values

| type | shape |
|---|---|
| `geometry` | `{parts: [{pos: number[], zone: string}]}` — flat triangle soup, zone is a colour/material name |
| `points` | `{pts: [[x,y,z,scale,yaw]]}` |
| `grid` | `{top, bot, nx, nz}` — paired lattices for `solidify` |
| `profile` | `[[x,y], …]` |
| `path` | `[[x,y,z], …]`, optional closed |
| `field` | JS expression string; evaluated per vertex/index |
| `number/int/bool/string/color/enum/vec3` | scalars |
| `random` | deterministic `{values,next}` stream |
| `object` | a `THREE.Object3D` output |

### Nodes (57)

| group | nodes |
|---|---|
| sources | `ring`, `profile`, `path`, `grid`, `box`, `cylinder`, `sphere`, `geometry`, `random` |
| surfaces | `loft`, `cap`, `extrude`, `revolve`, `sweep`, `inset`, `pocket`, `solidify` |
| modifiers | `transform`, `center`, `mirror`, `deform`, `clip`, `join` |
| distribution | `scatter`, `instance`, `arrayPolar`, `arrayLinear` |
| control | `switch`, `fan`, `cone` |
| output | `mesh`, `group` |
| escape hatches | `script`, `module` |

Key signatures:

```
ring      n r y sx sz phase radius(field)
grid      nx nz w d position(field -> [x,y,z])
loft      rings[] capTop? capBottom? zones{band,capTop,capBottom} diagonal bandZones flip
revolve   profile[[r,y]] seg phase inRadius axis('y'|'z') zone(k)|zones mod(field i,k)
sweep     path section twist caps
inset     profile dist -> profile
pocket    profile depth bevel -> geometry (walls + floor, no CSG)
solidify  grid topZone botZone wallZone
clip      geom nx ny nz d cap -> geometry (plane split + capped cut)
scatter   count minDist seed tries sample(field) height(field) size(field|vec3) yawScale lazy rng -> points
instance  points proto [sx,sy,sz] scale yawSign -> geometry
arrayPolar geom count radius start arc spin
geometry  object(THREE.BufferGeometry|Mesh|Group) zone -> geometry
random    seed count -> stream
switch    on cases{a:ref,b:ref}
mesh      geom zones{zone:hex} materials{zone:{slot,roughness,metalness,opacity}} crease
script    inputs{...} src  (JS: THREE, ADDONS, H; `return` any value)
module    params  (wraps an existing createAsset)
```

**Fields** are strings evaluated as JS with `x,y,z,i,k,u,v,p,n,s` in scope, plus
`sin/cos/clamp/lerp/noise/hash/rand`. Example: `` `0.05*(0.96+rand(1000+i*7)()*0.07)` ``.
The convention for arrow fields is positional `(x,y,z,i,k,u,v,p,n,s)`.

**Params vs inputs:** `in` values that contain a ref are wired sockets; everything else is a
parameter. They are merged for node evaluation.

### Composition

- `switch` picks one of several geometry branches by enum (all branches are currently
  evaluated; lazy branches are a TODO).
- `arrayPolar`/`arrayLinear` cover the common repeats.
- There is **no group/repeat-zone node yet**; ports inline loops or use arrays.
- `script` is the general escape hatch: typed inputs in, any value out.
- `module` wraps a whole `.mjs` generator; used for rigged assets.

---

## 2. The 20 ports

Method: a port is a `build(g, P)` function that emits graph nodes and returns the output.
Meshes are compared to the original module on triangle count, vertex count and bounds at
default parameters. "Parity" means tris and verts exactly equal; "near" within 15%;
"sketch" means the construction is expressed but detail is deliberately reduced.

| asset | class | orig tris | port tris | ratio | nodes | status |
|---|---|---:|---:|---:|---:|---|
| rough-sapphire | prop | 48 | 48 | 1.00 | 6 | **parity** |
| tire | prop | 520 | 520 | 1.00 | 13 | **parity** |
| lounge-armchair | prop | 460 | 468 | 1.02 | 9 | near |
| tram-track-tile | prop | 170 | 156 | 0.92 | 15 | near |
| small-rock | prop | 188 | 198 | 1.05 | 6 | near |
| baggage-carousel | prop | 276 | 316 | 1.14 | 16 | near |
| wattle-fence | prop | 802 | 472 | 0.59 | 27 | sketch |
| cobbled-street | prop | 890 | 492 | 0.55 | 43 | sketch |
| quiver | prop | 658 | 312 | 0.47 | 13 | sketch |
| composite-plaza-tile | prop | 292 | 108 | 0.37 | 12 | sketch |
| clam | prop | 792 | 192 | 0.24 | 2 | sketch |
| flowering-shrub | prop | 831 | 174 | 0.21 | 19 | sketch |
| adjustable-bay-stilt | building | 1,284 | 136 | 0.11 | 9 | sketch |
| cheese-wedge | prop | 608 | 12 | 0.02 | 3 | sketch |
| valet-attendant | character | 3,193 | 3,193 | 1.00 | 1 | module |
| snail | animal | 2,532 | 2,532 | 1.00 | 1 | module |
| stag-beetle | animal | 2,706 | 2,706 | 1.00 | 1 | module |
| mountain-hare | animal | 2,975 | 2,975 | 1.00 | 1 | module |
| opera-soprano | animal | 4,990 | 4,990 | 1.00 | 1 | module |
| elf-assassin | animal | 6,340 | 6,340 | 1.00 | 1 | module |

The sketches are not failures of the API so much as *unfinished ports*: each was stopped
when the next step needed a missing node, and the gap is recorded below. The rigged six are
wrapped whole because skinning is not implemented.

---

## 3. Gaps exposed, and what was filled

| # | gap | exposed by | resolution |
|---|---|---|---|
| 1 | Revolve had one zone and no per-segment modulation | tire (tread blocks), cogs, gears | **filled** — `revolve` now takes `axis`, `zone(k)`, and `mod(i,k)`; tire matches exactly |
| 2 | Primitives could not be placed/rotated | every port | **filled** — `x/y/z/rx/ry/rz/s` on box, cylinder, sphere, cone |
| 3 | Concave caps triangulated as fans | plaza, shells, panels | **filled** — `cap` node uses `ShapeUtils.triangulateShape`, with holes |
| 4 | No plane cut with a capped face | rock, cobbles, cut stones | **filled** — `clip` node (split triangles, collect cut loop, fan cap) |
| 5 | No bbox centering (all assets sit on y=0, centred) | sapphire, tire | **filled** — `center` node |
| 6 | Multi-material assets | glass/glow assets, dock | **filled** — zones map to material slots; `mesh` groups by slot |
| 7 | Bevel box cost | carousel blew up to 2,044 tris | **partial** — `RoundedBoxGeometry` default seg=1 is 108 tris; a 44-tri chamfer box is still missing |
| 8 | No group / repeat-zone | brick courses, plank runs, chair sets | **open** — ports use `arrayPolar`/`arrayLinear` or JS loops; loops bake N nodes |
| 9 | No skinning / bones / pose / IK | 6 rigged assets | **open** — `module` escape hatch; this is the big remaining family |
| 10 | `scatter` only samples x/z | cobbles, leaves, barnacles | **open** — needs point-on-surface sampling with normals |
| 11 | No spline interpolation | ropes, tails, cables | **open** — `path` is polyline; add Catmull-Rom/Bezier node |
| 12 | Only zone strings, no arbitrary face attributes | per-face wear, decals | **open** — attribute system is name→scalar/colour, not general |
| 13 | No true instancing | repeated details | **open** — everything is merged (fine at these tri counts) |
| 14 | No CSG / sphere subtraction | cheese craters | **open** — `clip` covers planes only; craters need SDF or manual polygons |
| 15 | Params are baked at build time | all ports | **partial** — `expr` params and fields exist, but ports compute arrays in JS; graphs are snapshots per parameter set |

The filled gaps are the ones that blocked more than one asset. The open ones are genuine
features, not bugs: skinning and surface scatter are the two that would change the most
port statuses.

---

## 4. Storage format

### 4.1 What other tools do

| tool | format | lesson taken |
|---|---|---|
| **OpenUSD** (`UsdShadeNodeGraph`) | typed `inputs:`/`outputs:`, connections authored on the consumer, nested graphs, UI metadata separate | explicit interface + explicit refs; keep presentation out of the graph |
| **Nuke** `.nk` | line-oriented TCL-ish blocks; connections implied by a stack (`set`/`push`); defaults omitted; `Group`/`end_group` | one line per node, omit defaults, block-scoped groups — but *not* the implicit stack |
| **Babylon Node Material** | JSON `blocks[]` with typed connection points; 24 blocks ≈ 13.6 KB; `generateCode()` emits JS | canonical JSON for tools; a text form for humans |
| **Blender GNToolkit / nodesync** | JSON `nodes[]` + `links[{from_node,from_socket,to_node,to_socket}]` + `interface_items`; zones for repeat/simulation | group interface and explicit links are the right model |
| **Houdini** | binary `.hip`, with VEX/Wrangle nodes as the code escape hatch | a script node is mandatory, not a compromise |

Anti-pattern for this use case: DOT/GraphML edge lists — compact, but untyped, no node
parameters, no interfaces.

### 4.2 Grammar (`.pfn`, "polyfork node")

```
# comment
graph <name>
in  <name> <type> <default> [min=..] [max=..] [options=a|b|c]
n   <id> <type> [key=value ...]
out <name>=<ref>
end
```

Values:

| literal | meaning |
|---|---|
| `12`, `0.5`, `true`, `false`, `null` | scalars |
| `#e0aa5e` | colour |
| `word`, `"two words"` | string |
| `[a,b,[c,d]]`, `{k:v}` | array / object |
| `@n3` | node output reference |
| `$thickness` | graph input |
| `` `0.05*(0.96+rand(1000+i*7)()*0.07)` `` | field expression (per vertex/index) |
| `` ~`s => s.length*2` `` | parameter expression (once per cook, `s` = inputs) |
| `<<< … >>>` | multi-line script body |

Rules:

1. One node per line; keys are socket or parameter names from the node schema.
2. Refs are explicit (`@id`), never positional. Order on disk does not define wiring.
3. Defaults are omitted. A parser fills them from the node registry.
4. Node type names are stable identifiers; unknown types are a hard error.
5. UI positions, colours and comments are optional `@ui` lines and never affect the cook.
6. `script` and `module` are the only executable payloads; both are marked as such.

### 4.3 Example — the compact cookie

```pfn
# polyfork graph v2 — cookie
graph cookie
in thickness float 0.024 min=0.014 max=0.034
in chips int 9
n rim  ring  n=20 radius=`0.05*(0.96+rand(1000+i*7)()*0.07)`
n body loft  rings=[@rim] capTop=[0,$thickness,0] capBottom=[0,0,0]
          zones={band:edge,capTop:dough,capBottom:edge}
n pts  scatter count=$chips seed=42 tries=800 minDist=0.019 sample=`[cos(hash(i,1)*TAU)*0.45*0.05, sin(hash(i,2)*TAU)*0.45*0.05]` height=`$thickness*(0.8+0.2*(1-hypot(x,z)/0.05/0.93))-0.0025`
n chip instance points=@pts proto=@pyramid
n pyramid cone n=6 r=0.009 h=0.0075
n out  mesh geom=@body zones={dough:#e0aa5e,edge:#c4843c,chip:#3d2113}
out mesh=@out
end
```

The line break inside `n body` is for print here; the canonical file keeps one node per
line. Backtick strings are single-line; multi-line code goes in a `<<<` block.

### 4.4 JSON

The same graph, canonical for tools:

```json
{
  "format": "polyfork-graph", "version": 2, "name": "cookie",
  "inputs": [{"name":"thickness","type":"float","default":0.024,"min":0.014,"max":0.034}],
  "nodes": [
    {"id":"rim","type":"ring","in":{},"p":{"n":20,"radius":{"__field":"0.05*(0.96+rand(1000+i*7)()*0.07)"}}},
    {"id":"body","type":"loft","in":{"rings":[{"__ref":"rim"}],"capTop":[0,{"__ref":"$thickness"},0]},"p":{"zones":{"band":"edge"}}}
  ],
  "outputs": {"mesh": {"__ref":"out"}}
}
```

The two forms map 1:1. Text is the authoring/diff form; JSON is the interchange/cache form.

### 4.5 Escape hatches

Script node (inline, versioned with the graph):

```pfn
n cook script lang=js inputs={geo=@body} <<<
  // inputs.geo is a geometry; return any graph value
  const parts = inputs.geo.parts.map(p => ({ ...p, zone: 'weathered' }));
  return { __kind: 'geom', parts };
>>>
```

Module node (opaque generator, resolved by the host, stored by path):

```pfn
n rig module src="scripts2/mountain-hare-base.mjs" params={species:"hare"}
```

A host that cannot execute JS can reject `script`/`module` nodes and still load, inspect and
cook every other graph.

### 4.6 Round-trip

`format.mjs` round-trips both forms. Measured:

| graph | text size | lines | JSON | text parity | JSON parity |
|---|---:|---:|---:|---|---|
| tire | 4.4 KB | 21 | 6.1 KB | ✓ tris/verts | ✓ |
| script-node smoke test | 0.3 KB | 7 | 0.4 KB | ✓ (12 tris) | ✓ |
| sapphire | 2.8 KB | 17 | 3.9 KB | ✓ tris/verts | ✓ |

The size is dominated by **baked ring literals**, because ports are builder-compiled: the
authoring function computes point arrays in JS and the graph stores the result. A
parametric port stores expressions instead (as in §4.3) and is ~5× smaller. This is the
main reason to add `group` + expression params before using the format as a source of
truth.

---

## 5. Verdict

- **API coverage:** 13 of the 20 assets are expressible as real graphs (6 at parity/near,
  7 as sketches); 6 rigged assets need the skinning family; 1 (cheese) needs
  subtraction or manual crater polygons.
- **What the second sample changed:** the first sample suggested a 12-op library. The
  second added *revolve modulation*, *plane clipping*, *profile caps with holes*, and
  *placement on primitives* — all cheap, all now implemented. It also confirmed that the
  expensive part is not geometry: it is rigging and surface scatter.
- **Format:** a line-oriented `.pfn` with explicit refs, omitted defaults, typed interfaces,
  and two marked escape hatches, plus a 1:1 JSON form. It borrows Nuke's brevity, USD's
  interface discipline, and Houdini's script-node honesty.
- **Remaining before this is a product:** groups/repeat zones, skinning, surface scatter,
  a cheap chamfer box, spline interpolation, and expression-param coverage so graphs are
  parametric rather than snapshots.
