// Port: desk — desk template (node-only).
import { desk } from '../templates.mjs';
export default function build(g, P = {}) {
  return desk(g, { ...{}, ...P });
}
