import test from 'node:test';
import assert from 'node:assert/strict';
import { versionModuleImports, versionEntryAssets } from '../scripts/version-assets.mjs';

const sha='1234567890abcdef1234567890abcdef12345678';
test('all relative JavaScript module imports use the same deploy SHA', () => {
  const source=[
    "import { a } from './i18n.js';",
    "import { b } from './tree-model.js';",
    "import { c } from 'third-party-module';"
  ].join('\n');
  const result=versionModuleImports(source,sha);
  assert.ok(result.includes("'./i18n.js?v="+sha+"'"));
  assert.ok(result.includes("'./tree-model.js?v="+sha+"'"));
  assert.ok(result.includes("from 'third-party-module'"));
  assert.equal(versionModuleImports(result,sha),result);
});
test('index file revisions both CSS and entry module, without replacing unrelated URLs', () => {
  const source='<link rel="stylesheet" href="./assets/styles.css"><script type="module" src="./assets/app.js"></script>';
  const result=versionEntryAssets(source,sha);
  assert.ok(result.includes('styles.css?v='+sha));
  assert.ok(result.includes('app.js?v='+sha));
  assert.equal(versionEntryAssets(result,sha),result);
});
test('invalid deploy revisions are rejected', () => {
  assert.throws(()=>versionModuleImports("import './x.js'", 'invalid'));
});
