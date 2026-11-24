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
  const scaled = g.transform({ geom: body, s: expr('s => [1, s.squash, 1]') });

  // Reference transform chain: translate up, tilt around Z, then seat on crown.
  const stem = g.transform({
    geom: g.transform({
      geom: g.prim({ type: 'CylinderGeometry', args: [0.036, 0.026, 0.078, 5], zone: 'stem' }),
      ty: 0.039,
    }),
    rz: -0.16, tx: 0.006,
    ty: expr('s => 0.192*s.squash'),
  });

  const exprColor = (key) => expr(`s => {
    const cw = (${JSON.stringify(PALETTE)})[s.colorway] || (${JSON.stringify(PALETTE)}).field;
    return s.${key} || cw.${key === 'lobe' ? 'lobe' : 'stem'};
  }`);
  const grooveColor = expr(`s => {
    const cw = (${JSON.stringify(PALETTE)})[s.colorway] || (${JSON.stringify(PALETTE)}).field;
    if (!s.lobe) return cw.groove;
    const n = parseInt(s.lobe.slice(1), 16);
    const f = 0.78;
    const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }`);

  return g.mesh(g.join([scaled, stem]), {
    zones: { lobe: exprColor('lobe'), shade: grooveColor, stem: exprColor('stem') },
  });
}
