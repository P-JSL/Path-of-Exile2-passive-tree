/**
 * Passive socket contents are imported from PoB's current Spec.
 * Keep every source item as readable text and never evaluate item modifiers.
 */
export function socketedJewelDetails(spec) {
  const result = new Map();
  for (const socket of spec?.sockets || []) {
    const id = Number(socket.nodeId);
    if (!Number.isSafeInteger(id) || id <= 0) continue;
    const text = String(socket.text || '').trim();
    const itemId = String(socket.itemId || '').trim();
    if (!text && !itemId) continue;
    if (!result.has(id)) result.set(id, []);
    result.get(id).push({text, itemId});
  }
  return result;
}
