# Script-node gaps and the pure layout layer

**Status:** implemented. The three showcase ports no longer use `script` nodes; the audit below is kept as the design record.

The showcase ports previously used three `script` nodes. They were escape hatches and
should not be part of a finished port. This document records exactly what they did, what
the DSL gap was, and the general language change that closed them without adding
asset-specific nodes.

## 1. Inventory

| port | script | lines | what it computes |
|---|---|---:|---|
| rough sapphire | `DATA_SRC` | 87 | jittered section, bevel profile, stations, rings, tips, truncated caps, broken dent/mirror |
| tire | `DATA_SRC` | 24 | derived dimensions, row table, profile/zones, per-facet radius function, caps |
| area rug | `GRID_SRC` | 66 | size lookup, random wobble lattice, grid construction, corner fold |

All three scripts return **data**, not geometry: no `BufferGeometry`, no mesh, no
`mergeGeometries`. The geometry is already built by `loftProfile`, `revolve`, `solidify`,
`fanRing`, `cone`, `join`, `center`, `transform` and `mesh`. So the missing capability is
not another geometry primitive; it is a compact **value/layout layer**.

## 2. What the scripts actually need

| need | sapphire | tire | rug | current workaround |
|---|:---:|:---:|:---:|---|
| local constants / derived scalars | ✓ | ✓ | ✓ | JS `const` |
| pure helper functions | ✓ | ✓ | ✓ | JS `function` |
| stateful seeded RNG | ✓ | — | ✓ | closed-over `seed` |
| array/table construction and mapping | ✓ | ✓ | ✓ | JS loops / `.map` / `.slice` |
| row/record field access | ✓ | ✓ | ✓ | JS objects |
| data-level conditional | ✓ | — | ✓ | JS `if` / ternary |
| mutate/fold a grid over indices | — | — | ✓ | `THREE.Vector3` + nested loops |
| return several named values | ✓ | ✓ | ✓ | one object + a get helper (now replaced by `@node.field`) |
| build a field/function from data | — | ✓ | — | string-concatenate a JS field |

The last row is the strongest signal: the tire script literally builds another field
source string with `JSON.stringify(PROF)` and `N`. That is code generation inside an
escape hatch. The DSL should provide a first-class function/table value instead.

## 3. Implemented additions

The change is a **pure `layout` block** plus first-class values. It is a language
feature, not a pile of nodes. It has no access to `THREE`, imports, DOM or runtime state;
`script` remains the unrestricted escape hatch for Three/addons geometry.

### 3.1 `layout … end`

A pure block with explicit inputs and named outputs:

```pfn
layout sapphire-data
in length float 1
in barrel float 0
in ends enum pointed
in chamfer float 0.3
in irregularity float 0

let R = 0.034
let Hh = 0.023
let rng = prng(20261103)

fn jitter(sec, amount) = sec.map(([x, y], i) => ...)
fn centroid(points) = points.sum() / points.count
fn tip(ring, dir, r) = ...

let sec = jitter(BASE_SECTION, $irregularity)
let profile = if $chamfer > 0.001 { bevel(sec, $chamfer * 0.2 * R) } else sec
let stations = if $barrel > 0.001 || $irregularity > 0.001 { ... } else { ... }
let rings = stations.map(s => profile.map(([z, y]) => [s.x, y * s.s, z * s.s + s.dz]))
...
out profile, stations, rings, pointedTop, pointedBottom, ...
end
```

Then the existing geometry nodes consume the outputs directly:

```pfn
n d sapphire-data length=$length ...
n body loftProfile profile=@d.profile stations=@d.stations capTop=@d.pointedTop ...
```

The syntax is deliberately small: `in`, `let`, `fn`, `if`, `for`/`map`, literals, records,
`out`. No new geometry semantics.

### 3.2 First-class values

- **`rng`**: `prng(seed)` with `next()`, `take(n)`, `grid(nx, nz)`; deterministic and
  forkable. Replaces every hand-rolled LCG in the scripts.
- **arrays / records / tables**: `[a, b]`, `{x, y}`, `.map`, `.filter`, `.slice`,
  `.flatMap`, `.sum`, `.count`, `.at`. Enough for profile rows, zones and ring maps.
