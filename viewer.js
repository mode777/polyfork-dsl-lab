import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { parseText } from './runtime/format.js?v=9';
import { evaluate } from './runtime/runtime.js?v=9';

const $ = (s) => document.querySelector(s);
const listEl = $('#list');
const codeEl = $('#code');
const editorEl = $('#editor');
const codeWrap = $('#codeWrap');
const statsEl = $('#stats');
const controlsEl = $('#controls');
const errorEl = $('#error');
const badgeEl = $('#badge');
const fileEl = $('#file');
const staticNote = $('#staticNote');
const runBtn = $('#run');
const editBtn = $('#edit');
const downloadEl = $('#download');

let manifest = [];
let current = null;
let graph = null;
let codeText = '';
let values = {};
let object = null;
let cookMs = 0;

// ---------------------------------------------------------------- three scene
const canvas = $('#view');
const viewport = $('#viewport');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;
scene.environmentIntensity = 0.3;
scene.background = new THREE.Color('#0f1319');
scene.fog = new THREE.Fog('#0f1319', 8, 22);

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
camera.position.set(2.4, 1.7, 3.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.6, 0);
controls.minDistance = 0.4;
controls.maxDistance = 20;

const hemi = new THREE.HemisphereLight('#cfe8ff', '#1a2028', 0.8);
scene.add(hemi);
const key = new THREE.DirectionalLight('#fff4e0', 1.55);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.1; key.shadow.camera.far = 30;
key.shadow.camera.left = -4; key.shadow.camera.right = 4;
key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
key.shadow.bias = -0.0008;
key.shadow.normalBias = 0.004;
scene.add(key);
const fill = new THREE.DirectionalLight('#9fc4ff', 0.32);
fill.position.set(-5, 3, -4);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(16, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: '#1a2028', roughness: 0.95, metalness: 0 }),
);
ground.position.y = -0.002;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(16, 32, '#2a3342', '#202733');
grid.position.y = -0.001;
scene.add(grid);

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

(function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
})();

// ---------------------------------------------------------------- helpers
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function highlight(src) {
  return src.split('\n').map((line, i) => {
    let h;
    if (line.trimStart().startsWith('#')) h = `<span class="cm">${esc(line)}</span>`;
    else {
      h = esc(line)
        .replace(/(@[\w-]+)/g, '<span class="ref">$1</span>')
        .replace(/(\$[\w-]+)/g, '<span class="inp">$1</span>')
        .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="num">$1</span>');
      h = h.replace(/^(\s*)(graph|in|n|out|group|end)\b/, (m, a, k) => `${a}<span class="kw">${k}</span>`);
    }
    return `<div class="line"><span class="ln">${i + 1}</span><span class="src">${h}</span></div>`;
  }).join('');
}
function downloadName(id) { return `${id}.pfn`; }
function fmt(n) { return n.toLocaleString('en-US'); }

function disposeObject(o) {
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry?.dispose?.();
    if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose?.());
    else m.material?.dispose?.();
  });
}

function addObject(o) {
  if (object) { scene.remove(object); disposeObject(object); }
  object = o;
  object.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  scene.add(object);
}

function bounds(o) {
  const box = new THREE.Box3();
  o.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry?.computeBoundingBox?.();
    const b = new THREE.Box3().setFromObject(m);
    if (!b.isEmpty()) box.union(b);
  });
  return box;
}

function frame(o, animate = false) {
  const box = bounds(o);
  if (box.isEmpty()) return;
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z, 0.08);
  const d = r * (current?.fit ?? 1.65);
  controls.target.copy(c);
  const [azD, elD] = current?.cam ?? [35, 22];
  const az = (azD * Math.PI) / 180, el = (elD * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
  const target = c.clone().addScaledVector(dir, d);
  if (animate) {
    const start = camera.position.clone();
    const t0 = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / 320);
      const e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(start, target, e);
      controls.update();
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  } else camera.position.copy(target);
  key.shadow.camera.left = -r * 2; key.shadow.camera.right = r * 2;
  key.shadow.camera.top = r * 2; key.shadow.camera.bottom = -r * 2;
  key.shadow.camera.updateProjectionMatrix();
  ground.position.y = box.min.y - 0.002;
  grid.position.y = box.min.y - 0.001;
}

function sig(o) {
  let h = 2166136261;
  o.traverse((m) => {
    if (!m.isMesh) return;
    const p = m.geometry?.attributes?.position;
    const c = m.geometry?.attributes?.color;
    if (p) for (let i = 0; i < p.array.length; i += 5) { h ^= Math.round(p.array[i] * 1e4); h = Math.imul(h, 16777619); }
    if (c) for (let i = 0; i < c.array.length; i += 7) { h ^= Math.round(c.array[i] * 255); h = Math.imul(h, 16777619); }
    if (m.isInstancedMesh) { h ^= m.count; h = Math.imul(h, 16777619); }
  });
  return h >>> 0;
}

