/**
 * Offline Path of Building 2 import.
 * XML is untrusted: parse as XML, never insert its content as HTML or fetch URLs.
 * PoB1 uses another game and is explicitly rejected.
 */
const MAX_INPUT = 1_500_000;
const MAX_OUTPUT = 12_000_000;
const csv = text => (text || '').split(',').map(s => s.trim()).filter(Boolean);
const ids = text => csv(text).filter(s => /^\d+$/.test(s)).map(Number);
const children = (node, name) => [...(node?.children || [])].filter(e => e.tagName === name);
const child = (node, name) => children(node, name)[0] || null;
const attr = (node, name) => node?.getAttribute(name) || '';
const attributes = node => Object.fromEntries([...(node?.attributes || [])].map(a => [a.name, a.value]));

export async function decodePobCode(input) {
  if (typeof input !== 'string' || !input.trim()) throw new Error('PoB2 공유 코드를 입력하세요.');
  const trimmed = input.trim();
  if (trimmed.length > MAX_INPUT) throw new Error('공유 코드가 크기 제한을 초과했습니다.');
  if (trimmed.startsWith('<')) {
    if (trimmed.length > MAX_OUTPUT) throw new Error('XML 크기 제한을 초과했습니다.');
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) throw new Error('공유 페이지 링크 대신 PoB2에서 생성한 코드를 붙여 넣으세요.');
  const encoded = trimmed.replace(/\s/g, '');
  if (!/^[a-z\d+/_=-]+$/i.test(encoded)) throw new Error('Base64 PoB2 공유 코드 형식이 아닙니다.');
  if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 PoB 압축 해제를 지원하지 않습니다.');
  let compressed;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4);
    compressed = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  } catch { throw new Error('PoB 코드의 Base64 인코딩이 손상되었습니다.'); }
  try {
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'));
    const reader = stream.getReader();
    let length = 0;
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_OUTPUT) throw new Error('PoB 압축 해제 결과가 크기 제한을 초과했습니다.');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch (error) {
    if (error.message.includes('크기 제한')) throw error;
    throw new Error('PoB2 압축 데이터를 해제할 수 없습니다. 코드가 올바른지 확인하세요.');
  }
}

export function parsePobDocument(doc) {
  if (doc.querySelector('parsererror')) throw new Error('PoB XML 구문이 올바르지 않습니다.');
  const root = doc.documentElement;
  if (root?.tagName === 'PathOfBuilding') throw new Error('PoE1용 PoB 코드는 지원하지 않습니다. PoB2 코드를 사용하세요.');
  if (root?.tagName !== 'PathOfBuilding2') throw new Error('PoB2 공유 코드가 아닙니다.');
  const build = child(root, 'Build'), tree = child(root, 'Tree');
  if (!build || !tree) throw new Error('PoB2 빌드의 직업 또는 패시브 정보가 없습니다.');
  const specs = children(tree, 'Spec').map(spec => {
    const weapons = [child(spec, 'WeaponSet1'), child(spec, 'WeaponSet2')].map(el => ids(attr(el, 'nodes')));
    const overrides = child(child(spec, 'Overrides'), 'AttributeOverride');
    const attributeChoices = {};
    for (const [type, key] of [['strNodes','str'],['dexNodes','dex'],['intNodes','int']]) {
      for (const id of ids(attr(overrides, type))) attributeChoices[id] = key;
    }
    return {
      title: attr(spec, 'title'),
      treeVersion: attr(spec, 'treeVersion'),
      classInternalId: attr(spec, 'classInternalId'),
      ascendancyInternalId: attr(spec, 'ascendancyInternalId'),
      // PoB2 PassiveSpec: Spec.nodes is the authoritative complete allocation
      // list. WeaponSet1/2 only mark the mode for already allocated node IDs.
      // Do not synthesize additional allocations from malformed markers.
      nodeIds: [...new Set(ids(attr(spec, 'nodes')))],
      weaponSets: weapons,
      sockets: children(child(spec, 'Sockets'), 'Socket').map(s => ({nodeId:Number(attr(s,'nodeId')),itemId:attr(s,'itemId')})),
      attributeChoices
    };
  });
  if (!specs.length) throw new Error('PoB2 빌드에 패시브 트리가 없습니다.');
  const activeIndex = Math.max(0, Math.min(specs.length - 1, (Number(attr(tree,'activeSpec')) || 1) - 1));
  const skills = child(root, 'Skills');
  const skillSets = children(skills, 'SkillSet').map(s => ({
    id:attr(s, 'id'),title:attr(s, 'title'),
    groups:children(s,'Skill').map(group => ({
      label:attr(group,'label'),slot:attr(group,'slot'),
      gems:children(group,'Gem').map(g => ({
        name:attr(g,'nameSpec') || attr(g,'skillId') || attr(g,'gemId'),
        level:attr(g,'level'),quality:attr(g,'quality'),enabled:attr(g,'enabled') !== 'false',
        id:attr(g,'gemId')
      }))
    }))
  }));
  if (!skillSets.length && skills) skillSets.push({
    id:attr(skills,'activeSkillSet') || '1', title:'',
    groups:children(skills,'Skill').map(s => ({
      label:attr(s,'label'),slot:attr(s,'slot'),
      gems:children(s,'Gem').map(g => ({
        name:attr(g,'nameSpec') || attr(g,'skillId') || attr(g,'gemId'),
        level:attr(g,'level'),quality:attr(g,'quality'),enabled:attr(g,'enabled') !== 'false',
        id:attr(g,'gemId')
      }))
    }))
  });
  const items = child(root,'Items');
  const itemPool = new Map(children(items, 'Item').map(item => [attr(item,'id'), (item.textContent || '').trim()]));
  for (const spec of specs) {
    for (const socket of spec.sockets) socket.text = itemPool.get(socket.itemId) || '';
  }
  const itemSets = children(items, 'ItemSet').map(s => ({
    id:attr(s,'id'),title:attr(s,'title'),
    slots:children(s,'Slot').map(slot => ({
      name:attr(slot,'name'),itemId:attr(slot,'itemId'),
      text:itemPool.get(attr(slot,'itemId')) || ''
    }))
  }));
  const config = child(root,'Config');
  const configSets = children(config,'ConfigSet').map(s => ({
    id:attr(s,'id'),title:attr(s,'title'),
    inputs:children(s,'Input').map(input => attributes(input))
  }));
  const stats = children(build,'PlayerStat').map(stat => ({name:attr(stat,'stat'),value:attr(stat,'value')}));
  return {
    className:attr(build,'className'),ascendancyName:attr(build,'ascendClassName'),
    level:attr(build,'level'),specs,activeIndex,skillSets,itemSets,configSets,stats,
    activeSkillSet:attr(skills,'activeSkillSet'),activeItemSet:attr(items,'activeItemSet'),
    notes:(child(root,'Notes')?.textContent || '').trim(),
    // A read-only summary never assumes PoB's calculation engine is available.
    fullFidelityCalculation:false
  };
}

