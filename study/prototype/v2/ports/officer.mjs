// Port: officer — creature template (node-only).
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { ...{biped:true,height:1.71,length:0.7,width:0.5,cloth:'#2a3446',skin:'#c29a78'}, ...P });
}
