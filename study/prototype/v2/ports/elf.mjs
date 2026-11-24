// Escape-hatch port: elf-assassin-base — opaque module node until the rig/skin node family lands.
import * as mod from '../../../scripts2/elf-assassin-base.mjs';
import { graph } from '../dsl.mjs';
export default function build(g, P = {}) {
  g.input('params', 'any', {});
  return g.module(mod, P);
}
