// Theatre vertical sign — exact geometric port. A stacked letter cabinet with
// per-row colour bands, inset enamel glyph plates, marquee lamps, two crown
// variants and the steel wall bracket. Wording selects one of three prebuilt
// row layouts; every other knob stays live.
import { graph } from '../dsl.mjs';

const PALETTE = {
  marquee: { red: '#b83833', yellow: '#e4c03d', teal: '#6998af', enamel: '#edeae3', bulbs: '#f0efed', steel: '#9b9085', cabinet: '#756b62', dark: '#47261f' },
  'brass-deco': { red: '#7d4530', yellow: '#b58941', teal: '#252b38', enamel: '#edeae3', bulbs: '#f0efed', steel: '#5a544b', cabinet: '#4c4238', dark: '#1b1b1e' },
  'faded-paint': { red: '#c57057', yellow: '#bfa585', teal: '#817d85', enamel: '#edeae3', bulbs: '#f0efed', steel: '#756b62', cabinet: '#967c61', dark: '#4c4238' },
  'jade-fiesta': { red: '#c25a3d', yellow: '#ffd530', teal: '#61973f', enamel: '#edeae3', bulbs: '#f0efed', steel: '#9b9085', cabinet: '#5a544b', dark: '#47261f' },
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

const Y0 = 3.0, ZB = -0.20, ZF = 0.28, BOARD_Z = ZF + 0.015;
const PLINTH = 0.28, LEDGE = 0.36, CAB = 1.30, ROWS_TOP = 5.36, TOP = 6.0;
const G = 0.04, HALF = 0.6, CELL = 0.2, PROUD = 0.06;
const BW = 0.46, FR = 0.04, FZ = ZF + 0.05;

const GLYPHS = {
  C: [[[0.8, 0], [5, 0], [5, 1.3], [1.5, 1.3], [1.5, 5.7], [5, 5.7], [5, 7], [0.8, 7], [0, 6.2], [0, 0.8]]],
  I: [[[1.75, 0], [3.25, 0], [3.25, 7], [1.75, 7]]],
  N: [[[0, 0], [1.5, 0], [1.5, 4.2], [3.5, 0], [5, 0], [5, 7], [3.5, 7], [3.5, 2.8], [1.5, 7], [0, 7]]],
  E: [[[0, 0], [5, 0], [5, 1.3], [1.5, 1.3], [1.5, 2.85], [4.3, 2.85], [4.3, 4.15], [1.5, 4.15], [1.5, 5.7], [5, 5.7], [5, 7], [0, 7]]],
  M: [[[0, 0], [1.5, 0], [1.5, 4.3], [2.5, 2.3], [3.5, 4.3], [3.5, 0], [5, 0], [5, 7], [3.6, 7], [2.5, 4.6], [1.4, 7], [0, 7]]],
  A: [[[0, 0], [1.3, 0], [1.79, 2], [3.21, 2], [3.7, 0], [5, 0], [3.3, 7], [1.7, 7]], [[2.08, 3.2], [2.92, 3.2], [2.5, 4.9]]],
  T: [[[1.75, 0], [3.25, 0], [3.25, 5.7], [5, 5.7], [5, 7], [0, 7], [0, 5.7], [1.75, 5.7]]],
  H: [[[0, 0], [1.5, 0], [1.5, 2.85], [3.5, 2.85], [3.5, 0], [5, 0], [5, 7], [3.5, 7], [3.5, 4.15], [1.5, 4.15], [1.5, 7], [0, 7]]],
  R: [[[0, 0], [1.5, 0], [1.5, 2.8], [2.2, 2.8], [3.4, 0], [5, 0], [3.8, 3], [5, 3.8], [5, 6.2], [4.2, 7], [0, 7]], [[1.5, 4.0], [3.5, 4.0], [3.5, 5.8], [1.5, 5.8]]],
  F: [[[0, 0], [1.5, 0], [1.5, 2.85], [4.2, 2.85], [4.2, 4.15], [1.5, 4.15], [1.5, 5.7], [5, 5.7], [5, 7], [0, 7]]],
  L: [[[0, 0], [5, 0], [5, 1.3], [1.5, 1.3], [1.5, 7], [0, 7]]],
  S: [[[0, 0], [5, 0], [5, 4.15], [1.5, 4.15], [1.5, 5.7], [5, 5.7], [5, 7], [0, 7], [0, 2.85], [3.5, 2.85], [3.5, 1.3], [0, 1.3]]],
};

const BANDS = {
  5: ['teal', 'red', 'yellow', 'teal', 'red'],
  6: ['teal', 'red', 'yellow', 'yellow', 'teal', 'red'],
  7: ['teal', 'red', 'yellow', 'yellow', 'teal', 'red', 'yellow'],
};

const others = (c) => ['red', 'yellow', 'teal'].filter((k) => k !== c);

function mappedGlyph(glyph, lh, lw, yc) {
  const map = (poly) => poly.map(([u, v]) => [(u / 5 - 0.5) * lw, yc + (v / 7 - 0.5) * lh]);
  return { outer: map(glyph[0]), holes: glyph.slice(1).map(map) };
}

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'marquee', { options: Object.keys(PALETTE), label: 'Colorway' });
  const lit = g.input('lit', 'bool', true, { label: 'Lit' });
  const wording = g.input('wording', 'enum', 'CINEMA', { options: ['FILMS', 'CINEMA', 'THEATRE'], label: 'Wording' });
  const crown = g.input('crown', 'enum', 'stepped', { options: ['stepped', 'tiered', 'cornice'], label: 'Crown' });
  const red = g.input('red', 'color', '', { label: 'Red enamel' });
  const yellow = g.input('yellow', 'color', '', { label: 'Yellow enamel' });
  const teal = g.input('teal', 'color', '', { label: 'Teal enamel' });
  const enamel = g.input('enamel', 'color', '', { label: 'Enamel face' });
  const bulbs = g.input('bulbs', 'color', '', { label: 'Bulbs' });
  const steel = g.input('steel', 'color', '', { label: 'Brackets' });
  const cabinet = g.input('cabinet', 'color', '', { label: 'Cabinet' });
  const dark = g.input('dark', 'color', '', { label: 'Plinth & reveals' });

  const block = (zone, x0, x1, y0, y1, z0, z1, skip = '') =>
    g.block({ x0, x1, y0, y1, z0, z1, skip, zone });
  const plate = (zone, outer, holes, z0, z1) => g.plate({ profile: outer, holes, z0, z1, zone });
  const poly = (zone, pts, inside) => g.poly({ pts, zone, inside });
  const polyHint = (zone, pts, hint) => g.poly({ pts, zone, hint });

  const lamp = (x, y, z, nx, ny, nz, r, ry, h) => {
    const bulb = g.gem({ x, y, z, nx, ny, nz, r, ry, h, n: 6, zone: 'bulbs' });
    const cap = g.gem({ x, y, z, nx, ny, nz, r: r * 0.85, ry: ry * 0.85, h: 0.025, n: 6, zone: 'steel' });
    return g.cond({ cond: lit, then: bulb, else: cap });
  };

  const arrow = (s, yc, c, z0, z1, rowH) => {
    const [cu, cl] = others(c);
    const hh = Math.min(0.13, rowH * 0.22);
    const a0 = 0.27 * s, a1 = 0.54 * s;
    const top = [a0, yc + hh], mid = [a0, yc], tip = [a1, yc], bot = [a0, yc - hh];
    const inside = [(a0 * 2 + a1) / 3, yc, (z0 + z1) / 2];
    const cap = (zone, p, q, r, ip) => poly(zone, [[p[0], p[1], z1], [q[0], q[1], z1], [r[0], r[1], z1]], ip);
    const wall = (zone, p, q) => poly(zone, [[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], inside);
    return g.join([
      cap(cu, top, mid, tip, [top[0], top[1], z0]),
      cap(cl, mid, bot, tip, [mid[0], mid[1], z0]),
      wall(cu, top, tip), wall(cu, mid, top),
      wall(cl, tip, bot), wall(cl, bot, mid),
    ]);
  };

  const wordBranch = (word) => {
    const nRows = word.length, rowH = (ROWS_TOP - CAB) / nRows, bands = BANDS[nRows];
    const parts = [];
    for (let i = 0; i < nRows; i++) {
      const c = bands[i];
      const yTop = ROWS_TOP - i * rowH, yBot = yTop - rowH;
      const y0 = yBot + G / 2, y1 = i === 0 ? yTop : yTop - G / 2;
      const yc = (y0 + y1) / 2;
      parts.push(block(c, -HALF, HALF, y0, y1, ZB, ZF));
      const frontA = block(c, -CELL, CELL, y0, y1, ZF, ZF + PROUD, 'nz');
      const frontB = block(c, -CELL, CELL, y0, y1, ZF, ZF + PROUD, 'nz py');
      parts.push(i === 0
        ? g.cond({ cond: g.value({ expr: "s.crown === 'stepped'" }), then: frontB, else: frontA })
        : frontA);

      const glyph = GLYPHS[word[i]] ?? GLYPHS.I;
      const lh = Math.min(rowH * 0.64, 0.5), lw = Math.min(0.32, lh * 5 / 7);
      const mapped = mappedGlyph(glyph, lh, lw, yc);
      parts.push(plate('enamel', mapped.outer, mapped.holes, ZF + PROUD, ZF + PROUD + 0.06));

      const arrows = i % 2 === 1 && i < nRows - 2;
      for (const s of [1, -1]) {
        if (arrows) parts.push(arrow(s, yc, c, ZF, ZF + 0.035, rowH));
        else parts.push(lamp(0.4 * s, yc, ZF, 0, 0, 1, 0.10, 0.13, 0.11));
        parts.push(lamp(HALF * s, yc, (ZB + ZF) / 2, s, 0, 0, 0.085, 0.11, 0.10));
      }
    }
    return g.join(parts);
  };

  const bodies = {
    FILMS: wordBranch('FILMS'),
    CINEMA: wordBranch('CINEMA'),
    THEATRE: wordBranch('THEATRE'),
  };
  const body = g.switch({ on: wording, cases: bodies });

  const base = g.join([
    block('dark', -HALF + 0.02, HALF - 0.02, 0, PLINTH, ZB + 0.02, ZF - 0.02, 'py'),
    block('yellow', -HALF - 0.04, HALF + 0.04, PLINTH, LEDGE, ZB - 0.02, ZF + 0.06),
    block('cabinet', -HALF, HALF, LEDGE, CAB, ZB, ZF, 'ny'),
  ]);

  const boards = [];
  for (const [b0, b1] of [[0.98, 1.20], [0.52, 0.86]]) {
    const outer = [[-BW - FR, b0 - FR], [BW + FR, b0 - FR], [BW + FR, b1 + FR], [-BW - FR, b1 + FR]];
    const hole = [[-BW, b0], [BW, b0], [BW, b1], [-BW, b1]];
    boards.push(plate('yellow', outer, [hole], ZF, FZ));
    boards.push(polyHint('enamel', [[-BW, b0, BOARD_Z], [BW, b0, BOARD_Z], [BW, b1, BOARD_Z]], [0, 0, 1]));
    boards.push(polyHint('enamel', [[-BW, b0, BOARD_Z], [BW, b1, BOARD_Z], [-BW, b1, BOARD_Z]], [0, 0, 1]));
  }
  boards.push(block('dark', -HALF + 0.04, HALF - 0.04, CAB - 0.01, ROWS_TOP - 0.02, ZB + 0.04, ZF - 0.04, 'py ny'));

  const crowns = {
    stepped: g.join([
      block('teal', -CELL, CELL, ROWS_TOP, TOP, ZB + 0.04, ZF + PROUD, 'ny'),
      block('red', CELL, 0.36, ROWS_TOP, ROWS_TOP + 0.44, ZB + 0.08, ZF, 'ny nx'),
      block('yellow', 0.36, 0.50, ROWS_TOP, ROWS_TOP + 0.28, ZB + 0.12, ZF - 0.06, 'ny nx'),
      block('red', -0.36, -CELL, ROWS_TOP, ROWS_TOP + 0.44, ZB + 0.08, ZF, 'ny px'),
      block('yellow', -0.50, -0.36, ROWS_TOP, ROWS_TOP + 0.28, ZB + 0.12, ZF - 0.06, 'ny px'),
    ]),
    tiered: g.join([
      block('yellow', -0.56, 0.56, ROWS_TOP, ROWS_TOP + 0.20, ZB + 0.02, ZF + 0.02, 'ny'),
      block('red', -0.38, 0.38, ROWS_TOP + 0.20, ROWS_TOP + 0.42, ZB + 0.06, ZF - 0.02, 'ny'),
      block('teal', -CELL, CELL, ROWS_TOP + 0.42, TOP, ZB + 0.10, ZF - 0.06, 'ny'),
    ]),
    cornice: g.join([
      block('teal', -0.56, 0.56, ROWS_TOP, TOP - 0.14, ZB + 0.04, ZF - 0.02, 'ny py'),
      block('yellow', -0.66, 0.66, TOP - 0.14, TOP, ZB - 0.06, ZF + 0.08),
    ]),
  };
  const crownGeom = g.switch({ on: crown, cases: crowns });

  const bracket = [block('steel', -0.23, 0.23, 0.12, 5.20, -0.40, -0.34)];
  for (const ya of [1.0, 4.0]) {
    bracket.push(block('steel', -0.90, 0.90, ya - 0.12, ya + 0.12, -0.37, ZB + 0.06, 'px nx'));
    for (const s of [1, -1]) bracket.push(block('steel', 0.88 * s, 0.95 * s, ya - 0.21, ya + 0.21, -0.40, -0.12));
  }

  const all = g.join([body, base, boards, crownGeom, bracket]);
  const placed = g.transform({ geom: all, ty: Y0 });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'marquee',
    overrides: { red, yellow, teal, enamel, bulbs, steel, cabinet, dark },
  });
  return g.mesh(placed, {
    zones: {
      red: at(pal, 'red'), yellow: at(pal, 'yellow'), teal: at(pal, 'teal'),
      enamel: at(pal, 'enamel'), bulbs: at(pal, 'bulbs'), steel: at(pal, 'steel'),
      cabinet: at(pal, 'cabinet'), dark: at(pal, 'dark'),
    },
  });
}
