import test from 'node:test';
import assert from 'node:assert/strict';
import {useNormalNodeBatching,normalNodePaint,normalNodeRadius,oracleOverlayStyle} from '../assets/render-quality.js';

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

test('Oracle overlay markers match ordinary passives at every zoom',()=>{
  for(const zoom of [.012,.02,.04,.065,.10,.19,.27,.28,.5,1.8]){
    const ordinary=normalNodeRadius(zoom), overlay=oracleOverlayStyle(zoom);
    assert.equal(overlay.radius,ordinary,'zoom='+zoom);
    assert.ok(overlay.lineWidth<=1.6);
    assert.ok(overlay.connectorWidth<=2.8);
    assert.equal(overlay.doubleRing,zoom>=.28 && ordinary>=5);
  }
  assert.equal(oracleOverlayStyle(.012).radius,1.2);
  assert.equal(oracleOverlayStyle(.04).radius,1.2);
  assert.equal(oracleOverlayStyle(.19).radius,3.99);
  assert.equal(oracleOverlayStyle(.012).doubleRing,false);
  assert.equal(oracleOverlayStyle(.7).doubleRing,true);
});
