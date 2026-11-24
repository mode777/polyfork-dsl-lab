import { buildPort, stats } from './run.mjs';
const cases = [
 ['basket','woven-storage-basket-983d80'],['officer','airport-security-officer-8fd38a'],
 ['goat','goat-base'],['minotaur','minotaur-miniature-108237'],['pumpkin','pumpkin-5f977e'],
 ['elfpresents','elf-carrying-presents-base'],['aurelian','aurelian-base'],['coral','pillar-coral-b6deba'],
 ['skiff','lake-rowing-skiff-4916e7'],['menu','context-menu-list-551201'],['fingers','small-pipe-joint-e037a0'],
 ['desk','office-desk-021eb3'],['shield','tower-shield-09ff7d'],['angel','cathedral-angel-base'],
 ['gmscreen','game-master-s-screen-665f62'],['grass','scorched-grass-tuft-994376'],['minka','minka-farmhouse-680475'],
 ['rowboat','wooden-rowboat-916981'],['roof','tiled-roof-section-6f1121'],['boulder','basalt-boulder-a1929c'],
];
let ok=0;
for (const [port, orig] of cases) {
  try {
    const o = await import(`../../scripts3/${orig}.mjs`);
    const a = stats(o.createAsset({}));
    const b = await buildPort(port, {});
    ok++;
    console.log(`${port.padEnd(12)} orig ${String(a.tris).padStart(5)} port ${String(b.stats.tris).padStart(5)} ratio ${(b.stats.tris/a.tris).toFixed(2)} nodes ${String(b.nodes).padStart(2)} ${b.ms.toFixed(1)}ms`);
  } catch(e) { console.log(`${port.padEnd(12)} ERROR ${String(e.message).slice(0,90)}`); }
}
console.log('ok',ok,'/',cases.length);
