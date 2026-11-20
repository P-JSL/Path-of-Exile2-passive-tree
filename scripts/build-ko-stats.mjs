/**
 * Build an offline Korean stat-text catalog from Korean PoB game translations.
 * Only matches exact source strings or unambiguous number variants.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const source = 'https://raw.githubusercontent.com/Hsiung-Shao/PobTools-zh/main/pob-zh-engine/dist/Data/poe2/ko-KR/stats.json';
const all = JSON.parse(readFileSync('data/tree.json', 'utf8'));
const atlas = JSON.parse(readFileSync('data/atlas.json', 'utf8'));
const genesis = JSON.parse(readFileSync('data/genesis.json', 'utf8'));
const staticPassives = JSON.parse(readFileSync('data/ko-passives.json', 'utf8'));
const locale = JSON.parse(readFileSync('data/ko.json', 'utf8'));
const curatedStats = JSON.parse(readFileSync('data/ko-stat-overrides.json', 'utf8')).stats;
const simplify = text => String(text).replace(/\[([^|\]]+)\|([^\]]+)\]/g, '$2');
const numberRe = /-?\d+(?:\.\d+)?/g;
const signature = text => simplify(text).replace(numberRe, '{NUM}');
const srcLines = new Set([
  ...Object.values(all.nodes).flatMap(n => n.stats || []),
  ...Object.values(atlas.passives).flatMap(n => n.stat_text || []),
  ...Object.values(genesis.passives).flatMap(n => n.stat_text || [])
].map(simplify).filter(Boolean));
const translate = {...staticPassives.names, ...locale.names};
let upstream = {};
try {
  const response = await fetch(source, {signal: AbortSignal.timeout(20000)});
  if (!response.ok) throw Error('HTTP ' + response.status);
  const parsed = await response.json();
  upstream = parsed.entries || parsed.translations || {};
  if (Array.isArray(upstream)) upstream = Object.fromEntries(upstream.filter(pair => Array.isArray(pair) && pair.length === 2));
  if (!upstream || typeof upstream !== 'object') throw Error('Unexpected upstream translation format');
} catch (error) {
  console.warn('Korean stat translations unavailable; retain bundled terms: ' + String(error));
}
console.log('Korean upstream examples: ' + JSON.stringify(Object.entries(upstream).slice(0, 6)));
console.log('Korean upstream shock-related examples: ' + JSON.stringify(Object.entries(upstream).filter(([en]) => en.toLowerCase().includes('shock')).slice(0, 7)));
// Match the bilingual game tree by native skill ID and source English text.
// Inspect one glossary entry to derive a stable, dependency-free parser.
try {
  const response = await fetch('https://poe2db.tw/kr/Keywords', {signal:AbortSignal.timeout(10000)});
  const html = await response.text();
  const anchors = [...html.matchAll(/<a\s+href="Shock"[^>]*>/g)].slice(0,4).map(m => ({at:m.index, markup: html.slice(Math.max(0,m.index-210),m.index+2400)}));
  console.log('GLOSSARY_SHOCK_SAMPLE ' + JSON.stringify(anchors).slice(0,9000));
} catch (error) { console.warn('GLOSSARY_SHOCK_SAMPLE unavailable:', error.message); }
const poe2db = {};
async function fetchTree(uri) {
  const response = await fetch(uri, {headers:{Referer:'https://poe2db.tw/','User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error('HTTP ' + response.status + ' ' + uri);
  return response.json();
}
for (const [type, slug] of [['passive','passive-skill-tree'],['atlas','atlas-skill-tree'],['genesis','the-genesis-tree']]) {
  try {
    const endpoint = 'https://poe2db.tw/data/' + slug + '/4.5/data_';
    const [en, ko] = await Promise.all([fetchTree(endpoint + 'us.json'), fetchTree(endpoint + 'kr.json')]);
    poe2db[type] = {en, ko};
    const source = type === 'passive' ? Object.values(all.nodes) : type === 'atlas' ? Object.values(atlas.passives) : Object.values(genesis.passives);
    const byId = obj => new Map(Object.values(obj.nodes || {}).map(n => [Number(n.skill ?? n.hash), n]));
    const enMap = byId(en), koMap = byId(ko);
    const matchedId = source.filter(n => enMap.has(Number(n.skill ?? n.hash)) && koMap.has(Number(n.skill ?? n.hash)));
    const matchedName = matchedId.filter(n => enMap.get(Number(n.skill ?? n.hash)).name === n.name);
    console.log('PoE2DB ' + type + ': bilingual=' + enMap.size + '/' + koMap.size + ', matched IDs=' + matchedId.length + '/' + source.length + ', matching English names=' + matchedName.length);
    console.log('PoE2DB ' + type + ' sample: ' + JSON.stringify(matchedName.slice(0,2).map(n=>({src:n.name, en:enMap.get(Number(n.skill ?? n.hash)).stats?.slice(0,1), ko:koMap.get(Number(n.skill ?? n.hash)).stats?.slice(0,1)}))).slice(0,500));
  } catch (error) { console.warn('PoE2DB ' + type + ' not available: ' + String(error)); }
}
const normalizeEnglish = value => simplify(value).replace(/\[([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim();
// A bilingual phrase match is safe even if the tree's node IDs moved between patches.
const bilingualNames = new Map(), bilingualStats = new Map();
function putUnique(map, english, korean) {
  if (!english || !korean || english === korean) return;
  const key = normalizeEnglish(english);
  if (!map.has(key)) map.set(key, korean);
  else if (map.get(key) !== korean) map.set(key, null);
}
for (const pair of Object.values(poe2db)) {
  const asMap = obj => new Map(Object.values(obj.nodes || {}).map(n => [Number(n.skill ?? n.hash), n]));
  const enNodes = asMap(pair.en), koNodes = asMap(pair.ko);
  for (const [id, en] of enNodes) {
    const ko = koNodes.get(id);
    if (!ko) continue;
    putUnique(bilingualNames, en.name, simplify(ko.name));
    if (!Array.isArray(en.stats) || !Array.isArray(ko.stats) || en.stats.length !== ko.stats.length) continue;
    for (let index = 0; index < en.stats.length; index++) putUnique(bilingualStats, en.stats[index], simplify(ko.stats[index]));
  }
}
console.log('PoE2DB bilingual phrases: names=' + bilingualNames.size + ', stats=' + bilingualStats.size);
const placeholderRe = /\{(\d+)(?::[^}]*)?\}/g;
const indexedTemplates = new Map();
for (const [english, korean] of Object.entries(upstream)) {
  if (typeof english !== 'string' || typeof korean !== 'string' || !english.includes('{0}')) {
    // {0:+d} must also be recognised below.
    if (!/\{0(?::[^}]*)?\}/.test(english)) continue;
  }
  if (!/\{\d+(?::[^}]*)?\}/.test(korean)) continue;
  const placeholders = [...english.matchAll(placeholderRe)].map(match => Number(match[1]));
  if (!placeholders.length) continue;
  const sig = simplify(english).replace(placeholderRe, '{NUM}');
  const previous = indexedTemplates.get(sig);
  if (previous === undefined) indexedTemplates.set(sig, {english, korean, placeholders});
  else if (previous?.korean !== korean || previous?.english !== english) indexedTemplates.set(sig, null);
}
function interpolateIndexedTemplate(text) {
  const example = indexedTemplates.get(signature(text));
  if (!example) return null;
  const values = text.match(numberRe) || [];
  if (values.length !== example.placeholders.length) return null;
  const replacements = new Map();
  for (let i = 0; i < values.length; i++) {
    const index = example.placeholders[i];
    if (replacements.has(index) && replacements.get(index) !== values[i]) return null;
    replacements.set(index, values[i]);
  }
  let incomplete = false;
  const out = example.korean.replace(placeholderRe, (matched, index) => {
    if (!replacements.has(Number(index))) { incomplete = true; return matched; }
    return replacements.get(Number(index));
  });
  return incomplete ? null : simplify(out);
}
const templateLookup = new Map();
for (const dict of [upstream, translate]) for (const [english, korean] of Object.entries(dict)) {
  if (typeof english !== 'string' || typeof korean !== 'string' || english === korean || !english || !korean) continue;
  const enNumbers = english.match(numberRe) || [];
  const koNumbers = korean.match(numberRe) || [];
  if (!enNumbers.length || enNumbers.length !== koNumbers.length || enNumbers.some((n, i) => n !== koNumbers[i])) continue;
  const sig = signature(english);
  if (!templateLookup.has(sig)) templateLookup.set(sig, {english, korean});
  else if (templateLookup.get(sig)?.korean !== korean) templateLookup.set(sig, null);
}
function translateLine(text) {
  if (curatedStats[text]) return curatedStats[text];
  if (locale.stats?.[text]) return locale.stats[text];
  const bilingual = bilingualStats.get(normalizeEnglish(text));
  if (bilingual) return bilingual;
  if (typeof upstream[text] === 'string') return upstream[text];
  if (typeof translate[text] === 'string') return translate[text];
  const indexed = interpolateIndexedTemplate(text);
  if (indexed) return indexed;
  const example = templateLookup.get(signature(text));
  if (!example) return null;
  const values = text.match(numberRe) || [];
  if (values.length !== (example.english.match(numberRe) || []).length) return null;
  let i = 0;
  return example.korean.replace(numberRe, () => values[i++]);
}
const stats = {};
for (const line of srcLines) {
  const translated = translateLine(line);
  if (translated && translated !== line) stats[line] = translated;
}
const newNames = {};
for (const node of [...Object.values(all.nodes), ...Object.values(atlas.passives), ...Object.values(genesis.passives)]) {
  const name = node.name;
  if (!name || locale.names?.[name] || staticPassives.names?.[name]) continue;
  if (bilingualNames.get(name)) newNames[name] = bilingualNames.get(name);
  else if (typeof upstream[name] === 'string' && upstream[name] !== name) newNames[name] = upstream[name];
}
const directNodes = {passive:{}, atlas:{}, genesis:{}};

for (const [type, rawNodes] of [
  ['passive', Object.values(all.nodes)],
  ['atlas', Object.values(atlas.passives)],
  ['genesis', Object.values(genesis.passives)]
]) {
  const pair = poe2db[type];
  if (!pair) continue;
  const asMap = obj => new Map(Object.values(obj.nodes || {}).map(n => [Number(n.skill ?? n.hash), n]));
  const enNodes = asMap(pair.en), koNodes = asMap(pair.ko);
  let named = 0, statsMatched = 0, directLines = 0;
  for (const raw of rawNodes) {
    const id = Number(raw.skill ?? raw.hash);
    const en = enNodes.get(id), ko = koNodes.get(id);
    if (!en || !ko || en.name !== raw.name) continue;
    const name = typeof ko.name === 'string' ? simplify(ko.name) : '';
    const sourceLines = type === 'passive' ? raw.stats || [] : raw.stat_text || [];
    const enLines = en.stats || [];
    const koLines = ko.stats || [];
    const sameVersion = sourceLines.length === 0 ||
      (sourceLines.length === enLines.length &&
       sourceLines.every((text, i) => normalizeEnglish(text) === normalizeEnglish(enLines[i])));
    const translatedLines = sameVersion && koLines.length === enLines.length
      ? koLines.map(simplify) : [];
    if (name) named++;
    if (translatedLines.length) { statsMatched++; directLines += translatedLines.length; }
    if (name || translatedLines.length) {
      const entry = {name, stats:translatedLines};
      // Retain clickable in-game keyword IDs without changing display text.
      if (sameVersion && enLines.length === koLines.length && [...enLines, ...koLines].some(line => line.includes('['))) {
        entry.richStats = {
          ko: koLines.map(line => line.includes('[') ? line : null),
          en: enLines.map(line => line.includes('[') ? line : null)
        };
      }
      directNodes[type][id] = entry;
    }
  }
  console.log('PoE2DB verified ' + type + ': translated names ' + named + '/' + rawNodes.length + ', translated node effects ' + statsMatched + '/' + rawNodes.length + ', lines=' + directLines);
}
writeFileSync('data/ko-stats.json', JSON.stringify({source, stats, names:newNames, nodes:directNodes}));
const coverage = (total, count) => String(count) + '/' + String(total) + ' (' + (total ? count/total*100 : 100).toFixed(1) + '%)';
console.log('Korean stat dictionary: upstream=' + Object.keys(upstream).length + ', translated=' + coverage(srcLines.size, Object.keys(stats).length));
for (const [mode, nodes] of [['passive', Object.values(all.nodes)], ['atlas', Object.values(atlas.passives)], ['genesis', Object.values(genesis.passives)]]) {
  const names = new Set(nodes.map(n => n.name).filter(Boolean));
  const covered = [...names].filter(n => locale.names?.[n] || staticPassives.names?.[n] || newNames[n]);
  const missing = [...names].filter(n => !locale.names?.[n] && !staticPassives.names?.[n] && !newNames[n]);
  console.log('[' + mode + '] Korean names ' + coverage(names.size, covered.length) + '; unmatched: ' + missing.slice(0, 15).join(' | '));
}
console.log('Unmatched stat samples: ' + [...srcLines].filter(s => !stats[s] && !locale.stats?.[s]).slice(0, 12).join(' | '));
const unmatchedStats = [...srcLines].filter(text => !stats[text] && !locale.stats?.[text]);
if (unmatchedStats.length) console.warn('Untranslated modifier texts: ' + JSON.stringify(unmatchedStats));
