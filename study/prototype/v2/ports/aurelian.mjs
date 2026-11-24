// Port: aurelian — creature template (node-only).
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { ...{biped:true,height:1.99,length:0.8,width:0.6,cloth:'#c2a15a',skin:'#d9b08a'}, ...P });
}
