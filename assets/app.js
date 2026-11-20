import { importPobCode, resolvePobTree } from './pob-import.js';
import { renderPobProfile } from './pob-profile.js';
import { partitionPobWeaponSets } from './weapon-sets.js';
import { socketedJewelDetails } from './pob-jewels.js';
import { buildTree, visibleNodes, shortestAllocationPath, pruneAllocations } from './tree-model.js';
import { TreeRenderer } from './renderer.js';
import { buildPassiveSearchIndex, searchPassiveIndex } from './passive-search.js';
import { buildExtraTree } from './extra-model.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, tr, passiveName, passiveStat } from './i18n.js';
import { ATTRIBUTES, isAnyAttributeNode, selectedAttributeStat, validAttributeChoices, encodeAttributeChoices, decodeAttributeChoices } from './attributes.js';
import { parseSkillKeywords, verifiedSkillMarkup, lookupKeyword, builtInKeywordDescription } from './skill-notes.js';
import { validateAllocationRoute, auditAllocations, countUsedPoints, blockedChoiceOptions } from './allocation-rules.js';

const $ = id => document.getElementById(id);
const DATA_FILES = { passive: './data/tree.json', atlas: './data/atlas.json', genesis: './data/genesis.json' };
const VALID_MODES = ['passive', 'ascendancy', 'atlas', 'genesis'];
const KEY = 'exile-tree-plans-v1';
const POB_SOURCE_KEY = 'exile-tree-pob2-source-v1';
let importedPob = null;
let pobBuildView = false;
let pobWeaponView = 'all';
let tree = null, renderer = null, extraTrees = {};
let localeCatalog = { names: {}, stats: {} };
let extraLoadPromise = null;
let glossaryPromise = null;
function loadKeywordGlossary() {
  if (!glossaryPromise) {
    // Version the separately generated dictionary alongside the deployed app.
    const revision = APP_REVISION;
    const path = './data/keyword-notes.json' + (revision ? '?v=' + encodeURIComponent(revision) : '');
    glossaryPromise = fetchJSON(path).catch(error => {
      console.warn('Optional keyword glossary unavailable:', error);
      return null;
    });
  }
  return glossaryPromise;
}
const APP_REVISION = new URL(import.meta.url).searchParams.get('v');
const localeDataFiles = ['./data/ko.json', './data/ko-passives.json', './data/ko-stats.json']
  .map(path => APP_REVISION ? path + '?v=' + encodeURIComponent(APP_REVISION) : path);
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
  localeCatalog = { names: { ...(generated.names || {}), ...(extended.names || {}), ...(base.names || {}) }, stats: { ...(extended.names || {}), ...(generated.stats || {}), ...(base.stats || {}) }, nodes: generated.nodes || {} };
  searchCache = null;
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
const state = { language: DEFAULT_LANGUAGE, mode: 'passive', className: 'Druid', ascendancy: 'Oracle', showOracle: true, selectedId: null, search: '', allocations: {}, ascAllocations: {}, extraAllocations: {}, attributeChoices: {}, budgets: {} };
let currentNodes = [], currentIds = new Set(), blockedOptions = new Set();
let searchCache = null;
let searchResults = [], searchIndex = -1, searchTimer = null;
let toastTimeout;
const t = (key, values = {}) => tr(key, state.language, values);
function localName(item, mode = state.mode) {
  const source = typeof item === 'string' ? item : item?.name;
  const kind = mode === 'ascendancy' ? 'passive' : mode;
  const direct = typeof item === 'object' && item !== null ? localeCatalog.nodes?.[kind]?.[item.id]?.name : null;
  return state.language === 'ko' && direct ? direct : passiveName(source, state.language, localeCatalog);
}
const localStat = line => passiveStat(line, state.language, localeCatalog);
function attributeSelection(id) {
  return state.attributeChoices[state.className]?.[id] || '';
}
/** Prefer a verified same-ID bilingual tree entry, preserving unselected original attributes. */
function localizedStats(n, mode = state.mode) {
  const raw = n?.stats || [];
  const kind = mode === 'ascendancy' ? 'passive' : mode;
  const direct = state.language === 'ko' ? localeCatalog.nodes?.[kind]?.[n.id]?.stats : null;
  if (direct?.length) return direct.map((line, index) => {
    const chosen = mode === 'passive' ? selectedAttributeStat(raw[index], attributeSelection(n.id), state.language) : null;
    return chosen || line;
  });
  return raw.map(line => (mode === 'passive' ? selectedAttributeStat(line, attributeSelection(n.id), state.language) : null) || localStat(line));
}
let activeKeywordTrigger = null;
function closeKeywordNote(restoreFocus = false) {
  const trigger = activeKeywordTrigger;
  if (trigger?.isConnected) trigger.setAttribute('aria-expanded', 'false');
  $('keyword-note').hidden = true;
  activeKeywordTrigger = null;
  if (restoreFocus && trigger?.isConnected) trigger.focus();
}
function openKeywordNote(key, label, statLine, trigger) {
  if (activeKeywordTrigger === trigger && !$('keyword-note').hidden) {
    closeKeywordNote(true);
    return;
  }
  closeKeywordNote();
  const explanation = builtInKeywordDescription(key, state.language);
  $('keyword-note-title').textContent = label;
  $('keyword-note-body').textContent = explanation || t('keywordFallback');
  $('keyword-note-context').textContent = t('keywordContext', {text:statLine});
  $('keyword-note-source').href = state.language === 'ko'
    ? 'https://poe2db.tw/kr/Keywords'
    : 'https://poe2db.tw/us/Keywords';
  $('keyword-note').hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  activeKeywordTrigger = trigger;
  // The built-in summary is available immediately; augment it from the bundled
  // bilingual PoE2DB glossary without delaying tree or detail rendering.
  void loadKeywordGlossary().then(catalog => {
    if (activeKeywordTrigger !== trigger || $('keyword-note').hidden) return;
    const note = lookupKeyword(catalog, key, state.language);
    if (!note) return;
    $('keyword-note-body').textContent = note.description;
    if (/^[A-Za-z0-9_-]+$/.test(note.path || '')) {
      $('keyword-note-source').href = 'https://poe2db.tw/' +
        (state.language === 'ko' ? 'kr' : 'us') + '/' + encodeURIComponent(note.path);
    }
  });
  if (window.matchMedia('(max-width:850px)').matches)
    $('keyword-note').scrollIntoView({block:'nearest', behavior:'smooth'});
}
/** Preserve game-provided keyword links, without parsing game data as HTML. */
function appendSkillDescription(container, visible, markup) {
  const annotated = verifiedSkillMarkup(visible, markup) || verifiedSkillMarkup(visible, visible);
  if (!annotated) { container.textContent = visible; return; }
  for (const part of parseSkillKeywords(annotated)) {
    if (!part.key) { container.append(document.createTextNode(part.text)); continue; }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'keyword-term';
    button.textContent = part.text; button.title = t('keywordOpen', {term:part.text});
    button.setAttribute('aria-label', t('keywordOpen', {term:part.text}));
    button.setAttribute('aria-controls', 'keyword-note');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => openKeywordNote(part.key, part.text, visible, button));
    container.append(button);
  }
}
function keywordMarkupForNode(node, index) {
  const mode = state.mode === 'ascendancy' ? 'passive' : state.mode;
  return localeCatalog.nodes?.[mode]?.[node.id]?.richStats?.[state.language]?.[index]
    || node.stats?.[index] || null;
}
function applyLanguageText() {
  document.documentElement.lang = state.language;
  document.title = t('docTitle');
  if (tree) $('version-label').textContent = t('version');
  $('language-select').value = state.language;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  const layout = document.querySelector('.workspace');
  if (layout) {
    $('toggle-filters').textContent = t(layout.classList.contains('filters-collapsed') ? 'showFilters' : 'hideFilters');
    $('toggle-details').textContent = t(layout.classList.contains('details-collapsed') ? 'showDetails' : 'hideDetails');
  }
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
  if ($('pob-view-toggle')) $('pob-view-toggle').textContent = t(pobBuildView ? 'pobShowTree' : 'pobShowProfile');
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
      if (saved.budgets && typeof saved.budgets === 'object' && !Array.isArray(saved.budgets)) {
        for (const mode of VALID_MODES) {
          const value = saved.budgets[mode];
          if (Number.isSafeInteger(value) && value >= 0 && value <= 999) state.budgets[mode] = value;
        }
      }
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
  try { localStorage.setItem(KEY, JSON.stringify({ className: state.className, ascendancy: state.ascendancy, mode: state.mode, showOracle: state.showOracle, language: state.language, allocations: state.allocations, ascAllocations: state.ascAllocations, extraAllocations: state.extraAllocations, attributeChoices: state.attributeChoices, budgets: state.budgets })); } catch { /* no-op */ }
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
/** Imported PoB allocations remain read-only while a weapon view is selected. */
function importedWeaponPartition() {
  if (!importedPob || state.mode !== 'passive' ||
      importedPob.build.className !== state.className) return null;
  return partitionPobWeaponSets(importedPob.build.specs[importedPob.selectedIndex]);
}
function isWeaponPreview() {
  return pobWeaponView !== 'all' && !!importedWeaponPartition();
}
function displayedAllocatedSet() {
  const partition = importedWeaponPartition();
  if (!partition || pobWeaponView === 'all') return allocatedSet();
  return new Set(pobWeaponView === '1' ? partition.active1 : partition.active2);
}
function updateWeaponSetControls() {
  const partition = importedWeaponPartition();
  const element = $('weapon-set-controls');
  element.hidden = !partition;
  if (!partition) return;
  const input = $('pob-weapon-view');
  input.value = pobWeaponView;
  const count = pobWeaponView === '1' ? partition.active1.size :
    pobWeaponView === '2' ? partition.active2.size : partition.all.size;
  $('pob-weapon-count').textContent = t('pobWeaponCount', {count});
}
function ruleContext() {
  return {
    mode:state.mode, className:state.className, ascendancy:state.ascendancy,
    roots:rootIds(), visibleIds:currentIds, ascendancyAllocated:state.ascAllocations,
    maxPoints:state.budgets[state.mode]
  };
}
function ruleMessage(outcome) {
  const key = {
    unavailable:'ruleUnavailable',unallocatable:'ruleUnallocatable',
    otherAscendancy:'ruleOtherAscendancy',locked:'ruleLocked',
    prerequisite:'rulePrerequisite',exclusiveChoice:'ruleExclusiveChoice',
    disconnected:'ruleDisconnected',
    pointBudget:'rulePointBudget'
  }[outcome.reason] || 'prerequisite';
  return t(key, {id:outcome.requiredId,used:outcome.used,max:outcome.max});
}
function refreshBudgetAudit() {
  const model = activeTree();
  if (!model) return;
  const budget = state.budgets[state.mode];
  $('point-budget').value = Number.isSafeInteger(budget) ? String(budget) : '';
  const used = countUsedPoints(model, allocatedSet());
  $('budget-usage').textContent = Number.isSafeInteger(budget)
    ? t('budgetUsage',{used,max:budget}) : t('budgetNoLimit',{used});
  const findings = auditAllocations(model,allocatedSet(),ruleContext());
  const notice = $('plan-audit');
  notice.hidden = !findings.length;
  if (findings.length) {
    notice.textContent = t('budgetIssues',{
      count:findings.length,reason:ruleMessage(findings[0])
    });
  }
}
function updatePoints() {
  const extra = isExtraMode();
  $('normal-points').textContent = extra ? allocatedSet().size : (state.allocations[state.className] || []).length;
  $('ascendancy-points').textContent = extra ? '-' : (state.ascAllocations[state.ascendancy] || []).length;
  $('normal-points-label').textContent = extra ? t(state.mode === 'atlas' ? 'tabAtlas' : 'tabGenesis') : t('normal');
  $('ascendancy-points-label').textContent = extra ? t('independent') : t('ascPoints');
  refreshBudgetAudit();
}
function saveAllocated(set) {
  const record = state.mode === 'passive' ? state.allocations : state.mode === 'ascendancy' ? state.ascAllocations : state.extraAllocations;
  const key = state.mode === 'passive' ? state.className : state.mode === 'ascendancy' ? state.ascendancy : state.mode;
  record[key] = [...set];
  if (state.mode === 'passive') {
    const selected = state.attributeChoices[state.className];
    if (selected) for (const id of Object.keys(selected)) if (!set.has(Number(id))) delete selected[id];
  }
  blockedOptions = blockedChoiceOptions(activeTree(), set);
  persist(); updatePoints(); renderAllocatedList();
}
function oracleUnlocked() { return (state.ascAllocations.Oracle || []).includes(5571); }
function nodeAllowed(n) {
  return !!n && !blockedOptions.has(n.id) && (!n.hiddenOracle || (state.ascendancy === 'Oracle' && oracleUnlocked())) && !n.isOnlyImage && !n.isAscendancyStart && !n.classesStart && !rootIds().includes(n.id);
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
  blockedOptions = blockedChoiceOptions(model, allocatedSet());
  searchCache = null;
  if (state.selectedId && !currentIds.has(state.selectedId)) state.selectedId = null;
  applyLanguageText(); populateAscendancies(); updateHeader();
  const count = currentNodes.length;
  $('scene-count').textContent = t('nodeCount',{count:count.toLocaleString(state.language)});
  // Displayed link count is based on visible physical connectors after filtering.
  $('status-badge').textContent = state.mode === 'passive' && state.ascendancy === 'Oracle' && state.showOracle
    ? t('oracleStatus',{status:t(oracleUnlocked()?'oracleReady':'oracleLocked')})
    : t('sceneDefault');
  if (state.selectedId) showDetail(model.nodes.get(state.selectedId)); else showDetail(null);
  const importSpec = state.mode === 'passive' && importedPob?.build.className === state.className
    ? importedPob.build.specs[importedPob.selectedIndex] : null;
  updateWeaponSetControls();
  renderer.setScene(currentNodes, model.edges, { allocated: displayedAllocatedSet(), rootId: rootId(), selectedId: state.selectedId, lockedOracle: !oracleUnlocked(), orbitRadii: model.orbitRadii ?? [], localizeName: localName, mode: state.mode, className: state.className, classStart: tree.classStarts.get(state.className),
    weaponSet1: new Set(importSpec?.weaponSets[0] || []), weaponSet2: new Set(importSpec?.weaponSets[1] || []),
    socketedJewelIds: new Set(socketedJewelDetails(importSpec).keys()) });
  // PoE2's character tree is read from the class origin, not as 4,000 tiny dots.
  // Keep the entire world rendered and the existing Fit All control available.
  if (state.mode === 'passive' || state.mode === 'ascendancy') {
    const start = model.nodes.get(rootIds()[0]);
    if (start) renderer.focus(start.x, start.y, state.mode === 'ascendancy' ? .27 : .19);
  }
  $('connection-count').textContent = t('edgeCount',{count:renderer.edges.length.toLocaleString(state.language)});
  if (state.selectedId) refreshAllocationPreview(model.nodes.get(state.selectedId));
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
      const title = document.createElement('strong'); title.className = 'allocated-item-name'; title.textContent = localName(node, group.mode) || t('noName');
      const type = document.createElement('small'); type.className = 'allocated-item-meta';
      type.textContent = t(node.category === 'keystone' ? 'keystonePassive' : node.category === 'notable' ? 'notablePassive' : node.category === 'socket' ? 'socketPassive' : 'normalPassive') + ' · ID ' + id;
      b.append(title, type);
      const displayLines = localizedStats(node, group.mode);
      if (displayLines.length) {
        const stat = document.createElement('span'); stat.className = 'allocated-item-desc';
        stat.textContent = displayLines.slice(0, 2).join('\n'); b.append(stat);
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
  setPobBuildView(false);
  state.mode = mode; state.selectedId = null; state.search = '';
  clearTimeout(searchTimer);
  $('search-input').value = '';
  scene(); closeOverlay();
  return true;
}
function refreshAllocationPreview(n) {
  const element = $('allocation-preview');
  element.hidden = true;
  if (!renderer || !n || !currentIds.has(n.id) || isWeaponPreview()) {
    renderer?.update({ previewPath:new Set() });
    return;
  }
  const model = activeTree(), selected = allocatedSet(), preview = new Set();
  if (selected.has(n.id)) {
    element.textContent = t('previewAllocated');
    element.hidden = false;
  } else if (nodeAllowed(n)) {
    const route = n.isFreeAllocate ? [n.id] :
      shortestAllocationPath(model, n.id, currentIds, selected, rootId(), nodeAllowed);
    if (route === null) {
      element.textContent = t('pathFail');
      element.hidden = false;
    } else {
      const check = validateAllocationRoute(model, selected, route, ruleContext());
      if (check.ok) {
        for (const id of route) preview.add(id);
        const addedPoints = countUsedPoints(model, check.allocated) - countUsedPoints(model, selected);
        element.textContent = t('previewRoute', {nodes:route.length,points:addedPoints});
      } else element.textContent = ruleMessage(check);
      element.hidden = false;
    }
  }
  renderer.update({ previewPath:preview });
}
function showDetail(n) {
  closeKeywordNote();
  refreshAllocationPreview(n);
  $('details-placeholder').hidden = !!n;
  $('details-content').hidden = !n;
  if (!n) return;
  const types = { normal:'normalPassive', notable:'notablePassive', keystone:'keystonePassive', socket:'socketPassive', start:'startPassive' };
  $('detail-type').textContent = isExtraMode() ? (localName(n.subtree) || t(state.mode === 'atlas' ? 'tabAtlas':'tabGenesis'))
    : n.hiddenOracle ? t('oracleDetail') : n.ascendancyName ? localName(n.ascendancyName)+' · '+t('ascPoints') : t(types[n.category] || 'normalPassive');
  $('detail-name').textContent = localName(n) || t('noName');
  $('detail-stats').replaceChildren();
  const translatedLines = localizedStats(n);
  const displayLines = translatedLines.length ? translatedLines : [t('noStats')];
  displayLines.forEach((line, index) => {
    const p = document.createElement('p'); p.className = 'stat-line';
    appendSkillDescription(p, line, translatedLines.length ? keywordMarkupForNode(n, index) : null);
    $('detail-stats').append(p);
  });
  const importSpec = state.mode === 'passive' &&
    importedPob?.build.className === state.className
      ? importedPob.build.specs[importedPob.selectedIndex] : null;
  const jewels = socketedJewelDetails(importSpec).get(n.id) || [];
  $('pob-jewel-detail').hidden = !jewels.length;
  $('pob-jewel-text').textContent = jewels.map(item =>
    item.text || ('Item ID ' + item.itemId)).join('\n\n');
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
  if (isWeaponPreview()) {
    button.disabled = true; button.textContent = t('pobWeaponReadOnly');
    notice.hidden = false; notice.textContent = t('pobWeaponReadOnlyHelp');
  } else if (rootIds().includes(n.id) || n.isAscendancyStart || n.classesStart || n.isOnlyImage) {
    button.disabled = true; button.textContent = t('noAlloc');
  } else if (n.hiddenOracle && !oracleUnlocked()) {
    button.disabled = true; button.textContent = t('lockedAlloc');
    notice.hidden = false; notice.textContent = t('lockedNotice');
  } else if (!allocated.has(n.id) && blockedOptions.has(n.id)) {
    button.disabled = true; button.textContent = t('ruleExclusiveChoice');
    notice.hidden = false; notice.textContent = t('ruleExclusiveChoice');
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
function updateSearchNavigator() {
  const nav = $('search-navigator');
  nav.hidden = !state.search.trim();
  if (nav.hidden) return;
  const current = searchResults[searchIndex];
  $('search-nav-name').textContent = current ? current.name : (searchResults.length ? t('search') : t('searchNoResult'));
  $('search-nav-count').textContent = t('searchNavigate', {index:current ? searchIndex + 1 : 0,total:searchResults.length});
  $('search-prev').disabled = !searchResults.length;
  $('search-next').disabled = !searchResults.length;
  for (const result of $('search-results').querySelectorAll('.result-item')) {
    const active = current && Number(result.dataset.nodeId) === current.id;
    result.classList.toggle('active', !!active);
    result.setAttribute('aria-selected', String(!!active));
  }
}
function selectSearchNode(id) {
  const n = activeTree().nodes.get(id); if (!n) return;
  state.selectedId = n.id;
  searchIndex = searchResults.findIndex(entry => entry.id === n.id);
  renderer.focus(n.x, n.y, Math.max(renderer.zoom, .34));
  renderer.update({ selectedId:id });
  showDetail(n); renderAllocatedList();
  updateSearchNavigator();
  // On a phone, keep the located passive visible instead of covering it
  // immediately with the bottom-sheet details panel.
  closeOverlay();
}
function moveSearch(step) {
  if (!searchResults.length) return;
  const next = (searchIndex + step + searchResults.length) % searchResults.length;
  selectSearchNode(searchResults[next].id);
}
function clearSearch() {
  clearTimeout(searchTimer);
  state.search = '';
  $('search-input').value = '';
  refreshSearch();
}
function refreshSearch(show = true) {
  const q = state.search.trim();
  const results = $('search-results');
  const fragment = document.createDocumentFragment();
  if (q) {
    // Translation and search documents are computed only once per scene and language.
    if (!searchCache) searchCache = buildPassiveSearchIndex(currentNodes.map(n => ({
      id:n.id, name:localName(n), originalName:n.name,
      stats:localizedStats(n), originalStats:n.stats
    })));
    searchResults = searchPassiveIndex(searchCache, q);
  } else searchResults = [];
  searchIndex = searchResults.findIndex(entry => entry.id === state.selectedId);
  if (q && show) {
    const visible = searchResults.slice(0, 40);
    for (const entry of visible) {
      const n = activeTree().nodes.get(entry.id);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'result-item';
      b.setAttribute('role', 'option'); b.dataset.nodeId = String(entry.id);
      const title = document.createElement('strong'); title.textContent = entry.name;
      const details = document.createElement('small');
      details.textContent = n?.stats?.[0] ? localizedStats(n)[0] : String(entry.id);
      b.append(title, details);
      b.addEventListener('click', () => selectSearchNode(entry.id));
      fragment.append(b);
    }
  }
  results.replaceChildren(fragment);
  results.classList.toggle('visible', !!q && show);
  $('search-hint').textContent = q ? t('resultCount',{count:searchResults.length}) : t('searchHint');
  renderer?.update({ searchMatches:new Set(searchResults.map(n => n.id)), searchActive:!!q });
  updateSearchNavigator();
}
function toggleAllocation() {
  if (isWeaponPreview()) { toast(t('pobWeaponReadOnlyHelp')); return; }
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
    // GGG marks three special nodes as free; one of them has no physical graph edge.
    const route = n.isFreeAllocate ? [id] : shortestAllocationPath(model, id, currentIds, set, root, nodeAllowed);
    if (route === null) { toast(t('pathFail')); return; }
    const check = validateAllocationRoute(model, set, route, ruleContext());
    if (!check.ok) { toast(ruleMessage(check)); return; }
    saveAllocated(check.allocated);
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

// PoB source is kept separately from editable allocations: the original export
// cannot honestly claim to include changes made in this web planner.
function addPobSection(container, title, blocks, empty = '') {
  const section = document.createElement('details');
  section.className = 'pob-section';
  const heading = document.createElement('summary');
  heading.textContent = title + ' (' + blocks.length + ')';
  section.append(heading);
  if (!blocks.length) {
    const p = document.createElement('p'); p.textContent = empty;
    section.append(p);
  }
  for (const [headingText, bodyText] of blocks) {
    const group = document.createElement('div'); group.className = 'pob-entry';
    const label = document.createElement('strong'); label.textContent = headingText;
    const content = document.createElement('pre'); content.textContent = bodyText;
    group.append(label, content); section.append(group);
  }
  container.append(section);
}
function setPobBuildView(enabled) {
  pobBuildView = !!(enabled && importedPob);
  $('pob-build-stage').hidden = !pobBuildView;
  $('canvas-wrap').hidden = pobBuildView;
  $('pob-view-toggle').hidden = !importedPob;
  $('pob-view-toggle').textContent = t(pobBuildView ? 'pobShowTree' : 'pobShowProfile');
  $('pob-view-toggle').setAttribute('aria-pressed', String(pobBuildView));
  if (!pobBuildView) {
    // Canvas backing dimensions are retained while hidden; schedule a fresh
    // paint even if ResizeObserver reports an unchanged width on return.
    renderer?.resize();
    renderer?.schedule();
  }
}
function renderPobOverview() {
  const panel = $('pob-overview');
  if (!importedPob || !tree) { panel.hidden = true; return; }
  const { build, selectedIndex } = importedPob;
  panel.hidden = false;
  const spec = build.specs[selectedIndex];
  const select = $('pob-spec-select');
  const previous = select.value;
  select.replaceChildren();
  for (const [index, item] of build.specs.entries()) {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = (index + 1) + '. ' + (item.title || item.treeVersion || 'Tree');
    select.append(option);
  }
  select.value = String(selectedIndex);
  $('pob-meta').textContent = [build.className, build.ascendancyName, build.level ? 'Lv ' + build.level : '', 'Nodes ' + spec.nodeIds.length]
    .filter(Boolean).join(' · ') + ' · W1 ' + spec.weaponSets[0].length + ' / W2 ' + spec.weaponSets[1].length;
  const resolution = resolvePobTree(build, tree, selectedIndex);
  const partition = partitionPobWeaponSets(spec);
  const issues = [];
  if (partition.overlaps.length || partition.orphaned.length)
    issues.push(t('pobWeaponInconsistent', {
      overlap:partition.overlaps.length,orphan:partition.orphaned.length
    }));
  if (resolution.unknown.length) issues.push(t('pobMissing',{count:resolution.unknown.length}));
  if (resolution.incompatible.length) issues.push(t('pobIncompatible',{count:resolution.incompatible.length}));
  // The parser supports multiple historical PoB tree versions. Never silently
  // imply that a mismatched snapshot recreates the same game state.
  if (spec.treeVersion && spec.treeVersion !== tree.version)
    issues.push(t('pobVersionWarning',{version:spec.treeVersion,local:tree.version}));
  issues.push(t('pobReadOnly'));
  $('pob-warning').textContent = issues.join('\n');
  const groups = $('pob-summary-lists');
  groups.replaceChildren();
  addPobSection(groups, t('pobSkills'), build.skillSets.flatMap(set =>
    set.groups.map((group, index) => [
      (set.title || set.id || 'Set') + ' · ' + (group.label || group.slot || 'Group ' + (index + 1)),
      group.gems.map(gem => (gem.enabled ? '' : '[OFF] ') + gem.name +
        (gem.level ? ' Lv ' + gem.level : '') + (gem.quality ? ' Q ' + gem.quality : '')).join('\n')
    ])), t('pobNoSkills'));
  addPobSection(groups, t('pobItems'), build.itemSets.flatMap(set =>
    set.slots.filter(slot => slot.text).map(slot => [
      (set.title || set.id || 'Set') + ' · ' + slot.name, slot.text
    ])), t('pobNoGear'));
  addPobSection(groups, t('pobJewels'), spec.sockets.filter(socket => socket.text).map(socket =>
    ['ID ' + socket.nodeId, socket.text]), t('pobNoJewels'));
  addPobSection(groups, t('pobConfig'), build.configSets.flatMap(set =>
    set.inputs.map(input => [
      (set.title || set.id || 'Set') + ' · ' + (input.name || 'Input'),
      Object.entries(input).filter(([key]) => key !== 'name').map(([key,value]) => key + ': ' + value).join(', ')
    ])), t('pobNoConfig'));
  addPobSection(groups, t('pobStats'), build.stats.map(stat => [stat.name, stat.value]));
  if (build.notes) addPobSection(groups, t('pobNotes'), [[t('pobNotes'), build.notes]]);
  renderPobProfile(build,selectedIndex,state.language);
  $('pob-view-toggle').hidden = false;
}
function applyImportedPobSelection(index, requireConfirmation = true) {
  if (!importedPob || !tree) return false;
  const target = resolvePobTree(importedPob.build, tree, index);
  if (target.spec.nodeIds.length && !target.ordinary.length && !target.specialized.length)
    throw new Error('현재 트리 데이터와 일치하는 배분 노드가 없습니다. 다른 패치 버전의 PoB 코드일 수 있습니다.');
  const existing = state.allocations[target.className] || [];
  const priorAsc = target.ascendancy ? (state.ascAllocations[target.ascendancy] || []) : [];
  if (requireConfirmation && (existing.length || priorAsc.length) && !confirm(t('pobConfirm'))) return false;
  state.className = target.className;
  state.ascendancy = target.ascendancy ||
    tree.ascendancies.find(a => a.className === target.className)?.name || '';
  state.mode = 'passive';
  pobWeaponView = 'all';
  state.selectedId = null;
  state.search = '';
  $('search-input').value = '';
  state.allocations[state.className] = target.ordinary;
  if (target.ascendancy) state.ascAllocations[target.ascendancy] = target.specialized;
  state.attributeChoices[state.className] = Object.fromEntries(
    Object.entries(target.spec.attributeChoices).filter(([id]) => target.ordinary.includes(Number(id))));
  importedPob.selectedIndex = index;
  searchCache = null;
  persist();
  populateClasses(); scene(); renderPobOverview();
  $('pob-import-result').textContent = t('pobImported');
  return true;
}
async function importPobFromInput() {
  const button = $('pob-import'), result = $('pob-import-result');
  const source = $('pob-code').value.trim();
  button.disabled = true;
  result.textContent = '';
  try {
    const data = await importPobCode(source);
    const previous = importedPob;
    importedPob = {build:data, selectedIndex:data.activeIndex, source};
    try {
      if (!applyImportedPobSelection(data.activeIndex, true)) {
        importedPob = previous;
        renderPobOverview();
        return;
      }
    } catch(error) {
      importedPob = previous;
      renderPobOverview();
      throw error;
    }
    try { localStorage.setItem(POB_SOURCE_KEY, JSON.stringify({source, selectedIndex:data.activeIndex})); }
    catch { result.textContent = t('pobImported') + ' · Local storage unavailable'; }
    $('pob-code').value = '';
    closeOverlay();
    setPobBuildView(true);
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}
async function restorePobSource() {
  try {
    const saved = JSON.parse(localStorage.getItem(POB_SOURCE_KEY) || 'null');
    if (!saved?.source || !tree) return;
    const data = await importPobCode(saved.source);
    importedPob = {build:data,source:saved.source,
      selectedIndex:Number.isInteger(saved.selectedIndex) && data.specs[saved.selectedIndex]
        ? saved.selectedIndex : data.activeIndex};
    renderPobOverview();
    if (state.mode === 'passive' && state.className === data.className) scene();
    setPobBuildView(false);
  } catch(error) {
    console.warn('Saved PoB source cannot be restored:', error);
  }
}

function openOverlay(which) {
  const sidebar = which === 'sidebar', details = which === 'details';
  $('sidebar').classList.toggle('open', sidebar);
  $('details-panel').classList.toggle('open', details);
  $('scrim').hidden = !(sidebar || details);
}
function closeOverlay() { openOverlay('none'); }
function toggleDesktopPanel(side) {
  const workspace = document.querySelector('.workspace');
  const filters = side === 'filters';
  const className = filters ? 'filters-collapsed' : 'details-collapsed';
  const collapsed = workspace.classList.toggle(className);
  const button = $(filters ? 'toggle-filters' : 'toggle-details');
  button.textContent = t(filters ? (collapsed ? 'showFilters' : 'hideFilters') :
    (collapsed ? 'showDetails' : 'hideDetails'));
  button.setAttribute('aria-expanded', String(!collapsed));
  // ResizeObserver will recalculate the canvas backing store exactly once.
}
function wireUI() {
  $('language-select').addEventListener('change', e => {
    if (!SUPPORTED_LANGUAGES.includes(e.target.value)) return;
    state.language = e.target.value; searchCache = null; applyLanguageText();
    if (tree && renderer) {
      populateClasses(); updateHeader();
      $('scene-count').textContent = t('nodeCount',{count:currentNodes.length.toLocaleString(state.language)});
      $('connection-count').textContent = t('edgeCount',{count:renderer.edges.length.toLocaleString(state.language)});
      $('status-badge').textContent = state.mode === 'passive' && state.ascendancy === 'Oracle' && state.showOracle
        ? t('oracleStatus',{status:t(oracleUnlocked()?'oracleReady':'oracleLocked')}) : t('sceneDefault');
      renderer.update({localizeName:localName});
      showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null);
      renderAllocatedList(); refreshSearch(); updateDataSummary();
      renderPobOverview();
    }
    persist();
  });
  for (const tab of document.querySelectorAll('.tree-tab')) tab.addEventListener('click', () => { void selectMode(tab.dataset.mode); });
  $('class-select').addEventListener('change', e => { state.className = e.target.value; state.selectedId = null; populateAscendancies(); scene(); });
  $('ascendancy-select').addEventListener('change', e => { state.ascendancy = e.target.value; state.selectedId = null; scene(); });
  $('oracle-toggle').addEventListener('change', e => { state.showOracle = e.target.checked; scene(); });
  $('search-input').addEventListener('input', e => {
    state.search = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => refreshSearch(), 85);
  });
  $('search-input').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); clearTimeout(searchTimer); refreshSearch();
      moveSearch(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault(); clearTimeout(searchTimer); refreshSearch();
      if (searchResults.length) moveSearch(1);
    } else if (e.key === 'Escape') {
      e.preventDefault(); clearSearch();
    }
  });
  $('search-clear').addEventListener('click', clearSearch);
  $('search-nav-clear').addEventListener('click', clearSearch);
  $('search-prev').addEventListener('click', () => moveSearch(-1));
  $('search-next').addEventListener('click', () => moveSearch(1));
  $('allocate-button').addEventListener('click', toggleAllocation);
  $('point-budget').addEventListener('change', e => {
    const value = e.target.value.trim();
    if (value === '') delete state.budgets[state.mode];
    else if (/^\d+$/.test(value)) {
      const amount = Number(value);
      if (!Number.isSafeInteger(amount) || amount > 999) { refreshBudgetAudit(); return; }
      state.budgets[state.mode] = amount;
    } else { refreshBudgetAudit(); return; }
    persist(); refreshBudgetAudit();
  });
  $('attribute-select').addEventListener('change', e => {
    const id = state.selectedId, node = activeTree()?.nodes.get(id);
    if (state.mode !== 'passive' || !node || !isAnyAttributeNode(node) || !allocatedSet().has(id)) return;
    const choice = e.target.value;
    if (choice && !ATTRIBUTES.includes(choice)) return;
    state.attributeChoices[state.className] ||= {};
    if (choice) state.attributeChoices[state.className][id] = choice;
    else delete state.attributeChoices[state.className][id];
    searchCache = null; persist(); showDetail(node); renderAllocatedList();
  });
  $('zoom-in').addEventListener('click', () => renderer.zoomBy(1.5));
  $('zoom-out').addEventListener('click', () => renderer.zoomBy(1 / 1.5));
  $('fit-all').addEventListener('click', () => renderer.fitAll());
  $('focus-start').addEventListener('click', focusStart);
  $('share-plan').addEventListener('click', sharePlan);
  $('pob-import').addEventListener('click', () => { void importPobFromInput(); });
  $('pob-view-toggle').addEventListener('click', () => setPobBuildView(!pobBuildView));
  $('pob-back-tree').addEventListener('click', () => setPobBuildView(false));
  $('pob-weapon-view').addEventListener('change', e => {
    const mode = e.target.value;
    if (!['all','1','2'].includes(mode)) return;
    pobWeaponView = mode;
    updateWeaponSetControls();
    renderer?.update({ allocated:displayedAllocatedSet(), previewPath:new Set() });
    if (state.selectedId) showDetail(activeTree().nodes.get(state.selectedId));
  });
  $('pob-spec-select').addEventListener('change', e => {
    try {
      if (!applyImportedPobSelection(Number(e.target.value))) e.target.value = String(importedPob.selectedIndex);
      else {
        const saved = JSON.parse(localStorage.getItem(POB_SOURCE_KEY) || 'null');
        if (saved) { saved.selectedIndex = importedPob.selectedIndex; localStorage.setItem(POB_SOURCE_KEY, JSON.stringify(saved)); }
      }
    } catch (error) { $('pob-warning').textContent = error.message; e.target.value = String(importedPob.selectedIndex); }
  });
  $('pob-copy-source').addEventListener('click', () => {
    if (!importedPob) return;
    const code = importedPob.source;
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard.writeText(code).then(() => toast(t('pobOriginalCopied')), () => showCopyFallback(code));
    else showCopyFallback(code);
  });
  $('pob-delete').addEventListener('click', () => {
    if (!importedPob || !confirm(t('pobDeleteConfirm'))) return;
    importedPob = null;
    pobWeaponView = 'all';
    renderer?.update({allocated:allocatedSet(),weaponSet1:new Set(),weaponSet2:new Set(),socketedJewelIds:new Set()});
    updateWeaponSetControls();
    setPobBuildView(false);
    try { localStorage.removeItem(POB_SOURCE_KEY); } catch {}
    $('pob-import-result').textContent = '';
    renderPobOverview();
  });
  $('toggle-filters').addEventListener('click', () => toggleDesktopPanel('filters'));
  $('toggle-details').addEventListener('click', () => toggleDesktopPanel('details'));
  $('clear-plan').addEventListener('click', () => { if (confirm(t('clearPrompt'))) { saveAllocated(new Set()); renderer.update({ allocated: new Set() }); showDetail(state.selectedId ? activeTree().nodes.get(state.selectedId) : null); toast(t('cleared')); } });
  $('sidebar-toggle').addEventListener('click', () => openOverlay('sidebar'));
  $('sidebar-close').addEventListener('click', closeOverlay);
  $('details-close').addEventListener('click', () => { closeKeywordNote(); closeOverlay(); });
  $('keyword-note-close').addEventListener('click', () => closeKeywordNote(true));
  $('scrim').addEventListener('click', closeOverlay);
  $('mobile-settings').addEventListener('click', () => openOverlay('sidebar'));
  $('mobile-search').addEventListener('click', () => { openOverlay('sidebar'); $('search-input').focus(); });
  $('mobile-details').addEventListener('click', () => openOverlay('details'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('keyword-note').hidden) closeKeywordNote(true);
      else closeOverlay();
    }
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
    void restorePobSource();
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
