import * as THREE from 'three';
const files = [
 ['valet','scripts2/valet-attendant-c351e6.mjs'],
 ['officer','scripts3/airport-security-officer-8fd38a.mjs'],
 ['angel','scripts3/cathedral-angel-base.mjs'],
 ['aurelian','scripts3/aurelian-base.mjs'],
 ['elf','scripts2/elf-assassin-base.mjs'],
 ['goat','scripts3/goat-base.mjs'],
 ['hare','scripts2/mountain-hare-base.mjs'],
 ['soprano','scripts2/opera-soprano-base.mjs'],
];
const hexOf=(v)=>{ if(typeof v==='number') return '#'+v.toString(16).padStart(6,'0'); return v; };
const key=(c)=>[c.r,c.g,c.b].map(x=>x.toFixed(4)).join(',');
for (const [name,file] of files) {
  try {
    const mod = await import('./'+file);
    const P = Object.fromEntries(Object.entries(mod.params??{}).map(([k,v])=>[k,v.default]));
    const cat = Object.keys(mod.params??{}).filter(k=>/hair|coat|gown|shirt|robe|dress|cloth|suit|skirt|tunic|fur|mane|uniform|jacket|trouser|apron|vest/i.test(k));
    const obj = mod.createAsset(P);
    const counts = new Map(); let total=0;
    obj.traverse(o=>{ if(!o.isMesh) return; const pa=o.geometry.attributes.position, ca=o.geometry.attributes.color; if(!ca) return;
      for(let i=0;i<pa.count;i+=3){ total++; const c=new THREE.Color(ca.getX(i),ca.getY(i),ca.getZ(i)); const k=key(c); counts.set(k,(counts.get(k)??0)+1); } });
    const out=[];
    for(const k of cat){ const v=P[k]; if(typeof v!=='string'&&typeof v!=='number') continue; const c=new THREE.Color(hexOf(v)); const n=counts.get(key(c))??0; if(n) out.push(`${k}:${n}(${(100*n/total).toFixed(0)}%)`); }
    console.log(`${name.padEnd(9)} tris ${String(total).padStart(5)}  ${out.join(' ')||'no colour match'}`);
  } catch(e){ console.log(name,'ERR',String(e.message).slice(0,80)); }
}
