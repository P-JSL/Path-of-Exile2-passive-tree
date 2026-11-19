import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExtraTree } from '../assets/extra-model.js';
import { shortestAllocationPath, pruneAllocations } from '../assets/tree-model.js';
const raw = { title: 'Atlas', orbit_radii: [0,82], skills_per_orbit: [1,12], roots:[1,4], groups: {
  1:{ x:0,y:0,passives:[{hash:1,radius:0,position_clockwise:0,connections:[2]}]},
  2:{ x:100,y:0,passives:[{hash:2,radius:1,position_clockwise:3,connections:[1,3]}]},
  3:{ x:200,y:0,passives:[{hash:3,radius:0,position_clockwise:0,connections:[2]}]},
  4:{ x:500,y:0,passives:[{hash:4,radius:0,position_clockwise:0,connections:[]}]}
},passives: {
  1:{hash:1,name:'Atlas Root',stat_text:[],stats:{}},
  2:{hash:2,name:'Value',stat_text:['Gain [Example|10] Damage'],stats:{}},
  3:{hash:3,name:'Notable',is_notable:true,stats:{increase:40}},
  4:{hash:4,name:'Another Root',stats:{}}
}};
test('atlas adapter reproduces node IDs, radius, text, and graph',()=>{
  const model=buildExtraTree(raw,'atlas');
  assert.equal(model.nodes.size,4);
  assert.equal(model.nodes.get(2).x,182);
  assert.ok(Math.abs(model.nodes.get(2).y) < 1e-9);
  assert.equal(model.nodes.get(2).stats[0],'Gain 10 Damage');
  assert.equal(model.nodes.get(3).stats[0],'increase: 40');
  assert.equal(model.nodes.get(3).category,'notable');
  assert.deepEqual(shortestAllocationPath(model,3,new Set(model.nodes.keys()),new Set(),model.roots),[2,3]);
  assert.equal(pruneAllocations(model,new Set([3]),model.roots,new Set(model.nodes.keys())).removed,1);
});
