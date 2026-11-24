import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  ['cookie2','../../scripts/cookie-2016bb','cookie'],
  ['sapphire','../../scripts2/rough-sapphire-fb25c7','sapphire'],
  ['tire','../../scripts2/tire-ccf0eb','tire'],
  ['pumpkin','../../scripts3/pumpkin-5f977e','pumpkin'],
  ['rug','../../scripts/area-rug-5c56e2','rug'],
  ['chalkboard','../../scripts4/chalkboard-menu-board-a24d9d','chalkboard'],
  ['theatre','../../scripts4/theatre-vertical-sign-21c29b','theatre'],
  ['wayfinding','../../scripts4/overhead-wayfinding-sign-64d4e8','wayfinding'],
  ['desk','../../scripts3/office-desk-021eb3','desk'],
  ['plaza','../../scripts2/composite-plaza-tile-618067','plaza'],
  ['clam','../../scripts2/maxima-clam-429c17','clam'],
  ['tram','../../scripts2/tram-track-tile-f3c69a','tram'],
  ['armchair','../../scripts2/lounge-armchair-5a72ca','armchair'],
  ['wattle','../../scripts2/wattle-fence-run-703830','wattle'],
  ['quiver','../../scripts2/quiver-722a40','quiver'],
  ['door','../../scripts/interior-door-leaf-a02f28','door'],
  ['taxiway','../../scripts4/lit-taxiway-sign-206955','taxiway'],
  ['roof','../../scripts3/tiled-roof-section-6f1121','roof'],
  ['carousel','../../scripts2/baggage-reclaim-carousel-7ceef0','carousel'],
  ['prize','../../scripts/prize-car-turntable-683ae8','prize'],
  ['grass','../../scripts3/scorched-grass-tuft-994376','grass'],
  ['coral','../../scripts3/pillar-coral-b6deba','coral'],
  ['rowboat','../../scripts3/wooden-rowboat-916981','rowboat'],
  ['basket','../../scripts3/woven-storage-basket-983d80','basket'],
  ['contextmenu','../../scripts3/context-menu-list-551201','contextmenu'],
  ['lookout','../../scripts/lookout-watchtower-f1a5ce','lookout'],
  ['cafe','../../scripts/cafe-table-set-1868d1','cafe'],
  ['keyboard','../../scripts/keyboard-bench-564d56','keyboard'],
  ['chair','../../scripts/table-game-chair-ffa6c1','chair'],
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
