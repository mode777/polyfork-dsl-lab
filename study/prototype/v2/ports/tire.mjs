// Tire — exact geometric port. A code node computes the reference profile,
// facet modulation, caps, dome and lug seats from the live params; the graph
// does the revolve/fan/polar assembly.
import { graph, expr } from '../dsl.mjs';

const PALETTE = {
  'whitewall-chrome': { rubber: '#2a2d35', sidewall: '#f1f2ef', rim: '#999ca3', chrome: '#c2c7cd' },
  'blackwall-steel': { rubber: '#2a2d35', sidewall: '#3d3f46', rim: '#676b72', chrome: '#afb5bb' },
  redline: { rubber: '#2a2d35', sidewall: '#d13d34', rim: '#c2c7cd', chrome: '#f1f2ef' },
  'worn-spare': { rubber: '#3d3f46', sidewall: '#898c95', rim: '#676b72', chrome: '#999ca3' },
};

const DATA_SRC = `
const R_OUT = 0.35, R_SHLD = 0.30, HW = 0.135, GROOVE = 0.030, BLOCK = 0.013;
const BORE0 = 0.21, HUB0 = 0.135, DISH_Z = 0.042, BACK_R = 0.72, BACK_Z = -0.105, APEX_Z = 0.142;
const N = Math.round(facets), W = width, RS = rimSize;
const BORE = BORE0 * RS, HUBR = HUB0 * RS, WWI = BORE + 0.014, BKR = BORE * BACK_R, LUG_R = 0.105 * RS;
const CY = R_OUT * Math.cos(Math.PI / N), ZOFF = -((APEX_Z - HW) / 2) * W;
const PROF = [
  [BKR, BACK_Z, 0, 0, 'rim'], [BKR, -0.135, 0, 0, 'rub'], [R_SHLD, -0.135, 0, 0, 'rub'],
  [R_OUT, -0.112, BLOCK, 0, 'rub'], [R_OUT, -0.062, BLOCK, 0, 'rub'], [R_OUT - GROOVE, -0.040, 0, 0, 'rub'],
  [R_OUT, -0.018, BLOCK, 1, 'rub'], [R_OUT, 0.018, BLOCK, 1, 'rub'], [R_OUT - GROOVE, 0.040, 0, 0, 'rub'],
  [R_OUT, 0.062, BLOCK, 0, 'rub'], [R_OUT, 0.112, BLOCK, 0, 'rub'], [R_SHLD, 0.135, 0, 0, 'ww'],
  [WWI, 0.135, 0, 0, 'rub'], [BORE, DISH_Z, 0, 0, 'rim'], [HUBR, DISH_Z, 0, 0, null],
];
const CAP = [[HUBR, DISH_Z], [0.118 * RS, 0.098], [0.066 * RS, 0.128]];
const radius = ({ i, k }) => { const row = PROF[k]; return row[2] ? (Math.min(i, N - 1 - i) % 2 === row[3] ? row[0] - row[2] : row[0]) : row[0]; };
`;
const DATA_OUTS = [
  { name: 'N', expr: 'N' },
  { name: 'CY', expr: 'CY' },
  { name: 'profile', expr: 'PROF.map((r) => [r[0], r[1] * W + ZOFF])' },
  { name: 'zones', expr: "PROF.slice(0, -1).map((r) => r[4] ?? 'rim')" },
  { name: 'radius', expr: 'radius' },
  { name: 'BKR', expr: 'BKR' },
  { name: 'backY', expr: 'BACK_Z * W + ZOFF' },
  { name: 'HUBR', expr: 'HUBR' },
  { name: 'dishY', expr: 'DISH_Z * W + ZOFF' },
  { name: 'domeProfile', expr: 'CAP.map(([r, z]) => [r, z * W + ZOFF])' },
  { name: 'domeR', expr: '0.066 * RS' },
  { name: 'domeY', expr: '0.128 * W + ZOFF' },
  { name: 'apexY', expr: 'APEX_Z * W + ZOFF' },
  { name: 'lugR', expr: '0.023 * RS' },
  { name: 'lugH', expr: '0.018 * W + 0.002' },
  { name: 'lugX', expr: 'LUG_R' },
  { name: 'lugZ', expr: 'DISH_Z * W + ZOFF - 0.002' },
];

export default function build(g, P = {}) {
  const colorway = g.input('colorway', 'enum', 'whitewall-chrome', { options: Object.keys(PALETTE), label: 'Colorway' });
  const rubber = g.input('rubber', 'color', '', { label: 'Rubber' });
  const sidewall = g.input('sidewall', 'color', '', { label: 'Sidewall' });
  const rimColor = g.input('rim', 'color', '', { label: 'Rim face' });
  const chrome = g.input('chrome', 'color', '', { label: 'Hubcap chrome' });
  const facets = g.input('facets', 'int', 14, { min: 12, max: 16, step: 1, label: 'Facets' });
  const width = g.input('width', 'float', 1, { min: 0.7, max: 1.35, step: 0.05, label: 'Section width' });
  const rimSize = g.input('rimSize', 'float', 1, { min: 0.85, max: 1.2, step: 0.05, label: 'Rim size' });

  const layoutInputs = [
    { name: 'facets', type: 'int', default: 14 },
    { name: 'width', type: 'float', default: 1 },
    { name: 'rimSize', type: 'float', default: 1 },
  ];
  g.defineLayout('tire-data', { inputs: layoutInputs, src: DATA_SRC, outs: DATA_OUTS });
  const data = g.layoutNode('tire-data', { facets, width, rimSize });
  const get = (key) => ({ __ref: `${data.__ref}.${key}` });
  const phase = expr('s => -Math.PI/2 + Math.PI/s.facets');
  const fanPhase = expr('s => -Math.PI/2 + Math.PI/s.facets');

  const shell = g.revolve({
    profile: get('profile'), seg: facets, axis: 'z', phase,
    ringMode: 'xz', zone: get('zones'), mod: get('radius'),
  });
  const backCap = g.fanRing({ r: get('BKR'), y: get('backY'), n: facets, phase: fanPhase, apex: [0, 0, get('backY')], axis: 'z', zone: 'rim', flip: true });
  const dishCap = g.fanRing({ r: get('HUBR'), y: get('dishY'), n: facets, phase: fanPhase, apex: [0, 0, get('dishY')], axis: 'z', zone: 'rim' });
  const dome = g.revolve({ profile: get('domeProfile'), seg: facets, axis: 'z', phase, zone: 'chrome' });
  const domeCap = g.fanRing({ r: get('domeR'), y: get('domeY'), n: facets, phase: fanPhase, apex: [0, 0, get('apexY')], axis: 'z', zone: 'chrome' });
  const lug = g.cone({ n: 6, r: get('lugR'), h: get('lugH'), x: get('lugX'), y: 0, z: get('lugZ'), axis: 'z', zone: 'chrome' });
  const lugs = g.arrayPolar({ geom: lug, count: 5, axis: 'z', start: Math.PI / 2, spin: false });

  const geo = g.join([shell, backCap, dishCap, dome, domeCap, lugs]);
  const centered = g.center({ geom: geo, y: false });
  const body = g.transform({ geom: centered, ty: get('CY') });

  const color = (key) => expr(`s => s.${key} || (${JSON.stringify(PALETTE)})[s.colorway].${key}`);
  return g.mesh(body, {
    zones: { rub: color('rubber'), ww: color('sidewall'), rim: color('rim'), chrome: color('chrome') },
  });
}
