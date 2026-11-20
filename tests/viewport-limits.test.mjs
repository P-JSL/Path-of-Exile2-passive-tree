import test from 'node:test';
import assert from 'node:assert/strict';
import {clampTreeViewport} from '../assets/viewport-limits.js';

const b={minX:-1000,maxX:1000,minY:-500,maxY:500};
test('tree viewport retains an in-bounds camera position',()=>{
  assert.deepEqual(clampTreeViewport(b,0,100,900,600,.5),{x:0,y:100});
});
test('tree viewport limits oversized desktop and touch drags',()=>{
  const p=clampTreeViewport(b,100000,-100000,1000,700,1);
  assert.deepEqual(p,{x:1180,y:-626});
});
test('zoomed-out view permits limited overscroll while refusing a blank remote pan',()=>{
  const p=clampTreeViewport(b,-50000,50000,400,300,.01);
  assert.deepEqual(p,{x:-2400,y:1900});
});
test('uninitialized view is not constrained',()=>{
  assert.deepEqual(clampTreeViewport(null,100,200,0,0,.5),{x:100,y:200});
});
