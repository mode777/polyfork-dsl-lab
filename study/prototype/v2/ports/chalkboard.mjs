// Chalkboard menu board — exact geometric port. A mitred frame sweep, a
// recessed slate panel, per-panel chalk cells, a ledge and two chalk sticks.
// The static menu layout is a list of cell descriptors mapped through a group;
// rows/panels/density stay live because every cell has a condition expression.
import { graph, expr, field } from '../dsl.mjs';

const PALETTE = {
  'oak-slate': { frame: '#A98F6F', board: '#2E3330', chalk: '#F8F5EF', chalkAccent: '#E4C98A', chalkStickB: '#9BD5E0' },
  'walnut-slate': { frame: '#4A3825', board: '#2E3330', chalk: '#F8F5EF', chalkAccent: '#E0A96D', chalkStickB: '#9BD5E0' },
  'black-steel': { frame: '#4A4F52', board: '#1C1F1E', chalk: '#ECEFF0', chalkAccent: '#C9A227', chalkStickB: '#9BD5E0' },
  'sage-painted': { frame: '#5C6E52', board: '#2E3330', chalk: '#F8F1E7', chalkAccent: '#E4C98A', chalkStickB: '#9FB89A' },
};

const at = (r, k) => ({ __ref: `${r.__ref}.${k}` });

// Reference constants (metres).
const FW = 0.078, D = 0.075, CH = 0.020, STEP = 0.014, CHS = 0.010;
const ZB = 0.016, ZF = D - STEP - 0.030, OV = 0.018;
const OW = 0.844, MW = 0.088, ZM0 = 0.024, ZM1 = D - STEP - 0.008;
const LD = 0.155, LZ0 = 0.006, LH = 0.075, LLAP = 0.032, LCH = 0.022, LPR = 0.012;
const CK_R = 0.020, CK_L = 0.140, CK_SIDES = 6;
const PAD_TOP = 0.035, HEAD_H = 0.068, HEAD_GAP = 0.026;
const RULE_H = 0.012, RULE_GAP = 0.030, HDR_H = 0.022, HDR_GAP = 0.024;
const ROW_PITCH = 0.096, BAR_H = 0.042, PAD_BOT = 0.030;
const FIXED_V = PAD_TOP + HEAD_H + HEAD_GAP + RULE_H + RULE_GAP + HDR_H + HDR_GAP + PAD_BOT;
const LM = 0.045, RM = 0.045, PCW = 0.115, PGAP = 0.030, TGAP = 0.040, WGAP = 0.026;
const ROW_WORDS = [
  [0.36, 0.22], [0.28, 0.19, 0.30], [0.44, 0.24], [0.31, 0.26], [0.22, 0.38],
  [0.48, 0.20], [0.26, 0.33, 0.18], [0.40, 0.27], [0.24, 0.30],
];
const PRICE_W = [0.66, 0.50, 0.60, 0.48, 0.72, 0.54, 0.64, 0.58, 0.46];
const PRICE_SKIP = [0, 0, 2, 0, 0, 0, 2, 0, 0];
const HEAD_WORDS = [0.115, 0.085, 0.10, 0.07];
const CHALK_Z = 0.0012;
const MOUNT_Y = 1.40;

const PROFILE = [
  [0, 0], [FW - CH, 0], [FW, CH], [FW, D - CH], [FW - CH, D],
  [FW * 0.42, D], [FW * 0.42 - CHS, D - STEP], [CH, D - STEP], [0, D - STEP - CH],
];

