# AGENTS.md — Polyfork DSL Lab

Project: a small declarative node-graph DSL for stylized three.js geometry, with a
browser viewer. Public repo, published with GitHub Pages.

- Repo: https://github.com/mode777/polyfork-dsl-lab
- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Owner: `mode777` (gh CLI authenticated)

## Hard rules

1. **Never commit Polyfork source.** No `.mjs`/`-params.json`/GLB/USD/FBX downloads, no
   copied code, no original hero renders. The reference files live under `study/scripts*/` and are **gitignored**;
   they are for local comparison only and must never be force-added.
2. **Examples may be geometric ports, not source copies.** `examples/*.pfn` are our own
   DSL graphs. Some are ports of Polyfork constructions for demonstration/interop; only
   call one exact when `t-all.mjs` reports PASS at the documented tolerance. See `NOTICE`.
3. **Respect the licence.** Polyfork's `.mjs` source may not be redistributed or used to
   build/sell a commercial asset generator. Linking to `/cdn` is allowed; hosting their
   modules is not. Our example graphs are independent re-expressions for demo/research,
   not redistributed Polyfork source. See https://polyfork.dev/licensing and `NOTICE`.
4. **Do not break Pages.** No build step. Use relative paths, ES modules with `.js`
   extensions, and keep `.nojekyll`. GitHub Pages serves `main` / root.
5. **Cache-bust viewer assets when changing them.** Pages caches for ~10 minutes:
   change `index.html` to `viewer.js?v=N` / `style.css?v=N` after a viewer edit.
6. **Always publish finished work.** When a task is done, commit everything, push to
   `main`, and confirm the Pages build before reporting completion. Do not leave finished
   work local-only, even when the user did not explicitly ask for a push.

## Layout

