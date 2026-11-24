// Prize car turntable — a live lathe/gem port. The platter and foot ring are
// revolved profiles; the bulbs are one reusable lofted spike rotated by
// arrayPolar, so the part stays a generic graph rather than a baked face list.
import { graph } from '../dsl.mjs';
import { at } from './_kit.mjs';

const PALETTE = {
  'vegas-gold': { gold: '#b3883a', deck: '#2a2a28', skirt: '#384451', lamp: '#f4f1ee' },
  'champagne-slate': { gold: '#d29f53', deck: '#384451', skirt: '#2a2a28', lamp: '#f4f1ee' },
  'crimson-vip': { gold: '#b3883a', deck: '#923629', skirt: '#2a2a28', lamp: '#f4f1ee' },
  'platinum-noir': { gold: '#e3e3e0', deck: '#2a2a28', skirt: '#57544f', lamp: '#f4f1ee' },
};

const CHORD = 0.785, DECK_DROP = 0.025, LIP = 0.025, RIM_W = 0.260, CHAM = 0.030;
const RIM_H = 0.105, CH_D = 0.052, FOOT_H = 0.035, FOOT_IN = 0.005, FOOT_CH = 0.010;
const SINK = 0.010, TWO_ROWS = 0.25, BR = 0.048, BP = 0.036, BS = 0.009, DROP = 0.005;

