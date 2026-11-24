// Port: goat — creature template (node-only).
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { ...{biped:false,height:1.0,length:1.31,width:0.55,skin:'#d9d3c4'}, ...P });
}
