import test from 'node:test';
import assert from 'node:assert/strict';
import { partitionPobWeaponSets } from '../assets/weapon-sets.js';

test('PoB2 spec nodes are all allocated, with WeaponSet1/2 as mode subsets', () => {
  const spec={nodeIds:[1,2,3,4],weaponSets:[[3],[4]]};
  const data=partitionPobWeaponSets(spec);
  assert.deepEqual([...data.shared],[1,2]);
  assert.deepEqual([...data.active1],[1,2,3]);
  assert.deepEqual([...data.active2],[1,2,4]);
  assert.deepEqual([...data.all],[1,2,3,4]);
  assert.deepEqual([...spec.nodeIds],[1,2,3,4]);
});
test('empty and duplicate lists remain safe, and do not synthesize nodes',()=>{
  const data=partitionPobWeaponSets({nodeIds:[1,1,2],weaponSets:[[2,2,99],[]]});
  assert.deepEqual([...data.all],[1,2]);
  assert.deepEqual(data.orphaned,[99]);
  assert.deepEqual([...data.active1],[1,2]);
  assert.deepEqual([...data.active2],[1]);
});
test('conflicting dual-set allocations are flagged but retained for inspection',()=>{
  const data=partitionPobWeaponSets({nodeIds:[1,5],weaponSets:[[5],[5]]});
  assert.deepEqual(data.overlaps,[5]);
  assert.deepEqual([...data.active1],[1,5]);
  assert.deepEqual([...data.active2],[1,5]);
});
