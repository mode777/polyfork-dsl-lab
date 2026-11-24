// Port: rowboat — boat template (node-only).
import { boat } from '../templates.mjs';
export default function build(g, P = {}) {
  return boat(g, { ...{length:3.4,width:1.2,height:0.82,hull:'#7a5a38'}, ...P });
}
