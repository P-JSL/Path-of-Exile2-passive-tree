/**
 * Offline bundle of the official Grinding Gear Games passive-tree atlases.
 * Asset versions are pinned to a known export commit, not to moving 'main'.
 * Run at build time only; browser requests remain same-origin.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXPORT_SHA = 'bd87e6512c92b868542eddfb1ba4ea8b6dc2da36';
const ROOT = 'https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/' + EXPORT_SHA + '/assets/';
const REQUIRED = ['skills.json', 'skills.webp', 'frame.json', 'frame.webp'];
const OPTIONAL = ['group-background.json', 'group-background.webp'];
const CLASSES = ['druid', 'huntress', 'mercenary', 'monk', 'ranger', 'sorceress', 'warrior', 'witch'];
const FILES = [...REQUIRED, ...OPTIONAL, ...CLASSES.flatMap(name => ['background-' + name + '.json', 'background-' + name + '.webp'])];

export function atlasIconKey(node) {
  if (typeof node?.icon !== 'string' || !node.icon) return null;
  const file = node.icon.replace(/\.dds$/i, '.png');
  const category = node.isKeystone || node.category === 'keystone' ? 'keystoneActive' :
    node.isNotable || node.category === 'notable' ? 'notableActive' : 'normalActive';
  return category + ':' + file;
}

export function countMatchingIcons(nodes, frames) {
  let matched = 0, skippedImages = 0;
  for (const n of nodes) {
    if (n.isOnlyImage) { skippedImages++; continue; }
    if (frames[atlasIconKey(n)]) matched++;
  }
  return { total:nodes.length, matched, skippedImages };
}

export async function downloadAtlases(directory = 'data/visual') {
  await mkdir(directory, {recursive:true});
  for (const name of FILES) {
    const response = await fetch(ROOT + name, {signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 50) throw new Error(name + ': invalid asset size');
    await writeFile(directory + '/' + name, bytes);
    console.log('Downloaded ' + name + ' (' + bytes.length + ' bytes)');
  }
  const iconAtlas = JSON.parse(await readFile(directory + '/skills.json', 'utf8'));
  if (!iconAtlas.frames || !iconAtlas.meta) throw new Error('Missing sprite frame metadata');
  await writeFile(directory + '/origin.json', JSON.stringify({
    repository:'https://github.com/grindinggear/poe2-skilltree-export',
    commit:EXPORT_SHA, files:FILES
  }));
  return iconAtlas.frames;
}

async function main() {
  const frames = await downloadAtlases();
  const game = JSON.parse(await readFile('data/tree.json', 'utf8'));
  const coverage = countMatchingIcons(Object.values(game.nodes), frames);
  if (coverage.matched < 4000) throw new Error('Official sprite match coverage fell below 4,000 nodes: ' + JSON.stringify(coverage));
  console.log('Official passive-tree sprite frames: ' + Object.keys(frames).length);
  console.log('Official passive-tree matched icons: ' + JSON.stringify(coverage));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
