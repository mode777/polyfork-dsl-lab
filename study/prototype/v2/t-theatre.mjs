import * as orig from '../../scripts4/theatre-vertical-sign-21c29b.mjs';
import { buildPort, compareGeometry, parityLine } from './run.mjs';
const cases = [
  {}, { wording: 'FILMS' }, { wording: 'THEATRE' },
  { crown: 'tiered' }, { crown: 'cornice' }, { lit: false },
  { colorway: 'brass-deco' },
  { wording: 'THEATRE', crown: 'cornice', lit: false, colorway: 'jade-fiesta' },
];
let pass = 0;
for (const params of cases) {
  const r = compareGeometry(orig.createAsset(params), (await buildPort('theatre', params)).mesh, { tol: 1e-4 });
  if (r.ok) pass++;
  console.log(JSON.stringify(params), parityLine('theatre', r));
}
console.log(`${pass}/${cases.length} theatre variants at 1e-4`);
if (pass !== cases.length) process.exit(1);
