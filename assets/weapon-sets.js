/**
 * PoB2 PassiveSpec allocation modes (src/Classes/PassiveSpec.lua):
 *   0 = shared, 1 = weapon set 1, 2 = weapon set 2.
 * The Spec "nodes" attribute contains every allocated hash. WeaponSet1/2
 * are subsets marking their allocation mode, not additional common passives.
 * This module only partitions imported state; it never rewrites PoB source.
 */
export function partitionPobWeaponSets(spec) {
  const all = new Set((spec?.nodeIds || []).filter(Number.isSafeInteger));
  const input1 = new Set((spec?.weaponSets?.[0] || []).filter(Number.isSafeInteger));
  const input2 = new Set((spec?.weaponSets?.[1] || []).filter(Number.isSafeInteger));
  const overlaps = [...input1].filter(id => input2.has(id));
  const orphaned = [...new Set([...input1, ...input2])].filter(id => !all.has(id));
  const shared = new Set([...all].filter(id => !input1.has(id) && !input2.has(id)));
  const weapon1 = new Set([...input1].filter(id => all.has(id) && !input2.has(id)));
  const weapon2 = new Set([...input2].filter(id => all.has(id) && !input1.has(id)));
  return {
    all, shared, weapon1, weapon2, overlaps, orphaned,
    // Keep contradictory IDs visible in both views, never silently drop them.
    active1:new Set([...shared, ...weapon1, ...overlaps]),
    active2:new Set([...shared, ...weapon2, ...overlaps])
  };
}
