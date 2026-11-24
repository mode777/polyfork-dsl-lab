// Tram track tile — high-level graph: one tramTile part plus the road palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'city-asphalt': { asphalt: '#3C4145', rail: '#D8DADD', stone: '#6B7278', base: '#4E5459', paint: '#F0EFEC' },
  'fresh-blacktop': { asphalt: '#2E3134', rail: '#E4E6E6', stone: '#6B7278', base: '#1B1D20', paint: '#F7F5EF' },
  'sun-faded': { asphalt: '#6B7278', rail: '#F0EFEC', stone: '#D8DADD', base: '#8A9197', paint: '#F7F5EF' },
  'wet-slate': { asphalt: '#2E3134', rail: '#8A9197', stone: '#4E5459', base: '#1B1D20', paint: '#E4E6E6' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'city-asphalt', { options: Object.keys(PALETTE), label: 'Colorway' });
  const gauge = g.input('gauge', 'enum', 'tram-1370', { options: ['cape-1067', 'tram-1370', 'standard-1435'], label: 'Track gauge' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'city-asphalt' });
  const tile = g.add('tramTile', { gauge }, {});
  return g.mesh(tile, {
    zones: { asphalt: at(pal, 'asphalt'), rail: at(pal, 'rail'), stone: at(pal, 'stone'), base: at(pal, 'base'), paint: at(pal, 'paint') },
  });
}
