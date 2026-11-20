import { buildTree, visibleNodes, shortestAllocationPath, pruneAllocations } from './tree-model.js';
import { TreeRenderer } from './renderer.js';
import { buildExtraTree } from './extra-model.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, tr, passiveName, passiveStat } from './i18n.js';

const $ = id => document.getElementById(id);
const DATA_FILES = { passive: './data/tree.json', atlas: './data/atlas.json', genesis: './data/genesis.json' };
const VALID_MODES = ['passive', 'ascendancy', 'atlas', 'genesis'];
const KEY = 'exile-tree-plans-v1';
let tree = null, renderer = null, extraTrees = {};
let localeCatalog = { names: {} };
const state = { language: DEFAULT_LANGUAGE, mode: 'passive', className: 'Druid', ascendancy: 'Oracle', showOracle: true, selectedId: null, search: '', allocations: {}, ascAllocations: {}, extraAllocations: {} };
let currentNodes = [], currentIds = new Set();
let toastTimeout;
const t = (key, values = {}) => tr(key, state.language, values);
const localName = item => passiveName(typeof item === 'string' ? item : item?.name, state.language, localeCatalog);
const localStat = line => passiveStat(line, state.language, localeCatalog);
function applyLanguageText() {
  document.documentElement.lang = state.language;
  $('language-select').value = state.language;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
}

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
      if (SUPPORTED_LANGUAGES.includes(saved.language)) state.language = saved.language;
    }
  } catch { /* Storage may be disabled in private mode or embedded browsers. */ }
  const params = new URLSearchParams(location.search);
  if (params.has('class')) state.className = params.get('class');
  if (params.has('asc')) state.ascendancy = params.get('asc');
  if (VALID_MODES.includes(params.get('view'))) state.mode = params.get('view');
  if (SUPPORTED_LANGUAGES.includes(params.get('lang'))) state.language = params.get('lang');
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
  try { localStorage.setItem(KEY, JSON.stringify({ className: state.className, ascendancy: state.ascendancy, mode: state.mode, showOracle: state.showOracle, language: state.language, allocations: state.allocations, ascAllocations: state.ascAllocations, extraAllocations: state.extraAllocations })); } catch { /* no-op */ }
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
  $('normal-points-label').textContent = extra ? t(state.mode === 'atlas' ? 'tabAtlas' : 'tabGenesis') : t('normal');
  $('ascendancy-points-label').textContent = extra ? t('independent') : t('ascPoints');
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
  for (const name of tree.classes) { const o = document.createElement('option'); o.value = name; o.textContent = localName(name); $('class-select').append(o); }
  if (!tree.classes.includes(state.className)) state.className = tree.classes[0];
  $('class-select').value = state.className;
  populateAscendancies();
}
function populateAscendancies() {
  const list = tree.ascendancies.filter(a => a.className === state.className);
  const prev = state.ascendancy;
  if (!list.some(a => a.name === prev)) state.ascendancy = list[0]?.name || '';
  const select = $('ascendancy-select'); select.replaceChildren();
  for (const asc of list) { const o = document.createElement('option'); o.value = asc.name; o.textContent = localName(asc.name); select.append(o); }
  select.value = state.ascendancy;
  $('oracle-settings').hidden = state.ascendancy !== 'Oracle' || state.mode !== 'passive';
  $('oracle-legend').hidden = $('oracle-settings').hidden || !state.showOracle;
  $('oracle-toggle').checked = state.showOracle;
  $('class-description').textContent = t('classSummary', {name:localName(state.className),count:list.length});
}
function updateHeader() {
  for (const mode of VALID_MODES) {
    const tab = $('tab-' + mode); tab.classList.toggle('active', state.mode === mode);
    tab.setAttribute('aria-pressed', String(state.mode === mode));
  }
  const text = {
    passive: [t('fullPassive'),t('passiveTitle',{name:localName(state.className)}),t('passiveSubtitle')],
    ascendancy: [t('fullAsc'),t('ascTitle',{name:localName(state.ascendancy)}),t('ascSubtitle')],
    atlas: [t('fullAtlas'),t('atlasTitle'),t('atlasSubtitle')],
    genesis: [t('fullGenesis'),t('genesisTitle'),t('genesisSubtitle')]
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
  applyLanguageText(); populateAscendancies(); updateHeader();
  const count = currentNodes.length;
  $('scene-count').textContent = t('nodeCount',{count:count.toLocaleString(state.language)});
  // Displayed link count is based on visible physical connectors after filtering.
  $('status-badge').textContent = state.mode === 'passive' && state.ascendancy === 'Oracle' && state.showOracle
    ? t('oracleStatus',{status:t(oracleUnlocked()?'oracleReady':'oracleLocked')})
    : t('sceneDefault');
  if (state.selectedId) showDetail(model.nodes.get(state.selectedId)); else showDetail(null);
  renderer.setScene(currentNodes, model.edges, { allocated: allocatedSet(), rootId: rootId(), selectedId: state.selectedId, lockedOracle: !oracleUnlocked(), orbitRadii: model.orbitRadii ?? [], localizeName: localName });
  $('connection-count').textContent = t('edgeCount',{count:renderer.edges.length.toLocaleString(state.language)});
  refreshSearch(false); persist();
}
function showDetail(n) {
  $('details-placeholder').hidden = !!n;
  $('details-content').hidden = !n;
  if (!n) return;
  const types = { normal:'normalPassive', notable:'notablePassive', keystone:'keystonePassive', socket:'socketPassive', start:'startPassive' };
  $('detail-type').textContent = isExtraMode() ? (n.subtree || t(state.mode === 'atlas' ? 'tabAtlas':'tabGenesis'))
    : n.hiddenOracle ? t('oracleDetail') : n.ascendancyName ? localName(n.ascendancyName)+' · '+t('ascPoints') : t(types[n.category] || 'normalPassive');
  $('detail-name').textContent = localName(n) || t('noName');
  $('detail-stats').replaceChildren();
  const lines = n.stats.length ? n.stats : [t('noStats')];
  for (const line of lines) {
    const p = document.createElement('p'); p.className = 'stat-line';
    p.textContent = n.stats.length ? localStat(line) : line;
    $('detail-stats').append(p);
  }
  $('detail-id').textContent = String(n.id);
  const notice = $('detail-notice'); notice.hidden = true;
  const button = $('allocate-button'), allocated = allocatedSet();
  if (rootIds().includes(n.id) || n.isAscendancyStart || n.classesStart || n.isOnlyImage) {
    button.disabled = true; button.textContent = t('noAlloc');
  } else if (n.hiddenOracle && !oracleUnlocked()) {
    button.disabled = true; button.textContent = t('lockedAlloc');
    notice.hidden = false; notice.textContent = t('lockedNotice');
  } else {
    button.disabled = false; button.textContent = t(allocated.has(n.id) ? 'refund' : 'allocate');
  }
  $('allocation-message').textContent = t(n.isMultipleChoice ? 'extraWarning' : 'planWarning');
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
    if (n.name.toLocaleLowerCase().includes(q) || localName(n).toLocaleLowerCase().includes(q) || n.stats.some(s => s.toLocaleLowerCase().includes(q) || localStat(s).toLocaleLowerCase().includes(q))) matches.add(n.id);
  }
  if (q && show) {
    for (const n of currentNodes.filter(n => matches.has(n.id)).slice(0, 30)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'result-item'; b.setAttribute('role', 'option');
      const title = document.createElement('strong'); title.textContent = localName(n);
      const details = document.createElement('small'); details.textContent = n.stats[0] ? localStat(n.stats[0]) : localName(n.ascendancyName || '');
      b.append(title, details); b.addEventListener('click', () => selectSearchNode(n.id)); results.append(b);
    }
  }
  results.classList.toggle('visible', !!q && show);
  $('search-hint').textContent = q ? t('resultCount',{count:matches.size}) : t('searchHint');
  renderer?.update({ searchMatches: matches });
}
function toggleAllocation() {
  const id = state.selectedId, model = activeTree(), n = model?.nodes.get(id);
  if (!n || !currentIds.has(id)) return;
  if (!nodeAllowed(n)) { toast(t('prerequisite')); return; }
  const set = allocatedSet(), root = rootId();
  if (set.has(id)) {
    set.delete(id);
    const { result, removed } = pruneAllocations(model, set, root, currentIds);
    saveAllocated(result);
    toast(t('refundSuccess',{count:removed}));
  } else {
    const route = shortestAllocationPath(model, id, currentIds, set, root, nodeAllowed);
    if (route === null) { toast(t('pathFail')); return; }
    for (const step of route) set.add(step);
    saveAllocated(set);
    toast(t('allocSuccess',{count:route.length}));
  }
  renderer.update({ allocated: allocatedSet(), lockedOracle: !oracleUnlocked() });
  if (id === 5571 || state.mode === 'ascendancy' && state.ascendancy === 'Oracle') {
    $('status-badge').textContent = t('oracleStatus',{status:t(oracleUnlocked()?'oracleReady':'oracleLocked')});
  }
  showDetail(n);
}
function focusStart() {
  const n = activeTree().nodes.get(rootIds()[0]); if (!n) { renderer.fitAll(); return; }
  renderer.focus(n.x, n.y, Math.max(renderer.zoom, state.mode === 'ascendancy' ? .22 : .13));
}
function sharePlan() {
  const url = new URL(location.href); url.search = '';
  url.searchParams.set('lang', state.language); url.searchParams.set('class', state.className); url.searchParams.set('asc', state.ascendancy); url.searchParams.set('view', state.mode);
  url.hash = new URLSearchParams({ p: (state.allocations[state.className] || []).join('.'), a: (state.ascAllocations[state.ascendancy] || []).join('.'), x: isExtraMode() ? (state.extraAllocations[state.mode] || []).join('.') : '' }).toString();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url.href).then(() => toast(t('shareCopied')), () => showCopyFallback(url.href));
  } else showCopyFallback(url.href);
}
function showCopyFallback(url) {
  // Safari file:// and private-context fallback without clipboard permission.
  window.prompt(t('shareFallback'), url);
}
function openOverlay(which) {
  const sidebar = which === 'sidebar', details = which === 'details';
  $('sidebar').classList.toggle('open', sidebar);
  $('details-panel').classList.toggle('open', details);
  $('scrim').hidden = !(sidebar || details);
}
function closeOverlay() { openOverlay('none'); }
function wireUI() {
  $('language-select').addEventListener('change', e => {
    if (!SUPPORTED_LANGUAGES.includes(e.target.value)) return;
    state.language = e.target.value; applyLanguageText();
    if (tree && renderer) {
      populateClasses(); updateHeader();
      $('scene-count').textContent = t('nodeCount',{count:currentNodes.length.toLocaleString(state.language)});
      $('connection-count').textContent = t('edgeCount',{count:renderer.edges.length.toLocaleString(state.language)});
      $('status-badge').textContent = state.mode === 'passive' && state.ascendancy === 'Oracle' && state.showOracle
        ? t('oracleStatus',{status:t(oracleUnlocked()?'oracleReady':'oracleLocked')}) : t('sceneDefault');
      renderer.update({localizeName:localName});
      showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null);
      refreshSearch();
      $('data-summary').textContent = t('summary',{nodes:tree.nodes.size.toLocaleString(state.language),asc:tree.ascendancies.length,atlas:extraTrees.atlas.nodes.size.toLocaleString(state.language),genesis:extraTrees.genesis.nodes.size.toLocaleString(state.language)});
    }
    persist();
  });
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
  $('clear-plan').addEventListener('click', () => { if (confirm(t('clearPrompt')) { saveAllocated(new Set()); renderer.update({ allocated: new Set() }); showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null); toast(t('cleared')); } });
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
    try { const response = await fetch('./data/ko.json', {cache:'no-cache'}); if (response.ok) localeCatalog = await response.json(); }
    catch (e) { console.warn('Korean terms are unavailable, showing source text.', e); }
    extraTrees = { atlas: buildExtraTree(raw.atlas, 'atlas'), genesis: buildExtraTree(raw.genesis, 'genesis') };
    if (tree.nodes.size < 4000 || tree.ascendancies.length < 20 || tree.classes.length < 8 || extraTrees.atlas.nodes.size < 500 || extraTrees.genesis.nodes.size < 200) {
      throw new Error('트리 데이터가 불완전합니다.');
    }
    if (!renderer) renderer = new TreeRenderer($('tree-canvas'), { onSelect: onNodeSelected });
    populateClasses(); scene();
    $('version-label').textContent = 'PoE2 0.5 · 공식 내보내기 기반';
    $('data-summary').textContent = t('summary',{nodes:tree.nodes.size.toLocaleString(state.language),asc:tree.ascendancies.length,atlas:extraTrees.atlas.nodes.size.toLocaleString(state.language),genesis:extraTrees.genesis.nodes.size.toLocaleString(state.language)});
    $('loading-overlay').hidden = true;
  } catch (err) {
    $('loading-overlay').hidden = true; $('error-overlay').hidden = false;
    $('error-message').textContent = `${err.message}. ${t('loadFailedSuffix')}`;
    console.error('Failed to load passive tree:', err);
  }
}
$('retry-button').addEventListener('click', loadTree);
loadSaved(); applyLanguageText(); wireUI(); loadTree();
