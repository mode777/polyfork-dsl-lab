import * as orig from '../../scripts/cookie-2016bb.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [{}, { thickness: 0.014, chips: 3 }, { thickness: 0.034, chips: 14 }];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('cookie2', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('cookie', r));
}
console.log(`${pass}/${cases.length} cookie variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
