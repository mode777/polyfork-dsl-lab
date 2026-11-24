import * as orig from '../../scripts4/chalkboard-menu-board-a24d9d.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  {}, { panels: 2 }, { panels: 3 }, { rows: 5 }, { rows: 9 },
  { menuDensity: 0 }, { menuDensity: 1 },
  { panels: 2, rows: 5, menuDensity: 0.3 },
  { panels: 3, rows: 9, menuDensity: 1 },
  { colorway: 'black-steel' },
];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('chalkboard', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('chalkboard', r));
}
console.log(`${pass}/${cases.length} chalkboard variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
