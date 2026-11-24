// Port: coral — coral template (node-only).
import { coral } from '../templates.mjs';
export default function build(g, P = {}) {
  return coral(g, { ...{}, ...P });
}
