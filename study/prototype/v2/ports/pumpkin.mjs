// Pumpkin — exact geometric port. Alternating lobe/groove columns around a
// five-ring profile; the stem is a real THREE.CylinderGeometry.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  field: { lobe: '#f5821f', groove: '#c7530c', stem: '#2f5d29' },
  ghost: { lobe: '#ece5d3', groove: '#c7bb9f', stem: '#5a6338' },
  'heirloom-blue': { lobe: '#8fa8b5', groove: '#6a8492', stem: '#414f2c' },
  unripe: { lobe: '#7fa03c', groove: '#5e7b28', stem: '#3c5226' },
};

export default function build(g, P = {}) {
  const colorway = g.input('colorway', 'enum', 'field', { options: Object.keys(PALETTE), label: 'Colorway' });
  const squash = g.input('squash', 'float', 1, { min: 0.7, max: 1.1, step: 0.05, label: 'Squash' });
  const ribs = g.input('ribs', 'float', 1, { min: 0, max: 2, step: 0.25, label: 'Rib depth' });
  const lobe = g.input('lobe', 'color', '', { label: 'Lobe colour' });
  const stemColor = g.input('stem', 'color', '', { label: 'Stem colour' });

  const profile = [[0.070, 0.000], [0.152, 0.042], [0.172, 0.105], [0.138, 0.172], [0.055, 0.208]];
  const body = g.revolve({
    profile, seg: 10, axis: 'y', ringMode: 'xz', ribs,
    mod: field('x*(i%2 ? (s.ribs===1 ? 0.92 : 1-0.08*s.ribs) : 1)'),
    zoneField: field("i%2 ? 'shade' : 'lobe'"),
    capTop: [0, 0.196, 0], capBottom: [0, 0, 0],
    capZoneField: field("i%2 ? 'shade' : 'lobe'"),
    orient: true,
  });
  const scaled = g.transform({ geom: body, s: expr('[1, s.squash, 1]') });

  // Reference transform chain: translate up, tilt around Z, then seat on crown.
  const stem = g.transform({
    geom: g.transform({
      geom: g.prim({ type: 'CylinderGeometry', args: [0.036, 0.026, 0.078, 5], zone: 'stem' }),
      ty: 0.039,
    }),
    rz: -0.16, tx: 0.006,
    ty: expr('0.192*s.squash'),
  });

  const PAL = JSON.stringify(PALETTE);
  const exprColor = (key) => expr(`s.${key} || (${PAL}[s.colorway] || ${PAL}.field).${key === 'lobe' ? 'lobe' : 'stem'}`);
  // Groove is the lobe darkened 22% when the lobe colour is overridden.
  const grooveColor = expr(`s.lobe ? darken(s.lobe, 0.78) : (${PAL}[s.colorway] || ${PAL}.field).groove`);

  return g.mesh(g.join([scaled, stem]), {
    zones: { lobe: exprColor('lobe'), shade: grooveColor, stem: exprColor('stem') },
  });
}
