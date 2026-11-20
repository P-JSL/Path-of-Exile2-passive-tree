/**
 * Display-only renderer adapters for official GGG sprite atlases.
 * This module does not alter skill IDs, coordinates or graph connectivity.
 */
const BASE = './data/visual/';
const CLASSES = new Set(['Druid','Huntress','Mercenary','Monk','Ranger','Sorceress','Warrior','Witch']);
const REVISION = new URL(import.meta.url).searchParams.get('v');
function resource(name) {
  return BASE + name + (REVISION ? '?v=' + encodeURIComponent(REVISION) : '');
}

export function iconSpriteKey(node) {
  if (typeof node?.icon !== 'string' || !node.icon) return null;
  const file = node.icon.replace(/\.dds$/i, '.png');
  const group = node.isKeystone || node.category === 'keystone' ? 'keystoneActive' :
    node.isNotable || node.category === 'notable' ? 'notableActive' : 'normalActive';
  return group + ':' + file;
}

export function nodeFrameKey(node, allocated, available = false) {
  if (node.isOnlyImage) return null;
  const status = allocated ? 'Allocated' : available ? 'CanAllocate' : 'Unallocated';
  const asc = !!node.ascendancyName;
  if (node.category === 'keystone') return 'frame:KeystoneFrame' + status;
  if (node.category === 'notable') return 'frame:' + (asc ? 'AscendancyFrameNotable' : 'NotableFrame') + status;
  if (node.category === 'socket') return 'frame:JewelFrame' + status;
  if (asc) return 'frame:AscendancyFrameNormal' + status;
  return 'frame:' + (allocated ? 'PSSkillFrameActive' : available ? 'PSSkillFrameHighlighted' : 'PSSkillFrame');
}

export function frameRectangle(catalog, name) {
  const frame = catalog?.frames?.[name]?.frame;
  if (!frame || ![frame.x,frame.y,frame.w,frame.h].every(Number.isFinite) || frame.w <= 0 || frame.h <= 0) return null;
  return frame;
}

async function readAtlas(name) {
  const response = await fetch(resource(name + '.json'));
  if (!response.ok) throw new Error(name + ': HTTP ' + response.status);
  const metadata = await response.json();
  const image = new Image();
  image.decoding = 'async';
  image.src = resource(name + '.webp');
  if (typeof image.decode === 'function') await image.decode();
  else await new Promise((resolve, reject) => {image.onload=resolve;image.onerror=reject;});
  return { image, ...metadata };
}

export async function loadVisualAtlases() {
  const [skills, frame] = await Promise.all([readAtlas('skills'), readAtlas('frame')]);
  return {skills, frame};
}

export async function loadClassArt(className) {
  if (!CLASSES.has(className)) return null;
  return readAtlas('background-' + className.toLowerCase());
}

/** Source dimensions stay exact; drawing is limited by on-screen zoom. */
export function drawAtlasFrame(ctx, atlas, key, x, y, width, height = width) {
  const frame = frameRectangle(atlas, key);
  if (!frame || !atlas?.image) return false;
  ctx.drawImage(atlas.image, frame.x, frame.y, frame.w, frame.h,
    x - width/2, y - height/2, width, height);
  return true;
}
