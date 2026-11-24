# Status — 24 Nov 2026

Living state of the published examples. Update this file when an example or the
example policy changes.

## Headline

The DSL/runtime/viewer are solid; the **content** is mixed. Some examples are faithful
construction ports, some are hand approximations, and four are original studies that are
not ports of the reference assets they are often compared against. The gallery mixes
them, which makes the whole set look worse than the verified work.

## Example status

| example | status | notes |
|---|---|---|
| **cookie** | rebuilt from reference construction | 174 tris: 20-segment rim, 3-ring loft, seeded scatter, 6-tri chips. Still reads flatter than the hero render; check thickness/chunk silhouette. |
| **sapphire** | close | 48 tris; profile/loft/caps fixed; crystal is shorter/less pointed than the hero. |
| **tire** | close | 520 tris; revolved tread, caps, hub, lug ring. Camera exposes tread/whitewall. |
| **rock** | approximation | 106 tris; low-poly deformed sphere + capped plane cuts; more symmetric than the reference. |
| **armchair** | approximation | 424 tris; curved back band, cushions, base, legs; thinner than the upholstered reference. |
| **clam** | approximation | 752 tris; closed ribbed shell + groove seam; **not** the reference two-valve opening. |
| **pumpkin** | close | 412 tris; deep 8-rib revolve + stem. |
| **basket** | approximation | 1,390 tris; corrugated wall, rim, side handles; not a woven coil pattern. |
| **hair** | **original study** | cap + ponytail + scattered 6-tri curls; not the valet's hair. |
| **jacket** | **original study** | closed zip jacket on a mannequin; not the valet's tailored vest. |
| **sign** | **original study** | taxiway-style panel with segment letters; not the reference stroke-font sign. |
| **creature** | **original study** | stylized quadruped with skin; not the goat. |

## What has been verified

- All 12 graphs parse and cook (`t-examples.mjs`).
- `sapphire`, `tire`, and the earlier cookie/rug ports were checked at
  triangle/vertex/bounding-box parity during the port studies.
- Manifold booleans, group/repeat, skinning, surface scatter, text and clipping were
  exercised by tests in the study workspace.
- Viewer and Pages are live; all examples render.

## What was not achieved

- Pixel/hero parity for any example beyond the simple props, and not even those under
  the hero's presentation.
- Exact ports of the character/sign assets. Those are different objects today.

## How to compare correctly

Comparing the published viewer against Polyfork `hero.png` conflates **geometry**,
**camera**, **lighting**, **background** and **tone mapping**. For parity work:

1. Render the reference `.mjs` module and the `.pfn` graph in the **same** renderer,
   camera, lighting and background.
2. Compare silhouettes and triangle counts, not just screenshots.
3. Keep the reference modules outside this repo; never commit them.

## Next

1. Decide the example policy:
   - **A**: keep the four studies, clearly labelled "not a Polyfork port"; or
   - **B**: replace them with exact ports of the actual assets (taxiway sign, goat, valet).
2. Rebuild `cookie` thickness/chunks and `clam` as a two-valve shell.
3. Add a same-renderer comparison harness in the study workspace.
4. Regenerate the gallery after the next geometry pass; the current gallery predates the
   last cookie/skin changes.
5. If a study stays, add a visible "original design" badge in the viewer next to its name.

## Workspace

The porting workspace is `study/` in this repo. Its downloaded Polyfork `.mjs`
assets, `node_modules`, renders and bulk catalogue index are gitignored; only the
study code and docs are published. See `study/AGENTS.md`.

## Links

- Viewer: https://mode777.github.io/polyfork-dsl-lab/
- Repo: https://github.com/mode777/polyfork-dsl-lab
- Gallery: [GALLERY.md](GALLERY.md)
- Licence notice: [../NOTICE](../NOTICE)
