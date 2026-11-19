/** Adapter for independent Atlas / Genesis graphs extracted from in-game data by RePoE. */
export function buildExtraTree(raw, id) {
  if (!raw || !raw.groups || !raw.passives || !Array.isArray(raw.roots)) throw new Error(`${id}: 잘못된 트리 데이터`);
  const nodes = new Map();
  const indexed = new Map();
  for (const group of Object.values(raw.groups)) {
    if (!group || !Array.isArray(group.passives)) continue;
    for (const position of group.passives) indexed.set(Number(position.hash), { group, position });
  }
  for (const value of Object.values(raw.passives)) {
    const hash = Number(value.hash), item = indexed.get(hash);
    if (!item) continue;
    const radius = raw.orbit_radii[item.position.radius] ?? 0;
    const count = raw.skills_per_orbit[item.position.radius] || 1;
    const radians = 2 * Math.PI * item.position.position_clockwise / count;
    const stats = (value.stat_text?.length ? value.stat_text : Object.entries(value.stats || {}).map(([k, v]) => `${k}: ${v}`))
      .map(s => String(s).replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2'));
    nodes.set(hash, {
      id: hash, skill: hash, name: value.name || value.id || `#${hash}`,
      stats, x: item.group.x + Math.sin(radians) * radius,
      y: item.group.y - Math.cos(radians) * radius,
      category: value.is_keystone ? 'keystone' : value.is_notable ? 'notable' : value.is_jewel_socket ? 'socket' : raw.roots.includes(hash) ? 'start' : 'normal',
      isOnlyImage: !!value.is_icon_only, isMultipleChoice: !!value.is_multiple_choice,
      isMultipleChoiceOption: !!value.is_multiple_choice_option,
      isAtlasRoot: !!value.is_atlas_root,
      subtree: value.atlas_subtree?.id || '', source: id
    });
  }
  const adjacent = new Map([...nodes.keys()].map(id => [id, new Set()]));
  const edges = [], seen = new Set();
  for (const [id0, item] of indexed) {
    if (!nodes.has(id0)) continue;
    for (const id1 of item.position.connections || []) {
      if (!nodes.has(id1) || id0 === id1) continue;
      adjacent.get(id0).add(id1); adjacent.get(id1).add(id0);
      const key = Math.min(id0,id1)+':'+Math.max(id0,id1);
      if (!seen.has(key)) { seen.add(key); edges.push({ a: id0, b: id1, orbit: 0 }); }
    }
  }
  const roots = raw.roots.filter(id => nodes.has(id));
  return { nodes, edges, adjacent, roots, title: raw.title, kind: id };
}
