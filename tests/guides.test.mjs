import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES } from '../assets/guides-data.js';
import { versionGuideAssets } from '../scripts/version-assets.mjs';

test('five starter guides have unique ids, Korean content and grounded source links', () => {
  assert.equal(GUIDES.length, 5);
  assert.deepEqual(GUIDES.map(item => item.rank), [1, 2, 3, 4, 5]);
  assert.equal(new Set(GUIDES.map(item => item.id)).size, 5);
  for (const guide of GUIDES) {
    assert.match(guide.title, /[가-힣]/);
    assert.match(guide.source, /^https:\/\/mobalytics\.gg\/poe-2\/builds\/[a-z0-9-]+$/);
    assert.ok(guide.stages.length >= 5, guide.id + ': expected campaign progression');
    assert.ok(guide.gems.length >= 5, guide.id + ': expected skill sections');
    assert.ok(guide.passives.length >= 3, guide.id + ': expected passive guidance');
    assert.ok(guide.checks.length >= 3, guide.id + ': expected playable checklist');
    assert.ok(guide.equipment.length >= 3, guide.id + ': expected equipment section');
  }
  assert.match(GUIDES[4].version, /0\.1/, '2024 reference must not masquerade as current');
});

test('guide route is linked separately from existing tree-mode buttons', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../guides.html', import.meta.url), 'utf8');
  assert.match(index, /href="\.\/guides\.html" class="guide-nav-link"/);
  assert.doesNotMatch(index, /class="tree-tab[^"]*"[^>]*href="\.\/guides\.html"/);
  for (const id of ['guide-choices', 'guide-tabs', 'guide-panel', 'guide-source-link']) {
    assert.ok(page.includes('id="' + id + '"'), id + ' missing');
  }
  assert.match(page, /lang="ko"/);
  assert.match(page, /assets\/guides\.js/);
  assert.match(page, /assets\/guides\.css/);
});

test('guide page asset versions are stable and independent of tree entrypoint', () => {
  const original = '<link href="./assets/guides.css"><script type="module" src="./assets/guides.js"></script>';
  const sha = '1234567890abcdef1234567890abcdef12345678';
  const result = versionGuideAssets(original, sha);
  assert.ok(result.includes('guides.css?v=' + sha));
  assert.ok(result.includes('guides.js?v=' + sha));
  assert.equal(versionGuideAssets(result, sha), result);
  assert.throws(() => versionGuideAssets(original, 'invalid'));
});
