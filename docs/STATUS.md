# Status — 24 Nov 2026

Living state of the published examples. Update this file when an example or the
example policy changes.

## Headline

The showcase is **ports only** while the remaining approximations and studies are
replaced with real ports. Seven reference assets pass the order-independent geometric
parity check at `1e-4`: cookie, rough sapphire, tire, pumpkin, area rug, chalkboard and
the theatre vertical sign.

## Example status

| example | tris | status | notes |
|---|---:|---|---|
| **cookie** | 174 | **geometric port** | exact vertices/bbox at default, 3-chip/thin and 14-chip/thick. |
| **sapphire** | 48 | **geometric port** | 47 nodes; jittered section, bevel, mapped stations/rings, point ops, termination switch. All reference params live. |
| **tire** | 520 | **geometric port** | 17 nodes; `let` dimensions, a 5-column row table, one preset, expression tread modulation. |
| **pumpkin** | 120 | **geometric port** | alternating lobe/groove revolve; real `THREE.CylinderGeometry` stem; squash/ribs live. |
| **area rug** | 392 / 700 | **geometric port** | 9 nodes; named dimensions, random grid, straighten + fold group, per-cell zones. |
| **chalkboard** | 194 | **geometric port** | 34 nodes; mitred frame sweep, recessed backing, mapped menu cells, ledge and two chalk sticks. Panels/rows/density stay live. |
| **theatre** | 667 | **geometric port** | 374 nodes; three prebuilt word layouts, banded readerboard, enamel glyph plates, marquee lamps, three crowns, steel bracket. |

The previous rock/armchair/clam/basket approximations and the hair/jacket/sign/creature
studies were removed from the published manifest. They are not shown as ports.

## What changed in this pass

- Added two exact signage ports from the fourth reference sample: **chalkboard menu
  board** and **theatre vertical sign**. Both use the new generic sign primitives and
  keep their reference options live.
- Added `prism` (polygon extrusion on X/Y/Z), `frame` (mitred rectangular sweep),
  `plate` (triangulated plate with holes and walls), `block` (box with optional skipped
  faces), `gem` (faceted marquee lamp) and `poly` (arbitrary 3D polygon with orientation
  hint/inside point). `join` now flattens nested geometry lists.
- `let` bindings now expose graph inputs under `s` as well as bare names, matching field
  and `~` param evaluation. Expression built-ins gained `mix`, `deg`/`rad` and
  `vadd`/`vsub`/`vmul`/`vdot`/`vcross`/`vlen`.
- Bumped the public runtime asset version to `10`.

- Fixed the sapphire inversion: the runtime's bottom-cap hint pointed inward; `loft` now
  has `orient`/`orientCenter` and the broken dished cap uses `reverse`.
- Sapphire is fully parametric. A random value stream plus `map`/`value` nodes compute the
  reference layout; `loftProfile`/`loft` build it; `switch` selects the termination; mesh
  colours come from `colorway`/`gem`.
- Added a **parsed expression language** (`runtime/expr.js`, no `new Function`) for
  fields and `~` params: arithmetic, comparisons, `?:`, arrays/objects, `let … in`, math
  and vector built-ins.
- Replaced code-block layouts with generic node graphs. Structural work now uses
  `let` (named derivations), `table` (named columns), `preset` (colourway + overrides),
  `map`/`fold`, `jitter`/`draws`, point ops (`centroid`, `lerpPoint`, `mirrorPoint`,
  `rotateAbout`, `planeCut`, `gridPoint`, `direction`) and list ops (`first`, `last`,
  `slice`, `concat`). `value` is residual scalar math only.
- Added `prim` (exact Three geometry constructors), `reverse` (face winding),
  `revolve.ringMode`/`zoneField`/caps, `solidify.diagonal`/`wallOrder`/zone fields, and
  input `label`/`step` metadata.
- Added exact **pumpkin** (alternating lobe/groove revolve, real Three cylinder stem) and
  **area rug** (deformed lattice, folded corner, per-cell zones) ports.
- Tire is fully parametric now (colorway, rubber/sidewall/rim/chrome, facets, width, rim
  size) with a `value` row table and expression-driven modulation.
- Parity now checks **winding** as well as vertices/bbox. This is what caught sapphire.
- Showcase tags and manifest now contain ports only; the old studies are removed.

## What was verified

- `t-all.mjs`: cookie, sapphire, tire, pumpkin, rug, chalkboard, theatre + six `module`
  wrappers pass at default; the per-port tests cover parameter variants.
- `t-cookie.mjs`: 3/3 variants.
- `t-tire.mjs`: 8/8 variants.
- `t-sapphire.mjs`: 13/13 variants (all params, including broken/truncated/irregular).
- `t-pumpkin.mjs`: 6/6 variants.
- `t-rug.mjs`: 9/9 variants (both sizes, pile, lived-in extremes, all patterns).
- `t-chalkboard.mjs`: 10/10 variants (panels, rows, density extremes, colourway).
- `t-theatre.mjs`: 8/8 variants (all words, all crowns, lit/unlit, colourway).
- `t-expr.mjs`: 10/10 angle/vector expression helpers.
- All seven showcase graphs parse and cook (`t-examples.mjs`); none contains a `script`
  node and the runtime never evaluates JavaScript for fields/params.
- `t-code.mjs`, `t-bool.mjs`, `t-cache.mjs`, `t-sample3.mjs` pass.

## How to compare correctly

1. Compare the reference `.mjs` module and the `.pfn` graph order-independently:
   vertex set, bbox and winding (`t-all.mjs` / per-port tests), not just counts.
2. For visual checks, use the same renderer, camera, lighting and background.
3. Keep the reference modules outside this repo; never commit them.

## Next

1. Port more reference props with the new ops and add them to the showcase; the
   remaining fourth-sample signs (lit taxiway, overhead wayfinding, core rulebook,
   marquee letter) are the next candidates.
2. Exposed but not yet filled: polygon faces with craters (cheese wedge), fused clipped
   lumps (small rock), and more cloth/rigged families.
3. Regenerate the gallery for the seven ports; the old images are stale.

## Workspace

The porting workspace is `study/` in this repo. Its downloaded Polyfork `.mjs`
assets, `node_modules/`, renders and bulk catalogue index are gitignored; only the
study code and docs are published. See `study/AGENTS.md`.

## Links

- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Repo: https://github.com/mode777/polyfork-dsl-lab
- Gallery: [GALLERY.md](GALLERY.md)
- Licence notice: [../NOTICE](../NOTICE)
