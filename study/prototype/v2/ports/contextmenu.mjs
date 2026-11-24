// Context menu list — a drafted rounded glass sheet, five bezel rows and the
// accent pill. Rows use the generic pill node; the sheet is a two-ring loft
// with raw fan caps, keeping the reference vertex order.
import { graph } from '../dsl.mjs';
import { at, TAU, clamp } from './_kit.mjs';

const THEMES = {
  light: { glass: '#b9dfed', rim: '#caf1fb', row: '#ffffff', muted: '#dedfe1' },
  dark: { glass: '#213844', rim: '#99b1c1', row: '#787e83', muted: '#55595c' },
};
const ACCENTS = { blue: '#0a84ff', green: '#30d158', amber: '#ffb020', red: '#ff453a', violet: '#8e5cff' };
const PALETTE = {
  'light-blue': { ...THEMES.light, glow: ACCENTS.blue },
  'dark-violet': { ...THEMES.dark, glow: ACCENTS.violet },
  'light-green': { ...THEMES.light, glow: ACCENTS.green },
  'dark-amber': { ...THEMES.dark, glow: ACCENTS.amber },
  'light-red': { ...THEMES.light, glow: ACCENTS.red },
  'dark-blue': { ...THEMES.dark, glow: ACCENTS.blue },
  'light-graphite': { ...THEMES.light, row: '#787e83', muted: '#9ba0a6', glow: ACCENTS.blue },
};

const W = 0.20, T = 0.005, SHEET_R = 0.03, SHEET_SEG = 8, RIM_DRAFT = 0.0015, GRID = 0.02;
const PITCH = 0.036, ROW_H = 0.028, ROW_R = ROW_H / 2, SIDE = 0.014, ROW_W = W - 2 * SIDE, END_MIN = 0.014, ROW_SEG = 16;
const UNDER = 0.0014;
const POSE = {
  rest: { foot: T + 0.004, th: 0.003 }, hover: { foot: T + 0.012, th: 0.003 },
  pressed: { foot: T + 0.0003, th: 0.002 }, selected: { foot: T + 0.0003, th: 0.003 },
  disabled: { foot: T + 0.0015, th: 0.0015 },
};
const STATES = ['idle', 'hover', 'pressed', 'selected', 'disabled'];

function sheetRing(H) {
  const pts = [], r = SHEET_R;
  const corners = [[W / 2 - r, H / 2 - r, 0], [-W / 2 + r, H / 2 - r, 90], [-W / 2 + r, -H / 2 + r, 180], [W / 2 - r, -H / 2 + r, 270]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= SHEET_SEG; i++) {
    const a = (a0 + (90 * i) / SHEET_SEG) * Math.PI / 180;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
  }
  return pts;
}

export default function build(g, params = {}) {
  const colorway = g.input('colorway', 'enum', 'light-blue', { options: Object.keys(PALETTE), label: 'Colorway' });
  const glass = g.input('glass', 'color', '', { label: 'Glass' });
  const rim = g.input('rim', 'color', '', { label: 'Glass rim' });
  const row = g.input('row', 'color', '', { label: 'Rows' });
  const muted = g.input('muted', 'color', '', { label: 'Muted rows' });
  const glow = g.input('glow', 'color', '', { label: 'Accent glow' });

  const P = { state: 'idle', rows: 7, active: 4, ...params };
  const state = STATES.includes(P.state) ? P.state : 'idle';
  const rows = clamp(Math.round(P.rows), 2, 10), active = Math.min(rows, clamp(Math.round(P.active), 1, 10));
  const off = state === 'disabled';
  const H = + (Math.ceil((rows * PITCH - (PITCH - ROW_H) + 2 * END_MIN) / GRID - 1e-6) * GRID).toFixed(3);
  const back = sheetRing(H);
  const front = back.map((p) => ({ ...p, x: p.x - p.nx * RIM_DRAFT, y: p.y - p.ny * RIM_DRAFT }));
  const back3 = back.map((p) => [p.x, p.y, 0]), front3 = front.map((p) => [p.x, p.y, T]);
  const parts = [
    g.loft({ rings: [front3], capBottom: [0, 0, T], capBottomRaw: true, zones: { capBottom: 'glass' } }),
    g.loft({ rings: [back3], capTop: [0, 0, 0], capTopRaw: true, zones: { capTop: 'glass' } }),
    g.loft({ rings: [back3, front3], zones: { band: 'rim' } }),
  ];

  const footSeg = rows <= 9 ? 4 : 2;
  const hx = ROW_W / 2 - ROW_R;
  for (let k = 1; k <= rows; k++) {
    const cy = ((rows - 1) / 2 - (k - 1)) * PITCH;
    const isActive = !off && k === active;
    const pose = off ? POSE.disabled : isActive ? (POSE[state] || POSE.rest) : POSE.rest;
    parts.push(g.pill({ hx, cy, r: ROW_R, seg: ROW_SEG, footSeg, foot: pose.foot, th: pose.th, under: UNDER, zone: off ? 'muted' : isActive ? 'glow' : 'row' }));
  }

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'light-blue',
    overrides: { glass, rim, row, muted, glow },
  });
  return g.mesh(g.join(parts), {
    zones: { glass: at(pal, 'glass'), rim: at(pal, 'rim'), row: at(pal, 'row'), muted: at(pal, 'muted'), glow: at(pal, 'glow') },
    materials: { glow: { slot: 'glow', roughness: 0.65 } },
  });
}
