import test from 'node:test';
import assert from 'node:assert/strict';
import {percentile95,pushFrameSample} from '../assets/perf-diagnostics.js';

test('p95 uses a stable sorted percentile and does not mutate input',()=>{
  const values=[20,5,10,35,15];
  assert.equal(percentile95(values),35);
  assert.deepEqual(values,[20,5,10,35,15]);
  assert.equal(percentile95([]),null);
  assert.equal(percentile95([Number.NaN]),null);
});
test('performance sampling is bounded and rejects invalid readings',()=>{
  const data=[];
  for(let i=0;i<200;i++)pushFrameSample(data,i,60);
  assert.equal(data.length,60);
  assert.equal(data[0],140);
  pushFrameSample(data,-1,60);
  pushFrameSample(data,Number.NaN,60);
  assert.equal(data.length,60);
});
