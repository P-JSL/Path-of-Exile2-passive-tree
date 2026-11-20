/**
 * Parses the game's inline keyword syntax (for example [Shock|감전]).
 * Returned strings are always inserted with textContent; never as HTML.
 */
export function parseSkillKeywords(line) {
  const text = String(line ?? '');
  const parts = [];
  const regex = /\[([A-Za-z][A-Za-z0-9_]*)(?:\|([^\]\n]+))?\]/g;
  let lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index) });
    parts.push({ key: match[1], text: match[2] ?? match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length || !parts.length) parts.push({ text: text.slice(lastIndex) });
  return parts;
}

export function plainSkillText(line) {
  return parseSkillKeywords(line).map(part => part.text).join('');
}

/** Only use markup when it represents exactly the visible translated sentence. */
export function verifiedSkillMarkup(visibleText, candidate) {
  if (typeof candidate !== 'string' || !candidate.includes('[')) return null;
  const plain = plainSkillText(candidate);
  return plain.replace(/\s+/g, ' ').trim() === String(visibleText ?? '').replace(/\s+/g, ' ').trim()
    ? candidate : null;
}

export function lookupKeyword(catalog, key, locale) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) return null;
  const lang = locale === 'en' ? 'en' : 'ko';
  const entry = catalog?.[lang]?.[key];
  return entry && typeof entry.description === 'string' && entry.description.trim()
    ? entry : null;
}

/**
 * Short, original explanatory notes for common PoE2 terms.
 * For unlisted game-specific keywords the UI offers the official game-term reference.
 */
const DEFINITIONS = {
  Shock: ['감전은 대상이 받는 피해를 증가시키는 상태 이상입니다. 적용 효과와 지속시간은 관련 속성의 영향을 받습니다.', 'Shock is an ailment that increases damage taken by the affected target. Modifiers can alter its effect and duration.'],
  Freeze: ['동결은 대상이 일정 시간 행동하지 못하게 하는 냉기 상태 이상입니다.', 'Freeze is a cold ailment that temporarily prevents the affected target from acting.'],
  Chill: ['냉각은 대상의 행동 속도를 감소시키는 냉기 상태 이상입니다.', 'Chill is a cold ailment that slows the affected target.'],
  Ignite: ['점화는 대상에게 화염 지속 피해를 입히는 상태 이상입니다.', 'Ignite is an ailment that deals fire damage over time.'],
  Bleeding: ['출혈은 물리 지속 피해를 입히는 상태 이상입니다. 이동 여부 등이 피해에 영향을 줄 수 있습니다.', 'Bleeding is a physical damage-over-time ailment; movement and other effects may modify the damage.'],
  Poison: ['중독은 카오스 지속 피해를 입히는 상태 이상입니다.', 'Poison is an ailment that deals chaos damage over time.'],
  Flask: ['플라스크는 충전을 소모하여 생명력이나 마나를 회복하는 등의 효과를 제공하는 장비입니다.', 'Flasks spend charges to provide effects such as restoring life or mana.'],
  Armour: ['방어도는 주로 물리 명중 피해를 완화하는 방어 능력치입니다.', 'Armour is a defensive stat primarily used to mitigate physical hit damage.'],
  Evasion: ['회피는 적 공격을 피할 확률에 영향을 주는 방어 능력치입니다.', 'Evasion is a defensive stat that affects the chance to evade attacks.'],
  EnergyShield: ['에너지 보호막은 일반적으로 생명력보다 먼저 피해를 받는 방어 자원입니다. 예외 효과가 존재할 수 있습니다.', 'Energy Shield is a defensive resource that normally absorbs damage before Life, subject to exceptions.'],
  Resistances: ['저항은 해당 피해 유형으로부터 받는 피해를 감소시키는 능력치입니다.', 'Resistances reduce incoming damage of their corresponding damage type.'],
  Exposure: ['노출은 해당 원소 저항을 낮추는 효과입니다.', 'Exposure lowers the affected elemental resistance.'],
  Rarity: ['희귀도는 아이템과 몬스터의 등급에 관련된 개념입니다. 상황에 따라 의미가 달라집니다.', 'Rarity refers to the classification of items or monsters; its exact meaning depends on context.'],
  MapBoss: ['지도 보스는 지도 진행 중 상대하는 주요 보스 몬스터입니다.', 'A Map Boss is a major boss enemy encountered while running a map.'],
  Strongbox: ['금고는 상호작용으로 열 수 있는 보상 상자이며, 추가 전투나 효과가 발생할 수 있습니다.', 'Strongboxes are interactable reward containers that may trigger additional encounters or effects.'],
  Biome: ['생물군계는 지도 지역의 환경 분류이며, 관련 패시브나 보상 효과에 사용될 수 있습니다.', 'A Biome is an environmental classification of an area that may affect Atlas mechanics or rewards.'],
  Ailments: ['상태 이상은 감전, 동결, 점화, 출혈, 중독처럼 대상에게 적용되는 특수 효과입니다.', 'Ailments are special effects applied to targets, such as Shock, Freeze, Ignite, Bleeding and Poison.'],
  CriticalStrike: ['치명타는 보통 명중 시 더 높은 피해를 발생시키는 판정입니다.', 'A Critical Hit is a hit that usually deals more damage than a regular hit.'],
  Attributes: ['기본 능력치는 힘, 민첩, 지능이며 아이템과 스킬 요구 조건 등에 사용됩니다.', 'The primary Attributes are Strength, Dexterity and Intelligence. They can affect skill and item requirements.']
};

export function builtInKeywordDescription(key, language = 'ko') {
  const entry = DEFINITIONS[key];
  if (!entry) return '';
  return entry[language === 'en' ? 1 : 0];
}
