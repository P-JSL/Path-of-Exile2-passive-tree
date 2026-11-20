import { buildTree, visibleNodes, shortestAllocationPath, pruneAllocations } from './tree-model.js';
import { TreeRenderer } from './renderer.js';
import { buildExtraTree } from './extra-model.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, tr, passiveName, passiveStat } from './i18n.js';
import { ATTRIBUTES, isAnyAttributeNode, selectedAttributeStat, validAttributeChoices, encodeAttributeChoices, decodeAttributeChoices } from './attributes.js';

const $ = id => document.getElementById(id);
const DATA_FILES = { passive: './data/tree.json', atlas: './data/atlas.json', genesis: './data/genesis.json' };
const VALID_MODES = ['passive', 'ascendancy', 'atlas', 'genesis'];
const KEY = 'exile-tree-plans-v1';
let tree = null, renderer = null, extraTrees = {};
let localeCatalog = { names: {}, stats: {} };
let extraLoadPromise = null;
const localeDataFiles = ['./data/ko.json', './data/ko-passives.json', './data/ko-stats.json'];
async function fetchJSON(path) {
  // Respect browser HTTP caching: no-cache revalidated multi-megabyte trees on every visit.
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status} · ${path}`);
  return response.json();
}
async function loadTranslations() {
  const responses = await Promise.allSettled(localeDataFiles.map(fetchJSON));
  const base = responses[0].status === 'fulfilled' ? responses[0].value : {};
  const extended = responses[1].status === 'fulfilled' ? responses[1].value : {};
  const generated = responses[2].status === 'fulfilled' ? responses[2].value : {};
  // Existing verified game names win over fallback dictionaries.
  localeCatalog = { names: { ...(generated.names || {}), ...(extended.names || {}), ...(base.names || {}) }, stats: { ...(extended.names || {}), ...(generated.stats || {}), ...(base.stats || {}) } };
  if (responses.every(r => r.status === 'rejected')) console.warn('Korean language files were unavailable.', responses.map(r => r.reason));
  if (tree && renderer) {
    populateClasses(); populateAscendancies();
    renderer.update({ localizeName: localName });
    showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null);
    renderAllocatedList(); refreshSearch(false); updateHeader();
  }
}
async function loadExtraTrees() {
  if (!extraLoadPromise) extraLoadPromise = Promise.all([fetchJSON(DATA_FILES.atlas), fetchJSON(DATA_FILES.genesis)])
    .then(([atlas, genesis]) => {
      extraTrees = { atlas: buildExtraTree(atlas, 'atlas'), genesis: buildExtraTree(genesis, 'genesis') };
      updateDataSummary(); renderAllocatedList();
      return extraTrees;
    }).catch(error => { extraLoadPromise = null; throw error; });
  return extraLoadPromise;
}
function updateDataSummary() {
  if (!tree) return;
  const format = x => Number(x || 0).toLocaleString(state.language);
  $('data-summary').textContent = t('summary', { nodes: format(tree.nodes.size), asc: tree.ascendancies.length, atlas: format(extraTrees.atlas?.nodes.size), genesis: format(extraTrees.genesis?.nodes.size) });
}
const state = { language: DEFAULT_LANGUAGE, mode: 'passive', className: 'Druid', ascendancy: 'Oracle', showOracle: true, selectedId: null, search: '', allocations: {}, ascAllocations: {}, extraAllocations: {}, attributeChoices: {} };
let currentNodes = [], currentIds = new Set();
let toastTimeout;
const t = (key, values = {}) => tr(key, state.language, values);
const localName = item => passiveName(typeof item === 'string' ? item : item?.name, state.language, localeCatalog);
const localStat = line => passiveStat(line, state.language, localeCatalog);
function attributeSelection(id) {
  if (state.mode !== 'passive') return '';
  return state.attributeChoices[state.className]?.[id] || '';
}
function localNodeStat(n, line) {
  return selectedAttributeStat(line, attributeSelection(n.id), state.language) || localStat(line);
}
function applyLanguageText() {
  document.documentElement.lang = state.language;
  document.title = t('docTitle');
  if (tree) $('version-label').textContent = t('version');
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
      state.attributeChoices = validAttributeChoices(saved.attributeChoices);
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
    if (hash.has('c')) state.attributeChoices[state.className] = decodeAttributeChoices(hash.get('c'), state.allocations[state.className]);
  }
}
function validAllocationRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, ids] of Object.entries(input)) if (Array.isArray(ids)) out[key] = ids.filter(Number.isSafeInteger).slice(0, 1500);
  return out;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ className: state.className, ascendancy: state.ascendancy, mode: state.mode, showOracle: state.showOracle, language: state.language, allocations: state.allocations, ascAllocations: state.ascAllocations, extraAllocations: state.extraAllocations, attributeChoices: state.attributeChoices })); } catch { /* no-op */ }
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
  if (state.mode === 'passive') {
    const selected = state.attributeChoices[state.className];
    if (selected) for (const id of Object.keys(selected)) if (!set.has(Number(id))) delete selected[id];
  }
  persist(); updatePoints(); renderAllocatedList();
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
  renderAllocatedList(); refreshSearch(false); persist();
}
function allocationGroups() {
  if (!tree) return [];
  return [
    { mode:'passive', title:t('tabPassive'), model:tree, ids:state.allocations[state.className] || [] },
    { mode:'ascendancy', title:t('tabAscendancy'), model:tree, ids:state.ascAllocations[state.ascendancy] || [] },
    { mode:'atlas', title:t('tabAtlas'), model:extraTrees.atlas, ids:state.extraAllocations.atlas || [] },
    { mode:'genesis', title:t('tabGenesis'), model:extraTrees.genesis, ids:state.extraAllocations.genesis || [] }
  ];
}
function renderAllocatedList() {
  const panel = $('allocated-list');
  if (!panel || !tree) return;
  const priorOpened = new Set([...panel.querySelectorAll('details[open]')].map(element => element.dataset.mode));
  const fragment = document.createDocumentFragment();
  let total = 0;
  for (const group of allocationGroups()) {
    const ids = [...new Set(group.ids)].filter(id => group.model?.nodes.has(id));
    total += ids.length;
    const details = document.createElement('details'); details.className = 'allocated-group';
    details.dataset.mode = group.mode; details.open = priorOpened.has(group.mode) || state.mode === group.mode;
    const heading = document.createElement('summary');
    const label = document.createElement('span'); label.textContent = group.title;
    const count = document.createElement('span'); count.className = 'allocated-group-count';
    count.textContent = ids.length.toLocaleString(state.language);
    heading.append(label, count); details.append(heading);
    const items = document.createElement('div'); items.className = 'allocated-items';
    if (!ids.length) {
      const empty = document.createElement('p'); empty.className = 'allocated-empty';
      empty.textContent = t('allocatedEmpty'); items.append(empty);
    }
    for (const id of ids) {
      const node = group.model.nodes.get(id);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'allocated-item';
      if (state.mode === group.mode && state.selectedId === id) b.classList.add('active');
      const title = document.createElement('strong'); title.className = 'allocated-item-name'; title.textContent = localName(node) || t('noName');
      const type = document.createElement('small'); type.className = 'allocated-item-meta';
      type.textContent = t(node.category === 'keystone' ? 'keystonePassive' : node.category === 'notable' ? 'notablePassive' : node.category === 'socket' ? 'socketPassive' : 'normalPassive') + ' · ID ' + id;
      b.append(title, type);
      if (node.stats?.length) {
        const stat = document.createElement('span'); stat.className = 'allocated-item-desc';
        stat.textContent = node.stats.slice(0, 2).map(line => group.mode === 'passive' ? (selectedAttributeStat(line, state.attributeChoices[state.className]?.[id], state.language) || localStat(line)) : localStat(line)).join('\n'); b.append(stat);
      }
      if (group.mode === 'passive' && isAnyAttributeNode(node) && !state.attributeChoices[state.className]?.[id]) {
        const missing = document.createElement('span'); missing.className = 'allocated-item-meta missing-attribute'; missing.textContent = t('attributeUnset'); b.append(missing);
      }
      b.addEventListener('click', async () => {
        if (state.mode !== group.mode && !(await selectMode(group.mode))) return;
        selectSearchNode(id);
      });
      items.append(b);
    }
    details.append(items); fragment.append(details);
  }
  panel.replaceChildren(fragment);
  $('allocated-total').textContent = total.toLocaleString(state.language);
  $('details-placeholder').hidden = total > 0 || !!state.selectedId;
}
async function selectMode(mode) {
  if (!VALID_MODES.includes(mode)) return false;
  if ((mode === 'atlas' || mode === 'genesis') && !extraTrees[mode]) {
    $('loading-overlay').hidden = false;
    try { await loadExtraTrees(); }
    catch (error) {
      $('error-overlay').hidden = false;
      $('error-message').textContent = error.message;
      return false;
    } finally { $('loading-overlay').hidden = true; }
  }
  state.mode = mode; state.selectedId = null; state.search = '';
  $('search-input').value = '';
  scene(); closeOverlay();
  return true;
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
    p.textContent = n.stats.length ? localNodeStat(n, line) : line;
    $('detail-stats').append(p);
  }
  const control = $('attribute-control');
  const choice = $('attribute-select');
  const selectable = state.mode === 'passive' && isAnyAttributeNode(n);
  control.hidden = !selectable;
  if (selectable) {
    const allocatedNow = allocatedSet().has(n.id);
    choice.value = attributeSelection(n.id);
    choice.disabled = !allocatedNow;
    $('attribute-hint').hidden = allocatedNow;
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
  showDetail(n); renderAllocatedList();
  if (window.matchMedia('(max-width:850px)').matches) openOverlay('details');
}
function selectSearchNode(id) {
  const n = activeTree().nodes.get(id); if (!n) return;
  state.selectedId = n.id;
  renderer.focus(n.x, n.y, Math.max(renderer.zoom, .34));
  renderer.update({ selectedId: id });
  showDetail(n); renderAllocatedList(); closeOverlay();
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

  // Encoded attribute choices are scoped to the selected class and allocated node IDs.
  url.hash = new URLSearchParams({
    p: (state.allocations[state.className] || []).join('.'),
    a: (state.ascAllocations[state.ascendancy] || []).join('.'),
    x: isExtraMode() ? (state.extraAllocations[state.mode] || []).join('.') : '',
    c: encodeAttributeChoices(state.attributeChoices[state.className], state.allocations[state.className] || [])
  }).toString();
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
      renderAllocatedList(); refreshSearch(); updateDataSummary();
    }
    persist();
  });
  for (const tab of document.querySelectorAll('.tree-tab')) tab.addEventListener('click', () => { void selectMode(tab.dataset.mode); });
  $('class-select').addEventListener('change', e => { state.className = e.target.value; state.selectedId = null; populateAscendancies(); scene(); });
  $('ascendancy-select').addEventListener('change', e => { state.ascendancy = e.target.value; state.selectedId = null; scene(); });
  $('oracle-toggle').addEventListener('change', e => { state.showOracle = e.target.checked; scene(); });
  $('search-input').addEventListener('input', e => { state.search = e.target.value; refreshSearch(); });
  $('search-clear').addEventListener('click', () => { $('search-input').value = ''; state.search = ''; refreshSearch(); });
  $('allocate-button').addEventListener('click', toggleAllocation);
  $('attribute-select').addEventListener('change', e => {
    const id = state.selectedId, node = activeTree()?.nodes.get(id);
    if (state.mode !== 'passive' || !node || !isAnyAttributeNode(node) || !allocatedSet().has(id)) return;
    const choice = e.target.value;
    if (choice && !ATTRIBUTES.includes(choice)) return;
    state.attributeChoices[state.className] ||= {};
    if (choice) state.attributeChoices[state.className][id] = choice;
    else delete state.attributeChoices[state.className][id];
    persist(); showDetail(node); renderAllocatedList();
  });
  $('zoom-in').addEventListener('click', () => renderer.zoomBy(1.5));
  $('zoom-out').addEventListener('click', () => renderer.zoomBy(1 / 1.5));
  $('fit-all').addEventListener('click', () => renderer.fitAll());
  $('focus-start').addEventListener('click', focusStart);
  $('share-plan').addEventListener('click', sharePlan);
  $('clear-plan').addEventListener('click', () => { if (confirm(t('clearPrompt'))) { saveAllocated(new Set()); renderer.update({ allocated: new Set() }); showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null); toast(t('cleared')); } });
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
  const localePromise = loadTranslations();
  // Start independent tree downloads without blocking the first character-tree paint.
  const extraPromise = loadExtraTrees();
  extraPromise.catch(error => console.warn('Optional Atlas/Genesis data unavailable:', error));
  try {
    tree = buildTree(await fetchJSON(DATA_FILES.passive));
    if (tree.nodes.size < 4000 || tree.ascendancies.length < 20 || tree.classes.length < 8)
      throw new Error('트리 데이터가 불완전합니다.');
    if (isExtraMode()) await extraPromise;
    if (!renderer) renderer = new TreeRenderer($('tree-canvas'), { onSelect: onNodeSelected });
    populateClasses(); scene(); updateDataSummary();
    $('loading-overlay').hidden = true;
    // Translation loading is optional; render using the source data immediately.
    await localePromise;
  } catch (err) {
    $('loading-overlay').hidden = true; $('error-overlay').hidden = false;
    $('error-message').textContent = `${err.message}. ${t('loadFailedSuffix')}`;
    console.error('Failed to load passive tree:', err);
  }
}
$('retry-button').addEventListener('click', loadTree);
loadSaved(); applyLanguageText(); wireUI(); loadTree();
