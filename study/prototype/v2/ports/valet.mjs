// Escape-hatch port: valet-attendant-c351e6 — opaque module node until the rig/skin node family lands.
import * as mod from '../../../scripts2/valet-attendant-c351e6.mjs';
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('params', 'any', {});
  return g.module(mod, P);
}
