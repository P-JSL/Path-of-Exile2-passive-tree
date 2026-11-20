/** Fast, locale-aware search for passive names, IDs and stat descriptions.
 * Pure functions keep indexing, ranking, and matching independent of the DOM/Canvas.
 */
export function normalizePassiveText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

/** Build once per tree view or language change, never on every keystroke. */
export function buildPassiveSearchIndex(nodes) {
  return nodes.map(node => {
    const names = [node.name, node.originalName].filter(Boolean).map(normalizePassiveText);
    const effects = [...(node.stats || []), ...(node.originalStats || [])].map(normalizePassiveText);
    const id = Number(node.id);
    return {
      id, name: String(node.name || node.originalName || id),
      names, nameText: names.join(' '),
      effectText: effects.join(' '),
      searchable: [String(id), ...names, ...effects].join(' ')
    };
  });
}

/** All terms must be present. Exact names/IDs outrank prefixes and effect matches. */
export function searchPassiveIndex(index, query) {
  const normalized = normalizePassiveText(query);
  if (!normalized) return [];
  const terms = normalized.split(' ').filter(Boolean);
  const found = [];
  for (const entry of index) {
    if (!terms.every(term => entry.searchable.includes(term))) continue;
    const exactName = entry.names.some(name => name === normalized);
    const prefixName = entry.names.some(name => name.startsWith(normalized));
    const partialName = terms.every(term => entry.nameText.includes(term));
    const score = String(entry.id) === normalized ? 500 :
      exactName ? 400 : prefixName ? 300 : partialName ? 200 :
      entry.effectText.includes(normalized) ? 120 : 100;
    found.push({ id: entry.id, name: entry.name, score });
  }
  return found.sort((a, b) => b.score - a.score ||
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id - b.id);
}
