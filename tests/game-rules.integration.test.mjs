import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTree} from '../assets/tree-model.js';
import {choiceGroups, pointCost, validateAllocationRoute} from '../assets/allocation-rules.js';

const raw=JSON.parse(readFileSync(new URL('../data/tree.json',import.meta.url),'utf8'));
const tree=buildTree(raw);

test('five real GGG multiple-choice groups retain their option membership',()=>{
  const groups=choiceGroups(tree);
  assert.equal(groups.length,5);
  const expected=new Map([[16433,2],[42416,2],[52395,3],[57141,5],[60287,3]]);
  for(const group of groups)assert.equal(group.options.length,expected.get(group.parent));
  const brew=groups.find(g=>g.parent===57141);
  const ctx={mode:'ascendancy',ascendancy:tree.nodes.get(9710).ascendancyName,visibleIds:new Set(tree.nodes.keys())};
  const result=validateAllocationRoute(tree,new Set([9710]),[18940],ctx);
  assert.equal(result.reason,'exclusiveChoice');
});

test('Sacred Unity is free only after all three real prerequisites',()=>{
  const sacred=tree.nodes.get(28254);
  assert.equal(sacred.isFreeAllocate,true);
  assert.deepEqual(sacred.unlockConstraint.nodes,[41401,62743,46070]);
  assert.equal(pointCost(sacred),0);
  const context={mode:'ascendancy',ascendancy:'Spirit Walker',visibleIds:new Set(tree.nodes.keys())};
  const missing=validateAllocationRoute(tree,new Set([41401,62743]),[28254],context);
  assert.equal(missing.reason,'prerequisite');
  assert.equal(missing.requiredId,46070);
  const ready=validateAllocationRoute(tree,new Set([41401,62743,46070]),[28254],context);
  assert.equal(ready.ok,true);
});

test('game Oracle nodes retain their exact The Unseen Path unlock prerequisite',()=>{
  const node=tree.nodes.get(479);
  assert.equal(node.unlockConstraint.ascendancy,'Oracle');
  assert.deepEqual(node.unlockConstraint.nodes,[5571]);
  const ctx={mode:'passive',ascendancy:'Oracle',visibleIds:new Set(tree.nodes.keys()),ascendancyAllocated:{Oracle:[5571]}};
  assert.equal(validateAllocationRoute(tree,new Set(),[479],ctx).ok,true);
  const denied=validateAllocationRoute(tree,new Set(),[479],{...ctx,ascendancyAllocated:{}});
  assert.equal(denied.reason,'prerequisite');
});
