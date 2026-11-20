import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../data/ko-stat-overrides.json',import.meta.url),'utf8')).stats;

test('all remaining 84 unmatched modifiers have distinct Korean translations',()=>{
  assert.equal(Object.keys(catalog).length,84);
  for(const [source,korean] of Object.entries(catalog)) {
    assert.ok(source && korean && /[가-힣]/.test(korean), 'Missing Korean modifier for '+source);
    assert.notEqual(source,korean);
  }
});
test('manually translated modifiers preserve every numeric constant',()=>{
  const numbers=text=>text.match(/-?\d+(?:\.\d+)?/g)||[];
  for(const [source,korean] of Object.entries(catalog)) {
    const remaining=numbers(korean);
    for(const number of numbers(source)) {
      const index=remaining.indexOf(number);
      assert.ok(index>=0,'Numeric value '+number+' missing for '+source);
      remaining.splice(index,1);
    }
  }
});
