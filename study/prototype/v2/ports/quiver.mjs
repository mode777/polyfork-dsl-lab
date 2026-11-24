// Arrow quiver — high-level graph: one quiver part plus the leather palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  'saddle-tan': { leather: '#9d846c', rim: '#6e423a', stitch: '#54352f', shaft: '#715a4e', fletch: '#d9dbe0', buckle: '#c6ab55', bark: '#8c6857', cord: '#e1e1e5', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
  oxblood: { leather: '#a0454b', rim: '#54352f', stitch: '#b2a299', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#95a0b5', bark: '#715a4e', cord: '#d9dbe0', alloy: '#7f8da3', fittings: '#4f6284', glow: '#63cadc' },
  'ranger-green': { leather: '#27372e', rim: '#54352f', stitch: '#9d846c', shaft: '#8c6857', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#6e423a', cord: '#b2a299', alloy: '#6e7b97', fittings: '#45495d', glow: '#4eb764' },
  'frost-steel': { leather: '#7f8da3', rim: '#4f6284', stitch: '#d9dbe0', shaft: '#9d846c', fletch: '#e1e1e5', buckle: '#c6ab55', bark: '#b2a299', cord: '#af8984', alloy: '#95a0b5', fittings: '#45495d', glow: '#5deaff' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'saddle-tan', { options: Object.keys(PALETTE), label: 'Colorway' });
  const length = g.input('length', 'float', 1.0, { min: 0.8, max: 1.25, step: 0.05, label: 'Tube length' });
  const taper = g.input('taper', 'float', 0.5, { min: 0, max: 1, step: 0.05, label: 'Taper' });
  const strap = g.input('strap', 'bool', true, { label: 'Shoulder strap' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'saddle-tan' });
  const q = g.add('quiver', { length, taper, strap }, {});
  return g.mesh(q, {
    zones: { leather: at(pal, 'leather'), rim: at(pal, 'rim'), stitch: at(pal, 'stitch'), shaft: at(pal, 'shaft'), fletch: at(pal, 'fletch'), buckle: at(pal, 'buckle'), bark: at(pal, 'bark'), cord: at(pal, 'cord'), alloy: at(pal, 'alloy'), fittings: at(pal, 'fittings'), glow: at(pal, 'glow') },
  });
}
