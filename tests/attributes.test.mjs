import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anyAttributeAmount, isAnyAttributeNode, selectedAttributeStat,
  validAttributeChoices, encodeAttributeChoices, decodeAttributeChoices
} from '../assets/attributes.js';

test('attribute selection applies only to any Attribute travel passives', () => {
  assert.equal(anyAttributeAmount('+5 to any Attribute'), 5);
  assert.equal(anyAttributeAmount('5 to any Attribute'), 5);
  assert.equal(anyAttributeAmount('+10 to Strength'), null);
  assert.equal(isAnyAttributeNode({ stats:['+5 to any Attribute'] }), true);
  assert.equal(isAnyAttributeNode({ stats:['+5 to all Attributes'] }), false);
  assert.equal(isAnyAttributeNode({ stats:['5% increased Attributes'] }), false);
  assert.equal(isAnyAttributeNode({ stats:[] }), false);
});

test('a selected attribute retains the source magnitude and supports both languages', () => {
  assert.equal(selectedAttributeStat('+5 to any Attribute', 'str', 'ko'), '힘 +5');
  assert.equal(selectedAttributeStat('+5 to any Attribute', 'dex', 'ko'), '민첩 +5');
  assert.equal(selectedAttributeStat('+5 to any Attribute', 'int', 'ko'), '지능 +5');
  assert.equal(selectedAttributeStat('+5 to any Attribute', 'int', 'en'), '+5 to Intelligence');
  assert.equal(selectedAttributeStat('+10 to any Attribute', 'str', 'ko'), '힘 +10');
  assert.equal(selectedAttributeStat('+5 to any Attribute', '', 'ko'), null);
  assert.equal(selectedAttributeStat('+5 to all Attributes', 'str', 'ko'), null);
});

test('sanitize and serialize attribute choices without changing allocated passive IDs', () => {
  assert.deepEqual(validAttributeChoices({ Druid:{ 11:'str', 22:'dex', 33:'invalid', abc:'int' }, Warrior:{ 44:'int' } }), {
    Druid:{ 11:'str', 22:'dex' }, Warrior:{ 44:'int' }
  });
  const allocated = [11, 22, 44];
  assert.equal(encodeAttributeChoices({ 11:'str', 22:'dex', 33:'int' }, allocated), '11:s.22:d');
  assert.deepEqual(decodeAttributeChoices('11:s.22:d.33:i.bad.44:i', allocated), {11:'str',22:'dex',44:'int'});
  assert.deepEqual(decodeAttributeChoices('11:z.55:i', allocated), {});
});
