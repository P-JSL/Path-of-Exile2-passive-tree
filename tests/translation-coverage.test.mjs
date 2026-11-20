import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTranslationRows,simplifyGameText,describeEffectSources} from '../scripts/translation-coverage.mjs';

test('coverage counts only translated display strings, not stripped source markup',()=>{
  const rows=[
    {id:10,name:'Fire Damage',stats:['20% increased Fire Damage','[Shock|Shock] Chance']},
    {id:20,name:'Fire Damage',stats:['20% increased Fire Damage','10% increased Cold Damage']},
    {id:30,name:'Life',stats:[]}
  ];
  const report=auditTranslationRows(rows,
    row=>row.name==='Fire Damage'?'화염 피해':row.name,
    (row,index)=>index===0?'화염 피해 20% 증가':simplifyGameText(row.stats[index]));
  assert.equal(report.namedNodes,3);
  assert.equal(report.translatedNames,2);
  assert.equal(report.statLines,4);
  assert.equal(report.translatedStats,2);
  assert.equal(report.nameCoveragePercent,66.67);
  assert.equal(report.statCoveragePercent,50);
  assert.deepEqual(report.untranslatedNames,[{english:'Life',occurrences:1,exampleIds:[30]}]);
  assert.deepEqual(report.untranslatedStats.find(item=>item.english==='Shock Chance'),{english:'Shock Chance',occurrences:1,exampleIds:[10]});
});
test('zero-content report and repeated unknown text do not count fabricated translations',()=>{
  const empty=auditTranslationRows([],()=>'',()=> '');
  assert.equal(empty.nameCoveragePercent,100);
  assert.equal(empty.statCoveragePercent,100);
  const report=auditTranslationRows([
    {id:1,name:'Unknown',stats:['Unknown Stat']},
    {id:2,name:'Unknown',stats:['Unknown Stat']}
  ],row=>row.name,(row,index)=>row.stats[index]);
  assert.equal(report.untranslatedNames[0].occurrences,2);
  assert.deepEqual(report.untranslatedStats[0].exampleIds,[1,2]);
  assert.equal(report.translatedStats,0);
});

test('Genesis internal modifier keys cannot count as translated game effect lines',()=>{
  const source={
    1:{hash:1,name:'Reward',stats:{brequel_reward_increased_item_chance:25}},
    2:{hash:2,name:'Modifier',stats:{brequel_modifier_a:1,brequel_modifier_b:2}},
    3:{hash:3,name:'Empty',stats:{}}
  };
  const provenance=describeEffectSources(source,true);
  assert.deepEqual(provenance,{
    humanReadableNodes:0,internalKeyNodes:2,internalKeyEntries:3,withoutEffectsNodes:1
  });
  const rows=Object.values(source).map(n=>({id:n.hash,name:n.name,stats:n.stat_text || []}));
  const result=auditTranslationRows(rows,n=>n.name,()=> '가짜 번역');
  assert.equal(result.statLines,0);
  assert.equal(result.translatedStats,0);
});
test('Atlas real game text is measured independently from machine-only fields',()=>{
  const provenance=describeEffectSources({
    1:{stat_text:['10% increased Map Drops'],stats:{game_modifier_id:10}},
    2:{stat_text:[],stats:{internal_only:5}},
    3:{stat_text:[],stats:{}}
  },true);
  assert.deepEqual(provenance,{
    humanReadableNodes:1,internalKeyNodes:1,internalKeyEntries:1,withoutEffectsNodes:1
  });
});
