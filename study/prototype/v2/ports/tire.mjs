// Tire — exact geometric port. Named derived dimensions (`let`), a row/column
// profile table, a named preset, and expression-driven tread modulation.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  'whitewall-chrome': { rubber: '#2a2d35', sidewall: '#f1f2ef', rim: '#999ca3', chrome: '#c2c7cd' },
  'blackwall-steel': { rubber: '#2a2d35', sidewall: '#3d3f46', rim: '#676b72', chrome: '#afb5bb' },
  redline: { rubber: '#2a2d35', sidewall: '#d13d34', rim: '#c2c7cd', chrome: '#f1f2ef' },
  'worn-spare': { rubber: '#3d3f46', sidewall: '#898c95', rim: '#676b72', chrome: '#999ca3' },
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'whitewall-chrome', { options: Object.keys(PALETTE), label: 'Colorway' });
  const rubber = g.input('rubber', 'color', '', { label: 'Rubber' });
  const sidewall = g.input('sidewall', 'color', '', { label: 'Sidewall' });
  const rimColor = g.input('rim', 'color', '', { label: 'Rim face' });
  const chrome = g.input('chrome', 'color', '', { label: 'Hubcap chrome' });
  const facets = g.input('facets', 'int', 14, { min: 12, max: 16, step: 1, label: 'Facets' });
  const width = g.input('width', 'float', 1, { min: 0.7, max: 1.35, step: 0.05, label: 'Section width' });
  const rimSize = g.input('rimSize', 'float', 1, { min: 0.85, max: 1.2, step: 0.05, label: 'Rim size' });

  const dims = g.let({
    in: { width, rimSize, facets },
    binds: {
      bore: '0.21*rimSize',
      wwi: '0.21*rimSize + 0.014',
      bkr: '0.21*rimSize*0.72',
      backY: '(-0.105 - 0.0035)*width',
      hubR: '0.135*rimSize',
      dishY: '(0.042 - 0.0035)*width',
      domeR: '0.066*rimSize',
      domeY: '(0.128 - 0.0035)*width',
      apexY: '(0.142 - 0.0035)*width',
      lugR: '0.023*rimSize',
      lugH: '0.018*width + 0.002',
      lugX: '0.105*rimSize',
      lugZ: '(0.042 - 0.0035)*width - 0.002',
      cy: '0.35*cos(PI/facets)',
      domeProfile: '[[0.135*rimSize, (0.042-0.0035)*width], [0.118*rimSize, (0.098-0.0035)*width], [0.066*rimSize, (0.128-0.0035)*width]]',
    },
  });
  const d = (k) => at(dims, k);

  const rows = g.table({
    cols: ['r', 'z', 'block', 'parity', 'zone'],
    rows: [
      [d('bkr'), -0.105, 0, 0, 'rim'],
      [d('bkr'), -0.135, 0, 0, 'rub'],
      [0.30, -0.135, 0, 0, 'rub'],
      [0.35, -0.112, 0.013, 0, 'rub'],
      [0.35, -0.062, 0.013, 0, 'rub'],
      [0.32, -0.040, 0, 0, 'rub'],
      [0.35, -0.018, 0.013, 1, 'rub'],
      [0.35, 0.018, 0.013, 1, 'rub'],
      [0.32, 0.040, 0, 0, 'rub'],
      [0.35, 0.062, 0.013, 0, 'rub'],
      [0.35, 0.112, 0.013, 0, 'rub'],
      [0.30, 0.135, 0, 0, 'ww'],
      [d('wwi'), 0.135, 0, 0, 'rub'],
      [d('bore'), 0.042, 0, 0, 'rim'],
      [d('hubR'), 0.042, 0, 0, null],
    ],
  });

  g.define('tire-profile', (h) => {
    const item = h.input('item', 'any', null);
    const v = h.value({ expr: '[item.r, (item.z - 0.0035) * s.width]' });
    h.out('out', v);
  });
  g.define('tire-zone', (h) => {
    const item = h.input('item', 'any', null);
    const v = h.coalesce({ value: h.lookup({ object: item, key: 'zone' }), fallback: 'rim' });
    h.out('out', v);
  });

  const profile = g.map({ list: rows, graph: 'tire-profile' });
  const zones = g.slice({ list: g.map({ list: rows, graph: 'tire-zone' }), from: 0, to: -1 });

  const phase = expr('-PI/2 + PI/s.facets');
  const shell = g.revolve({
    profile, seg: facets, axis: 'z', phase,
    ringMode: 'xz', zone: zones,
    values: { rows },
    mod: field('vals.rows[k].block ? (min(i, s.seg-1-i)%2===vals.rows[k].parity ? vals.rows[k].r-vals.rows[k].block : vals.rows[k].r) : vals.rows[k].r'),
  });
  const backCap = g.fanRing({ r: d('bkr'), y: d('backY'), n: facets, phase, apex: [0, 0, d('backY')], axis: 'z', zone: 'rim', flip: true });
  const dishCap = g.fanRing({ r: d('hubR'), y: d('dishY'), n: facets, phase, apex: [0, 0, d('dishY')], axis: 'z', zone: 'rim' });
  const dome = g.revolve({ profile: d('domeProfile'), seg: facets, axis: 'z', phase, zone: 'chrome' });
  const domeCap = g.fanRing({ r: d('domeR'), y: d('domeY'), n: facets, phase, apex: [0, 0, d('apexY')], axis: 'z', zone: 'chrome' });
  const lug = g.cone({ n: 6, r: d('lugR'), h: d('lugH'), x: d('lugX'), y: 0, z: d('lugZ'), axis: 'z', zone: 'chrome' });
  const lugs = g.arrayPolar({ geom: lug, count: 5, axis: 'z', start: Math.PI / 2, spin: false });

  const body = g.transform({
    geom: g.center({ geom: g.join([shell, backCap, dishCap, dome, domeCap, lugs]), y: false }),
    ty: d('cy'),
  });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'whitewall-chrome',
    overrides: { rubber, sidewall, rim: rimColor, chrome },
  });
  return g.mesh(body, {
    zones: { rub: at(pal, 'rubber'), ww: at(pal, 'sidewall'), rim: at(pal, 'rim'), chrome: at(pal, 'chrome') },
  });
}
