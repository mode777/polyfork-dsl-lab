// Tire — exact geometric port as a pure node graph: a table of profile rows,
// a mapped profile/zones list, a per-facet radius expression, and revolve/fan
// assembly. No script node.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  'whitewall-chrome': { rubber: '#2a2d35', sidewall: '#f1f2ef', rim: '#999ca3', chrome: '#c2c7cd' },
  'blackwall-steel': { rubber: '#2a2d35', sidewall: '#3d3f46', rim: '#676b72', chrome: '#afb5bb' },
  redline: { rubber: '#2a2d35', sidewall: '#d13d34', rim: '#c2c7cd', chrome: '#f1f2ef' },
  'worn-spare': { rubber: '#3d3f46', sidewall: '#898c95', rim: '#676b72', chrome: '#999ca3' },
};

const P = JSON.stringify(PALETTE);

export default function build(g, P0 = {}) {
  const colorway = g.input('colorway', 'enum', 'whitewall-chrome', { options: Object.keys(PALETTE), label: 'Colorway' });
  const rubber = g.input('rubber', 'color', '', { label: 'Rubber' });
  const sidewall = g.input('sidewall', 'color', '', { label: 'Sidewall' });
  const rimColor = g.input('rim', 'color', '', { label: 'Rim face' });
  const chrome = g.input('chrome', 'color', '', { label: 'Hubcap chrome' });
  const facets = g.input('facets', 'int', 14, { min: 12, max: 16, step: 1, label: 'Facets' });
  const width = g.input('width', 'float', 1, { min: 0.7, max: 1.35, step: 0.05, label: 'Section width' });
  const rimSize = g.input('rimSize', 'float', 1, { min: 0.85, max: 1.2, step: 0.05, label: 'Rim size' });

  // Profile rows: [radius, z, tread block, parity, zone]. These are the
  // reference constants with the two live scales applied.
  const rows = g.value({
    expr: `[[0.21*s.rimSize*0.72, -0.105, 0, 0, 'rim'], [0.21*s.rimSize*0.72, -0.135, 0, 0, 'rub'], [0.30, -0.135, 0, 0, 'rub'], [0.35, -0.112, 0.013, 0, 'rub'], [0.35, -0.062, 0.013, 0, 'rub'], [0.32, -0.040, 0, 0, 'rub'], [0.35, -0.018, 0.013, 1, 'rub'], [0.35, 0.018, 0.013, 1, 'rub'], [0.32, 0.040, 0, 0, 'rub'], [0.35, 0.062, 0.013, 0, 'rub'], [0.35, 0.112, 0.013, 0, 'rub'], [0.30, 0.135, 0, 0, 'ww'], [0.21*s.rimSize + 0.014, 0.135, 0, 0, 'rub'], [0.21*s.rimSize, 0.042, 0, 0, 'rim'], [0.135*s.rimSize, 0.042, 0, 0, null]]`,
  });

  g.define('tire-profile', (h) => {
    h.input('item', 'any', null);
    const v = h.value({ expr: '[item[0], (item[1] - 0.0035) * s.width]' });
    h.out('out', v);
  });
  g.define('tire-zone', (h) => {
    h.input('item', 'any', null);
    const v = h.value({ expr: "item[4] || 'rim'" });
    h.out('out', v);
  });

  const profile = g.map({ list: rows, graph: 'tire-profile' });
  const zonesAll = g.map({ list: rows, graph: 'tire-zone' });
  const zones = g.value({ args: { z: zonesAll }, expr: 'z.slice(0, -1)' });

  const BKR = g.value({ expr: '0.21*s.rimSize*0.72' });
  const backY = g.value({ expr: '(-0.105 - 0.0035)*s.width' });
  const HUBR = g.value({ expr: '0.135*s.rimSize' });
  const dishY = g.value({ expr: '(0.042 - 0.0035)*s.width' });
  const domeProfile = g.value({
    expr: '[[0.135*s.rimSize, (0.042-0.0035)*s.width], [0.118*s.rimSize, (0.098-0.0035)*s.width], [0.066*s.rimSize, (0.128-0.0035)*s.width]]',
  });
  const domeR = g.value({ expr: '0.066*s.rimSize' });
  const domeY = g.value({ expr: '(0.128 - 0.0035)*s.width' });
  const apexY = g.value({ expr: '(0.142 - 0.0035)*s.width' });
  const lugR = g.value({ expr: '0.023*s.rimSize' });
  const lugH = g.value({ expr: '0.018*s.width + 0.002' });
  const lugX = g.value({ expr: '0.105*s.rimSize' });
  const lugZ = g.value({ expr: '(0.042 - 0.0035)*s.width - 0.002' });
  const CY = g.value({ expr: '0.35*cos(PI/s.facets)' });
  const phase = expr('-PI/2 + PI/s.facets');

  const shell = g.revolve({
    profile, seg: facets, axis: 'z', phase,
    ringMode: 'xz', zone: zones,
    values: { rows },
    mod: field("vals.rows[k][2] ? (min(i, s.seg-1-i)%2===vals.rows[k][3] ? vals.rows[k][0]-vals.rows[k][2] : vals.rows[k][0]) : vals.rows[k][0]"),
  });
  const backCap = g.fanRing({ r: BKR, y: backY, n: facets, phase, apex: [0, 0, backY], axis: 'z', zone: 'rim', flip: true });
  const dishCap = g.fanRing({ r: HUBR, y: dishY, n: facets, phase, apex: [0, 0, dishY], axis: 'z', zone: 'rim' });
  const dome = g.revolve({ profile: domeProfile, seg: facets, axis: 'z', phase, zone: 'chrome' });
  const domeCap = g.fanRing({ r: domeR, y: domeY, n: facets, phase, apex: [0, 0, apexY], axis: 'z', zone: 'chrome' });
  const lug = g.cone({ n: 6, r: lugR, h: lugH, x: lugX, y: 0, z: lugZ, axis: 'z', zone: 'chrome' });
  const lugs = g.arrayPolar({ geom: lug, count: 5, axis: 'z', start: Math.PI / 2, spin: false });

  const geo = g.join([shell, backCap, dishCap, dome, domeCap, lugs]);
  const centered = g.center({ geom: geo, y: false });
  const body = g.transform({ geom: centered, ty: CY });

  const color = (key) => expr(`s.${key} || (${P}[s.colorway] || ${P}['whitewall-chrome']).${key}`);
  return g.mesh(body, {
    zones: { rub: color('rubber'), ww: color('sidewall'), rim: color('rim'), chrome: color('chrome') },
  });
}