export function parsePobXml(xml) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('외부 엔티티를 포함한 XML은 가져올 수 없습니다.');
  if (typeof DOMParser === 'undefined') throw new Error('XML 파서를 지원하지 않는 브라우저입니다.');
  return parsePobDocument(new DOMParser().parseFromString(xml,'application/xml'));
}

export async function importPobCode(code) {
  return parsePobXml(await decodePobCode(code));
}

/** Match imported node hashes to the locally bundled version without inventing nodes. */
export function resolvePobTree(build, model, index = build.activeIndex) {
  const spec = build.specs[index];
  if (!spec) throw new Error('선택한 빌드 트리가 없습니다.');
  // A malformed export can contain weapon-set markers but no authoritative
  // Spec.nodes. Never interpret such a source as an empty build and wipe a plan.
  if (!spec.nodeIds.length && spec.weaponSets.some(set => set.length))
    throw new Error('PoB2의 패시브 목록(Spec.nodes)이 비어 있으나 무기 세트 노드가 존재합니다. 기존 계획을 변경하지 않았습니다.');
  const className = build.className;
  if (!model.classes.includes(className)) throw new Error('현재 트리 데이터에 없는 직업입니다: ' + className);
  const candidates = model.ascendancies.filter(a => a.className === className).map(a => a.name);
  let ascendancy = candidates.includes(build.ascendancyName) ? build.ascendancyName : '';
  const known = [], unknown = [], ascendancyCounts = new Map();
  for (const id of spec.nodeIds) {
    const node = model.nodes.get(id);
    if (!node) { unknown.push(id); continue; }
    if (node.ascendancyName) ascendancyCounts.set(node.ascendancyName,(ascendancyCounts.get(node.ascendancyName)||0)+1);
    known.push(node);
  }
  if (!ascendancy && ascendancyCounts.size) {
    ascendancy = [...ascendancyCounts].filter(([name])=>candidates.includes(name)).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
  }
  const ordinary = [], specialized = [], incompatible = [];
  for (const node of known) {
    if (node.classesStart || node.isAscendancyStart || node.isOnlyImage) continue;
    if (!node.ascendancyName) ordinary.push(node.id);
    else if (node.ascendancyName === ascendancy) specialized.push(node.id);
    else incompatible.push(node.id);
  }
  return { className, ascendancy, ordinary, specialized, unknown, incompatible, spec };
}
