/**
 * Imported PoB2 reset scope: only keys whose allocations were replaced by
 * importing or changing an original PoB2 passive tree may be cleared.
 */
export function recordPobAppliedScope(previous, target) {
  const classes = new Set(previous?.classes || []);
  const ascendancies = new Set(previous?.ascendancies || []);
  if (target.className) classes.add(target.className);
  if (target.ascendancy) ascendancies.add(target.ascendancy);
  return { classes:[...classes], ascendancies:[...ascendancies] };
}

/** Remove recorded imported allocations without modifying other saved plans. */
export function clearImportedPobPlans(state, scopes) {
  const allocations={...state.allocations};
  const ascAllocations={...state.ascAllocations};
  const attributeChoices={...state.attributeChoices};
  for (const name of scopes.classes || []) {
    delete allocations[name];
    delete attributeChoices[name];
  }
  for (const name of scopes.ascendancies || []) delete ascAllocations[name];
  return {allocations,ascAllocations,attributeChoices};
}

/** Never trust source metadata to authorize deleting unrelated classes. */
export function safeImportedPobScopes(saved, className, validAscendancies, fallbackAscendancy='') {
  const allowed=new Set(validAscendancies);
  const remembered=Array.isArray(saved?.ascendancies) ? saved.ascendancies : null;
  const ascendancies=(remembered ?? (fallbackAscendancy?[fallbackAscendancy]:[]))
    .filter(name=>typeof name==='string' && allowed.has(name));
  return {classes:[className],ascendancies:[...new Set(ascendancies)]};
}
