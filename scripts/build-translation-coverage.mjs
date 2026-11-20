/**
 * Generate a deployment-local report of source-backed Korean coverage.
 * Untranslated strings are retained verbatim; no inferred game terminology.
 * Execute AFTER scripts/build-ko-stats.mjs.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {passiveName,passiveStat} from '../assets/i18n.js';
import {auditTranslationRows,simplifyGameText} from './translation-coverage.mjs';

const read = path => JSON.parse(readFileSync(path,'utf8'));
const original=read('data/tree.json');
const atlas=read('data/atlas.json');
const genesis=read('data/genesis.json');
const base=read('data/ko.json');
const extended=read('data/ko-passives.json');
const generated=read('data/ko-stats.json');
const catalog={
  names:{...(generated.names || {}),...(extended.names || {}),...(base.names || {})},
  stats:{...(extended.names || {}),...(generated.stats || {}),...(base.stats || {})}
};

function sourceRows(nodes,extra=false) {
  return Object.values(nodes).map(node=>({
    id:Number(node.skill ?? node.hash),
    name:String(node.name || ''),
    stats:!extra ? (node.stats || []) :
      node.stat_text?.length ? node.stat_text :
      Object.entries(node.stats || {}).map(([key,value])=>key+': '+value)
  }));
}
const modes={
  passive:sourceRows(original.nodes),
  atlas:sourceRows(atlas.passives,true),
  genesis:sourceRows(genesis.passives,true)
};
const report={
  schemaVersion:1,
  treeVersion:'0_5',
  measurement:'display-text differs from game English source; semantic accuracy is not verified',
  sources:{names:[base.source,extended.source],stats:generated.source},
  modes:{}
};
for(const [mode,rows] of Object.entries(modes)) {
  const direct=generated.nodes?.[mode] || {};
  const coverage=auditTranslationRows(rows,
    row=>direct[row.id]?.name || passiveName(row.name,'ko',catalog),
    (row,index)=>{
      const translated=direct[row.id]?.stats?.[index];
      return translated || passiveStat(simplifyGameText(row.stats[index]),'ko',catalog);
    });
  report.modes[mode]=coverage;
  console.log('[Korean coverage] '+mode+': names '+
    coverage.translatedNames+'/'+coverage.namedNodes+
    ' ('+coverage.nameCoveragePercent+'%), effects '+
    coverage.translatedStats+'/'+coverage.statLines+
    ' ('+coverage.statCoveragePercent+'%)');
}
writeFileSync('data/translation-coverage.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('[Korean coverage] Unmatched originals saved to data/translation-coverage.json');
