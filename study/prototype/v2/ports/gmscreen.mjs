// Port: gmscreen — screen template (node-only).
import { screen } from '../templates.mjs';
export default function build(g, P = {}) {
  return screen(g, { ...{}, ...P });
}
