# Status — 24 Nov 2026

Living state of the published examples. Update this file when an example or the
example policy changes.

## Headline

The showcase is **ports only** while the remaining approximations and studies are
replaced with real ports. Twenty-nine reference assets pass the order-independent geometric
parity check at `1e-4`, including the ten new ports added in this pass.

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
| **wayfinding** | 482 | **geometric port** | 157 nodes; chamfered lit cabinet, recessed face rings, packed arrow/letter/icon legends, hanger rods, ceiling channel, tie bar and knee braces. |
| **desk** | 280 | **geometric port** | 209 nodes; chamfered slab with cable slot, folded steel sleds, drawer/plain/pedestal undercarriage, live width and lived-in wear. |
| **plaza** | 292 | **geometric port** | 3 nodes; twin recessed seams, lit bars, raised field and service socket, all faces batched through `faces`. |
| **clam** | 792 | **geometric port** | 3 nodes; ribbed valves, pearly dish, mantle rays and inhalant spots. |
| **tram** | 170 | **geometric port** | 3 nodes; grooved steel rails in a swept asphalt slab with a base course. |
| **armchair** | 460 | **geometric port** | 3 nodes; tub shell, splayed legs and two loose cushions. |
| **wattle** | 802 | **geometric port** | 3 nodes; lashed stakes, mirrored sails and eleven woven withy rows. |
| **quiver** | 658 | **geometric port** | 3 nodes; stitched leather tube, shoulder strap, buckle and seven arrows. |
| **door** | 402 | **geometric port** | 3 nodes; glazed leaf, moulded panels, brass lever and three hinges; glass on its own material slot. |
| **taxiway** | 408 | **geometric port** | 3 nodes; two-panel arrow face, octagonal casing, legs and concrete pad. |
| **roof** | 712 | **geometric port** | 3 nodes; gable kawara roof with four stepped courses and closed verges. |
| **carousel** | 276 | **geometric port** | 3 nodes; sloped plate bed, bumper skirt and three riding bags. |
| **prize** | 768 | **geometric port** | 33 nodes; live diameter/height lathe, deck/foot ring and bulb ring. |
| **grass** | 660 | **geometric port** | 96 nodes; lofted three-sided blades, burn/scorch zones and pebble ring. |
| **coral** | 534 | **geometric port** | 15 nodes; integrated fluted columns and four-ring mound. |
| **rowboat** | 1262 | **geometric port** | 54 nodes; clinker hull, ribs, thwarts, oarlocks and stowed oars; stem caps stitched with `bridge`. |
| **basket** | 672 | **geometric port** | 25 nodes; checkered weave, braided bands, rope handles and lid/fill. |
| **contextmenu** | 788 | **geometric port** | 13 nodes; drafted glass sheet and pill rows. |
| **lookout** | 962 | **geometric port** | 125 nodes; trestle, planked shaft, glazed cabin, railing and roof; `beam`/`opening`/`block` parts. |
| **cafe** | 540 | **geometric port** | 71 nodes; faceted table, three chairs and two mugs at term 0.6; `beam` handles. |
| **keyboard** | 698 | **geometric port** | 71 nodes; tufted scissor-lift seat, legs, rails and crank; loft/fan tufts. |
| **chair** | 848 | **geometric port** | 73 nodes; swivel seat, tufted back pad, nailheads and footring; `stud`/`quiltedPad`/`bridge`. |

The previous rock/armchair/clam/basket approximations and the hair/jacket/sign/creature
studies were removed from the published manifest. Armchair, clam and basket are now real
ports; rock/cheese, the core rulebook and marquee letter remain open.

## What changed in this pass

- Added ten generic-node ports: **prize car turntable**, **scorched grass tuft**, **pillar coral**,
  **wooden rowboat**, **woven storage basket**, **context menu list**, **lookout watchtower**,
  **cafe table set**, **keyboard bench** and **table game chair**. No per-asset node type was
  added; they use `loft`/`revolve`/`prism`/`block`/`plate`/`poly`/`pill`.
- Refactored the face-dump `poly` usage in those ports into reusable primitives: `beam`
  (oriented strut), `frustum` (tapered box), `opening` (recessed window/door), `stud`
  (nail/button), `quiltedPad` (tufted panel), `bandPath` (bent rib) and `bridge` (stitched
  profile transition). `poly` is now reserved for isolated irregular faces, and
  `t-poly-budget.mjs` fails an example above 80 `poly` nodes.
