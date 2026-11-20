/** Inspect source-backed Korean coverage without guessing untranslated game text.
 * Coverage measures changed display text, not the semantic quality of a translation.
 */
export function simplifyGameText(value) {
  return String(value || '').replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2').trim();
}
function addExample(map, english, id) {
  const key = simplifyGameText(english);
  const record = map.get(key) || {english:key,occurrences:0,exampleIds:[]};
  record.occurrences++;
  if (record.exampleIds.length < 4) record.exampleIds.push(id);
  map.set(key,record);
}
export function auditTranslationRows(rows, translateName, translateStat) {
  const absentNames = new Map(), absentStats = new Map();
  let translatedNames = 0, translatedStats = 0, statLines = 0;
  for (const row of rows) {
    const sourceName = simplifyGameText(row.name);
    const targetName = simplifyGameText(translateName(row));
    if (sourceName) {
      if (targetName && targetName !== sourceName) translatedNames++;
      else addExample(absentNames,sourceName,row.id);
    }
    for (let index = 0; index < row.stats.length; index++) {
      const source = simplifyGameText(row.stats[index]);
      if (!source) continue;
      statLines++;
      const target = simplifyGameText(translateStat(row,index));
      if (target && target !== source) translatedStats++;
      else addExample(absentStats,source,row.id);
    }
  }
  const sorted = map => [...map.values()].sort((a,b)=>b.occurrences-a.occurrences ||
    a.english.localeCompare(b.english,'en'));
  const nameLines = rows.reduce((count,row)=>count + (simplifyGameText(row.name) ? 1 : 0),0);
  return {
    nodeCount:rows.length,
    namedNodes:nameLines, translatedNames,
    nameCoveragePercent:nameLines ? Number((100*translatedNames/nameLines).toFixed(2)) : 100,
    statLines, translatedStats,
    statCoveragePercent:statLines ? Number((100*translatedStats/statLines).toFixed(2)) : 100,
    untranslatedNames:sorted(absentNames),
    untranslatedStats:sorted(absentStats)
  };
}