function statsOf(o) {
  let tris = 0, verts = 0, meshes = 0;
  o.traverse((m) => {
    if (!m.isMesh) return;
    meshes++;
    const a = m.geometry.attributes.position;
    const mult = m.isInstancedMesh ? m.count : 1;
    tris += (a.count / 3) * mult;
    verts += a.count * mult;
  });
  return { tris, verts, meshes };
}

function showError(msg) {
  errorEl.hidden = false;
  errorEl.textContent = msg;
}
function clearError() { errorEl.hidden = true; errorEl.textContent = ''; }

// ---------------------------------------------------------------- controls
function perturb(inp) {
  const v = values[inp.name] ?? inp.default;
  if (inp.type === 'range' || inp.type === 'float' || inp.type === 'int' || inp.type === 'number') {
    const lo = inp.min ?? v - 1, hi = inp.max ?? v + 1;
    const t = Math.abs(v - lo) > Math.abs(hi - v) ? lo : hi;
    return t === v ? (v === hi ? lo : hi) : t;
  }
  if (inp.type === 'choice' || inp.type === 'enum') {
    const opts = inp.options ?? [];
    if (opts.length < 2) return undefined;
    return opts.find((o) => o !== v) ?? undefined;
  }
  if (inp.type === 'bool' || inp.type === 'toggle') return !v;
  if (inp.type === 'color') return v === '#ff0000' ? '#00ff00' : '#ff0000';
  if (inp.type === 'string') return (v || '') + 'X';
  return undefined;
}

function liveInputs() {
  const live = [];
  let base;
  try { base = sig(evaluate(graph, values).outputs.mesh); } catch { return live; }
  for (const inp of graph.inputs) {
    const t = perturb(inp);
    if (t === undefined) continue;
    try {
      const s = sig(evaluate(graph, { ...values, [inp.name]: t }).outputs.mesh);
      if (s !== base) live.push(inp);
    } catch { /* ignore probe failures */ }
  }
  return live;
}

function buildControls(inputs) {
  controlsEl.innerHTML = '';
  staticNote.hidden = inputs.length > 0;
  for (const inp of inputs) {
    const row = document.createElement('div');
    row.className = 'ctrl';
    const label = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = inp.label ?? inp.name;
    const val = document.createElement('b');
    val.textContent = String(values[inp.name] ?? inp.default ?? '');
    label.append(name, val);
    row.appendChild(label);

    let el;
    const t = inp.type;
    if (t === 'range' || t === 'float' || t === 'int' || t === 'number') {
      el = document.createElement('input');
      el.type = 'range';
      el.min = inp.min ?? 0;
      el.max = inp.max ?? 1;
      el.step = inp.step ?? (t === 'int' || t === 'number' ? 1 : 0.01);
      el.value = values[inp.name] ?? inp.default;
      el.addEventListener('input', () => {
        const n = Number(el.value);
        values[inp.name] = (t === 'int') ? Math.round(n) : n;
        val.textContent = String(values[inp.name]);
        scheduleRender();
      });
    } else if (t === 'choice' || t === 'enum') {
      el = document.createElement('select');
      for (const o of inp.options ?? []) {
        const op = document.createElement('option');
        op.value = String(o); op.textContent = String(o);
        el.appendChild(op);
      }
      el.value = values[inp.name] ?? inp.default;
      el.addEventListener('change', () => { values[inp.name] = el.value; val.textContent = el.value; scheduleRender(); });
    } else if (t === 'color') {
      el = document.createElement('input');
      el.type = 'color';
      el.value = String(values[inp.name] ?? inp.default ?? '#ffffff').slice(0, 7);
      el.addEventListener('input', () => { values[inp.name] = el.value; val.textContent = el.value; scheduleRender(); });
    } else if (t === 'bool' || t === 'toggle') {
      el = document.createElement('input');
      el.type = 'checkbox';
      el.checked = !!(values[inp.name] ?? inp.default);
      el.addEventListener('change', () => { values[inp.name] = el.checked; val.textContent = String(el.checked); scheduleRender(); });
    } else if (t === 'string') {
      el = document.createElement('input');
      el.type = 'text';
      el.value = values[inp.name] ?? inp.default ?? '';
      el.addEventListener('change', () => { values[inp.name] = el.value; val.textContent = el.value; scheduleRender(); });
    }
    if (el) row.appendChild(el);
    controlsEl.appendChild(row);
  }
}

let renderTimer = null;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => cook(false), 90);
}

