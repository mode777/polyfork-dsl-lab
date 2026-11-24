// Port: shield — shield template (node-only).
import { shield } from '../templates.mjs';
export default function build(g, P = {}) {
  return shield(g, { ...{}, ...P });
}
