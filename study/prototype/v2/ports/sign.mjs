// Stylized taxiway sign: lit yellow face, black border and arrow, segment letters.
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  const word = g.input('word', 'string', 'EXIT');
  const housing = g.box({ w: 1.76, h: 0.62, d: 0.15, y: 1.16, zone: 'housing' });
  const face = g.box({ w: 1.58, h: 0.44, d: 0.02, y: 1.16, z: 0.085, zone: 'face' });
  const ink = [];
  for (const [w, h, x, y] of [[1.58, 0.035, 0, 1.385], [1.58, 0.035, 0, 0.935], [0.035, 0.44, -0.772, 1.16], [0.035, 0.44, 0.772, 1.16]]) {
    ink.push(g.box({ w, h, d: 0.022, x, y, z: 0.098, zone: 'ink' }));
  }
  const letters = g.text({ text: word, size: 0.22, tracking: 0.1, stroke: 0.032, depth: 0.024, x: -0.34, y: 1.075, z: 0.098, align: 'center', zone: 'ink' });
  const shaft = g.box({ w: 0.3, h: 0.075, d: 0.022, x: 0.3, y: 1.16, z: 0.098, zone: 'ink' });
  const head = g.extrude({ profile: [[0, 0], [0.17, 0.085], [0, 0.17]], depth: 0.022, z0: 0.098, cap: true });
  const arrow = g.transform({ geom: head, tx: 0.42, ty: 1.075, tz: 0, s: 1 });
  const posts = [], feet = [];
  for (const sx of [-1, 1]) {
    posts.push(g.box({ w: 0.075, h: 0.92, d: 0.075, x: sx * 0.56, y: 0.02, z: 0, zone: 'post' }));
    feet.push(g.box({ w: 0.22, h: 0.05, d: 0.22, x: sx * 0.56, y: -0.44, z: 0, zone: 'post' }));
  }
  return g.mesh(g.join([housing, face, ...ink, letters, shaft, arrow, ...posts, ...feet]), {
    zones: { housing: '#6f7a72', face: P.face ?? '#d8c84a', ink: '#1c2026', post: '#5b636b' },
  });
}
