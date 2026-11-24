// Port: fingers — fingerSet template (node-only).
import { fingerSet } from '../templates.mjs';
export default function build(g, P = {}) {
  return fingerSet(g, { ...{}, ...P });
}
