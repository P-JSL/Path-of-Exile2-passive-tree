/**
 * Data-driven subset of the in-game passive allocation rules.
 *
 * IMPORTANT: budgets are optional and user supplied. Do not guess a character's
 * level, quest rewards, Ascendancy trial progress, or Weapon Set capacity.
 * Node IDs and graph edges are always sourced from the game export.
 */
// Tree models are constructed from fixed game-export data and are immutable
// during planning. Avoid scanning every node for each point allocation/audit.
const choiceGroupCache = new WeakMap();
export function choiceGroups(tree) {
  const cached = choiceGroupCache.get(tree);
  if (cached) return cached;
  const groups = [];
  for (const parent of tree.nodes.values()) {
    if (!parent.isMultipleChoice) continue;
    const options = [...(tree.adjacent.get(parent.id) || [])]
      .filter(id => tree.nodes.get(id)?.isMultipleChoiceOption);
    if (options.length > 1) groups.push({parent:parent.id,options});
  }
  choiceGroupCache.set(tree, groups);
  return groups;
}

/** Options made unavailable by another allocated option in the same game-defined group. */
export function blockedChoiceOptions(tree, allocated) {
  const selected = allocated instanceof Set ? allocated : new Set(allocated);
  const blocked = new Set();
  for (const {options} of choiceGroups(tree)) {
    if (!options.some(id => selected.has(id))) continue;
    for (const id of options) if (!selected.has(id)) blocked.add(id);
  }
  return blocked;
}

export function pointCost(node) {
  return node?.isFreeAllocate ? 0 : 1;
}

export function countUsedPoints(tree, ids) {
  let total = 0;
  for (const id of ids) {
    const node = tree.nodes.get(id);
    if (node && !node.classesStart && !node.isAscendancyStart && !node.isOnlyImage)
      total += pointCost(node);
  }
  return total;
}

/** Evaluate an entire proposed route, not only the clicked destination. */
export function validateAllocationRoute(tree, existing, route, context = {}) {
  const current = new Set(existing);
  const proposed = Array.isArray(route) ? route : [];
  const category = context.mode || 'passive';
  const asc = context.ascendancy || '';
  const rootIds = new Set(Array.isArray(context.roots) ? context.roots : [context.roots]);
  const accessible = context.visibleIds || new Set(tree.nodes.keys());
  const otherAllocated = context.ascendancyAllocated || {};
  const required = new Set();
  for (const id of proposed) {
    const node = tree.nodes.get(id);
    if (!node || !accessible.has(id)) return {ok:false,reason:'unavailable',nodeId:id};
    if (rootIds.has(id) || node.classesStart || node.isAscendancyStart || node.isOnlyImage)
      return {ok:false,reason:'unallocatable',nodeId:id};
    if (node.ascendancyName && (category !== 'ascendancy' || node.ascendancyName !== asc))
      return {ok:false,reason:'otherAscendancy',nodeId:id};
    if (category === 'ascendancy' && node.ascendancyName !== asc)
      return {ok:false,reason:'otherAscendancy',nodeId:id};
    const requirement = node.unlockConstraint;
    if (requirement) {
      if (requirement.ascendancy && requirement.ascendancy !== asc)
        return {ok:false,reason:'locked',nodeId:id};
      for (const prerequisite of requirement.nodes || []) {
        const prerequisiteNode = tree.nodes.get(prerequisite);
        const allocatedInOwnTree = current.has(prerequisite);
        const allocatedInAsc = prerequisiteNode?.ascendancyName &&
          (otherAllocated[prerequisiteNode.ascendancyName] || []).includes(prerequisite);
        if (!allocatedInOwnTree && !allocatedInAsc)
          return {ok:false,reason:'prerequisite',nodeId:id,requiredId:prerequisite};
      }
    }
    current.add(id);
    required.add(id);
  }
  for (const group of choiceGroups(tree)) {
    const choices = group.options.filter(id => current.has(id));
    if (choices.length > 1) return {ok:false,reason:'exclusiveChoice',nodeId:choices[1],groupId:group.parent};
  }
  const maxPoints = context.maxPoints;
  if (Number.isSafeInteger(maxPoints) && maxPoints >= 0 &&
      countUsedPoints(tree,current) > maxPoints)
    return {ok:false,reason:'pointBudget',used:countUsedPoints(tree,current),max:maxPoints};
  return {ok:true,allocated:current,added:[...required]};
}

/** Describes old/imported plans without deleting or mutating user allocations. */
export function auditAllocations(tree, selected, context = {}) {
  const current = new Set(selected);
  const findings = [];
  // Old links or browser plans can contain isolated branches. Report them
  // rather than deleting any saved nodes without the user's explicit action.
  const starts = Array.isArray(context.roots) ? context.roots : [context.roots];
  const reachable = new Set(starts.filter(id => tree.nodes.has(id)));
  const queue = [...reachable];
  for (let index = 0; index < queue.length; index++) {
    for (const neighbor of tree.adjacent.get(queue[index]) || []) {
      if (!reachable.has(neighbor) && current.has(neighbor)) {
        reachable.add(neighbor); queue.push(neighbor);
      }
    }
  }
  const isolated = [...current].filter(id =>
    tree.nodes.has(id) && !reachable.has(id) && !tree.nodes.get(id)?.isFreeAllocate);
  if (isolated.length) findings.push({reason:'disconnected',nodeIds:isolated});
  for (const group of choiceGroups(tree)) {
    const allocated = group.options.filter(id => current.has(id));
    if (allocated.length > 1) findings.push({reason:'exclusiveChoice',nodeIds:allocated,groupId:group.parent});
  }
  const max = context.maxPoints;
  if (Number.isSafeInteger(max) && max >= 0 && countUsedPoints(tree,current) > max)
    findings.push({reason:'pointBudget',used:countUsedPoints(tree,current),max});
  for (const id of current) {
    const node = tree.nodes.get(id);
    if (!node) { findings.push({reason:'unavailable',nodeIds:[id]}); continue; }
    if (context.visibleIds && !context.visibleIds.has(id))
      findings.push({reason:'unavailable',nodeIds:[id]});
    if (node.classesStart || node.isAscendancyStart || node.isOnlyImage ||
        starts.includes(id))
      findings.push({reason:'unallocatable',nodeIds:[id]});
    if ((node.ascendancyName && (context.mode !== 'ascendancy' || node.ascendancyName !== context.ascendancy)) ||
        (context.mode === 'ascendancy' && node.ascendancyName !== context.ascendancy))
      findings.push({reason:'otherAscendancy',nodeIds:[id]});
    const constraint = node.unlockConstraint;
    if (!constraint) continue;
    if (constraint.ascendancy && constraint.ascendancy !== context.ascendancy) {
      findings.push({reason:'locked',nodeIds:[id]}); continue;
    }
    for (const required of constraint.nodes || []) {
      const other = tree.nodes.get(required);
      const otherHas = other?.ascendancyName &&
        (context.ascendancyAllocated?.[other.ascendancyName] || []).includes(required);
      if (!current.has(required) && !otherHas)
        findings.push({reason:'prerequisite',nodeIds:[id],requiredId:required});
    }
  }
  return findings;
}
