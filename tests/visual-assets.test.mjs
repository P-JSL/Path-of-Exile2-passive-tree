import test from 'node:test';
import assert from 'node:assert/strict';
import { iconSpriteKey, nodeFrameKey, frameRectangle } from '../assets/visual-assets.js';
import { atlasIconKey, countMatchingIcons } from '../scripts/bundle-tree-art.mjs';

test('game DDS icon paths resolve to matching pinned GGG sprite keys', () => {
  const normal={icon:'Art/2DArt/SkillIcons/passives/LightningDamagenode.dds',category:'normal'};
  const notable={icon:'Art/2DArt/SkillIcons/passives/PhysicalDamageChaosNode.dds',category:'notable'};
  const keystone={icon:'Art/2DArt/SkillIcons/passives/test.dds',category:'keystone'};
  assert.equal(iconSpriteKey(normal), 'normalActive:Art/2DArt/SkillIcons/passives/LightningDamagenode.png');
  assert.equal(atlasIconKey(normal), iconSpriteKey(normal));
  assert.equal(iconSpriteKey(notable).startsWith('notableActive:'), true);
  assert.equal(iconSpriteKey(keystone).startsWith('keystoneActive:'), true);
  assert.equal(iconSpriteKey({}), null);
});

test('node frame depends on node category, ascendancy and allocation', () => {
  assert.equal(nodeFrameKey({category:'normal'},false), 'frame:PSSkillFrame');
  assert.equal(nodeFrameKey({category:'normal'},true), 'frame:PSSkillFrameActive');
  assert.equal(nodeFrameKey({category:'notable'},true), 'frame:NotableFrameAllocated');
  assert.equal(nodeFrameKey({category:'notable',ascendancyName:'Oracle'},false),
    'frame:AscendancyFrameNotableUnallocated');
  assert.equal(nodeFrameKey({category:'keystone'},false), 'frame:KeystoneFrameUnallocated');
  assert.equal(nodeFrameKey({category:'socket'},true), 'frame:JewelFrameAllocated');
  assert.equal(nodeFrameKey({isOnlyImage:true,category:'normal'},false),null);
});

test('sprite coordinates are validated, and count skips visual-only nodes', () => {
  const key='normalActive:Art/passives/example.png';
  const frames={frames:{[key]:{frame:{x:0,y:6,w:34,h:34}}}};
  assert.deepEqual(frameRectangle(frames,key),{x:0,y:6,w:34,h:34});
  assert.equal(frameRectangle(frames,'missing'),null);
  assert.equal(frameRectangle({frames:{bad:{frame:{x:0,y:0,w:-1,h:0}}}},'bad'),null);
  assert.deepEqual(countMatchingIcons([{icon:'Art/passives/example.dds'}, {isOnlyImage:true}, {icon:'Art/missing.dds'}],frames.frames),
    {total:3,matched:1,skippedImages:1});
});
