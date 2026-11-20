import test from 'node:test';
import assert from 'node:assert/strict';
import {localizePobName,localizePobRareName,localizePobSlot,localizePobMetric,localizePobItemLine,
 localizePobItemText,localizePobGem,formatPobValue} from '../assets/pob-localize.js';
const d={gems:{Spark:'전기불꽃','Align Fate':'운명 정렬'},
 items:{'Ancestral Tiara':'선대의 티아라'},
 uniques:{"Runeseeker's Call":'룬 탐구자의 소명'},
 ui:{'Average Hit':'평균 적중','Cast Speed':'시전 속도'},
 tags:{Gloom:'침울한',Salvation:'구원',Rift:'균열',Pith:'핵심'}};
test('exact game-source Korean names never translate an arbitrary rare name',()=>{
 assert.equal(localizePobName('Spark','ko',d),'전기불꽃');
 assert.equal(localizePobName('Ancestral Tiara','ko',d),'선대의 티아라');
 assert.equal(localizePobName("Runeseeker's Call",'ko',d),'룬 탐구자의 소명');
 assert.equal(localizePobName('Gloom Salvation','ko',d),'Gloom Salvation');
 assert.equal(localizePobName('Spark','en',d),'Spark');
});
test('slot labels and calculation labels localize without modifying stat keys',()=>{
 assert.equal(localizePobSlot('Body Armour'),'갑옷');
 assert.equal(localizePobSlot('Weapon 2'),'무기 2');
 assert.equal(localizePobMetric('AverageHit','ko',d),'평균 적중 피해');
 assert.equal(localizePobMetric('WithBleedDPS','ko',d),'출혈 포함 DPS');
 assert.equal(localizePobMetric('EnduranceChargesMax','ko',d),'최대 인내 충전 수');
 assert.equal(localizePobMetric('UnrecognizedStats123','ko',d),'UnrecognizedStats123');
});
test('PoB numeric display rounds to two decimals without changing source',()=>{
  assert.equal(formatPobValue('5025251.53575','ko'),'5,025,251.54');
  assert.equal(formatPobValue('3903543.6036629','ko'),'3,903,543.60');
  assert.equal(formatPobValue('0.77678571428571','ko'),'0.78');
  assert.equal(formatPobValue('1.005','ko'),'1.01');
  assert.equal(formatPobValue('9.999','ko'),'10.00');
  assert.equal(formatPobValue('-0.005','ko'),'-0.01');
  assert.equal(formatPobValue('-0.004','ko'),'0.00');
  assert.equal(formatPobValue('100.4','ko'),'100.40');
  assert.equal(formatPobValue('0','ko'),'0');
  assert.equal(formatPobValue('1234','ko'),'1,234');
  assert.equal(formatPobValue('999999999999999999.999','ko'),'1,000,000,000,000,000,000.00');
  assert.equal(formatPobValue('10e3','ko'),'10e3');
  assert.equal(formatPobValue('5025251.53575','en'),'5025251.54');
  assert.equal(formatPobValue('100.4','en'),'100.40');
});
test('item attributes preserve values, unique identifiers and unknown modifier text',()=>{
 assert.equal(localizePobItemLine('Rarity: RARE'),'등급: 희귀');
 assert.equal(localizePobItemLine('Energy Shield: 521'),'에너지 보호막: 521');
 assert.equal(localizePobItemLine('+54 to maximum Life'),'최대 생명력 +54');
 assert.equal(localizePobItemLine('+18% to Fire Resistance'),'화염 저항 +18%');
 assert.equal(localizePobItemLine('21% increased Cast Speed'),'시전 속도 21% 증가');
 assert.equal(localizePobItemLine('Adds 12 to 45 Fire Damage'),'화염 피해 12~45 추가');
 assert.equal(localizePobItemLine('Unique ID: a1b2c3'),'고유 ID: a1b2c3');
 assert.equal(localizePobItemLine('Some unrecognized special effect'),'Some unrecognized special effect');
 assert.equal(localizePobItemLine('Corrupted'),'타락');
});
test('all original item lines remain present and alternate English is untouched',()=>{
 const s='Rarity: UNIQUE\nRuneseeker\'s Call\nAncestral Tiara\n+54 to maximum Life\nSome unknown line';
 const out=localizePobItemText(s,'ko',d);
 assert.match(out,/등급: 고유/);
 assert.match(out,/룬 탐구자의 소명/);
 assert.match(out,/선대의 티아라/);
 assert.match(out,/최대 생명력 \+54/);
 assert.match(out,/Some unknown line/);
 assert.equal(localizePobItemText(s,'en',d),s);
 assert.equal(localizePobGem({name:'Spark',level:'20',quality:'20',enabled:true},'ko',d),
  '전기불꽃 레벨 20 퀄리티 20');
});

test('generated rare names use source-matched terms without claiming exact translation',()=>{
  assert.deepEqual(localizePobRareName('Gloom Salvation','ko',d),{
    name:'침울한 구원',approximate:true
  });
  assert.deepEqual(localizePobRareName('Unknown Salvation','ko',d),{
    name:'Unknown Salvation',approximate:false
  });
  assert.match(localizePobItemText('Rarity: RARE\nGloom Salvation\nAncestral Tiara','ko',d),
    /등급: 희귀\n침울한 구원\n선대의 티아라/);
  assert.equal(localizePobSlot('Weapon Swap 1'),'교체 무기 1');
});

test('escaped newline PoB jewels keep every line when translated',()=>{
  const literal='Rarity: Rare\\nIntegration Jewel\\n+12 to Life';
  const translated=localizePobItemText(literal,'ko',d);
  assert.match(translated,/등급: 희귀/);
  assert.match(translated,/Integration Jewel/);
  assert.match(translated,/생명력 \+12/);
  assert.equal(localizePobItemText(literal,'en',d),literal);
});
