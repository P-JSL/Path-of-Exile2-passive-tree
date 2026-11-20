import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGlossaryHtml, plainGlossaryText, decodeHtmlEntities } from '../scripts/build-keyword-notes.mjs';

const example = [
  '<div class="col"><div class="flex-grow-1 ms-2"><a href="Shock" class="strong fontinSmallCaps">감전</a>',
  '<div class="fontinRegular">감전은 <a data-keyword="Ailments" href="Ailments" class="KeywordPopups">상태 이상</a>입니다.<br />',
  '받는 피해가 20% 증가합니다.</div></div></div>',
  '<div class="col"><div class="flex-grow-1 ms-2"><a href="Ailments" class="strong fontinSmallCaps">상태 이상</a>',
  '<div class="fontinRegular">게임 내 상태 이상을 의미합니다.</div></div></div>',
  '<a data-keyword="StatusEffect" href="Ailments" class="KeywordPopups">상태 이상</a>'
].join('');

test('extracts bilingual-style keyword note cards and safe term aliases', () => {
  const result = parseGlossaryHtml(example);
  assert.equal(result.cards, 2);
  assert.equal(result.entries.Shock.title, '감전');
  assert.equal(result.entries.Shock.description, '감전은 상태 이상입니다.\n받는 피해가 20% 증가합니다.');
  assert.equal(result.entries.StatusEffect.path, 'Ailments');
  assert.equal(result.entries.StatusEffect.title, '상태 이상');
});

test('preserves readable text rather than rendering embedded HTML', () => {
  assert.equal(plainGlossaryText('피해 &amp; 방어<br/>50&#37; <strong>증가</strong>'), '피해 & 방어\n50% 증가');
  assert.equal(decodeHtmlEntities('&#xAC10;&#xC804;'), '감전');
  assert.equal(plainGlossaryText('<script>malicious()</script><b>메모</b>'), '메모');
});

test('ignores unsafe URLs and ambiguous keyword aliases', () => {
  const fixture = [
    example,
    '<a data-keyword="StatusEffect" href="Shock" class="KeywordPopups">충돌</a>',
    '<div class="flex-grow-1 ms-2"><a href="javascript:alert(1)" class="strong fontinSmallCaps">위험</a><div class="fontinRegular">링크</div></div>'
  ].join('');
  const data = parseGlossaryHtml(fixture);
  assert.equal(data.entries.StatusEffect, undefined);
  assert.equal(data.entries.Shock.path, 'Shock');
  assert.equal(data.entries['javascript:alert(1)'], undefined);
});
