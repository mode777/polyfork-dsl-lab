// Maxima clam — high-level graph: one clamAnimal part plus the colourway.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'maxima-blue': { shell: '#E8C88A', margin: '#B8894A', nacre: '#F6F2E8', mantle: '#3B5FC4', mantleDeep: '#2A3E8F', stripe: '#F6C13A', spot: '#2B2E33' },
  'crocea-teal': { shell: '#D4AC6A', margin: '#8C6236', nacre: '#F7F2E6', mantle: '#4E9AAE', mantleDeep: '#1B4E6B', stripe: '#7FD4A8', spot: '#2B2E33' },
  'squamosa-gold': { shell: '#C9B79B', margin: '#7E7059', nacre: '#E6DCC6', mantle: '#F6C13A', mantleDeep: '#E85F1E', stripe: '#FFF9EA', spot: '#2B2E33' },
  'derasa-violet': { shell: '#E8C88A', margin: '#B8894A', nacre: '#F6F2E8', mantle: '#6E4FA8', mantleDeep: '#2A3E8F', stripe: '#B0568C', spot: '#2B2E33' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'maxima-blue', { options: Object.keys(PALETTE), label: 'Colorway' });
  const ribs = g.input('ribs', 'int', 9, { min: 6, max: 9, step: 1, label: 'Ribs' });
  const flute = g.input('flute', 'float', 0.17, { min: 0.08, max: 0.28, step: 0.01, label: 'Flute depth' });
  const dome = g.input('dome', 'float', 1.0, { min: 0.65, max: 1.15, step: 0.01, label: 'Dome' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'maxima-blue' });
  const animal = g.add('clamAnimal', { ribs, flute, dome }, {});
  return g.mesh(animal, {
    zones: { shell: at(pal, 'shell'), margin: at(pal, 'margin'), nacre: at(pal, 'nacre'), mantle: at(pal, 'mantle'), mantleDeep: at(pal, 'mantleDeep'), stripe: at(pal, 'stripe'), spot: at(pal, 'spot') },
  });
}
