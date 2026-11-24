import * as orig from '../../scripts/area-rug-5c56e2.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  {}, { size: 'large' }, { pile: 0 }, { pile: 1 },
  { lived_in: 0 }, { lived_in: 1 }, { pattern: 'plain' }, { pattern: 'bordered' },
  { size: 'large', pile: 0.8, lived_in: 0.8 },
];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('rug', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('rug', r));
}
console.log(`${pass}/${cases.length} rug variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
