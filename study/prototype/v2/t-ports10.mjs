// Ten-port regression: default reference parity, exposed geometry variants,
// and colourway invariance. Geometry is rebuilt per node, so every variant must
// stay within the same 1e-4 contract as the default.
import { buildPort, compareGeometry, parityLine } from './run.mjs';

const cases = [
  ['plaza', '../../scripts2/composite-plaza-tile-618067', ['gallery-white', 'atrium-mint', 'promenade-violet', 'transit-blossom'],
    [{ seams: 'single' }, { seams: 'quad' }, { strips: 'none' }, { strips: 'one' }, { socket: false }]],
  ['clam', '../../scripts2/maxima-clam-429c17', ['maxima-blue', 'crocea-teal', 'squamosa-gold', 'derasa-violet'],
    [{ ribs: 7 }, { ribs: 8 }, { flute: 0.10 }, { flute: 0.18 }, { dome: 0.72 }, { dome: 1.07 }]],
  ['tram', '../../scripts2/tram-track-tile-f3c69a', ['city-asphalt', 'fresh-blacktop', 'sun-faded', 'wet-slate'],
    [{ gauge: 'cape-1067' }, { gauge: 'standard-1435' }]],
  ['armchair', '../../scripts2/lounge-armchair-5a72ca', ['linen-mustard', 'oak-sage', 'walnut-teal', 'ochre-plum'],
    [{ backLine: 'wing' }, { lived_in: 0 }, { lived_in: 1 }, { armLine: 0 }, { armLine: 1 }]],
  ['wattle', '../../scripts2/wattle-fence-run-703830', ['seasoned', 'peeled', 'weathered', 'fresh-hazel'],
    [{ height: 0.9 }, { height: 1.4 }, { unevenness: 0 }, { unevenness: 1 }]],
  ['quiver', '../../scripts2/quiver-722a40', ['saddle-tan', 'oxblood', 'ranger-green', 'frost-steel'],
    [{ length: 0.8 }, { length: 1.25 }, { taper: 0 }, { taper: 1 }, { strap: false }]],
  ['door', '../../scripts/interior-door-leaf-a02f28', ['pale-oak', 'chalk-white', 'walnut', 'sage-painted'],
    [{ width: 0.7 }, { width: 0.95 }, { lived_in: 0 }, { lived_in: 1 }]],
  ['taxiway', '../../scripts4/lit-taxiway-sign-206955', ['mustard', 'graphite', 'aluminium'],
    [{ panels: 1 }, { panels: 4 }]],
  ['roof', '../../scripts3/tiled-roof-section-6f1121', ['slate-kawara', 'charcoal-machiya', 'pale-alley', 'shrine-vermilion'],
    [{ roofPitch: 25 }, { roofPitch: 45 }, { ribs: 5 }, { ribs: 9 }, { courses: 3 }, { courses: 5 }]],
  ['carousel', '../../scripts2/baggage-reclaim-carousel-7ceef0', ['terminal-grey', 'graphite', 'warm-steel'],
    [{ load: 'empty' }, { load: 'full' }]],
];

let pass = 0, checks = 0;
for (const [port, origPath, colorways, variants] of cases) {
  const orig = await import(`${origPath}.mjs`);
  const a = orig.createAsset({});
  const base = await buildPort(port, {});
  const r = compareGeometry(a, base.mesh, { tol: 1e-4 });
  let ok = r.ok;
  for (const colorway of colorways.slice(1)) {
    checks++;
    const b = await buildPort(port, { colorway });
    if (!compareGeometry(base.mesh, b.mesh, { tol: 1e-6 }).ok) ok = false;
  }
  for (const variant of variants) {
    checks++;
    const ref = orig.createAsset(variant);
    const b = await buildPort(port, variant);
    const v = compareGeometry(ref, b.mesh, { tol: 1e-4 });
    if (!v.ok) { ok = false; console.log(`  variant FAIL ${JSON.stringify(variant)}`, parityLine(port, v)); }
  }
  if (ok) pass++;
  console.log(parityLine(port, r), `colours ${colorways.length}/${colorways.length} variants ${variants.length}/${variants.length}`);
}
console.log(`\n${pass}/${cases.length} new ports at 1e-4; ${checks} colour/variant checks`);
