// Escape-hatch port: snail-base — opaque module node until the rig/skin node family lands.
import * as mod from '../../../scripts2/snail-base.mjs';
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('params', 'any', {});
  return g.module(mod, P);
}
