// Ten new ports: default reference parity plus the exposed build variants.
// The .pfn files keep their default geometry; buildPort passes the same options
// through the port builders so every variant is checked against the reference.
import { buildPort, compareGeometry, parityLine } from './run.mjs';

const cases = [
  ['prize', '../../scripts/prize-car-turntable-683ae8',
    [{ diameter: 5 }, { diameter: 6.4 }, { height: 0.45 }, { bulbs: false }]],
  ['grass', '../../scripts3/scorched-grass-tuft-994376',
    [{ blades: 16 }, { blades: 36 }, { height: 0.55 }, { spread: 1 }, { burn: 1 }, { pebbles: false }]],
  ['coral', '../../scripts3/pillar-coral-b6deba',
    [{ columns: 2 }, { columns: 4 }, { flutes: 4 }, { flutes: 7 }, { height: 1.25 }, { height: 1.86 }, { health: 0.5 }]],
  ['rowboat', '../../scripts3/wooden-rowboat-916981',
    [{ length: 2.6 }, { length: 4.2 }, { beam: 0.95 }, { beam: 1.55 }, { strakes: 3 }, { strakes: 7 }, { thwarts: 1 }, { thwarts: 3 }, { ribs: 0 }, { ribs: 8 }]],
  ['basket', '../../scripts3/woven-storage-basket-983d80',
    [{ fill: 'folded-throw' }, { fill: 'rolled-blanket' }, { lidded: true }, { height: 0.2 }, { height: 0.36 }, { belly: 0.6 }, { belly: 1.6 }, { lived_in: 0 }, { lived_in: 1 }]],
  ['contextmenu', '../../scripts3/context-menu-list-551201',
    [{ state: 'hover' }, { state: 'pressed' }, { state: 'selected' }, { state: 'disabled' }, { rows: 2 }, { rows: 10 }, { active: 1 }, { active: 10 }]],
  ['lookout', '../../scripts/lookout-watchtower-f1a5ce',
    [{ towerHeight: 0.7 }, { towerHeight: 1.06 }, { legSplay: 0.55 }, { legSplay: 1.5 }, { platformWidth: 0.85 }, { platformWidth: 1.25 }, { roofFlare: 0.6 }, { roofFlare: 2 }, { cabinFacets: 'square' }, { cabinFacets: 'hex' }]],
  ['cafe', '../../scripts/cafe-table-set-1868d1',
    [{ chairs: 0 }, { chairs: 1 }, { chairs: 2 }, { chairs: 4 }, { term: 0.2 }, { topShape: 'square' }]],
  ['keyboard', '../../scripts/keyboard-bench-564d56',
    [{ era: 'modern' }, { era: '1700s' }, { width: 0.6 }, { width: 1.2 }, { seatHeight: 0.46 }, { seatHeight: 0.54 }]],
  ['chair', '../../scripts/table-game-chair-ffa6c1',
    [{ seatHeight: 0.48 }, { seatHeight: 0.78 }, { backHeight: 0.19 }, { backHeight: 0.43 }, { back: false }, { upholstery: 'emerald' }]],
];

let pass = 0, checks = 0;
for (const [port, origPath, variants] of cases) {
  const orig = await import(`${origPath}.mjs`);
  const base = await buildPort(port, {});
  const r = compareGeometry(orig.createAsset({}), base.mesh, { tol: 1e-4 });
  let ok = r.ok;
  for (const variant of variants) {
    checks++;
    const v = compareGeometry(orig.createAsset(variant), (await buildPort(port, variant)).mesh, { tol: 1e-4 });
    if (!v.ok) { ok = false; console.log(`  variant FAIL ${JSON.stringify(variant)}`, parityLine(port, v)); }
  }
  if (ok) pass++;
  console.log(parityLine(port, r), `variants ${variants.length}/${variants.length}`);
}
console.log(`\n${pass}/${cases.length} new ports at 1e-4; ${checks} variant checks`);
