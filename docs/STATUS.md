# Status — 24 Nov 2026

Living state of the published examples. Update this file when an example or the
example policy changes.

## Headline

The showcase is **ports only** while the remaining approximations and studies are
replaced with real ports. Five reference assets pass the order-independent geometric
parity check at `1e-4`: cookie, rough sapphire, tire, pumpkin and area rug.

## Example status

| example | tris | status | notes |
|---|---:|---|---|
| **cookie** | 174 | **geometric port** | exact vertices/bbox at default, 3-chip/thin and 14-chip/thick. |
| **sapphire** | 48 | **geometric port** | all reference params live: colorway, gem, length, barrel, ends (pointed/truncated/broken), chamfer, irregularity. Winding verified. |
| **tire** | 520 | **geometric port** | tread, caps, hub and lug ring; seated at `y=CY`; colorway/facets/width/rimSize live. |
| **pumpkin** | 120 | **geometric port** | alternating lobe/groove revolve; real `THREE.CylinderGeometry` stem; squash/ribs live. |
| **area rug** | 392 / 700 | **geometric port** | small/large, pile, lived-in fold, plain/bordered/geometric patterns, per-cell zones. |

The previous rock/armchair/clam/basket approximations and the hair/jacket/sign/creature
studies were removed from the published manifest. They are not shown as ports.

## What changed in this pass

- Fixed the sapphire inversion: the runtime's bottom-cap hint pointed inward; `loft` now
  has `orient`/`orientCenter` and the broken dished cap uses `reverse`.
- Sapphire is fully parametric. A code node computes the reference layout data using one
  PRNG stream; `get` feeds `loftProfile`/`loft`; `switch` selects the termination; mesh
  colours come from `colorway`/`gem`.
- Added first-class `get` (structured code output → graph values), `prim` (exact Three
  geometry constructors), `reverse` (face winding), `revolve.ringMode`/`zoneField`/caps,
  `solidify.diagonal`/`wallOrder`/zone fields, and input `label`/`step` metadata.
- Added exact **pumpkin** (alternating lobe/groove revolve, real Three cylinder stem) and
  **area rug** (deformed lattice, folded corner, per-cell zones) ports.
- Tire is fully parametric now (colorway, rubber/sidewall/rim/chrome, facets, width, rim
  size) with a code node for the profile/modulation data.
- Parity now checks **winding** as well as vertices/bbox. This is what caught sapphire.
- Showcase tags and manifest now contain ports only; the old studies are removed.

## What was verified

- `t-all.mjs`: cookie, sapphire, tire, pumpkin, rug + six `module` wrappers pass at
  default; the per-port tests cover parameter variants.
- `t-cookie.mjs`: 3/3 variants.
- `t-tire.mjs`: 8/8 variants.
- `t-sapphire.mjs`: 13/13 variants (all params, including broken/truncated/irregular).
- `t-pumpkin.mjs`: 6/6 variants.
- `t-rug.mjs`: 9/9 variants (both sizes, pile, lived-in extremes, all patterns).
- All five showcase graphs parse and cook (`t-examples.mjs`).
- `t-code.mjs`, `t-bool.mjs`, `t-cache.mjs`, `t-sample3.mjs` pass.

## How to compare correctly

1. Compare the reference `.mjs` module and the `.pfn` graph order-independently:
   vertex set, bbox and winding (`t-all.mjs` / per-port tests), not just counts.
2. For visual checks, use the same renderer, camera, lighting and background.
3. Keep the reference modules outside this repo; never commit them.

## Next

1. Port more reference props with the new ops and add them to the showcase.
2. Exposed but not yet filled: polygon faces with holes / craters (cheese wedge), fused
   clipped lumps (small rock), and more cloth/rigged families.
3. Regenerate the gallery for the five ports; the old images are stale.

## Workspace

The porting workspace is `study/` in this repo. Its downloaded Polyfork `.mjs`
assets, `node_modules/`, renders and bulk catalogue index are gitignored; only the
study code and docs are published. See `study/AGENTS.md`.

## Links

- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Repo: https://github.com/mode777/polyfork-dsl-lab
- Gallery: [GALLERY.md](GALLERY.md)
- Licence notice: [../NOTICE](../NOTICE)
