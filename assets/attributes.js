/** Per-character choices for the selectable +5 attribute travel passives. */
export const ATTRIBUTES = Object.freeze(['str', 'dex', 'int']);

export function anyAttributeAmount(line) {
  const match = typeof line === 'string' && /^\+?(\d+) to any Attribute$/i.exec(line.trim());
  return match ? Number(match[1]) : null;
}

export function isAnyAttributeNode(node) {
  return Array.isArray(node?.stats) && node.stats.some(stat => anyAttributeAmount(stat) !== null);
}

export function selectedAttributeStat(line, selection, language = 'ko') {
  const amount = anyAttributeAmount(line);
  if (amount === null || !ATTRIBUTES.includes(selection)) return null;
  const labels = language === 'ko'
    ? { str:'힘', dex:'민첩', int:'지능' }
    : { str:'Strength', dex:'Dexterity', int:'Intelligence' };
  return language === 'ko' ? `${labels[selection]} +${amount}` : `+${amount} to ${labels[selection]}`;
}

/** Tolerate old browser plans, and discard malformed or unknown selections. */
export function validAttributeChoices(input) {
  const output = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return output;
  for (const [className, selections] of Object.entries(input)) {
    if (!selections || typeof selections !== 'object' || Array.isArray(selections)) continue;
    const clean = {};
    for (const [nodeId, value] of Object.entries(selections)) {
      if (/^\d+$/.test(nodeId) && Number.isSafeInteger(Number(nodeId)) && ATTRIBUTES.includes(value)) clean[nodeId] = value;
    }
    output[className] = clean;
  }
  return output;
}

export function encodeAttributeChoices(choices, allocatedIds) {
  const allocated = new Set(allocatedIds);
  return Object.entries(choices || {})
    .filter(([id, choice]) => /^\d+$/.test(id) && allocated.has(Number(id)) && ATTRIBUTES.includes(choice))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, choice]) => `${id}:${choice[0]}`).join('.');
}

export function decodeAttributeChoices(encoded, allocatedIds) {
  const allocated = new Set(allocatedIds);
  const result = {};
  if (typeof encoded !== 'string') return result;
  for (const item of encoded.split('.')) {
    const match = /^(\d+):([sdi])$/.exec(item);
    if (!match || !allocated.has(Number(match[1]))) continue;
    result[match[1]] = { s:'str', d:'dex', i:'int' }[match[2]];
  }
  return result;
}
