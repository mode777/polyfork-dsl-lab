// Stylized quadruped: lofted body, four legs, bone tree and soft skin weights.
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { biped: false, height: 0.95, length: 1.15, width: 0.55, skin: '#b89a74', cloth: '#6b5a44', ...P });
}
