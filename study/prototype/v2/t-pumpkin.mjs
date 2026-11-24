import * as orig from '../../scripts3/pumpkin-5f977e.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [{}, { squash: 0.7 }, { squash: 1.1 }, { ribs: 0 }, { ribs: 2 }, { squash: 0.8, ribs: 1.5 }];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('pumpkin', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('pumpkin', r));
}
console.log(`${pass}/${cases.length} pumpkin variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
