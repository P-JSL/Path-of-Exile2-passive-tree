import { localizePobName, localizePobRareName, localizePobSlot, localizePobMetric, localizePobItemText, localizePobGem, formatPobValue } from './pob-localize.js';

/**
 * A source-backed character overview inspired by dense PoE build dashboards.
 * This does not calculate stats or construct equipment artwork that PoB lacks.
 * Every source-derived string uses textContent, never HTML.
 */
export function summarizePobItem(raw = '') {
  const lines = raw.replace(/\\n/g,'\n').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const rarity = (/^Rarity:\s*(\S+)/i.exec(lines[0] || '')?.[1] || '').toLowerCase();
  const title = lines.find(s => !/^Rarity:/i.test(s) && !/^Item Level:/i.test(s)) || '';
  const description = lines.filter(s => !/^Rarity:/i.test(s) && s !== title).slice(0, 2).join('\n');
  return {rarity,title,description,raw};
}

export function profileSnapshot(build, specIndex = build.activeIndex, selected = {}) {
  const spec = build.specs[specIndex];
  if (!spec) throw new Error('PoB passive specification is unavailable');
  const itemSet = build.itemSets.find(set => set.id === (selected.itemSetId ?? build.activeItemSet)) || build.itemSets[0];
  const skillSet = build.skillSets.find(set => set.id === (selected.skillSetId ?? build.activeSkillSet)) || build.skillSets[0];
  return {
    spec, itemSet, skillSet,
    equipment:(itemSet?.slots || []).map(slot =>
      ({...slot,...summarizePobItem(slot.text)})),
    skillGroups:(skillSet?.groups || []).filter(group => group.gems.length),
    jewels:spec.sockets.filter(socket => socket.text),
    stats:build.stats
  };
}

function element(name, className, content) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}
function fullSourceDisclosure(raw, language, dictionary = {}) {
  const details=element('details','pob-source-details');
  // A Korean-language user should see every equipment modifier without
  // opening a small nested disclosure or relying on hover tooltips.
  details.open = language === 'ko';
  details.append(
    element('summary','',language === 'ko' ? '장비 옵션 상세 (전체 표시)' : 'Show all original modifiers'),
    element('pre','',localizePobItemText(raw,language,dictionary))
  );
  return details;
}
export function renderPobProfile(build, specIndex, language = 'ko', selected = {}, locale = {}) {
  const {spec,equipment,skillGroups,jewels,stats,itemSet,skillSet} = profileSnapshot(build,specIndex,selected);
  const dictionary = locale.dictionary || {};
  const characterName = locale.characterName || (name => localizePobName(name,language,dictionary));
  const displayName = [characterName(build.ascendancyName || build.className),
    build.level ? (language === 'ko' ? '레벨 ' : 'Lv ') + build.level : '']
    .filter(Boolean).join(' · ');
  document.getElementById('pob-profile-name').textContent = displayName || 'PoB2';
  document.getElementById('pob-profile-version').textContent =
    [localizePobName(spec.title,language,dictionary),
      spec.treeVersion ? (language === 'ko' ? '패시브 트리 ' : 'PoB tree ') + spec.treeVersion : '',
      itemSet?.title ? (language === 'ko' ? '장비 구성 ' : 'Equipment ') + localizePobName(itemSet.title,language,dictionary) : '',
      skillSet?.title ? (language === 'ko' ? '스킬 구성 ' : 'Skills ') + localizePobName(skillSet.title,language,dictionary) : '',
      spec.nodeIds.length + (language === 'ko' ? '개 패시브' : ' passives')].filter(Boolean).join(' · ');
  const items = document.getElementById('pob-profile-equipment');
  const itemFragment = document.createDocumentFragment();
  for (const slot of equipment) {
    const tile = element('div','pob-equipment-tile rarity-' + slot.rarity);
    if (!slot.text) tile.classList.add('empty');
    const position = (slot.name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
    if (/^(body-armour|helmet|gloves|boots|weapon-1|weapon-2)$/.test(position))
      tile.classList.add('slot-' + position);
    tile.title = slot.raw;
    const originalTitle = slot.title || (slot.text ? slot.name : (language === 'ko' ? '비어 있음' : 'Empty'));
    const rareTitle = slot.rarity === 'rare'
      ? localizePobRareName(originalTitle,language,dictionary) : null;
    const localizedTitle = rareTitle?.name || localizePobName(originalTitle,language,dictionary);
    tile.append(element('small','',localizePobSlot(slot.name,language)),
      element('strong','',localizedTitle),
      element('p','',language === 'ko' ? '' : slot.description));
    if (slot.raw) tile.append(fullSourceDisclosure(slot.raw,language,dictionary));
    if (rareTitle?.approximate)
      tile.append(element('small','pob-approx-translation',
        '희귀 이름의 구성어 번역 · 원문: '+originalTitle));
    itemFragment.append(tile);
  }
  if (!equipment.length) itemFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? '장착 장비 정보가 없습니다.' : 'No equipped items.'));
  items.replaceChildren(itemFragment);
  const statsTarget = document.getElementById('pob-profile-stat-list');
  const statsFragment = document.createDocumentFragment();
  for (const stat of stats) {
    const card = element('div','pob-stat-row');
    const caption=element('span','',localizePobMetric(stat.name,language,dictionary));
    caption.title=stat.name; // Exact PoB metric key remains inspectable.
    const number=element('strong','',formatPobValue(stat.value,language));
    number.title=stat.value;
    card.append(caption,number);
    statsFragment.append(card);
  }
  if (!stats.length) statsFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? 'PoB 계산 결과가 없습니다.' : 'No PoB calculation snapshot.'));
  statsTarget.replaceChildren(statsFragment);
  const skillTarget = document.getElementById('pob-profile-skill-list');
  const skillsFragment = document.createDocumentFragment();
  for (const group of skillGroups) {
    const card = element('div','pob-skill-group');
    card.append(element('strong','',
      localizePobName(group.label || group.gems[0].name,language,dictionary)));
    const gems = element('div','pob-skill-gems');
    for (const gem of group.gems) {
      const note = localizePobGem(gem,language,dictionary);
      gems.append(element('span','pob-skill-gem' + (gem.enabled ? '' : ' disabled'),note));
    }
    card.append(gems);
    skillsFragment.append(card);
  }
  if (!skillGroups.length) skillsFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? '스킬 젬 정보가 없습니다.' : 'No skill gems.'));
  skillTarget.replaceChildren(skillsFragment);
  const jewelTarget = document.getElementById('pob-profile-jewel-list');
  const jewelFragment = document.createDocumentFragment();
  jewelFragment.append(element('p','pob-profile-hint',
    (language === 'ko' ? '일반 배분 ' : 'Allocated nodes ') + spec.nodeIds.length +
    ' · W1 ' + spec.weaponSets[0].length + ' · W2 ' + spec.weaponSets[1].length));
  for (const jewel of jewels) {
    const card = element('div','pob-jewel-card');
    const summary = summarizePobItem(jewel.text);
    card.append(element('strong','',localizePobName(summary.title || 'Jewel #' + jewel.nodeId,language,dictionary)),
      element('p','',language === 'ko' ? '주얼 노드 ID ' + jewel.nodeId : 'ID ' + jewel.nodeId + '\n' + summary.description));
    card.append(fullSourceDisclosure(jewel.text,language,dictionary));
    card.title = jewel.text;
    jewelFragment.append(card);
  }
  if (!jewels.length) jewelFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? '장착된 주얼이 없습니다.' : 'No socketed jewels.'));
  jewelTarget.replaceChildren(jewelFragment);
}
