// Ten-port regression: default reference parity plus colourway invariance.
// Geometry is baked per port, so switching colourway must not move a vertex.
import { buildPort, compareGeometry, parityLine } from './run.mjs';

const cases = [
  ['plaza', '../../scripts2/composite-plaza-tile-618067', ['gallery-white', 'atrium-mint', 'promenade-violet', 'transit-blossom']],
  ['clam', '../../scripts2/maxima-clam-429c17', ['maxima-blue', 'crocea-teal', 'squamosa-gold', 'derasa-violet']],
  ['tram', '../../scripts2/tram-track-tile-f3c69a', ['city-asphalt', 'fresh-blacktop', 'sun-faded', 'wet-slate']],
  ['armchair', '../../scripts2/lounge-armchair-5a72ca', ['linen-mustard', 'oak-sage', 'walnut-teal', 'ochre-plum']],
  ['wattle', '../../scripts2/wattle-fence-run-703830', ['seasoned', 'peeled', 'weathered', 'fresh-hazel']],
  ['quiver', '../../scripts2/quiver-722a40', ['saddle-tan', 'oxblood', 'ranger-green', 'frost-steel']],
  ['door', '../../scripts/interior-door-leaf-a02f28', ['pale-oak', 'chalk-white', 'walnut', 'sage-painted']],
  ['taxiway', '../../scripts4/lit-taxiway-sign-206955', ['mustard', 'graphite', 'aluminium']],
  ['roof', '../../scripts3/tiled-roof-section-6f1121', ['slate-kawara', 'charcoal-machiya', 'pale-alley', 'shrine-vermilion']],
  ['carousel', '../../scripts2/baggage-reclaim-carousel-7ceef0', ['terminal-grey', 'graphite', 'warm-steel']],
];

let pass = 0;
for (const [port, origPath, colorways] of cases) {
  const orig = await import(`${origPath}.mjs`);
  const a = orig.createAsset({});
  const base = await buildPort(port, {});
  const r = compareGeometry(a, base.mesh, { tol: 1e-4 });
  let colours = true;
  for (const colorway of colorways.slice(1)) {
    const b = await buildPort(port, { colorway });
    if (!compareGeometry(base.mesh, b.mesh, { tol: 1e-6 }).ok) colours = false;
  }
  if (r.ok && colours) pass++;
  console.log(parityLine(port, r), `colours ${colours ? 'PASS' : 'FAIL'} ${colorways.length}/${colorways.length}`);
}
console.log(`\n${pass}/${cases.length} new ports at 1e-4, colourways stable`);
