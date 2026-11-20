import test from 'node:test';
import assert from 'node:assert/strict';
import {recordPobAppliedScope,clearImportedPobPlans,safeImportedPobScopes} from '../assets/pob-reset.js';

test('reset removes only allocations and attributes written by this PoB import',()=>{
  const state={
    allocations:{Druid:[10,20],Monk:[99]},
    ascAllocations:{Oracle:[30],Chronomancer:[98],Invoker:[97]},
    attributeChoices:{Druid:{10:'Strength'},Monk:{99:'Dexterity'}},
    extraAllocations:{atlas:[56],genesis:[88]},
    budgets:{passive:120}
  };
  const scopes=recordPobAppliedScope(null,{className:'Druid',ascendancy:'Oracle'});
  const result=clearImportedPobPlans(state,scopes);
  assert.deepEqual(result.allocations,{Monk:[99]});
  assert.deepEqual(result.ascAllocations,{Chronomancer:[98],Invoker:[97]});
  assert.deepEqual(result.attributeChoices,{Monk:{99:'Dexterity'}});
  assert.deepEqual(state.allocations,{Druid:[10,20],Monk:[99]});
  assert.deepEqual(state.extraAllocations,{atlas:[56],genesis:[88]});
  assert.deepEqual(state.budgets,{passive:120});
});

test('changing imported specifications accumulates only the actually affected ascendancies',()=>{
  const one=recordPobAppliedScope(null,{className:'Druid',ascendancy:'Oracle'});
  const two=recordPobAppliedScope(one,{className:'Druid',ascendancy:'Chronomancer'});
  const three=recordPobAppliedScope(two,{className:'Druid',ascendancy:'Oracle'});
  assert.deepEqual(three,{classes:['Druid'],ascendancies:['Oracle','Chronomancer']});
  assert.deepEqual(one,{classes:['Druid'],ascendancies:['Oracle']});
});

test('restored metadata cannot reset unrelated classes or another class ascendancy',()=>{
  const scope=safeImportedPobScopes({
    classes:['Monk','Druid'],ascendancies:['Invoker','Oracle','Oracle','Chronomancer']
  },'Druid',['Oracle','Chronomancer'],'Oracle');
  assert.deepEqual(scope,{classes:['Druid'],ascendancies:['Oracle','Chronomancer']});
  assert.deepEqual(safeImportedPobScopes({},'Druid',['Oracle'],'Oracle'),
    {classes:['Druid'],ascendancies:['Oracle']});
  assert.deepEqual(safeImportedPobScopes({ascendancies:[]},'Druid',['Oracle'],'Oracle'),
    {classes:['Druid'],ascendancies:[]});
});
