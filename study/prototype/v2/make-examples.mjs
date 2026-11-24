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
  ['prize','prize','Prize car turntable','Exact geometric port: revolved deck and foot ring with a live bulb ring.','props'],
  ['grass','grass','Scorched grass tuft','Exact geometric port: three-sided lofted blades, per-band burn zones and a pebble ring.','nature'],
  ['coral','coral','Pillar coral','Exact geometric port: integrated fluted columns on a four-ring mound.','nature'],
  ['rowboat','rowboat','Wooden rowboat','Exact geometric port: clinker hull lofted from station sections, ribs, thwarts and stowed oars.','props'],
  ['basket','basket','Woven storage basket','Exact geometric port: checkered weave courses, braided bands, rope handles and optional lid/fill.','props'],
  ['contextmenu','contextmenu','Context menu list','Exact geometric port: drafted glass sheet, pill rows and the accent row.','props'],
  ['lookout','lookout','Lookout watchtower','Exact geometric port: timber trestle, planked shaft, glazed cabin, railing and conical roof.','architecture'],
  ['cafe','cafe','Cafe table set','Exact geometric port: faceted table, three chairs and two mugs at the reference term.','props'],
  ['keyboard','keyboard','Keyboard bench','Exact geometric port: tufted scissor-lift seat, legs, rails and crank.','props'],
  ['chair','chair','Table game chair','Exact geometric port: swivel drum seat, tufted back pad, nailheads and footring.','props'],
];
fs.mkdirSync('examples', { recursive: true });
const CAM = {
  cookie: [25, 35], sapphire: [20, 12], tire: [58, 14], pumpkin: [30, 14], rug: [35, 42],
  chalkboard: [22, 18], theatre: [18, 8], wayfinding: [25, 12], desk: [35, 22],
  plaza: [35, 35], clam: [25, 20], tram: [35, 35], armchair: [30, 18], wattle: [30, 15],
  quiver: [25, 15], door: [18, 8], taxiway: [25, 12], roof: [35, 20], carousel: [35, 20],
  prize: [35, 18], grass: [30, 20], coral: [25, 18], rowboat: [35, 25], basket: [30, 20],
  contextmenu: [12, 6], lookout: [30, 15], cafe: [30, 20], keyboard: [30, 18], chair: [30, 15],
};
const FIT = {
  cookie: 1.25, sapphire: 1.5, tire: 2.4, pumpkin: 1.65, rug: 1.5, chalkboard: 1.35,
  theatre: 1.15, wayfinding: 1.6, desk: 1.7, plaza: 1.25, clam: 1.8, tram: 1.5,
  armchair: 1.5, wattle: 1.4, quiver: 1.5, door: 1.2, taxiway: 1.4, roof: 1.4, carousel: 1.6,
  prize: 1.5, grass: 1.6, coral: 1.5, rowboat: 1.5, basket: 1.5, contextmenu: 1.2, lookout: 1.4,
  cafe: 1.6, keyboard: 1.5, chair: 1.5,
};
const STATUS = Object.fromEntries([...['cookie', 'sapphire', 'tire', 'pumpkin', 'rug', 'chalkboard', 'theatre', 'wayfinding', 'desk', 'plaza', 'clam', 'tram', 'armchair', 'wattle', 'quiver', 'door', 'taxiway', 'roof', 'carousel', 'prize', 'grass', 'coral', 'rowboat', 'basket', 'contextmenu', 'lookout', 'cafe', 'keyboard', 'chair'].map((id) => [id, 'port'])]);
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