function cook(reframe) {
  clearError();
  if (!graph) return;
  const t0 = performance.now();
  let out;
  try { out = evaluate(graph, values); }
  catch (e) { showError(String(e.stack ?? e.message).slice(0, 1200)); return; }
  cookMs = performance.now() - t0;
  const mesh = out.outputs.mesh ?? Object.values(out.outputs)[0];
  if (!mesh) { showError('graph produced no output'); return; }
  addObject(mesh);
  if (reframe) frame(mesh, false);
  const s = statsOf(mesh);
  statsEl.innerHTML = [
    `<span class="stat">tris <b>${fmt(s.tris)}</b></span>`,
    `<span class="stat">verts <b>${fmt(s.verts)}</b></span>`,
    `<span class="stat">meshes <b>${s.meshes}</b></span>`,
    `<span class="stat">nodes <b>${graph.nodes.length}</b></span>`,
    `<span class="stat">cook <b>${cookMs < 0.05 ? '<0.1' : cookMs.toFixed(1)} ms</b></span>`,
  ].join('');
}

// ---------------------------------------------------------------- examples
function setCode(src) {
  codeText = src;
  codeEl.innerHTML = highlight(src);
  editorEl.value = src;
}
function setEditing(on) {
  editorEl.hidden = !on;
  codeEl.hidden = on;
  runBtn.hidden = !on;
  editBtn.textContent = on ? 'cancel' : 'edit';
  if (on) { editorEl.value = codeText; editorEl.focus(); }
  else { editorEl.hidden = true; codeEl.hidden = false; runBtn.hidden = true; editBtn.textContent = 'edit'; }
}

async function loadExample(id, push = true) {
  const meta = manifest.find((m) => m.id === id) ?? manifest[0];
  if (!meta) return;
  current = meta;
  document.querySelectorAll('.item').forEach((b) => b.classList.toggle('active', b.dataset.id === meta.id));
  if (push) history.replaceState(null, '', `#${meta.id}`);
  const statusLabel = { port: 'geometric port', close: 'close', approx: 'approximation', study: 'original study' }[meta.status];
  badgeEl.textContent = `${meta.title}${statusLabel ? ' · ' + statusLabel : ''} — drag to orbit · scroll to zoom`;
  fileEl.textContent = `${meta.id}.pfn`;
  downloadEl.href = `examples/${meta.file}`;
  downloadEl.setAttribute('download', downloadName(meta.id));
  setEditing(false);
  try {
    const res = await fetch(`examples/${meta.file}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const src = await res.text();
    graph = parseText(src);
    setCode(src);
    values = Object.fromEntries(graph.inputs.map((i) => [i.name, i.default]));
    cook(true);
    const live = liveInputs();
    buildControls(live);
  } catch (e) {
    showError(`Could not load ${meta.file}\n\n${e.message}`);
  }
}

function itemHTML(m) {
  const statusLabel = { port: 'port', close: 'close', approx: 'approx', study: 'study' }[m.status];
  return `<button class="item" data-id="${m.id}"><strong>${m.title}${statusLabel ? ` <em class="tag ${m.status}">${statusLabel}</em>` : ''}</strong><span>${m.description}</span></button>`;
}

async function boot() {
  const res = await fetch('examples/manifest.json', { cache: 'no-cache' });
  manifest = await res.json();
  const groups = new Map();
  for (const m of manifest) {
    if (!groups.has(m.category)) groups.set(m.category, []);
    groups.get(m.category).push(m);
  }
  listEl.innerHTML = [...groups.entries()].map(([cat, items]) =>
    `<div class="group-label">${cat}</div>` + items.map(itemHTML).join('')
  ).join('');
  listEl.addEventListener('click', (e) => {
    const b = e.target.closest('.item');
    if (b) loadExample(b.dataset.id);
  });
  const start = location.hash.slice(1);
  await loadExample(manifest.some((m) => m.id === start) ? start : manifest[0].id, false);
}

// ---------------------------------------------------------------- actions
editBtn.addEventListener('click', () => setEditing(editorEl.hidden));
runBtn.addEventListener('click', () => {
  try {
    const g = parseText(editorEl.value);
    graph = g;
    values = Object.fromEntries(g.inputs.map((i) => [i.name, i.default]));
    setCode(editorEl.value);
    setEditing(false);
    cook(true);
    buildControls(liveInputs());
    clearError();
  } catch (e) {
    showError(`Parse error\n\n${e.message}`);
  }
});
editorEl.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runBtn.click(); }
  if (e.key === 'Escape') setEditing(false);
});
$('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(codeText); $('#copy').textContent = 'copied'; setTimeout(() => $('#copy').textContent = 'copy', 900); } catch {}
});

// splitter
const splitEl = $('#split');
const gutter = $('#gutter');
let drag = false;
gutter.addEventListener('pointerdown', (e) => { drag = true; gutter.setPointerCapture(e.pointerId); document.body.style.cursor = 'col-resize'; });
gutter.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = splitEl.getBoundingClientRect();
  const pct = Math.min(72, Math.max(26, ((e.clientX - r.left) / r.width) * 100));
  splitEl.style.setProperty('--split', `${pct}%`);
  resize();
});
gutter.addEventListener('pointerup', () => { drag = false; document.body.style.cursor = ''; });
gutter.addEventListener('dblclick', () => { splitEl.style.setProperty('--split', '47%'); resize(); });

boot();
