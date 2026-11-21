import { GUIDES } from './guides-data.js';

const TABS = [
  ['overview', '빌드 개요'],
  ['strengths', '장단점'],
  ['variants', '빌드 변형'],
  ['equipment', '장비'],
  ['gems', '스킬 젬'],
  ['passives', '패시브 트리'],
  ['quests', '퀘스트 보상'],
  ['leveling', '액트별 육성'],
  ['play', '플레이 방법'],
  ['check', '진행 체크'],
  ['source', '원문 출처']
];
const initial = new URLSearchParams(window.location.search);
const state = {
  build: GUIDES.some(item => item.id === initial.get('build')) ? initial.get('build') : GUIDES[0].id,
  tab: TABS.some(item => item[0] === initial.get('tab')) ? initial.get('tab') : 'overview',
  stage: 0
};
const $ = id => document.getElementById(id);
const make = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
};
const button = (label, className, handler) => {
  const node = make('button', className, label);
  node.type = 'button';
  node.addEventListener('click', handler);
  return node;
};
const paragraph = text => make('p', 'guide-paragraph', text);
const heading = text => make('h2', 'guide-section-heading', text);
const link = (label, href, external = false) => {
  const node = make('a', 'guide-link', label);
  node.href = href;
  if (external) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
};
const list = (items, ordered = false) => {
  const root = make(ordered ? 'ol' : 'ul', 'guide-list');
  for (const item of items) root.append(make('li', '', item));
  return root;
};
function currentGuide() {
  return GUIDES.find(item => item.id === state.build) || GUIDES[0];
}
function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('build', state.build);
  if (state.tab === 'overview') url.searchParams.delete('tab');
  else url.searchParams.set('tab', state.tab);
  window.history.replaceState(null, '', url);
}
function selectBuild(id) {
  if (!GUIDES.some(item => item.id === id)) return;
  state.build = id;
  state.tab = 'overview';
  state.stage = 0;
  render();
  syncUrl();
}
function selectTab(id) {
  if (!TABS.some(item => item[0] === id)) return;
  state.tab = id;
  renderTabs();
  renderPanel();
  syncUrl();
}
function renderChoices() {
  const root = $('guide-choices');
  root.replaceChildren();
  for (const guide of GUIDES) {
    const item = button('', 'guide-choice', () => selectBuild(guide.id));
    item.append(make('span', 'guide-choice-rank', String(guide.rank).padStart(2, '0')));
    const content = make('span', 'guide-choice-text');
    content.append(make('strong', '', guide.title), make('small', '', guide.ascendancy + ' · ' + guide.element + ' · ' + guide.version));
    item.append(content);
    item.setAttribute('aria-current', String(state.build === guide.id));
    root.append(item);
  }
}
function renderHeader() {
  const guide = currentGuide();
  $('guide-rank').textContent = '추천 ' + guide.rank + '위';
  $('guide-title').textContent = guide.title;
  $('guide-subtitle').textContent = guide.short;
  $('guide-meta').textContent = guide.ascendancy + ' · ' + guide.element + ' · 원문 ' + guide.version + ' · ' + guide.author + ' · ' + guide.updated;
  $('guide-source-link').href = guide.source;
  $('guide-version-note').hidden = guide.id !== 'frostbolt-comet' && guide.id !== 'ember-arc';
  $('guide-version-note').textContent = guide.id === 'frostbolt-comet'
    ? '구버전 주의: 2024년 0.1 가이드로, 현재 게임의 자동 시전·정신력·젬 규칙과 일치하지 않을 수 있습니다.'
    : '버전 주의: 2026년 5월 작성된 0.5 육성안입니다. 현재 패치의 세부 설정은 원문과 게임 내에서 재확인하세요.';
  document.title = guide.title + ' | Exile Tree 공략';
}
function renderTabs() {
  const root = $('guide-tabs');
  root.replaceChildren();
  for (const [id, name] of TABS) {
    const tab = button(name, 'guide-tab', () => selectTab(id));
    tab.id = 'section-' + id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(state.tab === id));
    tab.setAttribute('aria-controls', 'guide-panel');
    tab.tabIndex = state.tab === id ? 0 : -1;
    root.append(tab);
  }
}
function appendCards(root, values, className) {
  const wrapper = make('div', className || 'guide-cards');
  for (const value of values) {
    const card = make('div', 'guide-card');
    card.append(paragraph(value));
    wrapper.append(card);
  }
  root.append(wrapper);
}
function buildTable(headers, rows) {
  const wrap = make('div', 'guide-table-scroll');
  const table = make('table', 'guide-table');
  const thead = document.createElement('thead');
  const header = document.createElement('tr');
  for (const name of headers) header.append(make('th', '', name));
  thead.append(header);
  const tbody = document.createElement('tbody');
  for (const cells of rows) {
    const row = document.createElement('tr');
    for (const value of cells) row.append(make('td', '', value));
    tbody.append(row);
  }
  table.append(thead, tbody);
  wrap.append(table);
  return wrap;
}
function overview(root, guide) {
  root.append(heading('빌드 개요'));
  for (const item of guide.summary) root.append(paragraph(item));
  const facts = make('div', 'guide-facts');
  for (const [name, value] of [['주력 속성', guide.element], ['전직', guide.ascendancy], ['기준 원문', guide.version], ['무기 제한', '마법봉 / 주문 지팡이']]) {
    const cell = make('div', 'guide-fact');
    cell.append(make('span', '', name), make('strong', '', value));
    facts.append(cell);
  }
  root.append(facts);
  root.append(heading('무기 제한 적용'), paragraph(guide.weapons));
  root.append(make('p', 'guide-disclaimer', '이 공략은 원문 전체를 복제한 번역이 아니라, 출처를 표기한 독립적인 한국어 육성 정리입니다. 실제 장비·젬·패시브 상세 변형은 원문에서 확인하세요.'));
}
function strengths(root, guide) {
  root.append(heading('장점'), list(guide.pros));
  root.append(heading('주의할 점'), list(guide.cons));
}
function variants(root, guide) {
  root.append(heading('진행 단계별 구성'));
  root.append(paragraph('원문에서 다루는 육성 흐름을 재구성했습니다. 단계 버튼은 아래 ‘액트별 육성’ 탭에서 선택할 수 있습니다.'));
  appendCards(root, guide.stages.map(stage => stage[0] + ' — ' + stage[1]));
  root.append(make('p', 'guide-disclaimer', '최종 장비·젬 세팅은 원문의 변형을 선택해 직접 확인하세요. 검증되지 않은 아이템·패시브 ID는 이 페이지에서 생성하지 않습니다.'));
}
function equipment(root, guide) {
  root.append(heading('장비 및 우선 옵션'), paragraph(guide.weapons));
  root.append(buildTable(['슬롯', '우선 확인할 옵션', '설명'], guide.equipment));
  root.append(make('p', 'guide-disclaimer', '구체적인 아이템 이미지와 값은 타사 가이드에서 가져오지 않습니다. 업그레이드 시 현재 게임에 존재하는 옵션만 적용하세요.'));
}
function gems(root, guide) {
  root.append(heading('스킬 젬과 역할'));
  root.append(buildTable(['스킬 (한글 / 영문)', '역할', '사용 목적', '보조 젬 예시·조건'], guide.gems));
  root.append(make('p', 'guide-disclaimer', '보조 젬은 원문 단계에서 확인되는 예시 또는 확인이 필요한 조건입니다. 모든 조합을 동시에 장착하는 목록이 아니며, 현재 패치에서의 장착 가능성은 검증이 필요합니다.'));
}
function passives(root, guide) {
  root.append(heading('패시브 배분 방향'), list(guide.passives, true));
  const actions = make('div', 'guide-actions');
  actions.append(link('내 패시브 트리 플래너 열기', './index.html'));
  actions.append(link('원문의 정확한 트리 단계 확인', guide.source, true));
  root.append(actions);
  root.append(make('p', 'guide-disclaimer', '원문에 저장된 패시브 트리의 노드 ID·분배값을 추출하지 않았으므로, 이 페이지는 자동 배분이나 정확한 포인트 순서를 제공하지 않습니다.'));
}
function quests(root) {
  root.append(heading('영구 보상 점검'));
  root.append(paragraph('액트별 영구 보상은 캐릭터의 진행도와 패치에 따라 달라질 수 있습니다. 다음 유형을 놓치지 않았는지 게임 내 지도·퀘스트 기록과 대조하세요.'));
  root.append(list([
    '무기 세트 패시브 포인트를 주는 선택 퀘스트와 보스',
    '정신력을 제공하는 영구 보상',
    '화염·냉기·번개 저항 및 생명력·마나 관련 영구 보상',
    '참 슬롯·물약·재련대 등 이후 진행에 영향을 주는 해금 요소'
  ]));
  root.append(make('p', 'guide-disclaimer', '원문 퀘스트 보상 표를 통째로 옮기지 않았습니다. 특정 보상을 적용하기 전에는 게임 내 선택지와 원문을 확인하세요.'));
}
function leveling(root, guide) {
  root.append(heading('액트별 육성 안내'));
  const nav = make('div', 'guide-stage-nav');
  const body = make('article', 'guide-stage-body');
  const draw = () => {
    nav.replaceChildren();
    const index = Math.min(state.stage, guide.stages.length - 1);
    const [stageName, target, notes] = guide.stages[index];
    guide.stages.forEach((stage, i) => {
      const b = button(stage[0], 'guide-stage-button', () => { state.stage = i; draw(); });
      b.setAttribute('aria-pressed', String(i === index));
      nav.append(b);
    });
    body.replaceChildren(make('span', 'guide-stage-eyebrow', '육성 단계 ' + (index + 1) + '/' + guide.stages.length), make('h3', '', stageName), paragraph(target), make('h4', '', '확인할 사항'), paragraph(notes));
  };
  draw();
  root.append(nav, body);
}
function gameplay(root, guide) {
  root.append(heading('일반 맵핑 순서'), list(guide.play.clear, true));
  root.append(heading('보스전 순서'), list(guide.play.boss, true));
  root.append(make('p', 'guide-disclaimer', '실제 버튼 사용 순서는 보유 젬과 장비·버전의 영향을 받습니다. 원문의 운용 영상 또는 전투 설명으로 교차 확인하세요.'));
}
function savedChecks(guide) {
  try {
    const raw = JSON.parse(window.localStorage.getItem('poe2-guide-checks-v1:' + guide.id) || '[]');
    return Array.isArray(raw) ? raw.filter(i => Number.isInteger(i) && i >= 0 && i < guide.checks.length) : [];
  } catch { return []; }
}
function checks(root, guide) {
  root.append(heading('개인 진행 체크리스트'));
  root.append(paragraph('체크한 내용은 이 브라우저에만 저장되며, 기존 패시브 트리·PoB2 데이터에는 영향을 주지 않습니다.'));
  const completed = new Set(savedChecks(guide));
  const count = make('p', 'guide-check-count');
  const update = () => {
    count.textContent = guide.checks.length + '개 중 ' + completed.size + '개 완료';
    try { window.localStorage.setItem('poe2-guide-checks-v1:' + guide.id, JSON.stringify([...completed])); } catch { /* 저장소 사용 불가 시 화면에서만 유지 */ }
  };
  root.append(count);
  for (let i = 0; i < guide.checks.length; i++) {
    const row = make('label', 'guide-check-row');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = completed.has(i);
    input.addEventListener('change', () => {
      if (input.checked) completed.add(i); else completed.delete(i);
      update();
    });
    row.append(input, make('span', '', guide.checks[i]));
    root.append(row);
  }
  update();
}
function source(root, guide) {
  root.append(heading('공식 원문 및 작성자'));
  const card = make('div', 'guide-source-card');
  card.append(make('strong', '', guide.nameEn), paragraph('작성자: ' + guide.author), paragraph('원문 마지막 확인된 업데이트: ' + guide.updated), paragraph('가이드 기준 버전: ' + guide.version), link('Mobalytics 원문 공략 열기', guide.source, true));
  root.append(card);
  root.append(heading('내용 사용 범위'));
  root.append(paragraph('원문의 표제와 구성을 참고하여 한국어로 새롭게 작성한 안내입니다. 원문에 수록된 장비 이미지·서술 전문·영상·패시브 노드 배분 데이터는 재게시하지 않습니다. 게임 내 번역 및 패치별 정확성은 공식 데이터를 통해 추가로 검증하세요.'));
}
function renderPanel() {
  const guide = currentGuide();
  const panel = $('guide-panel');
  panel.replaceChildren();
  panel.setAttribute('aria-labelledby', 'section-' + state.tab);
  if (state.tab === 'overview') overview(panel, guide);
  else if (state.tab === 'strengths') strengths(panel, guide);
  else if (state.tab === 'variants') variants(panel, guide);
  else if (state.tab === 'equipment') equipment(panel, guide);
  else if (state.tab === 'gems') gems(panel, guide);
  else if (state.tab === 'passives') passives(panel, guide);
  else if (state.tab === 'quests') quests(panel);
  else if (state.tab === 'leveling') leveling(panel, guide);
  else if (state.tab === 'play') gameplay(panel, guide);
  else if (state.tab === 'check') checks(panel, guide);
  else source(panel, guide);
}
function render() { renderChoices(); renderHeader(); renderTabs(); renderPanel(); }

$('guide-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const index = TABS.findIndex(t => t[0] === state.tab);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 :
    (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
  selectTab(TABS[next][0]);
  $('section-' + state.tab).focus();
});
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  state.build = GUIDES.some(item => item.id === params.get('build')) ? params.get('build') : GUIDES[0].id;
  state.tab = TABS.some(item => item[0] === params.get('tab')) ? params.get('tab') : 'overview';
  state.stage = 0;
  render();
});
render();
