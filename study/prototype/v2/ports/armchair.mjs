// Lounge armchair — high-level graph: one armchair part plus the colourway.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'linen-mustard': { shellOuter: '#ECE7E0', shellInner: '#F8F4EF', cushion: '#D9A02B', leg: '#6B4A32' },
  'oak-sage': { shellOuter: '#CFC3B0', shellInner: '#F3EEE8', cushion: '#7E9179', leg: '#B8946A' },
  'walnut-teal': { shellOuter: '#B4AAA0', shellInner: '#E3E6E4', cushion: '#3E7C86', leg: '#4E3423' },
  'ochre-plum': { shellOuter: '#F3EEE8', shellInner: '#FAF8F3', cushion: '#7A4A5E', leg: '#8A6244' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'linen-mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const shellOuter = g.input('shellOuter', 'color', '', { label: 'Shell outer' });
  const shellInner = g.input('shellInner', 'color', '', { label: 'Shell lining' });
  const cushion = g.input('cushion', 'color', '', { label: 'Cushion' });
  const leg = g.input('leg', 'color', '', { label: 'Legs' });
  const backLine = g.input('backLine', 'enum', 'tub', { options: ['tub', 'wing'], label: 'Back line' });
  const lived = g.input('lived_in', 'float', 0.35, { min: 0, max: 1, step: 0.05, label: 'Lived in' });
  const armLine = g.input('armLine', 'float', 0.5, { min: 0, max: 1, step: 0.05, label: 'Arm line' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'linen-mustard',
    overrides: { shellOuter, shellInner, cushion, leg },
  });
  const wing = g.value({ args: { b: backLine }, expr: "b === 'wing'" });
  const chair = g.add('armchair', { wing, lived, armLine }, {});
  return g.mesh(chair, {
    zones: { shellOuter: at(pal, 'shellOuter'), shellInner: at(pal, 'shellInner'), cushion: at(pal, 'cushion'), leg: at(pal, 'leg') },
  });
}
