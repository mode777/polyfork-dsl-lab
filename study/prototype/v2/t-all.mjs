import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  ['cookie2','../../scripts/cookie-2016bb','cookie'],
  ['sapphire','../../scripts2/rough-sapphire-fb25c7','sapphire'],
  ['tire','../../scripts2/tire-ccf0eb','tire'],
  ['armchair','../../scripts2/lounge-armchair-5a72ca','armchair'],
  ['clam','../../scripts2/maxima-clam-429c17','clam'],
  ['quiver','../../scripts2/quiver-722a40','quiver'],
  ['carousel','../../scripts2/baggage-reclaim-carousel-7ceef0','carousel'],
  ['plaza','../../scripts2/composite-plaza-tile-618067','plaza'],
  ['tram','../../scripts2/tram-track-tile-f3c69a','tram'],
  ['wattle','../../scripts2/wattle-fence-run-703830','wattle'],
  ['cobbled','../../scripts2/cobbled-street-tile-054385','cobbled'],
  ['stilt','../../scripts2/adjustable-bay-stilt-426c90','stilt'],
  ['shrub','../../scripts2/williamsoniella-flowering-shrub-dc53ae','shrub'],
  ['rock','../../scripts2/small-rock-457be8','rock'],
  ['cheese','../../scripts2/cheese-wedge-a5c99b','cheese'],
  ['snail','../../scripts2/snail-base','snail'],
  ['stag','../../scripts2/stag-beetle-base','stag'],
  ['hare','../../scripts2/mountain-hare-base','hare'],
  ['soprano','../../scripts2/opera-soprano-base','soprano'],
  ['elf','../../scripts2/elf-assassin-base','elf'],
  ['valet','../../scripts2/valet-attendant-c351e6','valet'],
];
let pass = 0;
for (const [port, origPath, origName] of cases) {
  try {
    const orig = await import(`${origPath}.mjs`);
    const a = orig.createAsset({});
    const b = await buildPort(port, {});
    const r = compareGeometry(a, b.mesh, { tol: 1e-4 });
    if (r.ok) pass++;
    console.log(parityLine(port, r), `nodes ${String(b.nodes).padStart(2)} ${b.ms.toFixed(1)}ms`);
  } catch (e) { console.log(`${port.padEnd(10)} ERROR ${String(e.message).slice(0, 120)}`); }
}
console.log(`\n${pass}/${cases.length} geometric parity at 1e-4`);
