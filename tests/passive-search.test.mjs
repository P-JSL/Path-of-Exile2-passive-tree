import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPassiveSearchIndex, searchPassiveIndex, normalizePassiveText } from '../assets/passive-search.js';

const index = buildPassiveSearchIndex([
  { id: 15, name: '화염 피해', originalName: 'Fire Damage', stats: ['화염 피해 15% 증가'], originalStats: ['15% increased Fire Damage'] },
  { id: 12, name: '화염 숙련', originalName: 'Fire Mastery', stats: ['화염 피해 10% 증가'], originalStats: ['10% increased Fire Damage'] },
  { id: 9, name: '생명력', originalName: 'Life', stats: ['최대 생명력 5% 증가'] },
  { id: 20, name: '화염 피해', originalName: 'Fire Damage', stats: [] }
]);

test('name, translated description and original English description can all be searched', () => {
  assert.deepEqual(searchPassiveIndex(index, 'fire damage').map(r => r.id), [15, 20, 12]);
  assert.deepEqual(searchPassiveIndex(index, '생명력').map(r => r.id), [9]);
  assert.deepEqual(searchPassiveIndex(index, '15% increased').map(r => r.id), [15]);
});

test('search supports multiword AND terms, Unicode NFKC and exact IDs', () => {
  assert.deepEqual(searchPassiveIndex(index, '화염 증가').map(r => r.id), [15, 12]);
  assert.deepEqual(searchPassiveIndex(index, '15').map(r => r.id)[0], 15);
  assert.equal(normalizePassiveText('  ＦＩＲＥ   Damage  '), 'fire damage');
  assert.deepEqual(searchPassiveIndex(index, '  ').map(r => r.id), []);
});

test('matches are ranked name first, then effect, and results are stable', () => {
  const results = searchPassiveIndex(index, '화염 피해');
  assert.deepEqual(results.map(r => r.id), [15, 20, 12]);
  assert.deepEqual(searchPassiveIndex(index, 'not-found'), []);
});
