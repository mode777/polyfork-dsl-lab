// Copy the study runtime + generated examples into the public static tree.
// The public tree uses .js extensions; the study sources use .mjs, so rewrite
// the local imports here instead of remembering to sed them by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = (p) => path.join(repo, p);
const V = process.env.PUBLIC_ASSET_VERSION ?? '11';
const rewrite = (src) => src
  .replaceAll("from './runtime.mjs'", `from './runtime.js?v=${V}'`)
  .replaceAll("from './format.mjs'", `from './format.js?v=${V}'`)
  .replaceAll("from './dsl.mjs'", `from './dsl.js?v=${V}'`)
  .replaceAll("from './cache.mjs'", `from './cache.js?v=${V}'`)
  .replaceAll("from './expr.mjs'", `from './expr.js?v=${V}'`);

for (const [src, dst] of [
  ['runtime.mjs', 'runtime/runtime.js'],
  ['expr.mjs', 'runtime/expr.js'],
  ['dsl.mjs', 'runtime/dsl.js'],
  ['format.mjs', 'runtime/format.js'],
  ['cache.mjs', 'runtime/cache.js'],
]) {
  fs.mkdirSync(path.dirname(out(dst)), { recursive: true });
  fs.writeFileSync(out(dst), rewrite(fs.readFileSync(path.join(here, src), 'utf8')));
}
fs.mkdirSync(out('examples'), { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'examples'))) {
  if (f.endsWith('.pfn') || f === 'manifest.json') {
    fs.copyFileSync(path.join(here, 'examples', f), out(`examples/${f}`));
  }
}
console.log('synced runtime/*.js and examples/*.pfn');
