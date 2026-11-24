import * as orig from '../../scripts2/cheese-wedge-a5c99b.mjs';
import { buildPort, stats } from './run.mjs';
import { initManifold } from './runtime.mjs';
await initManifold();
const a=stats(orig.createAsset({}));
const b=await buildPort('cheese2',{});
console.log('orig',a.tris,a.verts,JSON.stringify(a.bbox));
console.log('port',b.stats.tris,b.stats.verts,JSON.stringify(b.stats.bbox),'nodes',b.nodes);
