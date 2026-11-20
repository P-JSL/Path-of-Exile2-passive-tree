/**
 * Generate a deployment-local report of source-backed Korean coverage.
 * Untranslated strings are retained verbatim; no inferred game terminology.
 * Execute AFTER scripts/build-ko-stats.mjs.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {passiveName,passiveStat} from '../assets/i18n.js';
import {auditTranslationRows,simplifyGameText,describeEffectSources} from './translation-coverage.mjs';

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
    // Modifier identifiers are machine data, not English effect descriptions.
    // Including them would incorrectly report 100% Korean translation coverage.
    stats:!extra ? (node.stats || []) :
      (Array.isArray(node.stat_text) ? node.stat_text : [])
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
  const raw = mode === 'passive' ? original.nodes : mode === 'atlas' ? atlas.passives : genesis.passives;
  const provenance=describeEffectSources(raw,mode !== 'passive');
  report.modes[mode]={
    ...coverage,
    ...provenance,
    effectTextStatus:coverage.statLines ? 'source-text-measured' :
      provenance.internalKeyNodes ? 'internal-keys-only' : 'no-effect-text',
    statCoveragePercent:coverage.statLines ? coverage.statCoveragePercent : null
  };
  console.log('[Korean coverage] '+mode+': names '+
    coverage.translatedNames+'/'+coverage.namedNodes+
    ' ('+coverage.nameCoveragePercent+'%), effects '+
    coverage.translatedStats+'/'+coverage.statLines+
    (coverage.statLines ? ' ('+coverage.statCoveragePercent+'%)' :
      ' (N/A: no human-readable source lines; internal-only nodes='+provenance.internalKeyNodes+')'));
}
writeFileSync('data/translation-coverage.json',JSON.stringify(report,null,2)+'\n','utf8');
console.log('[Korean coverage] Unmatched originals saved to data/translation-coverage.json');
