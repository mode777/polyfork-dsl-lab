// Port: skiff — boat template (node-only).
import { boat } from '../templates.mjs';
export default function build(g, P = {}) {
  return boat(g, { ...{length:3.8,width:1.53,height:0.88,hull:'#8a6a48'}, ...P });
}