function cellList() {
  const list = [];
  const gap = 0.014;
  const total = HEAD_WORDS.reduce((a, b) => a + b, 0) * OW + (HEAD_WORDS.length - 1) * gap;
  let x = -total / 2;
  for (const f of HEAD_WORDS) {
    list.push({ type: 'headline', zone: 'chalkAccent', x0: x, x1: x + f * OW });
    x += f * OW + gap;
  }
  list.push({ type: 'rule', zone: 'chalkAccent' });
  for (let k = 0; k < 2; k++) list.push({ type: 'header', zone: 'chalk', k });
  for (let row = 0; row < 9; row++) {
    const words = ROW_WORDS[row];
    for (let seg = 0; seg < 3; seg++) {
      const pre = words.slice(0, seg).reduce((a, b) => a + b, 0);
      list.push({ type: 'word', zone: 'chalk', row, seg, count: words.length, pre, w: words[seg] ?? 0 });
    }
    for (let k = 0; k < 2; k++) {
      list.push({
        type: 'price', zone: 'chalk', row, k, skip: !!(PRICE_SKIP[row] & (1 << k)),
        frac: PRICE_W[(row + k * 4) % PRICE_W.length],
      });
    }
  }
  return list;
}

const CELLS = cellList();

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'oak-slate', { options: Object.keys(PALETTE), label: 'Colorway' });
  const frame = g.input('frame', 'color', '', { label: 'Frame timber' });
  const board = g.input('board', 'color', '', { label: 'Slate' });
  const chalk = g.input('chalk', 'color', '', { label: 'Chalk' });
  const chalkAccent = g.input('chalkAccent', 'color', '', { label: 'Accent chalk' });
  const chalkStickB = g.input('chalkStickB', 'color', '', { label: 'Second chalk stick' });
  const panels = g.input('panels', 'int', 1, { min: 1, max: 3, step: 1, label: 'Panels' });
  const rows = g.input('rows', 'int', 7, { min: 5, max: 9, step: 1, label: 'Menu lines' });
  const density = g.input('menuDensity', 'float', 0.6, { min: 0, max: 1, step: 0.05, label: 'Chalk density' });

  const dims = g.let({
    in: { panels, rows, menuDensity: density },
    binds: {
      P: 'round(panels)',
      N: 'round(rows)',
      d: 'clamp(menuDensity, 0, 1)',
      openH: `${FIXED_V} + N*${ROW_PITCH}`,
      hy: 'openH/2',
      hx: `(P*${OW} + (P-1)*${MW})/2`,
      WF: `2*(hx + ${FW})`,
      HF: `2*(hy + ${FW})`,
      yMid: `${LH - LLAP} + HF/2`,
      priceCols: 'd < 0.4 ? 1 : 2',
      lenScale: '0.78 + 0.22*d',
      W60: 'round(N*0.8)',
      written: 'd <= 0 ? 0 : (d <= 0.6 ? round(W60*d/0.6) : round(W60 + (N-W60)*(d-0.6)/0.4))',
      hxp: `${OW / 2}`,
      blockRight: `hxp - ${RM}`,
      colLeft0: `blockRight - (priceCols-1)*(${PCW}+${PGAP}) - ${PCW}`,
      xL: `-hxp + ${LM}`,
      TW: `colLeft0 - ${TGAP} - xL`,
      bx: `hx + ${OV}`,
      by: `hy + ${OV}`,
    },
  });
  const d = (k) => at(dims, k);

  // Frame, recessed backing, mullions.
  const frameGeom = g.transform({
    geom: g.frame({ hx: d('hx'), hy: d('hy'), profile: PROFILE, zone: 'frame' }),
    ty: d('yMid'),
  });
  const backingGeom = g.poly({
    pts: g.value({
      args: { bx: d('bx'), by: d('by'), yMid: d('yMid'), ZB },
      expr: '[[-bx, yMid-by, ZB], [-bx, yMid+by, ZB], [bx, yMid+by, ZB], [bx, yMid-by, ZB]]',
    }),
    zone: 'frame',
  });
  const mullionAt = (m) => g.prism({
    profile: g.value({
      args: { hx: d('hx') },
      expr: `let c = -hx + ${m}*${OW} + (${m}-0.5)*${MW} in [[c+${MW / 2},${ZM0}],[c-${MW / 2},${ZM0}],[c-${MW / 2},${ZM1 - CH}],[c-${MW / 2}+${CH},${ZM1}],[c+${MW / 2}-${CH},${ZM1}],[c+${MW / 2},${ZM1 - CH}]]`,
    }),
    axis: 'y',
    from: g.value({ args: { hy: d('hy'), yMid: d('yMid') }, expr: 'yMid - hy - 0.018' }),
    to: g.value({ args: { hy: d('hy'), yMid: d('yMid') }, expr: 'yMid + hy + 0.018' }),
    cap: false,
    zone: 'frame',
  });
  const mullions = [
    g.cond({ cond: g.value({ expr: 's.panels >= 2' }), then: mullionAt(1), else: g.join([]) }),
    g.cond({ cond: g.value({ expr: 's.panels >= 3' }), then: mullionAt(2), else: g.join([]) }),
  ];

  // Board cells: one slate quad per panel plus the mapped menu marks.
  g.define('chalk-panel', (h) => {
    const item = h.input('item', 'any', null);
    const pane = h.let({
      in: { item },
      binds: {
        cx: `-s.hx + (item + 0.5)*${OW} + item*${MW}`,
        x0: `cx - ${OW / 2} - ${OV}`,
        x1: `cx + ${OW / 2} + ${OV}`,
        y0: `s.yMid - s.hy - ${OV}`,
        y1: `s.yMid + s.hy + ${OV}`,
      },
    });
    const slate = h.poly({
      pts: [[at(pane, 'x0'), at(pane, 'y0'), ZF], [at(pane, 'x1'), at(pane, 'y0'), ZF],
        [at(pane, 'x1'), at(pane, 'y1'), ZF], [at(pane, 'x0'), at(pane, 'y1'), ZF]],
      zone: 'board',
    });
    const cells = h.map({
      list: CELLS, graph: 'chalk-cell',
      cx: at(pane, 'cx'), hy: h.input('hy', 'any', null), yMid: h.input('yMid', 'any', null),
      blockRight: h.input('blockRight', 'any', null),
      priceCols: h.input('priceCols', 'any', null), xL: h.input('xL', 'any', null),
      TW: h.input('TW', 'any', null), lenScale: h.input('lenScale', 'any', null),
      d: h.input('d', 'any', null), written: h.input('written', 'any', null),
      N: h.input('N', 'any', null),
    });
    h.out('out', h.add('join', { geoms: h.concat({ lists: [[slate], cells] }) }));
  });

  g.define('chalk-cell', (h) => {
    const item = h.input('item', 'any', null);
    const p = h.let({
      in: { item },
      binds: {
        yTop: `s.yMid + s.hy - ${PAD_TOP}`,
        yHead: `yTop - ${HEAD_H}`,
        yRule: `yTop - ${HEAD_H} - ${HEAD_GAP}`,
        yHdr: `yRule - ${RULE_H} - ${RULE_GAP}`,
        yRows: `yHdr - ${HDR_H} - ${HDR_GAP}`,
        colLeft: `s.cx + s.blockRight - (s.priceCols - 1 - item.k)*(${PCW}+${PGAP}) - ${PCW}`,
        x0: `item.type === 'headline' ? s.cx + item.x0 : item.type === 'rule' ? s.cx - ${0.40 * OW}/2 : item.type === 'header' ? colLeft + (${PCW} - ${PCW}*0.58)/2 : item.type === 'word' ? s.cx + s.xL + s.TW*s.lenScale*item.pre + item.seg*${WGAP} : colLeft + ${PCW} - ${PCW}*item.frac`,
        x1: `item.type === 'headline' ? s.cx + item.x1 : item.type === 'rule' ? s.cx + ${0.40 * OW}/2 : item.type === 'header' ? colLeft + (${PCW} + ${PCW}*0.58)/2 : item.type === 'word' ? s.cx + s.xL + s.TW*s.lenScale*(item.pre + item.w) + item.seg*${WGAP} : colLeft + ${PCW}`,
        y0: `item.type === 'headline' ? yHead : item.type === 'rule' ? yRule - ${RULE_H} : item.type === 'header' ? yHdr - ${HDR_H} : yRows - item.row*${ROW_PITCH} - ${BAR_H}`,
        y1: `item.type === 'headline' ? yTop : item.type === 'rule' ? yRule : item.type === 'header' ? yHdr : yRows - item.row*${ROW_PITCH}`,
      },
    });
    const cond = h.value({
      args: { item },
      expr: `item.type === 'headline' || item.type === 'rule' ? s.d > 0
        : item.type === 'header' ? s.d > 0 && s.priceCols === 2
        : item.type === 'word' ? item.row < s.written && item.row < s.N && item.seg < item.count
        : item.row < s.written && item.row < s.N && item.k < s.priceCols && !item.skip`,
    });
    const zone = h.value({ args: { item }, expr: 'item.zone' });
    const cell = h.poly({
      pts: [[at(p, 'x0'), at(p, 'y0'), ZF + CHALK_Z], [at(p, 'x1'), at(p, 'y0'), ZF + CHALK_Z],
        [at(p, 'x1'), at(p, 'y1'), ZF + CHALK_Z], [at(p, 'x0'), at(p, 'y1'), ZF + CHALK_Z]],
      zone,
    });
    h.out('out', h.cond({ cond, then: cell, else: h.join([]) }));
  });

  const panelsGeom = g.map({
    list: g.range({ from: 0, to: panels }), graph: 'chalk-panel',
    hx: d('hx'), hy: d('hy'), yMid: d('yMid'), blockRight: d('blockRight'), priceCols: d('priceCols'),
    xL: d('xL'), TW: d('TW'), lenScale: d('lenScale'), d: d('d'),
    written: d('written'), N: d('N'),
  });

  // Ledge and the two chalk sticks (all still in board-local coordinates).
  const ledge = g.prism({
    profile: [[LD, 0], [LZ0, 0], [LZ0, LH], [LD - LCH, LH], [LD, LH - LCH]],
    axis: 'x',
    from: g.value({ args: { WF: d('WF') }, expr: `-WF/2 - ${LPR}` }),
    to: g.value({ args: { WF: d('WF') }, expr: `WF/2 + ${LPR}` }),
    cap: true,
    zone: 'frame',
  });
  const hexAt = (zc) => {
    const half = Math.PI / CK_SIDES;
    const yc = LH + CK_R * Math.cos(half) - 0.003;
    return Array.from({ length: CK_SIDES }, (_, i) => {
      const a = half - (i * 2 * Math.PI) / CK_SIDES;
      return [zc + Math.cos(a) * CK_R, yc + Math.sin(a) * CK_R];
    });
  };
  const stick = (z, x, zone) => g.prism({
    profile: hexAt(z),
    axis: 'x',
    from: g.value({ args: { WF: d('WF') }, expr: `-WF/2 + ${x}` }),
    to: g.value({ args: { WF: d('WF') }, expr: `-WF/2 + ${x} + ${CK_L}` }),
    cap: true,
    zone,
  });

  const boardGeom = g.join([frameGeom, backingGeom, mullions, panelsGeom, ledge,
    stick(0.112, 0.120, 'chalkAccent'), stick(0.104, 0.300, 'chalkStickB')]);
  const placed = g.transform({ geom: boardGeom, ty: MOUNT_Y });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'oak-slate',
    overrides: { frame, board, chalk, chalkAccent, chalkStickB },
  });
  return g.mesh(placed, {
    zones: {
      frame: at(pal, 'frame'), board: at(pal, 'board'), chalk: at(pal, 'chalk'),
      chalkAccent: at(pal, 'chalkAccent'), chalkStickB: at(pal, 'chalkStickB'),
    },
  });
}
