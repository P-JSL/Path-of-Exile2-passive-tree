import test from 'node:test';
import assert from 'node:assert/strict';
import {oracleDifference} from '../assets/oracle-difference.js';

function fixture() {
  const nodes=[
    {id:1,name:'Root',x:0,y:0,group:1},
    {id:2,name:'Regular',x:100,y:0,group:1},
    {id:3,name:'Unseen A',x:200,y:0,group:2,
      hiddenOracle:true,unlockConstraint:{ascendancy:'Oracle'}},
    {id:4,name:'Unseen B',x:250,y:20,group:2,
      hiddenOracle:true,unlockConstraint:{ascendancy:'Oracle'}},
    {id:5,name:'Other Ascendancy',x:280,y:0,group:2,
      ascendancyName:'Oracle',hiddenOracle:true,unlockConstraint:{ascendancy:'Oracle'}},
    {id:6,name:'Other class data',x:9000,y:0,group:3},
    {id:7,name:'Inaccessible',x:300,y:40,group:3,
      hiddenOracle:true,unlockConstraint:{ascendancy:'Oracle'}}
  ];
  return {nodes:new Map(nodes.map(n=>[n.id,n])),edges:[
    {a:1,b:2},{a:2,b:3},{a:3,b:4},{a:3,b:5},{a:4,b:6},{a:4,b:7}
  ]};
}
test('Oracle difference returns exact source-defined extra nodes and nearby real links',()=>{
  const tree=fixture();
  const result=oracleDifference(tree);
  assert.deepEqual(result.nodes.map(n=>n.id),[3,4,7]);
  assert.equal(result.baseCount,3);
  assert.deepEqual(result.edges.map(e=>[e.a,e.b]),[[2,3],[3,4],[4,7]]);
  assert.deepEqual(result.groups.map(g=>g.id),['2','3']);
  assert.equal(tree.nodes.get(3).hiddenOracle,true);
});
test('other ascendancies cannot leak into the difference',()=>{
  const output=oracleDifference(fixture(),'Chronomancer');
  assert.equal(output.nodes.length,0);
  assert.equal(output.edges.length,0);
});
test('nodes with no Oracle unlock flag are never manufactured',()=>{
  const tree=fixture();
  tree.nodes.get(3).hiddenOracle=true;
  delete tree.nodes.get(3).unlockConstraint;
  const result=oracleDifference(tree);
  assert.deepEqual(result.nodes.map(n=>n.id),[4,7]);
  assert.equal(result.edges.some(edge=>edge.a===2 && edge.b===3),false);
});
