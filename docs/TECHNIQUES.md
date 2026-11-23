# How Polyfork implements hair, clothes and text

Findings from the downloaded `.mjs` sources (samples 1–3 plus six sign/book assets).
Everything below is geometry: no textures, no font files, no cloth solver, no hair curves.

Triangle shares are measured by building each asset at its default parameters and counting
triangles whose three vertex colours match the named colour parameter.

---

## 1. Hair

Five style families, all built from solid low-poly geometry:

| style | technique | example |
|---|---|---|
| `buzz` / `cropped-hair` | thin shell over the skull + fringe teeth + nape/temple/sideburn shells | officer: hair = **216 tris (5%)** |
| `ponytail` | shell (crown/nape/temples/sideburns) + 3 stacked boxes for the tail, or lofted bunches tied with a box | valet: hair = **860 tris (27%)** |
| `bun` | shell + a lofted ball/bun | — |
| `long-hair` | shell + lofted locks/twists | soprano: **984 tris (20%)**, elf: **686 tris (11%)** |
| `side-part` / `pompadour` | 5-box stacked mass + crown/nape/temples/sideburns | — |
| `afro` | shell + **scattered solid curls** | — |

### The curl primitive

`curls()` / `ballCurls()` place curls on a head volume:

- sample a Fibonacci sphere (N = 700–1400 directions);
- raycast from the head centre against a list of AABBs (`mass`) to find the hair-volume
  surface, or use an ellipsoid for `ballCurls`;
- reject points closer than `0.95 × curlSize` to an existing curl (a Poisson-like rule);
- each curl is a **6-triangle squashed octahedron**: 4 side triangles to a raised tip + 2 base
  triangles, sunk 6% into the surface and twisted by a golden-angle-derived yaw;
- orient it to the surface normal, then translate.

So afro hair is a few hundred 6-triangle solids, not cards or strands. At 6 tris each,
860 tris ≈ 140 curls.

### Locks and braids

- `twists()` builds dreadlock-like locks as `loftClosed` of 4-point rings along a path that
  follows the nape (`nape` run list), tapered at the tip, with an optional fringe.
- `buildTwist()` in the plant/creature kit generates **two helical strands** around a body
  axis (`twistStrands`) and sweeps them with `vine` (5-sided tube).
- `buildBraid()` sweeps a spline over the trunk surface (`trunkPt`, `trunkN`) with `vine`.
- `pompadour()` is a stack of five boxes plus `crown`, `nape`, `temples`, `sideburns` shells.

**Conclusion:** hair = shell masses + lofted locks + scattered 6-tri curls. No hair cards, no
alpha-tested strips, no curves.

---

## 2. Clothes

No simulation. Garments are authored as geometry relative to the body:

### Bands
`fit.band()` casts a path onto the body surface (`fit.hit` raycasts the trunk), then builds
rectangular cross-sections with `ringBed` and lofts them. Used for belts, collars, cuffs,
coat hems, epaulettes. This is a **surface-projected sweep**.

### Offset shells
`vestFronts()`, `dressCoat()`, `buildDress()` wrap the trunk at an ease offset:

- body stations give radius/shape; garment rows are offset by `ease` and `under`;
- a front opening is a **V-gap** (`gapHalf(y)`), and triangles crossing the gap are split
  and emitted twice — outer cloth and inner lining — with a rim quad (`cutTri`);
- pleats are a sculpt term added along the normal (`backSculpt`, `pleat`);
- hems get teeth (`HEM_TEETH`, `tooth(k)`) and an inner hem ring;
- lapels are ribbons (`buildLapels`) built from `fold`, `lip`, `out` curves;
- buttons are rivets, pockets/panels are boxes or small lofts.

### Ribbons
`drapeRibbon(inner, outer)` builds a strip between two curves with a fold; used for ties,
lapels, sashes, hanging cloth.

