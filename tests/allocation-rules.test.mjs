import test from 'node:test';
import assert from 'node:assert/strict';
import {choiceGroups, pointCost, countUsedPoints, validateAllocationRoute, auditAllocations} from '../assets/allocation-rules.js';

const records = [
  {id:1,name:'Start',classesStart:['Druid'],connections:[{id:2}]},
  {id:2,name:'Bridge',connections:[{id:1},{id:5}]},
  {id:5,name:'Multiple Choice',isMultipleChoice:true,connections:[{id:6},{id:7}]},
  {id:6,name:'Choice A',isMultipleChoiceOption:true,connections:[{id:5}]},
  {id:7,name:'Choice B',isMultipleChoiceOption:true,connections:[{id:5}]},
  {id:8,name:'Free',isFreeAllocate:true},
  {id:9,name:'Locked',unlockConstraint:{ascendancy:'Oracle',nodes:[101]}},
  {id:10,name:'Image',isOnlyImage:true},
  {id:101,name:'The Unseen Path',ascendancyName:'Oracle'},
  {id:11,name:'Jewel Socket',isJewelSocket:true}
];
const nodes=new Map(records.map(n=>[n.id,n]));
const adjacent=new Map(records.map(n=>[n.id,new Set(n.connections?.map(c=>c.id)||[])]));
const tree={nodes,adjacent};
const base={mode:'passive',className:'Druid',ascendancy:'Oracle',roots:[1],visibleIds:new Set([...nodes.keys()]),ascendancyAllocated:{}};

test('multiple-choice options are mutually exclusive by official graph relationships',()=>{
  assert.deepEqual(choiceGroups(tree),[{parent:5,options:[6,7]}]);
  const one=validateAllocationRoute(tree,new Set([2,5]),[6],base);
  assert.equal(one.ok,true);
  const both=validateAllocationRoute(tree,one.allocated,[7],base);
  assert.deepEqual({reason:both.reason,groupId:both.groupId},{reason:'exclusiveChoice',groupId:5});
  assert.equal(one.allocated.has(7),false);
});

test('Oracle prerequisites are sourced from node-specific unlockConstraint data',()=>{
  assert.equal(validateAllocationRoute(tree,new Set([2]),[9],base).reason,'prerequisite');
  const allowed={...base,ascendancyAllocated:{Oracle:[101]}};
  assert.equal(validateAllocationRoute(tree,new Set([2]),[9],allowed).ok,true);
  const other={...allowed,ascendancy:'Witchhunter'};
  assert.equal(validateAllocationRoute(tree,new Set([2]),[9],other).reason,'locked');
});

test('point budgets are opt-in and free nodes do not consume ordinary points',()=>{
  assert.equal(pointCost(nodes.get(8)),0);
  assert.equal(countUsedPoints(tree,new Set([1,2,5,8])),2);
  assert.equal(validateAllocationRoute(tree,new Set([2]),[8],{...base,maxPoints:1}).ok,true);
  assert.equal(validateAllocationRoute(tree,new Set([2]),[5],{...base,maxPoints:1}).reason,'pointBudget');
  assert.equal(validateAllocationRoute(tree,new Set([2]),[5],base).ok,true);
});

test('images, roots, other ascendancies and missing nodes are not allocatable',()=>{
  for(const id of [1,10])assert.equal(validateAllocationRoute(tree,new Set(),[id],base).reason,'unallocatable');
  assert.equal(validateAllocationRoute(tree,new Set(),[101],base).reason,'otherAscendancy');
  assert.equal(validateAllocationRoute(tree,new Set(),[777],base).reason,'unavailable');
});

test('old plans are reported but never silently modified',()=>{
  const old=new Set([2,5,6,7,9,11]);
  const findings=auditAllocations(tree,old,{...base,maxPoints:3});
  assert.ok(findings.some(f=>f.reason==='exclusiveChoice'));
  assert.ok(findings.some(f=>f.reason==='prerequisite'));
  assert.ok(findings.some(f=>f.reason==='pointBudget'));
  assert.equal(old.size,6);
});
