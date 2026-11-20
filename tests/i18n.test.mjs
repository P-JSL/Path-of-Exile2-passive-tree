import test from 'node:test';
import assert from 'node:assert/strict';
import { tr, passiveName, passiveStat, SUPPORTED_LANGUAGES } from '../assets/i18n.js';

test('language options have localized labels and English remains available', () => {
  assert.deepEqual(SUPPORTED_LANGUAGES, ['ko', 'en']);
  assert.equal(tr('language', 'ko'), '언어');
  assert.equal(tr('language', 'en'), 'Language');
  assert.equal(tr('nodeCount', 'en', { count: 11 }), '11 nodes');
  assert.equal(tr('nodeCount', 'ko', { count: 11 }), '11개 노드');
});
test('localization keeps IDs and game stat values unmodified', () => {
  const catalog = { names: { 'Oracle': '오라클' } };
  assert.equal(passiveName('Oracle', 'ko', catalog), '오라클');
  assert.equal(passiveName('Oracle', 'en', catalog), 'Oracle');
  assert.equal(passiveName('Unknown node', 'ko', catalog), 'Unknown node');
  assert.equal(passiveStat('12% increased Fire Damage', 'ko'), '화염 피해 12% 증가');
  assert.equal(passiveStat('12% increased Fire Damage', 'en'), '12% increased Fire Damage');
  assert.equal(passiveStat('Unknown game-specific modifier', 'ko'), 'Unknown game-specific modifier');
});
