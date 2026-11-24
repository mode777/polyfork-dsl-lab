// Escape-hatch port: opera-soprano-base — opaque module node until the rig/skin node family lands.
import * as mod from '../../../scripts2/opera-soprano-base.mjs';
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('params', 'any', {});
  return g.module(mod, P);
}
