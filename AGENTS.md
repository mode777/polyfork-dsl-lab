# AGENTS.md — Polyfork DSL Lab

Project: a small declarative node-graph DSL for stylized three.js geometry, with a
browser viewer. Public repo, published with GitHub Pages.

- Repo: https://github.com/mode777/polyfork-dsl-lab
- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Owner: `mode777` (gh CLI authenticated)

## Hard rules

1. **Never commit Polyfork source.** No `.mjs`/`-params.json`/GLB/USD/FBX downloads, no
   copied code, no original hero renders. The reference files live outside this repo in
   `../polyfork-node-study/scripts*/` for local comparison only.
2. **The examples in `examples/*.pfn` are original DSL constructions.** Do not describe
   them as byte-identical Polyfork ports. See `NOTICE`.
3. **Respect the licence.** Polyfork's `.mjs` source may not be redistributed or used to
   build/sell a commercial asset generator. Linking to `/cdn` is allowed; hosting their
   modules is not. See https://polyfork.dev/licensing and `NOTICE`.
4. **Do not break Pages.** No build step. Use relative paths, ES modules with `.js`
   extensions, and keep `.nojekyll`. GitHub Pages serves `main` / root.
5. **Cache-bust viewer assets when changing them.** Pages caches for ~10 minutes:
   change `index.html` to `viewer.js?v=N` / `style.css?v=N` after a viewer edit.

## Layout

```
index.html            split code/result viewer
viewer.js             viewer: scene, examples, params, live cook
style.css
runtime/runtime.js    55-node typed graph runtime + evaluator
runtime/format.js     .pfn parser/serializer
runtime/dsl.js        JS authoring DSL (for building ports)
runtime/cache.js      content-addressed array pool / Float32 cache
examples/*.pfn        the published graphs
examples/manifest.json id, title, description, category, camera/fit
docs/                 design, techniques, study, improvements, gallery
docs/STATUS.md        current state, known gaps, next tasks
docs/gallery/         clean 900x900 renders of the examples
```

## Run

```bash
python3 -m http.server 8000
# http://localhost:8000
```

No npm/build. The page imports `three` from unpkg via an import map.
`manifold-3d` is mapped in the import map but only loaded if a graph uses a `boolean`
node; none of the published examples do (yet).

## How the two folders fit together

The **authoring/porting workspace is outside this repo**:

```
../polyfork-node-study/
  prototype/v2/runtime.mjs        source of runtime/runtime.js
  prototype/v2/format.mjs         source of runtime/format.js
  prototype/v2/dsl.mjs            source of runtime/dsl.js
  prototype/v2/cache.mjs          source of runtime/cache.js
  prototype/v2/ports/*.mjs        ports that generate examples/*.pfn
  prototype/v2/make-examples.mjs  writes examples/*.pfn + manifest.json
  prototype/v2/t-examples.mjs     parse + cook all pfn examples
  prototype/v2/t-all.mjs          sample-2 parity harness (imports Polyfork modules)
  prototype/v2/t-sample3.mjs      sample-3 template harness
  scripts/ scripts2/ scripts3/    downloaded Polyfork assets (NEVER copy here)
```

To change a published example:

1. Edit the port in `../polyfork-node-study/prototype/v2/ports/<name>.mjs`.
2. Run `node make-examples.mjs` in `../polyfork-node-study/prototype/v2`.
3. Copy `examples/<name>.pfn` and `examples/manifest.json` into this repo.
4. If runtime changed, copy `runtime.mjs` to `runtime/runtime.js` (keep the `.js` rename).
5. Test with `node t-examples.mjs`, then serve this repo and check the viewer.
6. Bump `viewer.js?v=N` in `index.html` if viewer code changed; commit and push.

The viewer `frame()` uses `current.cam` = `[azimuthDeg, elevationDeg]` and
`current.fit` = distance multiplier from `examples/manifest.json`.

## Current status (24 Nov 2026)

- 55 node types; 12 examples; all 12 parse and cook.
- `cookie` was rebuilt from the reference construction (174 tris) but still differs in
  presentation (thickness/chunk silhouette); see `docs/STATUS.md`.
- `sapphire` (48), `tire` (520) are close/faithful constructions; `pumpkin` is close.
- `rock`, `armchair`, `clam`, `basket` are hand approximations.
- `hair`, `jacket`, `sign`, `creature` are **original stylized studies, not ports** of
  valet / taxiway-sign / goat. Do not compare them as if they were.
- The gallery was generated before the last few geometry tweaks; treat it as indicative,
  not current. Regenerate if precision matters.

## Next tasks (priority)

1. Decide the public example policy: keep studies labelled, or replace them with exact
   ports of the actual reference assets (taxiway sign ~400 lines, goat ~2.4k, valet ~31k).
2. For parity work, compare **original module vs `.pfn` in the same renderer**, not
   hero render vs viewer. The reference modules are outside the repo.
3. Improve the remaining props: cookie thickness/chunks, clam two-valve shell, armchair
   upholstery, rock facet cuts, basket weave.
4. Add a `sign` with the stroke-font/SDF contour pipeline rather than segment letters.
5. If adding booleans to examples, verify `manifold-3d` WASM loads from the import map and
   gate it behind `await initManifold()`.

## Tests / checks

From `../polyfork-node-study/prototype/v2`:

```bash
node t-examples.mjs        # parses/cooks every published pfn
node t-all.mjs             # sample-2 ports vs original modules
node t-sample3.mjs         # sample-3 template ports
node t-bool.mjs            # Manifold boolean smoke test
node t-cache.mjs           # cache round-trip / size
```

From this repo:

```bash
python3 -m http.server 8000
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/
```

Publish:

```bash
git add -A && git commit -m "…" && git push
gh api repos/mode777/polyfork-dsl-lab/pages/builds/latest --jq '.status,.commit'
```

## Known traps

- `.pfn` backtick expressions are single-line; newlines are escaped as `\n`. Multi-line
  code goes in a `script` heredoc.
- `instance` scales the prototype uniformly by point size now. Real-sized protos must use
  size 1; unit protos use point size.
- `mesh` zones must match part zone names; a mismatch silently uses fallback colours.
- `loft` cap winding is orientation-corrected; don't reintroduce fan caps without a hint.
- GitHub Pages caches assets; bump `?v=` after viewer/style changes.