export default function build(g) {
  const colorway = g.input('colorway', 'enum', 'vegas-gold', { options: Object.keys(PALETTE), label: 'Colorway' });
  const gold = g.input('gold', 'color', '', { label: 'Gold rim' });
  const deck = g.input('deck', 'color', '', { label: 'Deck' });
  const skirt = g.input('skirt', 'color', '', { label: 'Skirt' });
  const lamp = g.input('lamp', 'color', '', { label: 'Bulbs' });
  const bulbs = g.input('bulbs', 'bool', true, { label: 'Bulb ring' });
  const diameter = g.input('diameter', 'float', 6.0, { min: 5.0, max: 6.4, step: 0.1, label: 'Diameter' });
  const height = g.input('height', 'float', 0.25, { min: 0.25, max: 0.45, step: 0.01, label: 'Height' });

  const d = g.let({
    in: { diameter, height },
    binds: {
      N: 'max(8, 2*round(PI*diameter/(2*0.785)))',
      phase: 'PI/N',
      cosH: 'cos(PI/N)',
      r0: 'diameter/2',
      yTop: 'height',
      yDeck: 'height - 0.025',
      yCham: 'height - 0.030',
      yRimBot: 'height - 0.105',
      rDeck: 'r0 - 0.260 - 0.025',
      rDeckR: '(r0 - 0.260 - 0.025)/cosH',
      rTopIn: 'r0 - 0.260',
      rTopOut: 'r0 - 0.030',
      rFoot: 'r0 - 0.005',
      rFootR: '(r0 - 0.005)/cosH',
      rFootTop: 'rFoot - 0.010',
      rWall: 'min(r0 - 0.052, (rFootTop - 0.003)*cosH)',
      rLedgeIn: '(rWall - 0.012)*cosH',
      wallBot: '0.035 - 0.010',
      pDeckLip: '[[rDeck,yDeck],[rTopIn,yTop]]',
      pLipCham: '[[rTopIn,yTop],[rTopOut,yTop]]',
      pChamFace: '[[rTopOut,yTop],[r0,yCham]]',
      pFaceWall: '[[r0,yCham],[r0,yRimBot]]',
      pRimWall: '[[r0,yRimBot],[rWall,yRimBot]]',
      pSkirt: '[[rWall,yRimBot],[rWall,wallBot]]',
      pFootLedge: '[[rLedgeIn,0.035],[rFootTop,0.035]]',
      pFootTop: '[[rFootTop,0.035],[rFoot,0.025]]',
      pFootWall: '[[rFoot,0.025],[rFoot,0]]',
      rs: 'rWall',
      rsCorner: 'rWall/cosH',
    },
  });
  const dim = (k) => at(d, k);

  const deckFan = g.fanRing({ r: dim('rDeckR'), y: dim('yDeck'), n: dim('N'), phase: dim('phase'), apex: [0, dim('yDeck'), 0], zone: 'deck' });
  const lip = g.revolve({ profile: dim('pDeckLip'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const cham = g.revolve({ profile: dim('pLipCham'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const faceCham = g.revolve({ profile: dim('pChamFace'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const faceWall = g.revolve({ profile: dim('pFaceWall'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const rimWall = g.revolve({ profile: dim('pRimWall'), seg: dim('N'), inRadius: true, zone: 'skirt', flip: true });
  const skirtWall = g.revolve({ profile: dim('pSkirt'), seg: dim('N'), inRadius: true, zone: 'skirt', flip: true });
  const footLedge = g.revolve({ profile: dim('pFootLedge'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const footTop = g.revolve({ profile: dim('pFootTop'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const footWall = g.revolve({ profile: dim('pFootWall'), seg: dim('N'), inRadius: true, zone: 'gold', flip: true });
  const footFan = g.fanRing({ r: dim('rFootR'), y: 0, n: dim('N'), phase: dim('phase'), apex: [0, 0, 0], zone: 'skirt', flip: true });

  // One bulb is a two-ring socket collar plus a lamp cone. Build the rings from
  // expressions so the diameter/height sliders rebuild it, then arrayPolar
  // places the same proto at every facet.
  function bulbProto(rs, yc) {
    const b = g.let({
      in: { rs, yc },
      binds: {
        r0: `[[0.048*cos(0*PI/3), yc+0.048*sin(0*PI/3), rs-0.009], [0.048*cos(1*PI/3), yc+0.048*sin(1*PI/3), rs-0.009], [0.048*cos(2*PI/3), yc+0.048*sin(2*PI/3), rs-0.009], [0.048*cos(3*PI/3), yc+0.048*sin(3*PI/3), rs-0.009], [0.048*cos(4*PI/3), yc+0.048*sin(4*PI/3), rs-0.009], [0.048*cos(5*PI/3), yc+0.048*sin(5*PI/3), rs-0.009]]`,
        apex: '[0, yc, rs+0.036]',
      },
    });
    return g.loft({
      rings: [at(b, 'r0')],
      capTop: at(b, 'apex'),
      capTopFlip: true,
      zones: { capTop: 'lamp' },
    });
  }

  const rowY = g.let({
    in: { height },
    binds: {
      C: 'height - 0.105 - 0.035',
      single: '0.035 + C/2 - 0.005',
      low: '0.035 + C/3',
      high: '0.035 + 2*C/3',
      two: 'C >= 0.25 - 1e-9',
    },
  });
  const ry = (k) => at(rowY, k);

  const bulbCenter = bulbProto(dim('rs'), ry('single'));
  const bulbCorner = bulbProto(dim('rsCorner'), ry('single'));
  const bulbsSingle = g.join([
    g.arrayPolar({ geom: bulbCenter, count: dim('N'), start: 0 }),
    g.arrayPolar({ geom: bulbCorner, count: dim('N'), start: dim('phase') }),
  ]);
  const bulbLow = bulbProto(dim('rs'), ry('low'));
  const bulbHigh = bulbProto(dim('rsCorner'), ry('high'));
  const bulbsDouble = g.join([
    g.arrayPolar({ geom: bulbLow, count: dim('N'), start: 0 }),
    g.arrayPolar({ geom: bulbHigh, count: dim('N'), start: dim('phase') }),
  ]);
  const bulbSet = g.cond({ cond: ry('two'), then: bulbsDouble, else: bulbsSingle });
  const bulbPart = g.cond({ cond: bulbs, then: bulbSet, else: g.join([]) });

  const pal = g.preset({
    choice: colorway, presets: PALETTE, fallback: 'vegas-gold',
    overrides: { gold, deck, skirt, lamp },
  });
  return g.mesh(g.join([deckFan, lip, cham, faceCham, faceWall, rimWall, skirtWall, footLedge, footTop, footWall, footFan, bulbPart]), {
    zones: { gold: at(pal, 'gold'), deck: at(pal, 'deck'), skirt: at(pal, 'skirt'), lamp: at(pal, 'lamp') },
  });
}
