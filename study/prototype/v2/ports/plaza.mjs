// Composite plaza tile — high-level graph: one plazaTile part plus the palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'gallery-white': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#5fb3e0', edge: '#3f4a58', ring: '#6e7f92', cap: '#a9b6c4' },
  'atrium-mint': { deck: '#ffffff', seam: '#c8d2dc', strip: '#7fe7da', edge: '#2a323d', ring: '#7b8a9c', cap: '#a9b6c4' },
  'promenade-violet': { deck: '#e6ecf2', seam: '#a9b6c4', strip: '#b7a6f5', edge: '#2a323d', ring: '#5d6b7c', cap: '#8e9eae' },
  'transit-blossom': { deck: '#f4f7fa', seam: '#b9c5d2', strip: '#ff9ec7', edge: '#1b212a', ring: '#5d6b7c', cap: '#9aa8b8' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'gallery-white', { options: Object.keys(PALETTE), label: 'Colorway' });
  const deck = g.input('deck', 'color', '', { label: 'Deck' });
  const seam = g.input('seam', 'color', '', { label: 'Seam' });
  const strip = g.input('strip', 'color', '', { label: 'Light strip' });
  const edge = g.input('edge', 'color', '', { label: 'Underside' });
  const ring = g.input('ring', 'color', '', { label: 'Socket rim' });
  const cap = g.input('cap', 'color', '', { label: 'Socket cap' });
  const seams = g.input('seams', 'enum', 'twin', { options: ['single', 'twin', 'quad'], label: 'Seams' });
  const strips = g.input('strips', 'enum', 'all', { options: ['none', 'one', 'all'], label: 'Light strips' });
  const socket = g.input('socket', 'bool', true, { label: 'Service socket' });
  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'gallery-white',
    overrides: { deck, seam, strip, edge, ring, cap },
  });
  const tile = g.add('plazaTile', { seams, strips, socket }, {});
  return g.mesh(tile, {
    zones: { deck: at(pal, 'deck'), seam: at(pal, 'seam'), strip: at(pal, 'strip'), edge: at(pal, 'edge'), ring: at(pal, 'ring'), cap: at(pal, 'cap') },
  });
}
