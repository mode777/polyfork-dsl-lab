# Script-node audit and the node-graph replacement

**Status:** implemented. The showcase ports contain no `script` nodes and the core never
evaluates JavaScript. This document keeps the audit as the design record.

## 1. Inventory

The three ports previously used `script` nodes:

| port | lines | what it computed |
|---|---:|---|
| rough sapphire | 87 | jittered section, bevel profile, stations, rings, tips, truncated caps, broken dent/mirror |
| tire | 24 | derived dimensions, row table, profile/zones, per-facet radius function, caps |
| area rug | 66 | size lookup, random wobble lattice, grid construction, corner fold |

All three returned **data**, not geometry. The geometry was already built by `loftProfile`,
`revolve`, `solidify`, `fanRing`, `cone`, `join`, `center`, `transform` and `mesh`.

## 2. What the scripts actually needed

| need | sapphire | tire | rug |
|---|:---:|:---:|:---:|
| constants / derived scalars | ✓ | ✓ | ✓ |
| reusable functions | ✓ | ✓ | ✓ |
| seeded random values | ✓ | — | ✓ |
| arrays, tables, row access | ✓ | ✓ | ✓ |
| value-level conditional | ✓ | — | ✓ |
| mutate/fold a lattice | — | — | ✓ |
| return several named values | ✓ | ✓ | ✓ |

## 3. Why not a code block

An earlier pass added a `layout … end` block. It removed the `script` node but still
compiled JavaScript, so a backend would still need a JS engine. That is not acceptable:
the graph itself must carry the meaning, and the text form must be a compact serialization
of the graph.

The block was removed. Its jobs are now done by two things:

1. a **parsed expression language** for scalar/vector math;
2. **generic data nodes** for structure and iteration.

## 4. The expression language (`runtime/expr.js`)

Fields and `~` params are tokenised and evaluated by our own parser. No `eval`,
no `new Function`, no host language required.

Supported:

- literals: numbers, strings, booleans, `null`
- arrays `[a, b]`, objects `{x: 1, y: 2}` (and `{x, y}` shorthand)
- `+ - * / % **`, comparisons, `&& || !`, ternary `? :`
- `let a = e, b = e in body`
- member/index access, `.length`, `.slice`, `.concat`, `.join`
- built-ins: `sin cos tan asin acos atan atan2 sqrt abs min max floor ceil round pow
  exp log hypot sign clamp lerp smoothstep fract hash noise rand`
- vector helpers: `centroid sum vnorm vrot darken`

## 5. Generic operations

Structure is now expressed by named operations, not by a catch-all `value`:

| operation | purpose |
|---|---|
| `let` | named derived values, one node, many outputs |
| `table` | rows with named columns |
| `preset` | colourway lookup plus per-key overrides |
| `coalesce` | explicit override else preset |
| `list` / `range` | list literals and index ranges |
| `map` / `fold` | apply a `group` to items / thread an accumulator |
| `if` | value-level select |
| `draws` / `jitter` | named consecutive draws / point jitter from a stream |
| `centroid`, `lerpPoint`, `mirrorPoint`, `rotateAbout`, `planeCut` | point/ring operations |
| `gridPoint`, `direction` | grid access and normalised direction |
| `first`, `last`, `slice`, `concat` | list access and assembly |
| `value` | residual scalar/vector expression only |

## 6. How the ports are expressed now

### Sapphire (47 nodes)

- `let` derives `pl`, `irr`, `bar`, `ch`, station count and draw count.
- `jitter` builds the section from base points + amplitudes + the stream.
- `bevelProfile` + `if` chooses bevel vs raw.
- `map` over `range n` builds stations with `draws`; nested `map` builds rings.
- `centroid`/`value` build the tips; `switch` selects pointed/truncated/broken.
- `planeCut`, `mirrorPoint`, `first`/`last`/`slice`/`concat` build the broken branch;
  `reverse` handles the dished fracture cap.

### Tire (17 nodes)

- `let` derives all dimensions once.
- `table` holds the 15 profile rows with `r/z/block/parity/zone` columns.
- `map` projects the profile and zone list; `revolve.mod` reads `vals.rows[k].block`.
- `preset` resolves the colourway and applies explicit colour overrides.

### Area rug (9 nodes)

- `let` derives `nx/nz/w/d/count` from size.
- `random` + `grid.position` build the lattice.
- `deform` straightens the ruck diagonal; `fold` threads the grid through a group that
  uses `gridPoint`/`direction`/`rotateAbout` math for the subset.
- `solidify` applies per-cell zones; `preset` handles colourway + overrides.

## 7. `script` today

`script` still exists as an optional host escape hatch for Three/addons geometry, but it is
**disabled by default**: `evaluate()` throws unless the host passes `{ allowScript: true }`.
No published example uses it, so the default runtime cannot execute JavaScript at all.

## 8. Acceptance (met)

1. `sapphire`, `tire`, `rug` contain no `script` nodes. ✓
2. The core never evaluates JavaScript for fields or params. ✓
3. Same parity at `1e-4`, including winding. ✓
4. No generated field strings; tire uses a row table + expression. ✓
5. `script` remains documented as a host-only escape hatch. ✓

## 9. Remaining gaps

Polygon faces with holes/craters (cheese wedge), fused clipped lumps / CSG (small rock),
and cloth/rigged families are separate geometry gaps. They are not layout gaps and are
not hidden in a code block.

## 10. Signage follow-up

