// Port: minka — building template (node-only).
import { building } from '../templates.mjs';
export default function build(g, P = {}) {
  return building(g, { ...{width:8,depth:6,height:4}, ...P });
}
