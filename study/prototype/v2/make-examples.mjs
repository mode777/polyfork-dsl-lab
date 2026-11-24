import fs from 'node:fs';
import { graph } from './dsl.mjs';
import { toText } from './format.mjs';
const list = [
  ['cookie','cookie2','Cookie','Exact geometric port: parametric loft, lazy PRNG scatter, non-uniform chips.','props'],
  ['sapphire','sapphire','Rough sapphire','Exact geometric port: bevel profile, terminations, all reference parameters live.','props'],
  ['tire','tire','Tire','Exact geometric port: revolved tread, caps, hub and lug ring.','props'],
  ['pumpkin','pumpkin','Pumpkin','Exact geometric port: alternating lobe/groove revolve and a real THREE stem.','nature'],
  ['rug','rug','Area rug','Exact geometric port: deformed lattice, folded corner, per-cell weave zones.','props'],
  ['chalkboard','chalkboard','Chalkboard menu board','Exact geometric port: mitred frame, recessed slate, live menu rows and two chalk sticks.','signage'],
  ['theatre','theatre','Theatre vertical sign','Exact geometric port: banded readerboard, enamel glyphs, marquee lamps and three crowns.','signage'],
  ['wayfinding','wayfinding','Overhead wayfinding sign','Exact geometric port: chamfered lit cabinet, packed legend glyphs, hanger rods and braces.','signage'],
  ['desk','desk','Office desk','Exact geometric port: chamfered slab, folded steel sleds, live drawer/plain/pedestal undercarriage.','props'],
];
fs.mkdirSync('examples', { recursive: true });
const CAM = {
  cookie: [25, 35], sapphire: [20, 12], tire: [58, 14], pumpkin: [30, 14], rug: [35, 42],
  chalkboard: [22, 18], theatre: [18, 8], wayfinding: [25, 12], desk: [35, 22],
};
const FIT = { cookie: 1.25, sapphire: 1.5, tire: 2.4, pumpkin: 1.65, rug: 1.5, chalkboard: 1.35, theatre: 1.15, wayfinding: 1.6, desk: 1.7 };
const STATUS = { cookie: 'port', sapphire: 'port', tire: 'port', pumpkin: 'port', rug: 'port', chalkboard: 'port', theatre: 'port', wayfinding: 'port', desk: 'port' };
const manifest = [];
for (const [id, port, title, desc, cat] of list) {
  const mod = await import(`./ports/${port}.mjs`);
  const g = graph(id);
  const out = mod.default(g, {});
  g.out('mesh', out);
  const text = toText(g.ir);
  fs.writeFileSync(`examples/${id}.pfn`, text);
  manifest.push({ id, title, description: desc, category: cat, status: STATUS[id], file: `${id}.pfn`, bytes: text.length, nodes: g.ir.nodes.length, cam: CAM[id], fit: FIT[id] });
}
fs.writeFileSync('examples/manifest.json', JSON.stringify(manifest, null, 2));
console.log(manifest.map((m) => `${m.id.padEnd(9)} ${String(m.bytes).padStart(6)}B ${String(m.nodes).padStart(3)} nodes`).join('\n'));
