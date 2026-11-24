// Lit taxiway sign — high-level graph: one taxiwaySign part plus the airfield palette.
import { graph } from '../dsl.mjs';

const PALETTE = {
  mustard: { casing: '#a3b173', steel: '#7b787c', concrete: '#948f8f', field: '#282f3f' },
  graphite: { casing: '#575451', steel: '#948f8f', concrete: '#dddbdc', field: '#282f3f' },
  aluminium: { casing: '#e5e3e3', steel: '#7b787c', concrete: '#948f8f', field: '#3a4d6b' },
};
const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });
const mixHex = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(a.slice(1 + i * 2, 3 + i * 2), 16) * (1 - t) + parseInt(b.slice(1 + i * 2, 3 + i * 2), 16) * t).toString(16).padStart(2, '0')).join('');

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'mustard', { options: Object.keys(PALETTE), label: 'Colorway' });
  const panels = g.input('panels', 'int', 2, { min: 1, max: 4, step: 1, label: 'Panels' });
  const pal = g.preset({ choice: colorway, presets: PALETTE, fallback: 'mustard' });
  const casing = PALETTE.mustard.casing, steel = PALETTE.mustard.steel;
  const sign = g.add('taxiwaySign', { panels, footing: true }, {});
  return g.mesh(sign, {
    zones: {
      casing: at(pal, 'casing'), casingTop: mixHex(casing, '#dddbdc', 0.08), casingBezel: mixHex(casing, '#dddbdc', 0.05),
      casingLow: mixHex(casing, '#575451', 0.12), steel: at(pal, 'steel'), steelLow: mixHex(steel, '#575451', 0.15),
      concrete: at(pal, 'concrete'), field: at(pal, 'field'), signYellow: '#cbc852', signRed: '#b94c34', signWhite: '#f5f3f4',
    },
  });
}
