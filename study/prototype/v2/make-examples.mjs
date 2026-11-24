import fs from 'node:fs';
import { graph } from './dsl.mjs';
import { toText } from './format.mjs';
const list = [
  ['cookie','cookie2','Cookie','Parametric loft, seeded scatter and instanced chips.','props'],
  ['sapphire','sapphire','Rough sapphire','Chamfered profile, loft along stations, pointed/truncated ends.','props'],
  ['tire','tire','Tire','Revolved tread with per-facet modulation, caps, hub and lug ring.','props'],
  ['rock','rock','Small rock','Deformed sphere clipped by two planes with capped cuts.','props'],
  ['armchair','armchair','Lounge armchair','Lofted shell, cylinder legs, bevel box cushion.','props'],
  ['clam','clam','Maxima clam','Ribbed shell bands with hinge cap.','nature'],
  ['hair','hair','Stylized hair','Solid curl primitives scattered on a head volume.','character'],
  ['jacket','jacket','Stylized jacket','Wrapped shell with a front gap, lining, lapels and collar.','character'],
  ['sign','sign','Sign','Extruded segment letters on a panel.','props'],
  ['creature','creature','Creature (skinned)','Lofted body, bone tree and soft skin weights.','character'],
  ['basket','basket','Storage basket','Revolved weave bands and handle.','props'],
  ['pumpkin','pumpkin','Pumpkin','Lobed revolve with stem.','nature'],
];
fs.mkdirSync('examples', { recursive: true });
const CAM = {
  cookie: [25, 35], sapphire: [20, 12], tire: [58, 14], rock: [35, 18],
  armchair: [25, 15], clam: [35, 28], hair: [150, 10], jacket: [15, 8],
  sign: [18, 6], creature: [30, 10], basket: [25, 18], pumpkin: [30, 14],
};
const FIT = { cookie: 1.25, sapphire: 1.5, tire: 1.75, rock: 1.7, armchair: 1.8, clam: 1.7, hair: 1.55, jacket: 1.9, sign: 2.25, creature: 1.75, basket: 1.7, pumpkin: 1.65 };
const manifest = [];
for (const [id, port, title, desc, cat] of list) {
  const mod = await import(`./ports/${port}.mjs`);
  const g = graph(id);
  const out = mod.default(g, {});
  g.out('mesh', out);
  const text = toText(g.ir);
  fs.writeFileSync(`examples/${id}.pfn`, text);
  manifest.push({ id, title, description: desc, category: cat, file: `${id}.pfn`, bytes: text.length, nodes: g.ir.nodes.length, cam: CAM[id], fit: FIT[id] });
}
fs.writeFileSync('examples/manifest.json', JSON.stringify(manifest, null, 2));
console.log(manifest.map((m) => `${m.id.padEnd(9)} ${String(m.bytes).padStart(6)}B ${String(m.nodes).padStart(3)} nodes`).join('\n'));
