// Port: boulder — boulder template (node-only).
import { boulder } from '../templates.mjs';
export default function build(g, P = {}) {
  return boulder(g, { ...{}, ...P });
}
