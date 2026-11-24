import fs from 'node:fs';
const MODELS=JSON.parse(fs.readFileSync('data/sample.json','utf8'));
const rows=[];
for(const id of MODELS){
  const mod=await import('./scripts/'+id+'.mjs'); const P=mod.params||{};
  for(const [k,s] of Object.entries(P)){
    if(s.type!=='choice'||!s.options)continue;
    const sigs=new Set();
    for(const o of s.options){
      try{const g=mod.createAsset({[k]:o});let t=0,v=0;
        g.traverse(x=>{if(!x.isMesh)return;const a=x.geometry.attributes.position;t+=a.count/3;v+=a.count;});
        sigs.add(t+'/'+v);}catch(e){sigs.add('err');}
    }
    rows.push({id,k,options:s.options.length,sigs:sigs.size});
  }
}
fs.writeFileSync('data/choice.json',JSON.stringify(rows,null,1));
const n=rows.length, multi=rows.filter(r=>r.sigs>1).length, single=rows.filter(r=>r.sigs===1).length;
console.log('choice params',n,'with >1 topology',multi,'same topology for all options',single);
console.log('options total',rows.reduce((a,b)=>a+b.options,0),'distinct topologies',rows.reduce((a,b)=>a+b.sigs,0));
console.log(rows.filter(r=>r.sigs===1).slice(0,12));