- Extended the generic DSL: `loft.zoneField`, `skipEdges`, `diagonal=abba`/`short`, raw/flipped
  caps, flat-cap winding, degenerate-triangle skipping in `loft`/`poly`, and the reusable
  `pill`, `beam`, `frustum`, `opening`, `stud`, `quiltedPad`, `bandPath` and `bridge` nodes.
- Added ten exact ports: **composite plaza tile**, **maxima clam**, **tram track tile**,
  **lounge armchair**, **wattle fence run**, **arrow quiver**, **interior door leaf**,
  **lit taxiway sign**, **tiled roof section** and **baggage carousel**.
- Added ten dedicated part nodes (`plazaTile`, `clamAnimal`, `tramTile`, `armchair`,
  `wattleFence`, `quiver`, `doorLeaf`, `taxiwaySign`, `roofGable`, `carousel`) backed by
  `builders.mjs`. The `.pfn` examples now show the part construction at a readable level
  (~0.7-1.3 KB each) instead of a batched face dump; `faces` remains the low-level escape
  hatch. `doorLeaf` keeps glass on a separate material slot and bakes the lived-in shear
  through its hinge knuckles.
- Added two more exact ports: the **overhead wayfinding sign** (fourth reference sample)
  and the **office desk** (third sample). Both keep their reference options live.
- Added three generic nodes: `pack` (flat legend layout), `outlineRect` (chamfered
  rectangle outlines) and `band` (connect matching outlines at two heights).
- Extended existing nodes: `plate` can emit front/back caps and selected walls and skip
  wall edges, `chamferBox` can skip faces, `prism` can orient its caps. The expression
  language gained `mixColor` for the reference wear palettes.
- Fixed `chamferBox` face winding and made the sign face panels explicit mitred quads.
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
- Bumped the public runtime asset version to `14`.

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

- `t-all.mjs`: all twenty-nine published ports pass at default.
- `t-ports10b.mjs`: 10/10 generic-node ports pass reference parity and 72 variant checks.
- `t-ports10.mjs`: 10/10 new ports pass reference parity, 69 colour/variant checks, and
every colourway leaves the vertex set unchanged.
- `t-cookie.mjs`: 3/3 variants.
- `t-tire.mjs`: 8/8 variants.
- `t-sapphire.mjs`: 13/13 variants (all params, including broken/truncated/irregular).
- `t-pumpkin.mjs`: 6/6 variants.
- `t-rug.mjs`: 9/9 variants (both sizes, pile, lived-in extremes, all patterns).
- `t-chalkboard.mjs`: 10/10 variants (panels, rows, density extremes, colourway).
- `t-theatre.mjs`: 8/8 variants (all words, all crowns, lit/unlit, colourway).
- `t-wayfinding.mjs`: 15/15 variants (width/drop extremes, unlit ends, every arrow/letter/icon family, colourway).
- `t-desk.mjs`: 10/10 variants (width extremes, all three undercarriages, lived-in extremes, colourway).
- `t-expr.mjs`: 10/10 angle/vector expression helpers.
- All twenty-nine showcase graphs parse and cook (`t-examples.mjs`); none contains a `script`
  node and the runtime never evaluates JavaScript for fields/params.
- `t-code.mjs`, `t-bool.mjs`, `t-cache.mjs`, `t-sample3.mjs` pass.

## How to compare correctly

1. Compare the reference `.mjs` module and the `.pfn` graph order-independently:
   vertex set, bbox and winding (`t-all.mjs` / per-port tests), not just counts.
2. For visual checks, use the same renderer, camera, lighting and background.
3. Keep the reference modules outside this repo; never commit them.

## Next

1. Port more reference props with the new ops and add them to the showcase; the
   remaining fourth-sample signs are the core rulebook (mostly plates and bands) and
   the marquee letter (stroke union/offset).
2. Exposed but not yet filled: polygon faces with craters (cheese wedge), fused clipped
   lumps (small rock), and more cloth/rigged families.
3. Regenerate the gallery for the twenty-nine ports; the old images are stale.

## Workspace

The porting workspace is `study/` in this repo. Its downloaded Polyfork `.mjs`
assets, `node_modules/`, renders and bulk catalogue index are gitignored; only the
study code and docs are published. See `study/AGENTS.md`.

## Links

- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Repo: https://github.com/mode777/polyfork-dsl-lab
- Gallery: [GALLERY.md](GALLERY.md)
- Licence notice: [../NOTICE](../NOTICE)
