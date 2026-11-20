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
