import * as orig from '../../scripts3/office-desk-021eb3.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  {}, { width: 1 }, { width: 1.6 },
  { under: 'plain' }, { under: 'pedestal' },
  { lived_in: 0 }, { lived_in: 1 },
  { width: 1, under: 'plain', lived_in: 0 },
  { width: 1.6, under: 'pedestal', lived_in: 1 },
  { colorway: 'walnut-charcoal' },
];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('desk', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('desk', r));
}
console.log(`${pass}/${cases.length} desk variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