- **multi-output**: `out name=value` in groups/layouts, referenced as `@node.name`.
  This removes the object-access workaround from showcase ports.
- **`if` as a value expression**: selects profiles/stations/tips without a geometry
  `switch` (the geometry `switch` stays for geometry branches).

### 3.3 Two generic hooks, no asset-specific nodes

| hook | why | proposed surface |
|---|---|---|
| grid deformation/fold | rug needs cumulative rotations of a subset of top/bot vertices | let existing `deform` accept a `grid` and apply a callback to both lattices; callback gets `(p, i, j, top, bot, ctx)` |
| table/function modulation | tire builds a `mod` string by hand | let `revolve.mod` accept a function value (`fn radius(i, k) = ...`) or a table, not only a field string |

That is the whole geometry-side change: two general capabilities, no `rugFold`,
`sapphireProfile`, `tireTread` or similar nodes.

## 4. How the three ports look after the change

### Sapphire

The layout block holds the jitter, bevel, station and tip math. The graph keeps
`loftProfile`/`loft`, `switch` for pointed/truncated/broken, `reverse` for the dished
fracture cap, `center` and `mesh`. No `script` node. The generated pfn uses a `layout`
block and `@data.field` refs.

### Tire

```pfn
layout tire-data
in facets int 14
in width float 1
in rimSize float 1
let rows = [
  {r: BKR, z: BACK_Z, block: 0, zone: rim}, ...
]
fn radius(i, k) = ...
out profile=rows.map(...), zones=rows.map(...), mod=radius, ...
end
```

`revolve profile=@t.profile zone=@t.zones mod=@t.mod`. The dynamic field string disappears.

### Rug

```pfn
layout rug-grid
in size enum small
in pile float 0.25
in lived_in float 0.35
let {W, D, NX, NZ} = SIZES[$size]
let rng = prng(7681)
let wob = rng.grid(NX + 1, NZ + 1)
let top = grid(NX, NZ, (i, k) => ...wob[i][k]...)
let bot = grid(NX, NZ, (i, k) => [top[i][k].x, 0, top[i][k].z])
let foldedTop = deform(grid: top, fn: ...KRUCK rotations...)
let foldedBot = deform(grid: bot, fn: ...same rotations...)
out top=foldedTop, bot=foldedBot, NX, NZ
end
```

`solidify` then does the slab and `topZoneField` does the weave colours. The rug fold is
still an algorithm, but it is a pure, reusable layout expression instead of opaque JS.

## 5. What not to do

- Do not add `sapphire`, `tire` or `rug` nodes.
- Do not add one node per loop/table operation.
- Do not let the layout block call `THREE` or import modules; that is what `script` is for.
- Do not claim a port is script-free until `rg "script" examples/*.pfn` is empty.

## 6. Acceptance criteria (met)

1. `sapphire`, `tire` and `rug` contain no `script` nodes. ✓
2. Their layout blocks are pure; geometry still comes from the existing nodes. ✓
3. The same parity tests pass at `1e-4`, including winding. ✓
4. The tire no longer embeds a JSON-string-generated field source; it returns a
   `radius({i,k})` function. ✓
5. `script` remains documented as the escape hatch for Three/addons geometry only. ✓

## 7. Remaining gaps this does not close

Polygon faces with holes/craters (cheese wedge), fused clipped lumps / CSG (small rock),
and cloth/rigged families are separate geometry gaps. They are not caused by the layout
scripts and should not be hidden inside a layout block.


## 8. Implementation notes

- `layout … end` is a first-class block in the `.pfn` format (and JSON). It has typed
  inputs, `let`/`fn` sugar, pure JS expressions, and `out name=expr` outputs.
- `@node.field` refs resolve multi-output layouts.
- `rng(seed)` is available inside layouts; `next()`, `take(n)` and `grid(nx,nz)` are
  deterministic.
- The layout source is checked for `THREE`, imports, DOM/global access and eval-like
  constructs; it is intentionally not a general script.
- `deform` accepts a grid value and deforms top/bot together.
- `revolve.mod` accepts a function value; tire returns `radius({i,k})`.
- `t-layout.mjs` covers layout inputs, `fn`, `rng`, multi-output and format round-trip.
