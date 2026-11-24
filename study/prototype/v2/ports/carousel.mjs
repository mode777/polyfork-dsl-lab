// Baggage reclaim carousel — high-level graph: one carousel part plus the terminal palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'terminal-grey': { plates: '#dddbdc', frame: '#8fa5b1', skirt: '#696568', hardCase: '#3e6495', duffel: '#b94c34' },
  graphite: { plates: '#e5e3e3', frame: '#586f84', skirt: '#282f3f', hardCase: '#9b855d', duffel: '#47592d' },
  'warm-steel': { plates: '#eeeded', frame: '#7b787c', skirt: '#4c3a43', hardCase: '#497aa2', duffel: '#836047' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'terminal-grey', { options: Object.keys(PALETTE), label: 'Colorway' });
  const load = g.input('load', 'enum', 'few', { options: ['empty', 'few', 'full'], label: 'Load' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'terminal-grey' });
  const carousel = g.add('carousel', { load }, {});
  return g.mesh(carousel, {
    zones: { plates: at(pal, 'plates'), frame: at(pal, 'frame'), skirt: at(pal, 'skirt'), hardCase: at(pal, 'hardCase'), duffel: at(pal, 'duffel') },
  });
}
