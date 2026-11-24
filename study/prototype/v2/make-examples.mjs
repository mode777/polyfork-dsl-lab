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
  ['plaza','plaza','Composite plaza tile','Exact geometric port: twin recessed seams, lit bars, raised field and service socket.','architecture'],
  ['clam','clam','Maxima clam','Exact geometric port: ribbed valves, pearly dish, mantle rays and inhalant spots.','nature'],
  ['tram','tram','Tram track tile','Exact geometric port: grooved steel rails in a swept asphalt slab with a base course.','architecture'],
  ['armchair','armchair','Lounge armchair','Exact geometric port: tub shell, splayed legs and two loose cushions.','props'],
  ['wattle','wattle','Wattle fence run','Exact geometric port: lashed stakes, mirrored sails and eleven woven withy rows.','nature'],
  ['quiver','quiver','Arrow quiver','Exact geometric port: stitched leather tube, shoulder strap, buckle and seven arrows.','props'],
  ['door','door','Interior door leaf','Exact geometric port: glazed leaf, moulded panels, brass lever and three hinges.','architecture'],
  ['taxiway','taxiway','Lit taxiway sign','Exact geometric port: two-panel arrow face, octagonal casing, legs and concrete pad.','signage'],
  ['roof','roof','Tiled roof section','Exact geometric port: gable kawara roof with four stepped courses and closed verges.','architecture'],
  ['carousel','carousel','Baggage carousel','Exact geometric port: sloped plate bed, bumper skirt and three riding bags.','props'],
];
fs.mkdirSync('examples', { recursive: true });
const CAM = {
  cookie: [25, 35], sapphire: [20, 12], tire: [58, 14], pumpkin: [30, 14], rug: [35, 42],
  chalkboard: [22, 18], theatre: [18, 8], wayfinding: [25, 12], desk: [35, 22],
  plaza: [35, 35], clam: [25, 20], tram: [35, 35], armchair: [30, 18], wattle: [30, 15],
  quiver: [25, 15], door: [18, 8], taxiway: [25, 12], roof: [35, 20], carousel: [35, 20],
};
const FIT = {
  cookie: 1.25, sapphire: 1.5, tire: 2.4, pumpkin: 1.65, rug: 1.5, chalkboard: 1.35,
  theatre: 1.15, wayfinding: 1.6, desk: 1.7, plaza: 1.25, clam: 1.8, tram: 1.5,
  armchair: 1.5, wattle: 1.4, quiver: 1.5, door: 1.2, taxiway: 1.4, roof: 1.4, carousel: 1.6,
};
const STATUS = Object.fromEntries([...['cookie', 'sapphire', 'tire', 'pumpkin', 'rug', 'chalkboard', 'theatre', 'wayfinding', 'desk', 'plaza', 'clam', 'tram', 'armchair', 'wattle', 'quiver', 'door', 'taxiway', 'roof', 'carousel'].map((id) => [id, 'port'])]);
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
