import { compileExpr } from './expr.mjs';

const cases = [
  ['deg(PI)', 180],
  ['rad(180)', Math.PI],
  ['mix(2, 6, 0.25)', 3],
  ['vadd([1, 2, 3], [4, 5, 6])', [5, 7, 9]],
  ['vsub([1, 2, 3], [4, 5, 6])', [-3, -3, -3]],
  ['vmul([1, 2, 3], 2)', [2, 4, 6]],
  ['vdot([1, 2, 3], [4, 5, 6])', 32],
  ['vcross([1, 0, 0], [0, 1, 0])', [0, 0, 1]],
  ['vlen([3, 4, 0])', 5],
  ['let a = 2, b = a * 3 in vadd([a, b, 0], [1, 1, 1])', [3, 7, 1]],
];
let pass = 0;
for (const [src, want] of cases) {
  const got = compileExpr(src)({});
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++;
  console.log(ok ? 'PASS' : 'FAIL', src, '=>', JSON.stringify(got));
}
console.log(`${pass}/${cases.length} expression helpers`);
if (pass !== cases.length) process.exit(1);
