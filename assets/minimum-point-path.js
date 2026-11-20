/**
 * Minimum-cost route across the *actual* connected game passive graph.
 * Cost = extra spent passive points (game-defined free nodes cost zero).
 * Equal-point routes prefer fewer traversed nodes.
 * Root reachability is established before searching so disconnected imported
 * allocations cannot become artificial path roots.
 */
function before(a, b) {
  return a.points < b.points ||
    (a.points === b.points && (a.hops < b.hops ||
      (a.hops === b.hops && a.order < b.order)));
}
class MinQueue {
  constructor() { this.items = []; }
  push(item) {
    const items = this.items;
    let index = items.length;
    items.push(item);
    while (index) {
      const parent = (index - 1) >> 1;
      if (!before(item, items[parent])) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return null;
    const head = items[0], tail = items.pop();
    if (!items.length) return head;
    let index = 0;
    while (true) {
      const left = index * 2 + 1, right = left + 1;
      if (left >= items.length) break;
      const child = right < items.length && before(items[right], items[left]) ? right : left;
      if (!before(items[child], tail)) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = tail;
    return head;
  }
  get size() { return this.items.length; }
}

/**
 * @param {object} tree Graph with nodes and adjacent maps.
 * @param {number} target Target passive skill ID.
 * @param {Set<number>} visibleIds The selected scene's real node IDs.
 * @param {Set<number>} allocated Existing plan nodes; never mutated.
 * @param {number|number[]} rootId Class or ascendancy root node IDs.
 * @param {(node:object)=>boolean} isAllowed Availability predicate.
 * @returns {number[]|null} Newly required node IDs in path order, or null.
 */
export function minimumPointAllocationPath(tree, target, visibleIds, allocated, rootId, isAllowed = () => true) {
  const roots = Array.isArray(rootId) ? rootId : [rootId];
  if (!visibleIds.has(target) || !roots.some(id => visibleIds.has(id))) return null;
  if (roots.includes(target)) return [];

  // Existing allocations count as roots only when reachable through an
  // uninterrupted chain from the actual class/ascendancy origin.
  const connected = new Set(roots.filter(id => visibleIds.has(id)));
  const queue = [...connected];
  for (let i = 0; i < queue.length; ++i) {
    for (const next of tree.adjacent.get(queue[i]) || []) {
      if (!connected.has(next) && visibleIds.has(next) && allocated.has(next) &&
          isAllowed(tree.nodes.get(next))) {
        connected.add(next);
        queue.push(next);
      }
    }
  }
  if (connected.has(target)) return [];

  const heap = new MinQueue();
  const best = new Map(), parent = new Map();
  let order = 0;
  for (const id of connected) {
    best.set(id, {points:0,hops:0});
    heap.push({id,points:0,hops:0,order:order++});
  }
  while (heap.size) {
    const current = heap.pop();
    const recorded = best.get(current.id);
    if (current.points !== recorded?.points || current.hops !== recorded?.hops) continue;
    if (current.id === target) break;
    for (const next of tree.adjacent.get(current.id) || []) {
      if (!visibleIds.has(next)) continue;
      const node = tree.nodes.get(next);
      if (!node || !isAllowed(node)) continue;
      const points = current.points + (allocated.has(next) || node.isFreeAllocate ? 0 : 1);
      const hops = current.hops + 1;
      const previous = best.get(next);
      if (previous && (previous.points < points ||
          (previous.points === points && previous.hops <= hops))) continue;
      best.set(next, {points,hops});
      parent.set(next, current.id);
      heap.push({id:next,points,hops,order:order++});
    }
  }
  if (!best.has(target)) return null;
  const result = [];
  let step = target;
  while (!connected.has(step)) {
    result.push(step);
    step = parent.get(step);
    if (step === undefined) return null;
  }
  return result.reverse().filter(id => !allocated.has(id));
}
