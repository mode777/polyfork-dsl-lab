import { buildPort, stats } from './run.mjs';
const cases = [
  ['sapphire','rough-sapphire-fb25c7','exact'],
  ['tire','tire-ccf0eb','exact'],
  ['armchair','lounge-armchair-5a72ca','near'],
  ['clam','maxima-clam-429c17','struct'],
  ['quiver','quiver-722a40','struct'],
  ['carousel','baggage-reclaim-carousel-7ceef0','struct'],
  ['plaza','composite-plaza-tile-618067','struct'],
  ['tram','tram-track-tile-f3c69a','struct'],
  ['wattle','wattle-fence-run-703830','struct'],
  ['cobbled','cobbled-street-tile-054385','struct'],
  ['stilt','adjustable-bay-stilt-426c90','struct'],
  ['shrub','williamsoniella-flowering-shrub-dc53ae','struct'],
  ['rock','small-rock-457be8','struct'],
  ['cheese','cheese-wedge-a5c99b','struct'],
  ['snail','snail-base','module'],
  ['stag','stag-beetle-base','module'],
  ['hare','mountain-hare-base','module'],
  ['soprano','opera-soprano-base','module'],
  ['elf','elf-assassin-base','module'],
  ['valet','valet-attendant-c351e6','module'],
];
for (const [port, origName, kind] of cases) {
  try {
    const orig = await import(`../../scripts2/${origName}.mjs`);
    const a = stats(orig.createAsset({}));
    const b = await buildPort(port, {});
    console.log(`${port.padEnd(9)} ${kind.padEnd(7)} orig ${String(a.tris).padStart(5)} port ${String(b.stats.tris).padStart(5)} ratio ${(b.stats.tris/a.tris).toFixed(2)} nodes ${String(b.nodes).padStart(2)} ${b.ms.toFixed(1)}ms`);
  } catch (e) { console.log(`${port.padEnd(9)} ${kind.padEnd(7)} ERROR ${String(e.message).slice(0,100)}`); }
}
