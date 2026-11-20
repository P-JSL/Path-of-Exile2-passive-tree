/**
 * A source-backed character overview inspired by dense PoE build dashboards.
 * This does not calculate stats or construct equipment artwork that PoB lacks.
 * Every source-derived string uses textContent, never HTML.
 */
export function summarizePobItem(raw = '') {
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const rarity = (/^Rarity:\s*(\S+)/i.exec(lines[0] || '')?.[1] || '').toLowerCase();
  const title = lines.find(s => !/^Rarity:/i.test(s) && !/^Item Level:/i.test(s)) || '';
  const description = lines.filter(s => !/^Rarity:/i.test(s) && s !== title).slice(0, 2).join('\n');
  return {rarity,title,description,raw};
}

export function profileSnapshot(build, specIndex = build.activeIndex) {
  const spec = build.specs[specIndex];
  if (!spec) throw new Error('PoB passive specification is unavailable');
  const itemSet = build.itemSets.find(set => set.id === build.activeItemSet) || build.itemSets[0];
  const skillSet = build.skillSets.find(set => set.id === build.activeSkillSet) || build.skillSets[0];
  return {
    spec, itemSet, skillSet,
    equipment:(itemSet?.slots || []).filter(slot => slot.text).map(slot =>
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
const statsKo = {
  TotalDPS:'전체 DPS', TotalDotDPS:'지속 피해 DPS', FullDPS:'총 피해 DPS',
  Life:'생명력', Mana:'마나', EnergyShield:'에너지 보호막',
  Armour:'방어도', Evasion:'회피', BlockChance:'막기 확률',
  FireResist:'화염 저항', ColdResist:'냉기 저항', LightningResist:'번개 저항',
  ChaosResist:'카오스 저항', MovementSpeed:'이동 속도', Spirit:'정신력',
  EffectiveHitPool:'유효 생명력', PhysicalDamageReduction:'물리 피해 감소'
};
export function renderPobProfile(build, specIndex, language = 'ko') {
  const {spec,equipment,skillGroups,jewels,stats,itemSet,skillSet} = profileSnapshot(build,specIndex);
  const displayName = [build.ascendancyName || build.className, build.level ? 'Lv ' + build.level : '']
    .filter(Boolean).join(' · ');
  document.getElementById('pob-profile-name').textContent = displayName || 'PoB2';
  document.getElementById('pob-profile-version').textContent =
    [spec.title, spec.treeVersion ? 'PoB tree ' + spec.treeVersion : '',
      itemSet?.title ? 'Equipment ' + itemSet.title : '',
      skillSet?.title ? 'Skills ' + skillSet.title : '',
      spec.nodeIds.length + ' passives'].filter(Boolean).join(' · ');
  const items = document.getElementById('pob-profile-equipment');
  const itemFragment = document.createDocumentFragment();
  for (const slot of equipment) {
    const tile = element('div','pob-equipment-tile rarity-' + slot.rarity);
    const position = (slot.name || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
    if (/^(body-armour|helmet|gloves|boots|weapon-1|weapon-2)$/.test(position))
      tile.classList.add('slot-' + position);
    tile.title = slot.raw;
    tile.append(element('small','',slot.name),
      element('strong','',slot.title || slot.name),
      element('p','',slot.description));
    itemFragment.append(tile);
  }
  if (!equipment.length) itemFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? '장착 장비 정보가 없습니다.' : 'No equipped items.'));
  items.replaceChildren(itemFragment);
  const statsTarget = document.getElementById('pob-profile-stat-list');
  const statsFragment = document.createDocumentFragment();
  for (const stat of stats) {
    const card = element('div','pob-stat-row');
    card.append(element('span','', language === 'ko' ? statsKo[stat.name] || stat.name : stat.name),
      element('strong','',stat.value));
    statsFragment.append(card);
  }
  if (!stats.length) statsFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? 'PoB 계산 결과가 없습니다.' : 'No PoB calculation snapshot.'));
  statsTarget.replaceChildren(statsFragment);
  const skillTarget = document.getElementById('pob-profile-skill-list');
  const skillsFragment = document.createDocumentFragment();
  for (const group of skillGroups) {
    const card = element('div','pob-skill-group');
    card.append(element('strong','',group.label || group.gems[0].name));
    const gems = element('div','pob-skill-gems');
    for (const gem of group.gems) {
      const note = gem.name + (gem.level ? ' Lv ' + gem.level : '') +
        (gem.quality ? ' Q ' + gem.quality : '');
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
    card.append(element('strong','',summary.title || 'Jewel #' + jewel.nodeId),
      element('p','', 'ID ' + jewel.nodeId + '\n' + summary.description));
    card.title = jewel.text;
    jewelFragment.append(card);
  }
  if (!jewels.length) jewelFragment.append(element('p','pob-profile-empty',
    language === 'ko' ? '장착된 주얼이 없습니다.' : 'No socketed jewels.'));
  jewelTarget.replaceChildren(jewelFragment);
}
