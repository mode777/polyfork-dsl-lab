# Status — 24 Nov 2026

Living state of the published examples. Update this file when an example or the
example policy changes.

## Headline

The DSL now has the right layer boundary: it is a compact graph/code layer over the same
three.js primitives and addons, not a replacement geometry kernel. Three simple props are
geometric ports verified against the reference modules. The remaining content is still a
mix of approximations and original studies.

## Example status

Verified with `t-all.mjs` (order-independent triangle/vertex/bbox comparison at `1e-4`):

| example | status | notes |
|---|---|---|
| **cookie** | **geometric parity** | 174 tris; exact vertex/bbox match at default, 3-chip/thin and 14-chip/thick settings. |
| **sapphire** | **geometric parity** | 48 tris; default chamfer/profile corrected; exact vertex/bbox match. |
| **tire** | **geometric parity** | 520 tris; tread, caps, hub and lug ring match; the reference sits at `y=CY`, not on the origin. |
| **rock** | approximation | 106 tris vs 188; low-poly deformed sphere + capped plane cuts, more symmetric than the reference. |
| **armchair** | approximation | 424 tris vs 460; curved back band, cushions, base, legs; thinner than the reference. |
| **clam** | approximation | 992 tris vs 792; closed ribbed shell + groove seam, not the reference two-valve opening. |
| **pumpkin** | close | 412 tris; deep 8-rib revolve + stem. |
| **basket** | approximation | 1,390 tris; corrugated wall, rim, side handles, not a woven coil pattern. |
| **hair** | original study | cap + ponytail + scattered 6-tri curls; not the valet's hair. |
| **jacket** | original study | closed zip jacket on a mannequin; not the valet's tailored vest. |
| **sign** | original study | taxiway-style panel with segment letters; not the reference stroke-font sign. |
| **creature** | original study | stylized quadruped with skin; not the goat. |

## What changed in this pass

- Cookie is now a real port: `loft.diagonal='ba'`, lazy PRNG draws, `yawScale=PI`,
  non-uniform instance scale, `yawSign=-1`, 6-sided cone with flipped winding.
- Sapphire's default chamfer is `0.3` and its bevel profile follows the reference
  edge-walk formula; the previous `0.18` default produced a different crystal.
- Tire is no longer centred on the origin. It is translated to the reference's
  `y=CY` seating, the lug bases get the `-0.002` offset, and `arrayPolar.spin=false`
  keeps the hexagon orientation fixed while placing the lugs radially.
- The runtime now has a first-class Three bridge: `geometry`/`mesh` accept
  `BufferGeometry`/`Mesh`/`Group`; scripts see `THREE`, `ADDONS` and `H`.
- Parity is no longer counts-only. `t-all.mjs` compares triangle sets, vertex sets and
  bbox with a tolerance; `t-code.mjs` covers the Three bridge and random stream.

## What was verified

- All 12 graphs parse and cook (`t-examples.mjs`).
- `cookie`, `sapphire`, `tire` and the six `module` wrappers pass `t-all.mjs`.
  Cookie is parametric; sapphire/tire are verified at default and still bake some
  profile/station arrays, so their non-default sliders are not yet live.
- Manifold booleans, group/repeat, skinning, surface scatter, text and clipping are
  exercised by tests in the study workspace.
- Public runtime/examples cook under the `.js` import layout.

## What is not achieved

- Pixel/hero parity for the remaining examples. Geometry parity is only claimed for the
  three props above.
- Exact ports of the character/sign assets. Hair, jacket, sign and creature are still
  original studies.

## How to compare correctly

Comparing the published viewer against Polyfork `hero.png` conflates **geometry**,
**camera**, **lighting**, **background** and **tone mapping**. For parity work:

1. Compare the reference `.mjs` module and the `.pfn` graph order-independently:
   vertex set and bbox (`t-all.mjs`), not just triangle counts.
2. For visual checks, use the same renderer, camera, lighting and background.
3. Keep the reference modules outside this repo; never commit them.

## Next

1. Port the remaining public props (rock, armchair, clam, basket) with the new low-level
   ops, then decide whether to replace the four studies with actual ports.
2. Make sapphire/tire fully parametric (their generated `.pfn` currently bakes some
   profile/station arrays at default).
3. Regenerate the gallery after the next geometry pass.
3. Keep exact ports labelled as such; do not mix “original study” and “port” in the same
   claim.

## Workspace

The porting workspace is `study/` in this repo. Its downloaded Polyfork `.mjs`
assets, `node_modules/`, renders and bulk catalogue index are gitignored; only the
study code and docs are published. See `study/AGENTS.md`.

## Links

- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Repo: https://github.com/mode777/polyfork-dsl-lab
- Gallery: [GALLERY.md](GALLERY.md)
- Licence notice: [../NOTICE](../NOTICE)
