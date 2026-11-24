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
3. **Ports are original DSL constructions.** When copying a `.pfn` to the public repo,
   do not describe it as a byte-identical port unless it was verified as such.
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
    runtime.mjs         55-node typed runtime (source of public runtime.js)
    dsl.mjs             authoring DSL
    format.mjs          .pfn text + JSON (source of public format.js)
    cache.mjs           content-addressed array cache
    ports/*.mjs         ports that build the published examples
    templates.mjs       creature/boat/building/... archetype graphs
    make-examples.mjs   writes examples/*.pfn + manifest.json
    t-examples.mjs      parse + cook every pfn
    t-all.mjs           sample-2 ports vs original modules
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
node t-all.mjs                      # sample-2 parity
node t-sample3.mjs                  # sample-3 templates
node t-bool.mjs && node t-cache.mjs
```

Then copy to the public repo:

```bash
cp runtime.mjs ../../../runtime/runtime.js
cp dsl.mjs ../../../runtime/dsl.js
cp format.mjs ../../../runtime/format.js
cp cache.mjs ../../../runtime/cache.js
cp examples/*.pfn examples/manifest.json ../../../examples/
```

Keep the `.js` extensions in the public repo. If viewer code changes, bump
`viewer.js?v=N` in the public `index.html` (Pages caches ~10 min). Commit/push the public
repo, check `gh api repos/mode777/polyfork-dsl-lab/pages/builds/latest`.

## Current state (24 Nov 2026)

- Runtime: 55 nodes; all 12 published examples cook.
- Closest: `sapphire` (48 tris), `tire` (520), `cookie` (174, rebuilt from reference
  construction), `pumpkin` (412, visual close).
- Approximations: `rock`, `armchair`, `clam`, `basket`.
- **Not ports**: `hair`, `jacket`, `sign`, `creature`. They are original studies; do not
  compare them to valet/taxiway-sign/goat as if equal.
- Gallery is older than the last geometry pass; regenerate if precise.

## Known issues / next

1. Decide policy for the four studies: label as original designs, or replace with exact
   ports of the reference assets.
2. Exact parity workflow: render the reference module and the pfn in the **same**
   renderer/camera/lighting; do not compare hero images to the viewer.
3. Cookie: thicker puck, chunkier chips. Clam: two-valve shell. Armchair: thicker
   upholstery. Rock: facet cuts. Basket: woven coils. Sign: stroke/SDF glyphs.
4. The public repo must stay source-free; keep the reference modules here.
5. If a study stays, add an "original design" badge in the public viewer.

## Why this matters

The current public gallery mixes verified ports, approximations and original studies.
That is why it "looks nothing like" the catalogue when viewed as a whole. The fix is a
content-policy decision plus exact ports, not more tweaking of the studies.
