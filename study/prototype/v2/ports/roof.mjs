// Tiled roof section — high-level graph: one roofGable part plus the tile palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'slate-kawara': { tile: '#4E5459', ridge: '#3C4145', trim: '#7E4B33', plaster: '#F0EFEC' },
  'charcoal-machiya': { tile: '#3C4145', ridge: '#2E3134', trim: '#42352A', plaster: '#ECE8DE' },
  'pale-alley': { tile: '#8A9197', ridge: '#6B7278', trim: '#8C7355', plaster: '#F7F5EF' },
  'shrine-vermilion': { tile: '#4E5459', ridge: '#3C4145', trim: '#B5462F', plaster: '#F7F5EF' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'slate-kawara', { options: Object.keys(PALETTE), label: 'Colorway' });
  const pitch = g.input('roofPitch', 'float', 35, { min: 25, max: 45, step: 1, label: 'Roof pitch' });
  const ribs = g.input('ribs', 'int', 8, { min: 5, max: 9, step: 1, label: 'Tile rolls' });
  const courses = g.input('courses', 'int', 4, { min: 3, max: 5, step: 1, label: 'Tile courses' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'slate-kawara' });
  const roof = g.add('roofGable', { pitch, ribs, courses }, {});
  return g.mesh(roof, {
    zones: { tile: at(pal, 'tile'), ridge: at(pal, 'ridge'), trim: at(pal, 'trim'), plaster: at(pal, 'plaster') },
  });
}
