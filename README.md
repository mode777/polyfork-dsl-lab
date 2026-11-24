# Polyfork DSL Lab

A compact, typed graph/code DSL for **stylized three.js assets** — with a browser viewer
that splits DSL source and the cooked mesh. The DSL is a thin layer over the same
`three` primitives/addons the reference modules use, not a replacement geometry kernel.

**Live demo:** https://mode777.github.io/polyfork-dsl-lab/

![viewer](docs/preview.png)

No build step, no textures, no node editor (yet). One vertex-colour material, flat shading,
geometry only.

---

## What is here

```
index.html            the split code / result viewer
app.js                viewer (three.js scene, params, live cook)
runtime/runtime.js    103-node typed graph runtime + evaluator, Three bridge
runtime/parts.js      graph wrappers for the ported part builders
runtime/builders.js   pure geometry builders used by those part nodes
runtime/expr.js       parsed expression language (no eval)
runtime/format.js     .pfn text parser and serializer
runtime/dsl.js        JavaScript authoring DSL
runtime/cache.js      content-addressed array pool + Float32 cache
examples/*.pfn        19 ported example graphs (showcase is ports only)
docs/                 design notes, parity status, techniques
study/                authoring/porting workspace (reference assets gitignored)
```

**No Polyfork source code or assets are included.** See `NOTICE`. Some examples are
independent DSL re-expressions/ports of publicly observable Polyfork constructions for
demonstration and interoperability testing; they are not redistributed source files.

## Run

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

The viewer loads `examples/manifest.json`, fetches a `.pfn` graph, parses it with
`runtime/format.js`, cooks it with `runtime/runtime.js` and renders the mesh. Sliders and
colour pickers are generated from the graph's `in` declarations; inputs that are baked into
the graph are detected and hidden.

## The DSL

One line per node. Refs are explicit, defaults are omitted, fields are expressions.

```pfn
graph cookie
in thickness float 0.024 min=0.014 max=0.034
in chips int 9 min=3 max=14
in chipColor color #3d2113
n rim0 ring n=20 radius=`0.05*(0.96+rand(1000+i*7)()*0.07)` sx=0.9 sz=0.9
n rim1 ring n=20 radius=`0.05*(0.96+rand(1000+i*7)()*0.07)` y=~`s => s.thickness*0.42`
n rim2 ring n=20 radius=`0.05*(0.96+rand(1000+i*7)()*0.07)` y=~`s => s.thickness*0.8` sx=0.93 sz=0.93
n body loft rings=[@rim0,@rim1,@rim2] capTop=~`s => [0, s.thickness, 0]`
       capBottom=[0,0,0] zones={band:edge,capTop:dough,capBottom:edge} diagonal=ba
n pts  scatter count=$chips seed=42 tries=800 prng=true lazy=true yawScale=3.141592653589793
       sample=`[cos(r0*TAU)*(0.16+r1*0.54)*0.05, sin(r0*TAU)*(0.16+r1*0.54)*0.05]`
       height=`s.thickness*(0.8+0.2*(1-hypot(x,z)/0.05/0.93))-0.0025`
       size=`[0.0085+r2*0.0025, 0.0075, 0.0085+r2*0.0025]`
n chip cone n=6 r=1 h=1 zone=chip flip=true
n inst instance points=@pts proto=@chip yawSign=-1
n out  mesh geom=@inst zones={dough:#e0aa5e,edge:#c4843c,chip:$chipColor}
out mesh=@out
end
```

- `@id` — node ref · `$name` — graph input
- `` `expr` `` — field expression, evaluated per vertex/index
- `` ~`expr` `` — parameter expression, evaluated once per cook (`s` = inputs)
- `group … end` — subgraph · `repeat count= graph=` — repeated subgraph
- `map` / `fold` over a list with a `group` as the function; `let` derives named values;
  `table` gives rows named columns; `preset` resolves a colourway with overrides
- `script` and `module` — explicit host escape hatches; `script` is disabled unless the
  host opts in, and no example uses it
- `geometry`/`mesh` also accept a `THREE.BufferGeometry`, `Mesh` or `Group`; a `script`
  can return one and the rest of the graph can join/transform it.
- `random` exposes a deterministic consumable stream; `scatter` can consume it via `rng`.

The parser, serializer and evaluator are in `runtime/`. `.pfn` is the authoring form;
`cache.js` shows a compact content-addressed JSON cache (arrays pooled and base64-encoded,
≈84% smaller on graphs with repeated rings).

## Node set (103)

| group | nodes |
|---|---|
| sources | `ring profile path grid box chamferBox outlineRect cylinder sphere plane card cone curl pointsGrid geometry prim faces random value let list range table preset coalesce draws jitter` |
| ported parts | `plazaTile clamAnimal tramTile armchair wattleFence quiver doorLeaf taxiwaySign roofGable carousel` |
| surfaces | `loft loftProfile cap extrude revolve sweep band inset pocket solidify bevelProfile fan fanRing wrapShell` |
| signage | `prism frame plate block gem poly` |
| modifiers | `transform center mirror reverse deform clip join cavity centroid lerpPoint mirrorPoint rotateAbout planeCut gridPoint direction lookup first last slice concat` |
| distribution | `scatter scatterSurface scatterVolume instance instancedMesh arrayPolar arrayLinear` |
| character | `skeleton skin pose` |
| surface-relative | `pathOnSurface bandOnSurface ribbon` |
| control / text | `switch text boolean if map fold pack` |
| output | `mesh group` |
| escape hatches | `script module` |

