# Polyfork → node graph study

Research artefacts for the feasibility question: *can Polyfork's three.js generator
scripts be re-expressed in a declarative, geometry-nodes-style system?*

This folder is part of the public repo at `study/`. Its `scripts*/`, `node_modules/`, downloaded
renders and `data/catalogue.json` are gitignored: the **code and documents are published,
the Polyfork reference assets are not**.

**Read `FEASIBILITY.md` for the report, and `NODE_TEST.md` for the executed port test.**

**Operating rules and paths: [`AGENTS.md`](AGENTS.md). Public project rules:
[`../AGENTS.md`](../AGENTS.md).**

## Layout

```
FEASIBILITY.md      the report (verdict, micro-ops, compound ops, scorecard, plan)
scripts/            20 randomly sampled assets: {id}.mjs + {id}-params.json
data/
  catalogue.json    full catalogue index (3,529 unique assets)
  sample.json       the seeded 20-asset sample (seed 20261123)
  runtime.json      triangles, meshes, materials, bones, build ms, determinism, op counts
  range.json        every range knob swept min→max: topology/vertex change
  choice.json       every choice knob, all options: distinct topologies
  compound.json     manual coding of the 12 compound ops + triangle table
  callgraph.json    helper counts, reachability, depth, reuse
  opmatrix.json     lexical micro-op matrix (noisy; used as a cross-check only)
  helpers.json      per-file helper-name inventory
tools/
  trace.mjs         runtime tracer (patches BufferGeometry + ShapeUtils)
  callgraph.mjs     approximate helper call graph
  rangecheck2.mjs   range topology sweep
  choicecheck.mjs   choice topology sweep
prototype/
  graph.mjs         v1 runtime (10 node types)
  models/cookie.mjs v1 port: 158 -> 43 lines, exact topology/bounds
  models/area-rug.mjs v1 port: 260 -> 77 lines, exact topology/bounds
  bench.mjs / bench-rug.mjs / parity.mjs
  v2/
    runtime.mjs     65-node typed runtime + Three bridge + code/random ops
    expr.mjs        parsed expression language (no eval)
    dsl.mjs         builder DSL
    format.mjs      .pfn text + canonical JSON, round-trip tested
    GRAPH_API.md    API, port table, gap analysis, format spec
    SAMPLE3.md      third sample, filled gaps, ring-array optimisation
    IMPROVEMENTS.md mature features implemented + research decisions
    cache.mjs       content-addressed array pool + Float32 base64
    templates.mjs   creature/boat/building/... archetype graphs
    ports/          40+ ports across samples 2 and 3 plus the showcase
    make-examples.mjs writes examples/*.pfn + manifest.json
    sync-public.mjs   copies runtime + examples to the public tree (.js rewrite)
    t-all.mjs       order-independent geometric parity; t-sample3.mjs runs sample 3
    t-cookie.mjs    cookie default / thin / thick parity
    t-tire.mjs      tire 8-variant parity
    t-sapphire.mjs  sapphire 13-variant parity
    t-pumpkin.mjs   pumpkin 6-variant parity
    t-rug.mjs       rug 9-variant parity
    t-code.mjs      Three object/BufferGeometry + random stream smoke test
```

## Reproduce

Requires Node 20+ and `three@0.180.0` (`npm i three@0.180.0`).

```bash
node tools/trace.mjs
node tools/callgraph.mjs
node tools/rangecheck2.mjs
node tools/choicecheck.mjs
```

## Sample

Uniform random, without replacement, 20 of 3,529, seed `20261123`:

`thermocycler`, `raised-pit-platform`, `sidearm`, `orc-brute`, `clockwork-hand-adornments`,
`compacted-hardcore-tile`, `volantin`, `prize-car-turntable`, `breath-scorch-mark`,
`players-tunnel`, `wooden-wreck-stern`, `interior-door-leaf`, `keyboard-bench`,
`table-game-chair`, `cookie`, `area-rug`, `side-dock`, `bloom-elemental`,
`cafe-table-set`, `lookout-watchtower`.

## Headline numbers

- 24 micro-ops → 12 compound ops; median 4 compounds per asset; 9 ops cover 87%.
- 247 knobs: 119 colour, 67 choice, 53 range, 8 toggle.
- 20/53 range knobs and 42/67 choice knobs change topology.
- 20/20 deterministic; median build 14.2 ms; worst 343 ms.
- 64% of sampled triangles are in the three rigged assets.

## Licence note

The `.mjs` files are Polyfork-licensed source, kept here only for analysis and
reproducibility. They are not redistributed as a product. Any system that rehosts them or
reproduces the generation pipeline commercially needs Polyfork's `/platform` licence or
explicit permission; see `https://polyfork.dev/licensing`.
