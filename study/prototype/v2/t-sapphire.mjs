import * as orig from '/home/agent/workspace/polyfork-dsl/study/scripts2/rough-sapphire-fb25c7.mjs';
import { buildPort, compareGeometry, parityLine } from '/home/agent/workspace/polyfork-dsl/study/prototype/v2/run.mjs';
const cases = [
  {},
  { length: 0.5 }, { length: 1.8 },
  { barrel: 0.5 }, { barrel: 1 },
  { chamfer: 0 }, { chamfer: 1 },
  { irregularity: 0.5 }, { irregularity: 1 },
  { ends: 'truncated' }, { ends: 'broken' },
  { ends: 'truncated', length: 1.6, barrel: 0.4, chamfer: 0.7, irregularity: 0.6 },
  { ends: 'broken', length: 0.6, barrel: 0.7, chamfer: 0.2, irregularity: 0.8 },
];
let pass = 0;
for (const params of cases) {
  try {
    const r = compareGeometry(orig.createAsset(params), (await buildPort('sapphire', params)).mesh, { tol: 1e-4 });
    if (r.ok) pass++;
    console.log(JSON.stringify(params), parityLine('sapphire', r));
  } catch (e) { console.log(JSON.stringify(params), 'ERROR', e.message); }
}
console.log(`${pass}/${cases.length} sapphire variants at 1e-4`);
