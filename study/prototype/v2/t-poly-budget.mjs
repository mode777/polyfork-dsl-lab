// Guard against serializing a reference face loop as hundreds of `poly`
// nodes. A handful of genuinely irregular faces is fine; a face-dump-sized
// count means a structural primitive was missed.
import fs from 'node:fs';
import { parseText } from './format.mjs';

const BUDGET = 80;
let fail = 0;
for (const f of fs.readdirSync('examples').filter((x) => x.endsWith('.pfn')).sort()) {
  const graph = parseText(fs.readFileSync(`examples/${f}`, 'utf8'));
  const counts = {};
  for (const n of graph.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
  const poly = counts.poly ?? 0;
  const bad = poly > BUDGET;
  if (bad) fail++;
  console.log(`${f.replace(/\.pfn$/, '').padEnd(12)} poly ${String(poly).padStart(3)} / ${BUDGET}${bad ? ' FAIL' : ''}`);
}
if (fail) throw new Error(`${fail} example(s) exceed the poly budget`);
console.log(`\n${BUDGET} poly-node budget: all examples pass`);