```
index.html            split code/result viewer
viewer.js             viewer: scene, examples, params, live cook
style.css
runtime/runtime.js    101-node typed graph runtime + evaluator, Three bridge
runtime/expr.js       parsed expression language (no eval)
runtime/format.js     .pfn parser/serializer
runtime/dsl.js        JS authoring DSL (for building ports)
runtime/cache.js      content-addressed array pool / Float32 cache
examples/*.pfn        the published graphs
examples/manifest.json id, title, description, category, camera/fit
docs/                 design, techniques, study, improvements, gallery
docs/STATUS.md        current state, known gaps, next tasks
docs/gallery/         clean 900x900 renders of the examples
study/                authoring/porting workspace (scripts*/ are gitignored)
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

The **authoring/porting workspace is inside this repo under `study/`**:

```
study/
  prototype/v2/runtime.mjs        source of runtime/runtime.js
  prototype/v2/format.mjs         source of runtime/format.js
  prototype/v2/dsl.mjs            source of runtime/dsl.js
  prototype/v2/cache.mjs          source of runtime/cache.js
  prototype/v2/ports/*.mjs        ports that generate examples/*.pfn
  prototype/v2/make-examples.mjs  writes examples/*.pfn + manifest.json
  prototype/v2/t-examples.mjs     parse + cook all pfn examples
  prototype/v2/t-all.mjs          order-independent geometric parity harness
  prototype/v2/t-code.mjs         Three BufferGeometry/object + random-stream smoke test
  prototype/v2/t-sample3.mjs      sample-3 template harness
  scripts/ scripts2/ scripts3/    downloaded Polyfork assets (NEVER copy here)
```

To change a published example:

1. Edit the port in `study/prototype/v2/ports/<name>.mjs`.
2. Run `node make-examples.mjs` in `study/prototype/v2`.
3. Run `node sync-public.mjs` — it copies the runtime with the `.js` import rewrite and
   the generated examples into the public tree.
4. Test with `node t-examples.mjs` and `node t-all.mjs`, then serve this repo and check
   the viewer.
5. Bump `viewer.js?v=N` in `index.html` if viewer code changed; commit and push.

The study workspace is documented in `study/AGENTS.md`; its downloaded Polyfork
sources are ignored by `.gitignore` and are not part of the published tree.

The viewer `frame()` uses `current.cam` = `[azimuthDeg, elevationDeg]` and
`current.fit` = distance multiplier from `examples/manifest.json`.

## Current status (24 Nov 2026)

- 101 node types; **29 published examples, all geometric ports, zero script nodes**.
- All 29 examples are generic-node graphs. The ten earlier face-soup ports (plaza, clam,
  tram, armchair, wattle, quiver, door, taxiway, roof, carousel) were re-expressed with
  `loft`/`frustum`/`block`/`poly`/`fan`/`stud`/`prim`; no per-asset node remains and
  `builders.mjs`/`parts.mjs` were deleted.
- **Geometric parity (vertices, bbox and winding at 1e-4):** `cookie` (174),
  `sapphire` (48), `tire` (520), `pumpkin` (120), `area rug` (392/700),
  `chalkboard` (194), `theatre` (667), `wayfinding` (482), `desk` (280),
  `plaza` (292), `clam` (792), `tram` (170), `armchair` (460), `wattle` (802),
  `quiver` (658), `door` (402), `taxiway` (408), `roof` (712), `carousel` (276),
  `prize` (768), `grass` (660), `coral` (534), `rowboat` (1262), `basket` (672),
  `contextmenu` (788), `lookout` (962), `cafe` (540), `keyboard` (698), `chair` (848).
- Sapphire had an inverted bottom cap; `loft.orient`/`orientCenter` and `reverse` fixed it.
  Sapphire is now fully parametric (all reference params live, including pointed/
  truncated/broken terminations).
- Core expressions are parsed by `runtime/expr.js` (no `new Function`): arithmetic,
  comparisons, `?:`, arrays/objects, `let … in`, math and vector built-ins (`mix`,
  `mixColor`, `deg`/`rad`, `vadd`/`vsub`/`vmul`/`vdot`/`vcross`/`vlen`). Fields and `~` params use
  it; `let` bindings see the inputs under `s` too.
- Layout math is node graphs: `let`, `table`, `preset`, `list`, `range`, `map`, `fold`,
  `if`, `jitter`, `draws`, point ops (`centroid`, `lerpPoint`, `mirrorPoint`,
  `rotateAbout`, `planeCut`, `gridPoint`, `direction`) and list ops (`first`, `last`,
  `slice`, `concat`), plus `@node.field` refs. `value` is now residual scalar math.
- Sapphire/tire/rug no longer use `script`; the showcase has zero script nodes.
- The overhead wayfinding sign adds `pack`, `outlineRect` and `band`; `plate` gained
  cap/wall selection, `chamferBox` face skipping, `prism` cap orientation and `mixColor`
  expression support. The office desk reuses the new outline/band primitives.
- The ten generic-node ports use reusable primitives rather than face dumps: `beam`
  (oriented strut), `frustum` (tapered box), `opening` (recessed window/door), `stud`
  (nail/button), `quiltedPad` (tufted panel), `bandPath` (bent rib), `bridge` (stitched
  profile transition) and `pill` (rounded UI row). `loft` gained `zoneField`, `skipEdges`,
  `abba`/`short` diagonals, raw/flipped caps, `inside`, `keepDegenerate` and
  degenerate-triangle skipping; `poly` now skips degenerate triangles and flat loft caps
  keep their raw winding. `stud` gained an elliptical second radius and inside orientation;
  `frustum` gained inside orientation. No per-asset node was added. `faces` remains the
  low-level escape hatch. The door port keeps its glass in a separate material slot and
  applies the reference's lived-in shear with `deform`.
- The previous approximations/studies were removed from the published manifest while
  they are replaced with real ports. The gallery is stale.
- `t-all.mjs` is count-independent and winding-aware; counts alone are not parity.

## Next tasks (priority)

1. Port more reference props and add them to the showcase. The generic node set now covers
   structured furniture, UI, nature and vehicle props; the remaining gaps are polygon faces
   with craters (cheese wedge), fused clipped lumps (small rock), the core rulebook/marquee
   letter, and cloth/rigged families.
2. Keep every published example a verified port; do not re-add labelled approximations.
3. Regenerate the gallery for the twenty-nine ports.
4. If adding booleans to examples, verify `manifold-3d` WASM loads from the import map and
   gate it behind `await initManifold()`.

## Tests / checks

From `study/prototype/v2`:

```bash
node t-examples.mjs        # parses/cooks every published pfn
node t-all.mjs             # order-independent vertex/bbox/winding parity
node t-ports10.mjs         # first ten ports: parity + variants + colourways
node t-ports10b.mjs        # ten generic-node ports: parity + variants
node t-poly-budget.mjs     # reject face-dump-sized poly counts
node t-cookie.mjs          # cookie default / 3-chip / 14-chip
node t-tire.mjs             # 8 tire variants
node t-sapphire.mjs        # 13 sapphire param variants
node t-pumpkin.mjs         # 6 pumpkin variants
node t-rug.mjs             # 9 rug variants
node t-chalkboard.mjs      # 10 menu-board variants
node t-theatre.mjs         # 8 theatre-sign variants
node t-wayfinding.mjs      # 15 overhead-wayfinding variants
node t-desk.mjs            # 10 office-desk variants
node t-expr.mjs            # angle/vector expression helpers
node t-code.mjs            # Three object/BufferGeometry + random-stream bridge
node t-sample3.mjs         # sample-3 template ports
node t-bool.mjs            # Manifold boolean smoke test
node t-cache.mjs           # cache round-trip / size
```

From this repo:

```bash
python3 -m http.server 8000
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/
```

Publish (required after every finished task):

```bash
git add -A && git commit -m "…" && git push
gh api repos/mode777/polyfork-dsl-lab/pages/builds/latest --jq '.status,.commit'
```

Wait for the Pages build to report `built` before calling the task complete. If the
deployment fails, fix it and push again rather than leaving the public site stale.

## Known traps

- `.pfn` backtick expressions are single-line; newlines are escaped as `\n`. Multi-line
  code goes in a `script` heredoc.
- `instance` accepts a scalar or a per-point `[sx,sy,sz]` scale. `yawSign: -1` matches
  reference helpers that use `x=cos(yaw), z=sin(yaw)`; Three's +Y rotation has the
  opposite handedness.
- `scatter.lazy=true` draws size/yaw only after a point is accepted. `yawScale` defaults
  to `TAU`; cookie uses `PI`.
- `geometry`/`mesh` accept `THREE.BufferGeometry`, `Mesh`, `Group` or `__kind:'geom'`.
  A script can return any of them; `geometry` makes it composable with `join`/modifiers.
- `let` bindings are field expressions and can read graph inputs as bare names or via
  `s` (the same `s` used by fields and `~` params).
- `plate` triangulates an outer profile plus holes and walls every loop; `block` takes a
  `skip` list of faces (`px nx py ny pz nz`); `poly` accepts `hint` or `inside` to orient
  hand-authored triangles/quads.
- `loft.diagonal='ba'` flips the quad diagonal; `loft.bandZones` is a per-band zone array;
  `loft.flip` reverses winding.
- `mesh` zones must match part zone names; a mismatch silently uses fallback colours.
- GitHub Pages caches assets; bump `?v=` after viewer/style/runtime changes. The public
  runtime files must import each other with `.js`, unlike the study `.mjs` sources.
  `sync-public.mjs` uses `PUBLIC_ASSET_VERSION` (default `13`); keep it in step with
  `index.html` and `viewer.js`.
