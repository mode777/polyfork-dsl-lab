import { graph } from './dsl.mjs';
import { evaluate } from './runtime.mjs';
import { stats } from './run.mjs';
import { toJSON } from './format.mjs';
import { toCache, fromCache, cacheSize } from './cache.mjs';
const g=graph('baked');
const parts=[];
for(let n=0;n<4;n++){
  const rings=[];
  for(let k=0;k<4;k++){
    const ring=[];
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=0.2+0.02*k;ring.push([Math.cos(a)*r,0.1*k,Math.sin(a)*r]);}
    rings.push(ring);
  }
  parts.push(g.loft({rings,capTop:[0,0.4,0],capBottom:[0,0,0],zones:{band:'a'}}));
}
g.out('m',g.mesh(g.join(parts),{}));
const a=stats(evaluate(g.ir,{}).outputs.m);
const j=toJSON(g.ir), c=toCache(g.ir);
const j2=fromCache(JSON.parse(JSON.stringify(c)));
const b=stats(evaluate(j2,{}).outputs.m);
console.log('tris',a.tris,b.tris,'| json',cacheSize(j),'cache',cacheSize(c),'ratio',(cacheSize(c)/cacheSize(j)).toFixed(2),'| pool',c.pool.length);
