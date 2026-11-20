import test from 'node:test';
import assert from 'node:assert/strict';
import {useNormalNodeBatching,normalNodePaint} from '../assets/render-quality.js';

test('full overview and moving tree can batch normal nodes',()=>{
  assert.equal(useNormalNodeBatching(0.04,false,true),true);
  assert.equal(useNormalNodeBatching(0.2,true,true),true);
  assert.equal(useNormalNodeBatching(0.2,false,true),false);
  assert.equal(useNormalNodeBatching(0.9,true,true),false);
  assert.equal(useNormalNodeBatching(0.02,true,false),false);
});
test('drawing style preserves selected allocation and oracle visual semantics',()=>{
  assert.deepEqual(normalNodePaint({hiddenOracle:false},false,false,false),{
    fill:'#111c2a',stroke:'#8194a3',alpha:1
  });
  assert.equal(normalNodePaint({hiddenOracle:false},true,true,false).alpha,0.3);
  assert.equal(normalNodePaint({hiddenOracle:true},false,true,true).alpha,0.55);
  assert.equal(normalNodePaint({hiddenOracle:false},true,false,false).fill,'#54d9b6');
});
