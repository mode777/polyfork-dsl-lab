// Port: elfpresents — creature template (node-only).
import { creature } from '../templates.mjs';
export default function build(g, P = {}) {
  return creature(g, { ...{biped:true,height:1.24,length:0.6,width:0.5,cloth:'#7a2e2e'}, ...P });
}
