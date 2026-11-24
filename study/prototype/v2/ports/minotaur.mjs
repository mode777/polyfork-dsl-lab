// Port: minotaur — miniature template (node-only).
import { miniature } from '../templates.mjs';
export default function build(g, P = {}) {
  return miniature(g, { ...{}, ...P });
}
