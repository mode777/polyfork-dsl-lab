import * as orig from '../../scripts4/overhead-wayfinding-sign-64d4e8.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  {}, { width: 2 }, { width: 6 }, { drop: 0.4 }, { drop: 1.2 },
  { endLights: false }, { arrow: 'none' }, { arrow: 'left' }, { arrow: 'up' },
  { letters: 'E' }, { icons: 'none' }, { icons: 'departures' },
  { icons: 'arrivals-bag-pickup' },
  { width: 6, drop: 1.2, endLights: false, arrow: 'up', letters: 'C', icons: 'arrivals-bag-pickup' },
  { colorway: 'navy' },
];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('wayfinding', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('wayfinding', r));
}
console.log(`${pass}/${cases.length} wayfinding variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
