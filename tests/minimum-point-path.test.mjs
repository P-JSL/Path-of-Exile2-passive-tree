import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumPointAllocationPath} from '../assets/minimum-point-path.js';

function graph(nodeDefs, pairs) {
  const nodes = new Map(nodeDefs.map(n=>[n.id,n]));
  const adjacent = new Map(nodeDefs.map(n=>[n.id,new Set()]));
  for (const [a,b] of pairs) { adjacent.get(a).add(b); adjacent.get(b).add(a); }
  return {nodes,adjacent};
}
test('free nodes are preferred when they reduce newly consumed passive points',()=>{
  // A: 1->2->3->6 = 3 points, B: 1->4(free)->5->6 = 2 points.
  const tree=graph([{id:1},{id:2},{id:3},{id:4,isFreeAllocate:true},{id:5},{id:6}],
    [[1,2],[2,3],[3,6],[1,4],[4,5],[5,6]]);
  assert.deepEqual(minimumPointAllocationPath(tree,6,new Set(tree.nodes.keys()),new Set(),1),[4,5,6]);
});
test('among equal point-cost routes, fewer graph edges are preferred',()=>{
  const tree=graph([{id:1},{id:2},{id:3,isFreeAllocate:true},{id:4},{id:5}],
    [[1,2],[2,5],[1,3],[3,4],[4,5]]);
  assert.deepEqual(minimumPointAllocationPath(tree,5,new Set(tree.nodes.keys()),new Set(),1),[2,5]);
});
test('only connected existing allocations are valid search sources',()=>{
  const tree=graph([{id:1},{id:2},{id:3},{id:7},{id:8},{id:9}],
    [[1,2],[2,3],[7,8],[8,9]]);
  const all=new Set(tree.nodes.keys());
  assert.deepEqual(minimumPointAllocationPath(tree,3,all,new Set([2,7,8]),1),[3]);
  assert.equal(minimumPointAllocationPath(tree,9,all,new Set([7,8]),1),null);
});
test('blocked nodes and hidden scenes cannot be traversed',()=>{
  const tree=graph([{id:1},{id:2},{id:3}],[[1,2],[2,3]]);
  const all=new Set(tree.nodes.keys());
  assert.equal(minimumPointAllocationPath(tree,3,all,new Set(),1,n=>n.id!==2),null);
  assert.equal(minimumPointAllocationPath(tree,3,new Set([1,2]),new Set(),1),null);
  assert.deepEqual(minimumPointAllocationPath(tree,1,all,new Set(),1),[]);
});
test('no input graph, allocation or visible set is mutated',()=>{
  const tree=graph([{id:1},{id:2},{id:3}],[[1,2],[2,3]]);
  const allocated=new Set([2]), visible=new Set(tree.nodes.keys());
  assert.deepEqual(minimumPointAllocationPath(tree,3,visible,allocated,1),[3]);
  assert.deepEqual([...allocated],[2]);
  assert.equal(visible.size,3);
  assert.deepEqual([...tree.adjacent.get(2)],[1,3]);
});