The fourth reference sample is signage-heavy: menu boards, readerboards, marquee letters
and wayfinding signs. Those assets repeatedly hand-build mitred frames, holed plates,
skipped-face boxes, faceted lamps and flat letter polygons. Rather than bake each one into
a `script` node, the runtime gained six generic primitives:

| node | replaces |
|---|---|
| `prism` | `prismX` / `prismY` / Z extrusion helpers |
| `frame` | rectangular mitred frame sweeps |
| `plate` | triangulated outer profile + holes, with side walls |
| `block` | axis-aligned box with selected faces skipped |
| `gem` | n-sided faceted lamp/socket cap |
| `poly` | arbitrary oriented 3D polygon (hint or interior point) |

`join` now flattens nested geometry lists, so `map` results and conditional branches can
be joined directly. `let` bindings also expose graph inputs under `s`, matching fields and
`~` params; the chalkboard and theatre ports use this for per-panel/per-row layout maths.
Expression built-ins gained `mix`, `deg`/`rad` and the missing vector operations
(`vadd`, `vsub`, `vmul`, `vdot`, `vcross`, `vlen`). Both new ports are exact at `1e-4`
across their parameter variants.

## 11. Furniture / legend follow-up

The overhead wayfinding sign and office desk added the next set of reusable operations:

| node / option | replaces |
|---|---|
| `pack` | flat arrow/letter/pictogram rows with a shared gap and scale |
| `outlineRect` | chamfered rectangle plans (desk slab, sleds) |
| `band` | connecting matching outlines at two heights (slab chamfers, slot walls) |
| `plate.cap` / `walls` / `skipWalls` | front/back caps, selected walls, and omitted wall edges |
| `chamferBox.skip` | cabinets with a recessed face replacing one or more chamfered faces |
| `prism.capOrient` | reference prisms whose caps must face out from a profile |
| `mixColor` | wear/fade colour interpolation in `value` expressions |

The remaining fourth-sample signs are still open: the core rulebook is mostly
plates/bands but has two states, and the marquee letter needs stroke union/offset. Those
are separate geometry features, not layout escapes.

## 12. Face-soup ports replaced

The ten earlier face-soup ports (plaza, clam, tram, armchair, wattle, quiver, door,
taxiway, roof and carousel) are now generic graphs. Their per-asset part nodes and the
`builders.mjs`/`parts.mjs` wrappers were removed. The recurring techniques are:

| technique | used by |
|---|---|
| zoned profile/ring lofts | tram, plaza, clam, carousel, roof |
| short-diagonal lofts | armchair shell and cushions |
| `frustum` sweeps and caps | roof rolls, quiver vanes, taxiway gussets, door panel returns |
| fan caps | clam valves/mantle, armchair shell/cushions |
| `stud` fasteners | quiver stitches, taxiway bolts |
| `block` / `prim` | door ironmongery, taxiway frame, carousel cases |
| `loft.inside` / `keepDegenerate` | wattle rods/stakes, armchair shell |
| isolated `poly` faces | tram end curtains, taxiway sign faces, roof bargeboards |

`faces` remains available as a low-level escape hatch for genuinely irregular soups, but
no published example needs it now. The expression language did not need another built-in
for this set; the repeated value work is covered by `let`/`value`/`preset` and the existing
math helpers.

## 13. Generic-node follow-up

Ten more ports were added without a per-asset runtime node: **prize car turntable**,
**scorched grass tuft**, **pillar coral**, **wooden rowboat**, **woven storage basket**,
**context menu list**, **lookout watchtower**, **cafe table set**, **keyboard bench** and
**table game chair**. They use the existing generic nodes plus a small set of reusable
extensions:

| extension | used by | why |
|---|---|---|
| `loft.zoneField` / `values` | rowboat hull | per-edge zones on one lofted hull |
| `loft.diagonal='abba'` | coral, rowboat | reference interleaved quad order |
| `loft.capTopFlip` / `capBottomFlip` / `capTopRaw` / `capBottomRaw` | prize, coral, keyboard | reference fan/cap orientation |
| `pill` | context menu | rounded UI row with two cap centres |
| degenerate-triangle skipping | keyboard, chair | reference helpers skip zero-area faces |

No `script`, `module`, `faces` dump or single-asset node is used by the published graphs.
The shared authoring helpers live in `ports/_kit.mjs` (loft/beam/prism/poly wrappers and
vector/profile helpers), not in the runtime.

## 12. Generic-node props follow-up

The ten generic-node ports exposed the same construction techniques in several scripts:
rectangular members, tapered boxes, recessed openings, repeated fasteners, tufted pads,
bent ribs and transitions between profiles with different vertex counts. Those are now
named nodes rather than per-face `poly` calls:

| node / option | replaces |
|---|---|
| `beam` | oriented rectangular struts, rails, braces and handles |
| `frustum` | tapered boxes, planks and posts between two rings |
| `opening` | recessed window/door/hatch surrounds |
| `stud` | repeated nails, rivets and buttons |
| `quiltedPad` | tufted rectangular upholstery panels |
| `bandPath` | bent ribs and bands swept along a 2D path |
| `bridge` | stitched transitions between profiles with different vertex counts |
| `loft.skipEdges` / `diagonal=short` | omitted edges and shortest-diagonal quad splits |
| flat loft caps | stable winding when the cap point is the ring centroid |

`poly` remains for isolated irregular faces (blade roots, oar blade caps, glyph arrows).
`t-poly-budget.mjs` fails an example above 80 `poly` nodes so a face dump cannot return.
