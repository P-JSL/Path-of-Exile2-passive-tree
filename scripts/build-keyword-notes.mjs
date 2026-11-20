/**
 * Bundle PoE2DB's public bilingual Keywords page at build time.
 * No third-party requests are made by visitors and HTML is never rendered.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URLS = Object.freeze({
  ko: 'https://poe2db.tw/kr/Keywords',
  en: 'https://poe2db.tw/us/Keywords'
});
const SAFE_SLUG = /^[A-Za-z0-9_-]+$/;
const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_]*$/;
const ENTITIES = {
  amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ', ndash:'–',
  mdash:'—', hellip:'…', lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”',
  bull:'•', times:'×', minus:'−'
};

export function decodeHtmlEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function plainGlossaryText(fragment) {
  return decodeHtmlEntities(String(fragment)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' • ')
    .replace(/<\/(?:p|li|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\r/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export function parseGlossaryHtml(html) {
  const cards = new Map();
  // The heading links identify official PoE2DB glossary entries; nested
  // cross-references in their descriptions are not headings.
  const cardsPattern = /<div class="flex-grow-1 ms-2">\s*<a href="([^"]+)" class="strong fontinSmallCaps">([\s\S]*?)<\/a>\s*<div class="fontinRegular">([\s\S]*?)<\/div>/gi;
  for (const match of String(html).matchAll(cardsPattern)) {
    const slug = match[1], title = plainGlossaryText(match[2]), description = plainGlossaryText(match[3]);
    if (!SAFE_SLUG.test(slug) || !title || !description || description.length > 12000) continue;
    cards.set(slug, { title, description, path:slug });
  }
  const aliases = new Map();
  const ambiguous = new Set();
  for (const match of String(html).matchAll(/<a\b([^>]*)>/gi)) {
    const attrs = match[1];
    const key = /\bdata-keyword="([^"]+)"/i.exec(attrs)?.[1];
    const slug = /\bhref="([^"]+)"/i.exec(attrs)?.[1];
    if (!SAFE_KEY.test(key ?? '') || !SAFE_SLUG.test(slug ?? '') || !cards.has(slug)) continue;
    if (aliases.has(key) && aliases.get(key) !== slug) ambiguous.add(key);
    else aliases.set(key, slug);
  }
  // Direct card slugs win over aliases. Conflicting aliases cannot be trusted.
  const result = {};
  for (const [slug, entry] of cards) if (SAFE_KEY.test(slug)) result[slug] = entry;
  for (const [key, slug] of aliases) {
    if (!ambiguous.has(key) && !result[key]) result[key] = cards.get(slug);
  }
  return { entries:result, cards:cards.size, aliases:aliases.size, conflicts:ambiguous.size };
}

async function download(language) {
  const response = await fetch(URLS[language], { signal:AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + URLS[language]);
  const html = await response.text();
  const parsed = parseGlossaryHtml(html);
  if (parsed.cards < 100) throw new Error('Unexpected PoE2DB glossary format: only ' + parsed.cards + ' entries');
  console.log('PoE2DB ' + language + ' glossary: ' + JSON.stringify({
    cards:parsed.cards, keys:Object.keys(parsed.entries).length,
    aliases:parsed.aliases, conflicts:parsed.conflicts
  }));
  return parsed.entries;
}

async function main() {
  const results = await Promise.allSettled(['ko', 'en'].map(download));
  const catalog = { source:URLS, ko:{}, en:{} };
  for (const [index, language] of ['ko','en'].entries()) {
    if (results[index].status === 'fulfilled') catalog[language] = results[index].value;
    else console.warn('Could not bundle ' + language + ' glossary: ' + String(results[index].reason));
  }
  writeFileSync('data/keyword-notes.json', JSON.stringify(catalog));
  console.log('Saved data/keyword-notes.json: ' + JSON.stringify({
    ko:Object.keys(catalog.ko).length, en:Object.keys(catalog.en).length
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
