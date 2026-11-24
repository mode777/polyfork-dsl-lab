// Wattle fence run — high-level graph: one wattleFence part plus the wood palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  seasoned: { stake: '#7f5430', withy: '#a88661', rope: '#b49970' },
  peeled: { stake: '#6b4326', withy: '#c8b89e', rope: '#b49970' },
  weathered: { stake: '#625249', withy: '#a9977e', rope: '#b8a88e' },
  'fresh-hazel': { stake: '#4e301c', withy: '#9b673d', rope: '#c8b89e' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'seasoned', { options: Object.keys(PALETTE), label: 'Colorway' });
  const height = g.input('height', 'float', 1.2, { min: 0.9, max: 1.4, step: 0.05, label: 'Height' });
  const unevenness = g.input('unevenness', 'float', 0.5, { min: 0, max: 1, step: 0.05, label: 'Unevenness' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'seasoned' });
  const fence = g.add('wattleFence', { height, unevenness }, {});
  return g.mesh(fence, {
    zones: { stake: at(pal, 'stake'), withy: at(pal, 'withy'), rope: at(pal, 'rope') },
  });
}
