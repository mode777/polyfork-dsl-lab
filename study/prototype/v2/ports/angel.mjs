// Port: angel — creature template (node-only).
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { ...{biped:true,height:2.03,length:0.8,width:0.65,cloth:'#e8e0d0',skin:'#e0c0a0'}, ...P });
}
