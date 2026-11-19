import { buildTree, visibleNodes, shortestAllocationPath, pruneAllocations } from './tree-model.js';
import { TreeRenderer } from './renderer.js';
import { buildExtraTree } from './extra-model.js';

const $ = id => document.getElementById(id);
const DATA_FILES = { passive: './data/tree.json', atlas: './data/atlas.json', genesis: './data/genesis.json' };
const VALID_MODES = ['passive', 'ascendancy', 'atlas', 'genesis'];
const KEY = 'exile-tree-plans-v1';
let tree = null, renderer = null, extraTrees = {};
const state = { mode: 'passive', className: 'Druid', ascendancy: 'Oracle', showOracle: true, selectedId: null, search: '', allocations: {}, ascAllocations: {}, extraAllocations: {} };
let currentNodes = [], currentIds = new Set();
let toastTimeout;

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('visible'), 2900);
}
function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (saved && typeof saved === 'object') {
      state.allocations = validAllocationRecord(saved.allocations);
      state.ascAllocations = validAllocationRecord(saved.ascAllocations);
      state.extraAllocations = validAllocationRecord(saved.extraAllocations);
      if (saved.className && typeof saved.className === 'string') state.className = saved.className;
      if (saved.ascendancy && typeof saved.ascendancy === 'string') state.ascendancy = saved.ascendancy;
      if (VALID_MODES.includes(saved.mode)) state.mode = saved.mode;
      if (typeof saved.showOracle === 'boolean') state.showOracle = saved.showOracle;
    }
  } catch { /* Storage may be disabled in private mode or embedded browsers. */ }
  const params = new URLSearchParams(location.search);
  if (params.has('class')) state.className = params.get('class');
  if (params.has('asc')) state.ascendancy = params.get('asc');
  if (VALID_MODES.includes(params.get('view'))) state.mode = params.get('view');
  // Share links are intentionally opt-in and independent of personal local plans.
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (hash.has('p') || hash.has('a') || hash.has('x')) {
    state.allocations = {}; state.ascAllocations = {}; state.extraAllocations = {};
    state.allocations[state.className] = hash.get('p')?.split('.').map(Number).filter(Number.isSafeInteger) ?? [];
    state.ascAllocations[state.ascendancy] = hash.get('a')?.split('.').map(Number).filter(Number.isSafeInteger) ?? [];
    if (state.mode === 'atlas' || state.mode === 'genesis') state.extraAllocations[state.mode] = hash.get('x')?.split('.').map(Number).filter(Number.isSafeInteger) ?? [];
  }
}
function validAllocationRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, ids] of Object.entries(input)) if (Array.isArray(ids)) out[key] = ids.filter(Number.isSafeInteger).slice(0, 1500);
  return out;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ className: state.className, ascendancy: state.ascendancy, mode: state.mode, showOracle: state.showOracle, allocations: state.allocations, ascAllocations: state.ascAllocations, extraAllocations: state.extraAllocations })); } catch { /* no-op */ }
}
function isExtraMode() { return state.mode === 'atlas' || state.mode === 'genesis'; }
function activeTree() { return isExtraMode() ? extraTrees[state.mode] : tree; }
function rootId() {
  if (isExtraMode()) return extraTrees[state.mode].roots;
  return state.mode === 'passive' ? tree.classStarts.get(state.className) : tree.ascStarts.get(state.ascendancy);
}
function rootIds() { const root = rootId(); return Array.isArray(root) ? root : [root]; }
function allocatedSet() {
  const record = state.mode === 'passive' ? state.allocations : state.mode === 'ascendancy' ? state.ascAllocations : state.extraAllocations;
  const key = state.mode === 'passive' ? state.className : state.mode === 'ascendancy' ? state.ascendancy : state.mode;
  return new Set(record[key] || []);
}
function updatePoints() {
  const extra = isExtraMode();
  $('normal-points').textContent = extra ? allocatedSet().size : (state.allocations[state.className] || []).length;
  $('ascendancy-points').textContent = extra ? '-' : (state.ascAllocations[state.ascendancy] || []).length;
  $('normal-points-label').textContent = extra ? (state.mode === 'atlas' ? '아틀라스' : '제네시스') : '일반';
  $('ascendancy-points-label').textContent = extra ? '별도 트리' : '전직';
}
function saveAllocated(set) {
  const record = state.mode === 'passive' ? state.allocations : state.mode === 'ascendancy' ? state.ascAllocations : state.extraAllocations;
  const key = state.mode === 'passive' ? state.className : state.mode === 'ascendancy' ? state.ascendancy : state.mode;
  record[key] = [...set];
  persist(); updatePoints();
}
function oracleUnlocked() { return (state.ascAllocations.Oracle || []).includes(5571); }
function nodeAllowed(n) {
  return !!n && (!n.hiddenOracle || (state.ascendancy === 'Oracle' && oracleUnlocked())) && !n.isOnlyImage && !n.isAscendancyStart && !n.classesStart && !rootIds().includes(n.id);
}
function populateClasses() {
  $('class-select').replaceChildren();
  for (const name of tree.classes) { const o = document.createElement('option'); o.value = name; o.textContent = name; $('class-select').append(o); }
  if (!tree.classes.includes(state.className)) state.className = tree.classes[0];
  $('class-select').value = state.className;
  populateAscendancies();
}
function populateAscendancies() {
  const list = tree.ascendancies.filter(a => a.className === state.className);
  const prev = state.ascendancy;
  if (!list.some(a => a.name === prev)) state.ascendancy = list[0]?.name || '';
  const select = $('ascendancy-select'); select.replaceChildren();
  for (const asc of list) { const o = document.createElement('option'); o.value = asc.name; o.textContent = asc.name; select.append(o); }
  select.value = state.ascendancy;
  $('oracle-settings').hidden = state.ascendancy !== 'Oracle' || state.mode !== 'passive';
  $('oracle-legend').hidden = $('oracle-settings').hidden || !state.showOracle;
  $('oracle-toggle').checked = state.showOracle;
  $('class-description').textContent = `${state.className} · ${list.length}개 전직 선택 가능`;
}
function updateHeader() {
  for (const mode of VALID_MODES) {
    const tab = $('tab-' + mode); tab.classList.toggle('active', state.mode === mode);
    tab.setAttribute('aria-pressed', String(state.mode === mode));
  }
  const text = {
    passive: ['FULL PASSIVE SKILL TREE', `${state.className} · 패시브 트리`, '게임 데이터의 노드 좌표와 연결 관계를 표시합니다.'],
    ascendancy: ['ASCENDANCY SPECIALIZATION', `${state.ascendancy} · 전직 트리`, '공개 데이터에 포함된 실제 전직 노드 및 연결 경로'],
    atlas: ['ATLAS SKILL TREE', '아틀라스 패시브 트리', '독립된 아틀라스 루트와 리그별 분기'],
    genesis: ['GENESIS SPECIAL TREE', '제네시스 패시브 트리', '별도 제네시스/브레켈 트리 데이터']
  }[state.mode];
  $('stage-eyebrow').textContent = text[0]; $('stage-title').textContent = text[1]; $('stage-subtitle').textContent = text[2];
  $('class-controls').hidden = isExtraMode();
  updatePoints();
}
function scene() {
  const model = activeTree();
  currentNodes = isExtraMode() ? [...model.nodes.values()] : visibleNodes(tree, state.mode, state.ascendancy, state.showOracle);
  currentIds = new Set(currentNodes.map(n => n.id));
  if (state.selectedId && !currentIds.has(state.selectedId)) state.selectedId = null;
  populateAscendancies(); updateHeader();
  const count = currentNodes.length, connections = model.edges.filter(e => currentIds.has(e.a) && currentIds.has(e.b)).length;
  $('scene-count').textContent = `${count.toLocaleString()}개 노드`;
  $('connection-count').textContent = `${connections.toLocaleString()}개 연결`;
  $('status-badge').textContent = state.mode === 'passive' && state.ascendancy === 'Oracle' && state.showOracle
    ? `오라클 숨겨진 노드 표시 · ${oracleUnlocked() ? '배분 가능' : '보이지 않는 길 전직 미배분'}`
    : '노드를 선택하면 효과 및 배분 경로를 확인할 수 있습니다';
  if (state.selectedId) showDetail(model.nodes.get(state.selectedId)); else showDetail(null);
  renderer.setScene(currentNodes, model.edges, { allocated: allocatedSet(), rootId: rootId(), selectedId: state.selectedId, lockedOracle: !oracleUnlocked(), orbitRadii: model.orbitRadii ?? [] });
  refreshSearch(false); persist();
}
function showDetail(n) {
  $('details-placeholder').hidden = !!n;
  $('details-content').hidden = !n;
  if (!n) return;
  const types = { normal: '일반 패시브', notable: '주요 패시브', keystone: '핵심 패시브', socket: '주얼 슬롯', start: '시작 노드' };
  $('detail-type').textContent = isExtraMode() ? (n.subtree || (state.mode === 'atlas' ? '아틀라스' : '제네시스')) : n.hiddenOracle ? '오라클 · 숨겨진 길' : n.ascendancyName ? `${n.ascendancyName} · 전직` : (types[n.category] || '패시브');
  $('detail-name').textContent = n.name || '(이름 없음)';
  $('detail-stats').replaceChildren();
  if (!n.stats.length) { const p = document.createElement('p'); p.className = 'stat-line'; p.textContent = '별도의 능력치 효과 없음'; $('detail-stats').append(p); }
  for (const line of n.stats) { const p = document.createElement('p'); p.className = 'stat-line'; p.textContent = line; $('detail-stats').append(p); }
  $('detail-id').textContent = String(n.id);
  const notice = $('detail-notice'); notice.hidden = true;
  const button = $('allocate-button');
  const allocated = allocatedSet();
  if (rootIds().includes(n.id) || n.isAscendancyStart || n.classesStart || n.isOnlyImage) {
    button.disabled = true; button.textContent = '배분 불가 · 시작 / 표시 전용';
  } else if (n.hiddenOracle && !oracleUnlocked()) {
    button.disabled = true; button.textContent = '보이지 않는 길 전직 먼저 배분';
    notice.hidden = false; notice.textContent = '오라클 전직 트리에서 The Unseen Path를 먼저 배분해야 선택할 수 있습니다.';
  } else {
    button.disabled = false; button.textContent = allocated.has(n.id) ? '패시브 회수' : '연결 경로를 따라 배분';
  }
  $('allocation-message').textContent = n.isMultipleChoice ? '다중 선택형 노드는 실제 게임의 선택 규칙을 별도로 확인하세요.' : '이 사이트의 계획은 게임 캐릭터에 적용되지 않습니다.';
}
function onNodeSelected(n) {
  if (!n) return;
  state.selectedId = n.id;
  renderer.update({ selectedId: n.id });
  showDetail(n);
  if (window.matchMedia('(max-width:850px)').matches) openOverlay('details');
}
function selectSearchNode(id) {
  const n = activeTree().nodes.get(id); if (!n) return;
  state.selectedId = n.id;
  renderer.focus(n.x, n.y, Math.max(renderer.zoom, .34));
  renderer.update({ selectedId: id });
  showDetail(n); closeOverlay();
  if (window.matchMedia('(max-width:850px)').matches) openOverlay('details');
}
function refreshSearch(show = true) {
  const q = state.search.trim().toLocaleLowerCase();
  const results = $('search-results'); results.replaceChildren();
  const matches = new Set();
  if (q) for (const n of currentNodes) {
    if (n.name.toLocaleLowerCase().includes(q) || n.stats.some(s => s.toLocaleLowerCase().includes(q))) matches.add(n.id);
  }
  if (q && show) {
    for (const n of currentNodes.filter(n => matches.has(n.id)).slice(0, 30)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'result-item'; b.setAttribute('role', 'option');
      const title = document.createElement('strong'); title.textContent = n.name;
      const details = document.createElement('small'); details.textContent = n.stats[0] || (n.ascendancyName || '연결 노드');
      b.append(title, details); b.addEventListener('click', () => selectSearchNode(n.id)); results.append(b);
    }
  }
  results.classList.toggle('visible', !!q && show);
  $('search-hint').textContent = q ? `${matches.size}개 일치 · 최대 30개 표시` : '이름 또는 효과로 실제 패시브를 검색합니다.';
  renderer?.update({ searchMatches: matches });
}
function toggleAllocation() {
  const id = state.selectedId, model = activeTree(), n = model?.nodes.get(id);
  if (!n || !currentIds.has(id)) return;
  if (!nodeAllowed(n)) { toast('전직 선행 조건을 확인해 주세요.'); return; }
  const set = allocatedSet(), root = rootId();
  if (set.has(id)) {
    set.delete(id);
    const { result, removed } = pruneAllocations(model, set, root, currentIds);
    saveAllocated(result);
    toast(`패시브 회수 완료 · 연결이 끊긴 노드 ${removed}개도 회수`);
  } else {
    const route = shortestAllocationPath(model, id, currentIds, set, root, nodeAllowed);
    if (route === null) { toast('시작 노드에서 연결 경로를 찾을 수 없습니다.'); return; }
    for (const step of route) set.add(step);
    saveAllocated(set);
    toast(`${route.length}개 노드를 경로에 따라 배분했습니다.`);
  }
  renderer.update({ allocated: allocatedSet(), lockedOracle: !oracleUnlocked() });
  if (id === 5571 || state.mode === 'ascendancy' && state.ascendancy === 'Oracle') {
    $('status-badge').textContent = `오라클 · ${oracleUnlocked() ? '보이지 않는 길 배분 가능' : '보이지 않는 길 전직 미배분'}`;
  }
  showDetail(n);
}
function focusStart() {
  const n = activeTree().nodes.get(rootIds()[0]); if (!n) { renderer.fitAll(); return; }
  renderer.focus(n.x, n.y, Math.max(renderer.zoom, state.mode === 'ascendancy' ? .22 : .13));
}
function sharePlan() {
  const url = new URL(location.href); url.search = '';
  url.searchParams.set('class', state.className); url.searchParams.set('asc', state.ascendancy); url.searchParams.set('view', state.mode);
  url.hash = new URLSearchParams({ p: (state.allocations[state.className] || []).join('.'), a: (state.ascAllocations[state.ascendancy] || []).join('.'), x: isExtraMode() ? (state.extraAllocations[state.mode] || []).join('.') : '' }).toString();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url.href).then(() => toast('계획 링크를 복사했습니다.'), () => showCopyFallback(url.href));
  } else showCopyFallback(url.href);
}
function showCopyFallback(url) {
  // Safari file:// and private-context fallback without clipboard permission.
  window.prompt('아래 링크를 복사하세요.', url);
}
function openOverlay(which) {
  const sidebar = which === 'sidebar', details = which === 'details';
  $('sidebar').classList.toggle('open', sidebar);
  $('details-panel').classList.toggle('open', details);
  $('scrim').hidden = !(sidebar || details);
}
function closeOverlay() { openOverlay('none'); }
function wireUI() {
  for (const tab of document.querySelectorAll('.tree-tab')) tab.addEventListener('click', () => {
    state.mode = tab.dataset.mode; state.selectedId = null; state.search = ''; $('search-input').value = ''; scene(); closeOverlay();
  });
  $('class-select').addEventListener('change', e => { state.className = e.target.value; state.selectedId = null; populateAscendancies(); scene(); });
  $('ascendancy-select').addEventListener('change', e => { state.ascendancy = e.target.value; state.selectedId = null; scene(); });
  $('oracle-toggle').addEventListener('change', e => { state.showOracle = e.target.checked; scene(); });
  $('search-input').addEventListener('input', e => { state.search = e.target.value; refreshSearch(); });
  $('search-clear').addEventListener('click', () => { $('search-input').value = ''; state.search = ''; refreshSearch(); });
  $('allocate-button').addEventListener('click', toggleAllocation);
  $('zoom-in').addEventListener('click', () => renderer.zoomBy(1.5));
  $('zoom-out').addEventListener('click', () => renderer.zoomBy(1 / 1.5));
  $('fit-all').addEventListener('click', () => renderer.fitAll());
  $('focus-start').addEventListener('click', focusStart);
  $('share-plan').addEventListener('click', sharePlan);
  $('clear-plan').addEventListener('click', () => { if (confirm('선택한 직업과 전직의 계획 포인트를 모두 초기화할까요?')) { saveAllocated(new Set()); renderer.update({ allocated: new Set() }); showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null); toast('선택한 트리의 계획을 초기화했습니다.'); } });
  $('sidebar-toggle').addEventListener('click', () => openOverlay('sidebar'));
  $('sidebar-close').addEventListener('click', closeOverlay);
  $('details-close').addEventListener('click', closeOverlay);
  $('scrim').addEventListener('click', closeOverlay);
  $('mobile-settings').addEventListener('click', () => openOverlay('sidebar'));
  $('mobile-search').addEventListener('click', () => { openOverlay('sidebar'); $('search-input').focus(); });
  $('mobile-details').addEventListener('click', () => openOverlay('details'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeOverlay();
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === '+' || e.key === '=') renderer.zoomBy(1.3);
    else if (e.key === '-') renderer.zoomBy(1 / 1.3);
    else if (e.key.toLowerCase() === 'f') renderer.fitAll();
  });
}
async function loadTree() {
  $('loading-overlay').hidden = false; $('error-overlay').hidden = true;
  try {
    const entries = await Promise.all(Object.entries(DATA_FILES).map(async ([key, file]) => {
      const response = await fetch(file, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status} · ${file}`);
      return [key, await response.json()];
    }));
    const raw = Object.fromEntries(entries);
    tree = buildTree(raw.passive);
    extraTrees = { atlas: buildExtraTree(raw.atlas, 'atlas'), genesis: buildExtraTree(raw.genesis, 'genesis') };
    if (tree.nodes.size < 4000 || tree.ascendancies.length < 20 || tree.classes.length < 8 || extraTrees.atlas.nodes.size < 500 || extraTrees.genesis.nodes.size < 200) {
      throw new Error('트리 데이터가 불완전합니다.');
    }
    if (!renderer) renderer = new TreeRenderer($('tree-canvas'), { onSelect: onNodeSelected });
    populateClasses(); scene();
    $('version-label').textContent = 'PoE2 0.5 · 공식 내보내기 기반';
    $('data-summary').textContent = `${tree.nodes.size.toLocaleString()}개 캐릭터 노드 · ${tree.ascendancies.length}개 전직 · 아틀라스 ${extraTrees.atlas.nodes.size}개 · 제네시스 ${extraTrees.genesis.nodes.size}개`;
    $('loading-overlay').hidden = true;
  } catch (err) {
    $('loading-overlay').hidden = true; $('error-overlay').hidden = false;
    $('error-message').textContent = `${err.message}. GitHub Pages 또는 로컬 HTTP 서버에서 열어야 합니다. (file:// 직접 실행 불가)`;
    console.error('Failed to load passive tree:', err);
  }
}
$('retry-button').addEventListener('click', loadTree);
loadSaved(); wireUI(); loadTree();
