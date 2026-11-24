import * as orig from '../../scripts2/tire-ccf0eb.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [{}, { facets: 12 }, { facets: 16 }, { width: 0.7 }, { width: 1.35 }, { rimSize: 0.85 }, { rimSize: 1.2 }, { facets: 16, width: 1.3, rimSize: 1.15 }];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('tire', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('tire', r));
}
console.log(`${pass}/${cases.length} tire variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
