import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTranslationRows,simplifyGameText} from '../scripts/translation-coverage.mjs';

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
  assert.deepEqual(report.untranslatedStats[0],{english:'Shock Chance',occurrences:1,exampleIds:[10]});
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
