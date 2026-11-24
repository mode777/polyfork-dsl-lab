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

## 5. Generic data nodes

Six nodes cover the structure the code blocks provided:

| node | purpose |
|---|---|
| `value` | evaluate an expression to a value; `args` binds refs into it |
| `list` | list literal of refs/values |
| `range` | integer range for iteration |
| `map` | apply a `group` to each list item; group sees `item`/`index` |
| `fold` | thread an accumulator through a list; group sees `item`/`index`/`acc` |
| `if` | select one of two values |

`@node.field` reads a named output from a multi-output node or group, so `map`/`fold`
groups can return records without a special accessor node.

## 6. How the ports are expressed now

### Sapphire

- `random(20261103, 12 + 2*nStations)` provides the reference draw stream.
- `map(range 6)` builds the jittered section; `bevelProfile` + `if` chooses bevel vs raw.
- `map(range nStations)` builds jittered stations; nested `map` builds rings.
- a second `random` seeded from `@rng.state` gives the tip jitter; `value` computes tips.
- `switch` selects pointed/truncated/broken; `reverse` handles the dished fracture cap.
- No code block, 50 nodes.

### Tire

- `value` holds the profile row table.
- `map` builds the scaled profile and zone list.
- `revolve.mod` is an expression reading `vals.rows[k]`; no generated field string.
- No code block, 28 nodes.

### Area rug

- `random(7681, (NX+1)*(NZ+1))` provides the wobble values.
- `grid.position` is one `let … in` expression using `vals.wob`.
- `deform` straightens the ruck diagonal (top only).
- `fold(range 1..3)` threads the grid through a group that computes pivot/axis/phi and
  rotates the subset with `vrot`.
- `solidify` uses a per-cell zone expression.
- No code block, 12 nodes.

## 7. `script` today

`script` still exists as an optional host escape hatch for Three/addons geometry. It is
not used by any published example, and a strict backend can reject it. The core graph
evaluation path has no dependency on it.

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
