/**
 * Cache-bust the complete ES module graph as well as the entrypoint.
 * Run only after source-code tests; this changes deployment copies, not Git history.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function versionModuleImports(content, sha) {
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error('Expected a full Git commit SHA');
  return content.replace(/(\bfrom\s*['"])(\.\/[^'"?]+\.js)(?:\?v=[a-f0-9]+)?(['"])/g,
    (_, beginning, path, ending) => beginning + path + '?v=' + sha + ending);
}

export function versionEntryAssets(html, sha) {
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error('Expected a full Git commit SHA');
  const result = html
    .replace(/src="\.\/assets\/app\.js(?:\?v=[a-f0-9]+)?"/, 'src="./assets/app.js?v=' + sha + '"')
    .replace(/href="\.\/assets\/styles\.css(?:\?v=[a-f0-9]+)?"/,
      'href="./assets/styles.css?v=' + sha + '"');
  if (!result.includes('app.js?v=' + sha) || !result.includes('styles.css?v=' + sha))
    throw new Error('Could not version the HTML entrypoint assets');
  return result;
}

async function main() {
  const sha = process.env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/i.test(sha || '')) throw new Error('GITHUB_SHA is required');
  for (const filename of readdirSync('assets').filter(name => name.endsWith('.js'))) {
    const path = join('assets', filename), current = readFileSync(path, 'utf8');
    const next = versionModuleImports(current, sha);
    if (next !== current) writeFileSync(path, next);
  }
  writeFileSync('index.html', versionEntryAssets(readFileSync('index.html','utf8'), sha));
  console.log('Versioned browser modules, CSS and entrypoint: ' + sha);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
