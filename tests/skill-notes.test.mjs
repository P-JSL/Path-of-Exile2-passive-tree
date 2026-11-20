import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSkillKeywords, plainSkillText, verifiedSkillMarkup, lookupKeyword } from '../assets/skill-notes.js';

test('extracts highlighted keyword links without changing visible Korean text', () => {
  const line = '[Shock|감전] 확률 15% 증가, [Flask|플라스크] 충전량 20% 증가';
  assert.deepEqual(parseSkillKeywords(line), [
    { key:'Shock', text:'감전' },
    { text:' 확률 15% 증가, ' },
    { key:'Flask', text:'플라스크' },
    { text:' 충전량 20% 증가' }
  ]);
  assert.equal(plainSkillText(line), '감전 확률 15% 증가, 플라스크 충전량 20% 증가');
  assert.deepEqual(parseSkillKeywords('15% increased chance to [Shock]'), [
    { text:'15% increased chance to ' }, { key:'Shock',text:'Shock' }
  ]);
});
test('does not treat ordinary brackets or HTML-looking text as markup', () => {
  assert.equal(plainSkillText('a [3] roll <script>alert(1)</script>'), 'a [3] roll <script>alert(1)</script>');
  assert.equal(verifiedSkillMarkup('치명타 확률 20% 증가', '[Shock|감전] 확률 20% 증가'), null);
  assert.equal(verifiedSkillMarkup('감전 확률 20% 증가', '[Shock|감전] 확률 20% 증가'), '[Shock|감전] 확률 20% 증가');
  assert.deepEqual(parseSkillKeywords(''), [{text:''}]);
});
test('only resolves safe, known keywords in requested language', () => {
  const catalog = {ko:{Shock:{title:'감전',description:'감전 설명'}},en:{Shock:{title:'Shock',description:'Shock description'}}};
  assert.equal(lookupKeyword(catalog,'Shock','ko').title,'감전');
  assert.equal(lookupKeyword(catalog,'Shock','en').description,'Shock description');
  assert.equal(lookupKeyword(catalog,'Unknown','ko'),null);
  assert.equal(lookupKeyword(catalog,'../../evil','en'),null);
});
