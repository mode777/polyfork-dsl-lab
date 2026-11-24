// Port: roof — roofTile template (node-only).
import { roofTile } from '../templates.mjs';
export default function build(g, P = {}) {
  return roofTile(g, { ...{}, ...P });
}
