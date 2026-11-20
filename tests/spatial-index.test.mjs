import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewportIndex} from '../assets/spatial-index.js';

test('viewport index excludes nonvisible nodes while retaining nearby hit targets',()=>{
  const nodes=[{id:1,x:0,y:0},{id:2,x:2400,y:2400},{id:3,x:-900,y:0}];
  const map=new Map(nodes.map(n=>[n.id,n]));
  const index=new ViewportIndex(nodes,[],map,[],400);
  assert.deepEqual([...index.visibleNodes(-80,-80,80,80)].map(n=>n.id),[1]);
  assert.equal(index.nearest(10,5,24)?.id,1);
  assert.equal(index.nearest(10,5,3),null);
});
test('same-orbit connectors are indexed by full official group circle bounds',()=>{
  const a={id:1,x:100,y:0,group:2,orbit:1,groupX:0,groupY:0};
  const b={id:2,x:-100,y:0,group:2,orbit:1,groupX:0,groupY:0};
  const e={a:1,b:2,orbit:1};
  const index=new ViewportIndex([a,b],[e],new Map([[1,a],[2,b]]),[0,100],40);
  assert.equal(index.visibleEdges(-1,90,1,110).has(e),true);
  assert.equal(index.visibleEdges(900,900,950,950).has(e),false);
});
test('straight links crossing viewport are still visible with offscreen endpoints',()=>{
  const a={id:1,x:-3000,y:0},b={id:2,x:3000,y:0},e={a:1,b:2,orbit:0};
  const index=new ViewportIndex([a,b],[e],new Map([[1,a],[2,b]]),[],500);
  assert.equal(index.visibleEdges(-30,-30,30,30).has(e),true);
});
