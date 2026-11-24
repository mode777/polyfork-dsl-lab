import * as m from './runtime.mjs';
import { graph } from './dsl.mjs';
import { stats } from './run.mjs';
try {
  await m.initManifold();
  const g=graph('b');
  const a=g.box({w:1,h:1,d:1});
  const b=g.sphere({r:0.62,seg:16,rings:10});
  const c=g.boolean({a,b,op:'subtract'});
  g.out('mesh',g.mesh(c,{}));
  const s=stats(m.evaluate(g.ir,{}).outputs.mesh);
  console.log('OK',s.tris,s.verts,s.bbox);
} catch(e) { console.log('ERR',e.message.slice(0,300)); console.log(e.stack.split('\n').slice(0,4).join('\n')); }
