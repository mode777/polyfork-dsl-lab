# AGENTS.md — Polyfork research workspace

This is the **authoring and verification workspace** for the public project. It lives at
`study/` inside the repo [`polyfork-dsl`](../..). The study code and docs are published;
the downloaded Polyfork assets under `study/scripts*/` are **gitignored** and must never be
committed.

Public project:

- Repo: https://github.com/mode777/polyfork-dsl-lab
- Viewer: https://mode777.github.io/polyfork-dsl-lab/

## Hard rules

1. **Never copy the downloaded Polyfork sources into the public repo.** `scripts/`,
   `scripts2/`, `scripts3/`, `scripts4/` contain `.mjs` and `-params.json` files fetched
   from polyfork.dev. They are for local analysis/rendering only. No source, no original
   renders, no downloads in the public tree. Never use `git add -f` on `study/scripts*`.
2. **Never commit the ignored assets.** The study code/docs are published; `scripts*/`,
   `node_modules/`, downloaded renders and `data/catalogue.json` are gitignored.
3. **Ports are our own DSL graphs.** Some are geometric ports for demo/interop. Only
   describe one as exact when `t-all.mjs` passes at the documented tolerance; never claim
   byte-identical output.
4. **Licence:** see https://polyfork.dev/licensing and the public `NOTICE`. Research and
   interop are fine; redistributing source or building a commercial generator is not.

## Layout

```
scripts/ scripts2/ scripts3/ scripts4/   downloaded Polyfork assets (gitignored)
data/
  catalogue.json        full catalogue index (3,529 unique, gitignored)
  sample*.json          the three seeded samples
  runtime.json          cycles/tris/params/determinism of sample 1
  range/choice.json     topology sweeps
  compound.json         12-op coding used for set cover
  callgraph.json        helper graph metrics
tools/                  trace, callgraph, sweeps (sample 1)
t-zones.mjs             colour-zone measurement for characters
prototype/
  graph.mjs             v1 runtime (10 nodes)
  models/*.mjs          v1 exact ports (cookie, rug)
  bench*.mjs            v1 parity benches
  v2/
    runtime.mjs         60-node typed runtime + Three bridge (source of public runtime.js)
    dsl.mjs             authoring DSL
    format.mjs          .pfn text + JSON (source of public format.js)
    cache.mjs           content-addressed array cache
    ports/*.mjs         ports that build the published examples
    templates.mjs       creature/boat/building/... archetype graphs
    make-examples.mjs   writes examples/*.pfn + manifest.json
    t-examples.mjs      parse + cook every pfn
    t-all.mjs           order-independent geometric parity vs original modules
    t-code.mjs          Three object/BufferGeometry + random stream smoke test
    t-sample3.mjs       sample-3 template ports
    t-bool.mjs          Manifold CSG smoke test
    t-cache.mjs         cache round-trip/size
    GRAPH_API.md        API + sample-2 report
    SAMPLE3.md          sample 3 + ring-array fix
    IMPROVEMENTS.md     booleans/instancing/caching research
    POLYFORK_TECHNIQUES.md  how Polyfork builds hair/clothes/text
    examples/           generated pfn + manifest (copied to public repo)
FEASIBILITY.md          first feasibility study
NODE_TEST.md            strict parity v1 port test
```

## Environment

- Node 24, `three@0.180.0` installed here.
- `manifold-3d` installed here; boolean tests need `await initManifold()`.
- Public repo is static: no build step, three via import map, Pages from `main` / root.
- Verification server: use `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` from env; never print or
  write them. Chrome headless shell:
  `~/browsers/chrome-headless-shell/linux-131.0.6778.264/chrome-headless-shell-linux64/chrome-headless-shell`.
  Serve a checkout with `python3 -m http.server`, screenshot with
  `--headless --no-sandbox --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader`.

## Authoring loop

From `prototype/v2`:

```bash
node make-examples.mjs              # writes examples/*.pfn + manifest
node t-examples.mjs                 # parse + cook all published examples
node t-all.mjs                      # order-independent geometric parity
node t-cookie.mjs                   # cookie default / 3-chip / 14-chip
node t-tire.mjs             # 8 tire variants
node t-sapphire.mjs                 # 13 sapphire variants
node t-pumpkin.mjs                  # 6 pumpkin variants
node t-rug.mjs                      # 9 rug variants
node t-layout.mjs                   # layout block, fn/rng, multi-output, round-trip
node t-code.mjs                     # Three object/BufferGeometry + random stream
node t-sample3.mjs                  # sample-3 templates
node t-bool.mjs && node t-cache.mjs
```

Then sync to the public repo:

```bash
node sync-public.mjs
```

It copies the runtime with the `.js` import rewrite and the generated examples. If viewer
code changes, bump `viewer.js?v=N` in the public `index.html` (Pages caches ~10 min).
Commit/push the public repo, check
`gh api repos/mode777/polyfork-dsl-lab/pages/builds/latest`.

## Current state (24 Nov 2026)

- Runtime: 60 nodes; **5 published examples, all geometric ports**.
- **Geometric parity** (vertices, bbox and winding at 1e-4): `cookie` (174),
  `sapphire` (48), `tire` (520), `pumpkin` (120), `area rug` (392/700), plus the six
  `module` wrappers.
- Sapphire is fully parametric (colorway, gem, length, barrel, ends, chamfer, irregularity)
  and its bottom-cap inversion is fixed with `loft.orient` + `reverse`.
- New: pure `layout` blocks (`in`/`let`/`fn`/`out`, `rng`, multi-output refs), `prim`,
  `reverse`, `revolve.ringMode`/`zoneField`/caps, `solidify.diagonal`/`wallOrder`/zone
  fields, input `label`/`step`.
- Sapphire/tire/rug are script-free; the showcase has no script or get nodes.
- Approximations/studies were removed from the published manifest; do not re-add them
  until they are real ports.
- Gallery is older than the last geometry pass; regenerate if precise.

## Known issues / next

1. Port more reference props. Exposed gaps: polygon faces with holes/craters (cheese
   wedge), fused clipped lumps (small rock), cloth/rigged families.
2. Exact parity workflow: compare order-independently (vertices, bbox, winding) against
   the reference module; do not compare hero images to the viewer.
3. The public repo must stay source-free; keep the reference modules here.
4. Regenerate the gallery for the five ports.

## Why this matters

The showcase is now ports only; every card is a verified geometric port. Adding more
ports is the way to prove the DSL's versatility, not adding approximations or studies.
