import fs from 'node:fs';
const MODELS=JSON.parse(fs.readFileSync('data/sample.json','utf8'));
const rows=[];
for (const id of MODELS){
  const mod=await import('./scripts/'+id+'.mjs'); const P=mod.params||{};
  for (const [k,s] of Object.entries(P)){
    if(s.type!=='range')continue;
    const mk=(v)=>{const o=mod.createAsset({[k]:v});let t=0,vv=0;
      o.traverse(x=>{if(!x.isMesh)return;const a=x.geometry.attributes.position;t+=a.count/3;vv+=a.count;});return {t,v:vv};};
    try{const A=mk(s.min??s.default),B=mk(s.max??s.default);
      rows.push({id,k,min:s.min,max:s.max,tA:A.t,tB:B.t,vertsA:A.v,vertsB:B.v,struct:A.t!==B.t||A.v!==B.v});}catch(e){rows.push({id,k,err:1});}
  }
}
fs.writeFileSync('data/range.json',JSON.stringify(rows,null,1));
const r=rows.filter(x=>!x.err);
console.log('tested',r.length,'struct',r.filter(x=>x.struct).length);
for(const x of r.filter(x=>x.struct)) console.log(x.id.slice(0,28).padEnd(30), x.k.padEnd(16), 'tris', x.tA, '->', x.tB, 'verts', x.vertsA, '->', x.vertsB);
