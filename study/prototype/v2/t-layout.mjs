import { graph } from './dsl.mjs';
import { evaluate } from './runtime.mjs';
import { parseText, toText, toJSON, fromJSON } from './format.mjs';

const g = graph('layout-test');
const n = g.input('n', 'int', 3, { min: 1, max: 8, label: 'Count' });
g.defineLayout('test-data', {
  inputs: [{ name: 'n', type: 'int', default: 3 }],
  src: `
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const count = clamp(n, 1, 8);
fn twice(x) { return x * 2; }
const values = rng(42).take(count).map((v) => twice(v));
const label = count > 2 ? 'many' : 'few';
`,
  outs: [
    { name: 'values', expr: 'values' },
    { name: 'label', expr: 'label' },
    { name: 'count', expr: 'count' },
  ],
});
const data = g.layoutNode('test-data', { n });
g.out('values', { __ref: `${data.__ref}.values` });
g.out('label', { __ref: `${data.__ref}.label` });
g.out('count', { __ref: `${data.__ref}.count` });

const r = evaluate(g.ir, { n: 4 });
if (r.outputs.count !== 4 || r.outputs.label !== 'many' || r.outputs.values.length !== 4) {
  throw new Error(`layout values wrong: ${JSON.stringify(r.outputs)}`);
}
if (Math.abs(r.outputs.values[0] - 0.0006574150177917513) > 1e-12) {
  throw new Error(`rng sequence changed: ${r.outputs.values[0]}`);
}

const text = toText(g.ir);
const g2 = parseText(text);
const r2 = evaluate(g2, { n: 4 });
if (JSON.stringify(r.outputs) !== JSON.stringify(r2.outputs)) throw new Error('layout text round-trip changed values');
const r3 = evaluate(fromJSON(toJSON(g.ir)), { n: 4 });
if (JSON.stringify(r.outputs) !== JSON.stringify(r3.outputs)) throw new Error('layout JSON round-trip changed values');
console.log('layout ok', JSON.stringify(r.outputs), 'text+json round-trip ok');
