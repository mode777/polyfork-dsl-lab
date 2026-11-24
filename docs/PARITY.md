# Parity and the Three.js bridge

This is the contract for porting a Polyfork-style module into the DSL without
accidentally building a second geometry kernel.

## What “parity” means

Order does not matter. A port is geometrically faithful when:

- the vertex count is identical;
- the vertex set matches within `1e-4`;
- the bounding box matches within `1e-4`;
- matched faces have the same winding.

Triangle count/centroid distance is reported for diagnosis. A different quad diagonal over
the same four vertices is not a failure; a different set of vertices or a reversed face is.

Run `node t-all.mjs`. It compares the reference `createAsset()` with the graph result
using a nearest-vertex check in world space. A count-only match is **not** parity; the old
table that labelled sapphire/tire “exact” from triangle counts was wrong.

Current hand-port results:

| port | tris | result |
|---|---:|---|
| cookie | 174 | PASS at 0 error, 3 variants |
| sapphire | 48 | PASS at 0 error, 13 variants |
| tire | 520 | PASS at ~1e-18 |
| pumpkin | 120 | PASS, 6 variants |
| area rug | 392/700 | PASS, 9 variants |
| chalkboard | 194 | PASS, 10 variants |
| theatre | 667 | PASS, 8 variants |

The six `module` wrappers also pass because they call the reference `createAsset()`
directly.

## Three.js bridge

`geometry` converts a `THREE.BufferGeometry`, `Mesh` or `Group` into the graph’s geometry
value. `mesh` accepts those objects directly. `join`, `transform`, `center`, `mirror`,
`clip`, `deform`, `arrayPolar`, `arrayLinear`, `cavity`, `skin` and `scatterSurface`
normalise through `toGeometry`.

A `script` node receives:

- `THREE` — the same three module;
- `ADDONS` — `mergeGeometries`, `toCreasedNormals`, `RoundedBoxGeometry`;
- `H` — `tri`, `quad`, `part`, `geom`, `profile`, `path`, `pts`, `ring`, `prng`,
  `clamp`, `lerp`, `TAU`.

It may return an internal `__kind:'geom'`, a `BufferGeometry`, a `Mesh`/`Group`, or any
other graph value. This is the escape hatch for bespoke builders, but it is a first-class
value, not a dead end.

## Low-level controls

These exist specifically so a port can reproduce a reference helper without adding a new
node option per asset:

| node | option | purpose |
|---|---|---|
| `loft` | `diagonal: 'ab'|'ba'` | choose the quad diagonal; `ba` matches cookie/rug helpers |
| `loft` | `bandZones: [...]` | per-band zone names |
| `loft` | `flip` | reverse winding |
| `loft` | `orient` | flip each band/cap triangle away from the ring centroid |
| `revolve` | `ringMode: 'xz'` | use `x=cos(a), z=sin(a)` like the reference rings |
| `revolve` | `zoneField` / `capZoneField` | per-column/per-cap zone names |
| `revolve` | `orient`, `capTop`, `capBottom` | outward winding and exact caps |
| `solidify` | `diagonal: 'ref'`, `wallOrder: 'ref'` | match reference top/bottom/wall triangulation |
| `solidify` | `topZoneField` / `botZoneField` | per-cell colour zones |
| `reverse` | — | flip every triangle winding (dished caps) |
| `prim` | `type`, `args` | call a real `THREE.*Geometry` constructor |
| `prism` | `axis: x|y|z` | extrude a polygon along an axis (ledges, mullions, sticks) |
| `frame` | `hx`, `hy`, `profile` | mitred rectangular frame sweep |
| `plate` | `profile`, `holes`, `z0`, `z1` | triangulated face plus outer/hole walls |
| `block` | `skip` | box with selected faces omitted |
| `gem` | `r`, `ry`, `h`, `n` | faceted marquee lamp / socket cap |
| `poly` | `hint` / `inside` | orient hand-authored sign triangles and quads |
| `let` | `in`, `binds`, `outs` | named derived values, one node; bindings can read inputs via `s` |
| `table` | `cols`, `rows` | rows with named columns |
| `preset` | `choice`, `presets`, `overrides` | colourway plus explicit overrides |
| `jitter` / `draws` | stream slicing | point jitter and named consecutive draws |
| `centroid`, `lerpPoint`, `mirrorPoint`, `rotateAbout`, `planeCut` | point/ring ops | geometry point math |
| `gridPoint`, `direction`, `first`, `last`, `slice`, `concat` | access/assembly | grid and list structure |
| `map` / `fold` | group as function | per-item values / threaded accumulator |
| `value` | residual expression | scalar/vector math only |
| `@node.field` | — | read a named multi-output value |
| `scatter` | `lazy: true` | draw size/yaw only after a candidate passes min-distance |
| `scatter` | `yawScale` | reference helpers use `PI`, not `TAU` |
| `scatter` | `rng` | consume a shared `random` stream |
| `instance` | per-point `[sx,sy,sz]` | radius and height can differ |
| `instance` | `yawSign: -1` | match `x=cos(yaw), z=sin(yaw)` handedness |
| `arrayPolar` | `spin: false` | place copies radially without rotating their local orientation |
| `cone` | `flip` | reverse the fan winding |
| `mesh` | `crease` | use `toCreasedNormals` instead of smooth vertex normals |

## Recipe: cookie

See `examples/cookie.pfn` / `ports/cookie2.mjs`. The key points are:

1. Three rings with the reference rim wobble.
2. `loft diagonal=ba` for the same edge triangles.
3. `scatter prng=true lazy=true yawScale=PI` for the exact draw sequence.
4. `size=[r, 0.0075, r]` because the reference ring is 2.5 mm below the surface and the
   apex is 5 mm above it.
5. `cone flip=true` and `instance yawSign=-1` for winding/orientation.
6. `mesh` does the colour/merge path.

The result matches the reference at 0 position error for default, 3-chip and 14-chip
settings.

## Rule of thumb

If a port needs a new option that only makes sense for one asset, stop and ask whether the
missing piece is a **low-level Three operation** or a **code node**. Do not grow a
high-level shape node with asset-specific branches.