Low-level controls are first-class: `loft` has `diagonal`, `bandZones`, `flip`,
`orient`; `revolve` has `ringMode`, `zoneField`, `orient`, caps and per-cap zones;
`solidify` has reference diagonals, wall order and zone fields; `scatter` has `lazy`,
`yawScale`, `rng`; `instance` has per-point `[sx,sy,sz]` scale and `yawSign`; `arrayPolar`
has `spin`; `reverse` flips winding; `prim` calls a real Three geometry constructor;
`prism`/`frame`/`plate`/`block`/`gem`/`poly` cover swept frames, holed plates, skipped-face
blocks, faceted lamps and hand-authored sign polygons. The ten newest ports use dedicated
part nodes (`plazaTile`, `clamAnimal`, `tramTile`, `armchair`, `wattleFence`, `quiver`,
`doorLeaf`, `taxiwaySign`, `roofGable`, `carousel`) backed by `builders.mjs`; `faces`
remains the low-level escape hatch for genuinely irregular face soups. `plate` can emit
either cap and selected walls, `chamferBox` can skip faces, `prism` can orient its caps,
`outlineRect` and `band` build chamfered furniture outlines, and `pack` lays out flat
legend items.
A `script` node sees `THREE`, `ADDONS`
(`mergeGeometries`, `toCreasedNormals`, `RoundedBoxGeometry`) and `H` (`tri`, `quad`,
`part`, `geom`, `ring`, `prng`, `clamp`, `lerp`). Fields and `~` params are parsed
  expressions (`+ - * / % **`, comparisons, `?:`, arrays, objects, `let … in`, built-in
  math/vector functions, including `mix`, `mixColor`, `deg`/`rad` and `vadd`/`vsub`/`vmul`/`vdot`/`vcross`/`vlen`);
  the core never evaluates JavaScript.

## Examples

The showcase currently contains **ports only**. Approximations and original studies were
removed from the published manifest while they are replaced with real ports.

| example | what it shows |
|---|---|
| Cookie | parametric loft, lazy PRNG scatter, non-uniform chip instances |
| Rough sapphire | bevel profile, full parameter set, all three terminations |
| Tire | revolved tread with per-facet modulation, caps, hub, lug ring |
| Pumpkin | alternating lobe/groove revolve, real `THREE.CylinderGeometry` stem |
| Area rug | deformed lattice, folded corner, per-cell weave zones |
| Chalkboard menu board | mitred frame sweep, recessed slate, mapped menu cells, ledge and chalk sticks |
| Theatre vertical sign | banded readerboard, enamel glyph plates, marquee lamps and three crowns |
| Overhead wayfinding sign | chamfered lit cabinet, packed legend glyphs, hanger rods and knee braces |
| Office desk | chamfered slab, folded steel sleds, drawer/plain/pedestal undercarriage |
| Composite plaza tile | twin recessed seams, lit bars, raised field and service socket |
| Maxima clam | ribbed valves, pearly dish, mantle rays and inhalant spots |
| Tram track tile | grooved steel rails in a swept asphalt slab with a base course |
| Lounge armchair | tub shell, splayed legs and two loose cushions |
| Wattle fence run | lashed stakes, mirrored sails and eleven woven withy rows |
| Arrow quiver | stitched leather tube, shoulder strap, buckle and seven arrows |
| Interior door leaf | glazed leaf, moulded panels, brass lever and three hinges |
| Lit taxiway sign | two-panel arrow face, octagonal casing, legs and concrete pad |
| Tiled roof section | gable kawara roof with four stepped courses and closed verges |
| Baggage carousel | sloped plate bed, bumper skirt and three riding bags |

Parity means the order-independent `t-all.mjs` check passes at `1e-4`: same vertex count,
vertex set and bbox, and no winding mismatches. It is not a byte/vertex-order claim.

## Project docs

- [AGENTS.md](AGENTS.md) — operating rules, layout, authoring loop, known traps
- [docs/STATUS.md](docs/STATUS.md) — current example status, verified work, next tasks
- [study/AGENTS.md](study/AGENTS.md) — authoring/porting workspace; downloaded assets are gitignored
- [docs/PARITY.md](docs/PARITY.md) — geometric parity contract and Three.js bridge
- [docs/DSL_GAPS.md](docs/DSL_GAPS.md) — script-node audit and the node-graph replacements
- [docs/DESIGN.md](docs/DESIGN.md) — API, node signatures, format
- [docs/TECHNIQUES.md](docs/TECHNIQUES.md) — how the studied assets build hair, clothes, text
- [docs/STUDY.md](docs/STUDY.md) — three random samples, gap analysis, ring-array optimisation
- [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) — booleans, instancing, caching, research decisions
- [docs/FEASIBILITY.md](docs/FEASIBILITY.md) — the original feasibility study
- [docs/PORT_TEST.md](docs/PORT_TEST.md) — strict parity port test

## Scope and limitations

This is a **stylized geometry DSL**, not a full DCC. It has no node editor, no textures, no
UVs, no cloth simulation and no general grooming. The showcase examples are geometric ports for demo/interop; parity is
order-independent, not byte-identical. Booleans use `manifold-3d`
(WASM, loaded lazily; no example needs it).

## Licence

MIT for the runtime, format, viewer and example graphs. Polyfork names and assets remain
the property of their author; see `NOTICE`. Not affiliated with or endorsed by Polyfork.
