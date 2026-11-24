// Port: grass — grass template (node-only).
import { grass } from '../templates.mjs';
export default function build(g, P = {}) {
  return grass(g, { ...{}, ...P });
}
