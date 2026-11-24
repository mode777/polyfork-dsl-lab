// Escape-hatch port: stag-beetle-base — opaque module node until the rig/skin node family lands.
import * as mod from '../../../scripts2/stag-beetle-base.mjs';
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('params', 'any', {});
  return g.module(mod, P);
}
