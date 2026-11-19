/** Game tree adapter. Keeps the official node IDs, text and positions unchanged. */
export function buildTree(raw) {
  if (!raw || !raw.nodes || !raw.groups || !raw.constants || !Array.isArray(raw.classes)) {
    throw new Error('지원되지 않는 패시브 데이터 구조입니다.');
  }
  const nodes = new Map();
  const radii = raw.constants.orbitRadii;
  const angles = raw.constants.orbitAnglesByOrbit;
  for (const value of Object.values(raw.nodes)) {
    const group = raw.groups[value.group];
    if (!group || !Number.isFinite(group.x) || !Number.isFinite(group.y)) continue;
    const a = angles[value.orbit]?.[value.orbitIndex] ?? 0;
    const r = radii[value.orbit] ?? 0;
    const n = {
      ...value,
      id: Number(value.skill),
      x: group.x + Math.sin(a) * r,
      y: group.y - Math.cos(a) * r,
      stats: Array.isArray(value.stats) ? value.stats : [],
      hiddenOracle: value.unlockConstraint?.ascendancy === 'Oracle',
      category: value.isKeystone ? 'keystone' : value.isAscendancyStart || value.classesStart ? 'start' : value.isNotable ? 'notable' : value.isJewelSocket ? 'socket' : 'normal'
    };
    nodes.set(n.id, n);
  }
  const adjacent = new Map([...nodes.keys()].map(id => [id, new Set()]));
  const edges = [];
  const edgeKeys = new Set();
  for (const n of nodes.values()) {
    for (const link of n.connections ?? []) {
      const other = nodes.get(Number(link.id));
      if (!other || other.id === n.id) continue;
      const key = Math.min(n.id, other.id) + ':' + Math.max(n.id, other.id);
      if (!edgeKeys.has(key)) {
        edges.push({ a: n.id, b: other.id, orbit: link.orbit || 0 });
        edgeKeys.add(key);
      }
      adjacent.get(n.id).add(other.id);
      adjacent.get(other.id).add(n.id);
    }
  }
  const ascendancies = raw.classes.flatMap(c => c.ascendancies.map(a => ({ ...a, className: c.name })))
    .filter(a => [...nodes.values()].some(n => n.ascendancyName === a.name));
  const classStarts = new Map();
  for (const c of raw.classes) {
    const root = [...nodes.values()].find(n => n.classesStart?.includes(c.name));
    if (root) classStarts.set(c.name, root.id);
  }
  const ascStarts = new Map([...nodes.values()].filter(n => n.isAscendancyStart).map(n => [n.ascendancyName, n.id]));
  return { nodes, edges, adjacent, classes: raw.classes.map(c => c.name), ascendancies, classStarts, ascStarts, version: '0_5' };
}

export function visibleNodes(tree, mode, ascendancy, showOracle) {
  return [...tree.nodes.values()].filter(n => mode === 'ascendancy'
    ? n.ascendancyName === ascendancy
    : !n.ascendancyName && (!n.hiddenOracle || (ascendancy === 'Oracle' && showOracle)));
}

export function getBounds(nodes, padding = 300) {
  if (!nodes.length) return { minX: -500, maxX: 500, minY: -500, maxY: 500 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); }
  return { minX: minX - padding, maxX: maxX + padding, minY: minY - padding, maxY: maxY + padding };
}

/** Find a shortest connected path through eligible nodes. Does not forge implicit edges. */
export function shortestAllocationPath(tree, target, sceneIds, allocated, rootId, isAllowed = () => true) {
  const roots = Array.isArray(rootId) ? rootId : [rootId];
  if (!sceneIds.has(target) || !roots.some(id => sceneIds.has(id))) return null;
  if (roots.includes(target)) return [];
  const sources = [...roots, ...allocated].filter(id => sceneIds.has(id));
  const queue = [], seen = new Set(), parent = new Map();
  for (const id of sources) if (!seen.has(id)) { seen.add(id); queue.push(id); }
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    if (id === target) break;
    for (const next of tree.adjacent.get(id) ?? []) {
      if (!sceneIds.has(next) || seen.has(next) || !isAllowed(tree.nodes.get(next))) continue;
      seen.add(next); parent.set(next, id); queue.push(next);
    }
  }
  if (!seen.has(target)) return null;
  const result = [];
  let step = target;
  while (!sources.includes(step)) { result.push(step); step = parent.get(step); if (step === undefined) return null; }
  return result.reverse().filter(id => !allocated.has(id));
}

/** Discard orphaned allocations after a node is refunded. */
export function pruneAllocations(tree, allocated, rootId, sceneIds) {
  const roots = Array.isArray(rootId) ? rootId : [rootId];
  const visited = new Set(roots); const queue = [...roots];
  for (let i = 0; i < queue.length; i++) {
    for (const next of tree.adjacent.get(queue[i]) ?? []) {
      if (!visited.has(next) && sceneIds.has(next) && allocated.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  const result = new Set([...allocated].filter(id => visited.has(id) && !roots.includes(id)));
  return { result, removed: allocated.size - result.size };
}
