import test from 'node:test';
import assert from 'node:assert/strict';
import {socketedJewelDetails} from '../assets/pob-jewels.js';

test('matches all source jewel sockets by the original passive ID',()=>{
  const a=socketedJewelDetails({sockets:[
    {nodeId:123,itemId:'7',text:'Rare Jewel\n+12% Damage'},
    {nodeId:124,itemId:'8',text:'Unique Jewel'}
  ]});
  assert.equal(a.size,2);
  assert.deepEqual(a.get(123),[{text:'Rare Jewel\n+12% Damage',itemId:'7'}]);
});
test('invalid IDs and empty socket references are ignored without data mutation',()=>{
  const sockets=[{nodeId:NaN,itemId:'7',text:'bad'},{nodeId:0,itemId:'8',text:'bad'},
    {nodeId:10,itemId:'',text:''},{nodeId:12,itemId:'3',text:''},
    {nodeId:12,itemId:'4',text:'Second'}];
  const a=socketedJewelDetails({sockets});
  assert.equal(a.size,1);
  assert.deepEqual(a.get(12),[{text:'',itemId:'3'},{text:'Second',itemId:'4'}]);
  assert.equal(sockets.length,5);
});