### Patterns
`printShirt()` / `printSkirt()` subdivide the body/garment quads and assign per-face colours
for checks, stripes, stars, numbers. It is a **vertex-colour pattern**, not a texture.

### Skinning
Garments are added through `collector.addRun(..., soft: ...)` with a bone chain, so cloth
follows the same skeleton as the body with blended weights at the joints.

Measured shares:

| asset | garment share |
|---|---|
| valet | shirt 752 tris (24%) + coat 388 (12%) |
| elf | coat 1,039 (16%) + trousers 260 (4%) |
| aurelian | robe 1,202 (25%) |
| soprano | dress 1,194 (24%) |
| angel | gown only 171 (3.5%) — most of the model is wings |

**Conclusion:** clothes = surface-projected bands + offset shells with authored folds and
gaps + ribbons + per-face colour patterns. No cloth solver, no separate garment rig.

---

## 3. Text

Fixed legends **are** modelled as geometry. Two pipelines:

### Stroke font → SDF → contour → extrude

1. `GLYPHS` stores each character as **centreline strokes with a width** (A–Z, 0–9, `&`, `$`
   as offered by the params), not outlines.
2. `glyphField(strokes)` returns a signed distance field: capsule distance to every stroke
   segment, max at joins (`hypot - SH`), clipped to the glyph height.
3. `contours(field, …)` runs **marching squares** at 56 cells/unit over the glyph box, links
   edge crossings into loops, and returns closed contours.
4. `simplify()` applies Douglas–Peucker; loops are classified by containment depth so holes
   (A, B, D, O, P, Q, R, 0, 4, 6, 8, 9) become `ShapeUtils.triangulateShape` holes.
5. The resulting triangles are extruded to raised letters with face/return/trim zones
   (taxiway sign, theatre sign), or used as the bulb path for a marquee letter.

### Marquee bulbs
`glyphBulbs()` offsets the outline inward/outward, places bulbs along the stroke centreline,
then filters by winding number and clearance (`B_CLEAR`) so bulbs sit only inside the face
and never on the edge. The letter body itself is an extruded channel section.

### Custom legends
Signs expose a "custom legend" that pairs with `sign: blank`; arbitrary text is then a
**decal**: `decalsFromSvg` builds a multi-layer SDF at runtime from an SVG, not geometry.
So Polyfork has both: modelled glyphs for fixed wording, decals for buyer text.

**Conclusion:** text is a compact stroke-font + SDF contouring + extrusion system, ~300 lines
plus glyph data. No font files, no textures, no text layout engine (signs stack one letter
per band or use fixed word lists).

---

## 4. What this means for the node system

| area | earlier assumption | correction |
|---|---|---|
| hair | cards / alpha strips | **solid 6-tri curls scattered on a volume + lofted locks + box masses** |
| clothes | cloth solver needed | **authored offset shells + projected bands + ribbons + per-face colour** |
| text | object-only (troika) or decal-only | **geometry from a stroke font + SDF contour + extrusion**; decals for custom text |

Concrete node additions that would cover these without scripts:

1. `curl` (6-tri octahedron) + `scatterVolume` (Fibonacci sphere on an ellipsoid / AABB
   raycast, min-distance rejection) — covers afro and fur tufts.
2. `loftClosed` already exists; add `pathOnSurface` (project a polyline onto a body mesh)
   for twists/braids.
3. `bandOnSurface` (project a path, sweep a rectangular section) — belts, collars, cuffs.
4. `offsetShell` (body rings + ease + V-gap + inner lining) — vests, coats, dresses.
5. `ribbon` / `lapel` (two curves + fold) — ties, lapels, sashes.
6. `text` (stroke font + SDF + contour + extrude) — fixed sign legends.
7. Per-face colour patterns already fit the zone/colour-field model.

The missing piece in all three is **surface-relative construction** (project/slide on a body
mesh), not simulation or textures. That is a much smaller gap than a cloth or hair solver.
