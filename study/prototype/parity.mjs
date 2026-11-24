import * as origCookie from '../scripts/cookie-2016bb.mjs';
import * as origRug from '../scripts/area-rug-5c56e2.mjs';
import { build as portCookie } from './models/cookie.mjs';
import { build as portRug } from './models/area-rug.mjs';

const key = (o) => {
  const out = [];
  o.traverse((m) => {
    if (!m.isMesh) return;
    const a = m.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      out.push([a.array[i*3], a.array[i*3+1], a.array[i*3+2]].map((v) => v.toFixed(5)).join(','));
    }
  });
  return out.sort();
};
const cmp = (name, a, b) => {
  const A = key(a), B = key(b);
  let diff = 0;
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) diff++;
  console.log(`${name}: ${A.length} vs ${B.length} verts, ${diff} position mismatches`);
};
cmp('cookie default', origCookie.createAsset({}), portCookie({}));
cmp('cookie 14 chips', origCookie.createAsset({ chips: 14, thickness: 0.034 }), portCookie({ chips: 14, thickness: 0.034 }));
cmp('rug default', origRug.createAsset({}), portRug({}));
cmp('rug large lived', origRug.createAsset({ size: 'large', lived_in: 1 }), portRug({ size: 'large', lived_in: 1 }));
