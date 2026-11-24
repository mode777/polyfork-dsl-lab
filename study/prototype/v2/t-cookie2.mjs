import { buildPort, stats } from './run.mjs';
import { evaluate } from './runtime.mjs';
const { graph } = await buildPort('cookie2', {});
for (const p of [{}, {thickness:0.014, chips:3}, {thickness:0.034, chips:14}]) {
  const s=stats(evaluate(graph,p).outputs.mesh);
  console.log(JSON.stringify(p), s.tris, s.verts, s.bbox);
}
