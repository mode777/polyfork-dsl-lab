// Interior door leaf — high-level graph: one doorLeaf part plus the joinery palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'pale-oak': { leaf: '#E3CBA5', panel: '#D2B084', glass: '#47423C', brass: '#C9A24B' },
  'chalk-white': { leaf: '#FAF8F3', panel: '#F3EEE8', glass: '#47423C', brass: '#C9A24B' },
  walnut: { leaf: '#8A6244', panel: '#6B4A32', glass: '#2E2A26', brass: '#E0C078' },
  'sage-painted': { leaf: '#7E9179', panel: '#5B8551', glass: '#47423C', brass: '#E0C078' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const mixHex = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, '0')).join('');

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'pale-oak', { options: Object.keys(PALETTE), label: 'Colorway' });
  const leaf = g.input('leaf', 'color', '', { label: 'Leaf' });
  const panel = g.input('panel', 'color', '', { label: 'Panel field' });
  const glass = g.input('glass', 'color', '', { label: 'Glazing' });
  const brass = g.input('brass', 'color', '', { label: 'Ironmongery' });
  const width = g.input('width', 'float', 0.90, { min: 0.70, max: 0.95, step: 0.05, label: 'Leaf width (m)' });
  const lived = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'pale-oak',
    overrides: { leaf, panel, glass, brass },
  });
  const wear = mixHex(PALETTE['pale-oak'].leaf, '#8C837A', 0.20 * 0.35);
  const door = g.add('doorLeaf', { width, lived }, {});
  return g.mesh(door, {
    zones: { leaf: at(pal, 'leaf'), panel: at(pal, 'panel'), glass: at(pal, 'glass'), brass: at(pal, 'brass'), wear },
    materials: { glass: { slot: 'glass', transparent: true, opacity: 0.6, roughness: 0.25, metalness: 0 } },
    name: 'interior-door-leaf',
  });
}
