import fs from 'node:fs';
import { parseText } from './format.mjs';
import { evaluate } from './runtime.mjs';
import { stats } from './run.mjs';
const man = JSON.parse(fs.readFileSync('examples/manifest.json','utf8'));
for (const m of man) {
  try {
    const g = parseText(fs.readFileSync(`examples/${m.file}`,'utf8'));
    const { outputs } = evaluate(g, {});
    const s = stats(outputs.mesh);
    const escape = g.nodes.filter((n) => n.type === 'script').map((n) => n.type);
    if (escape.length) { console.log(`${m.id}: ESCAPE NODES ${escape.join(',')}`); process.exitCode = 1; }
    const layouts = g.layouts.size ? ` layouts ${g.layouts.size}` : '';
    console.log(`${m.id.padEnd(9)} tris ${String(s.tris).padStart(5)}  meshes ${s.meshes}${layouts}  inputs ${g.inputs.map(i=>i.name).join(',')}`);
  } catch(e) { console.log(m.id, 'ERR', String(e.message).slice(0,100)); }
}
