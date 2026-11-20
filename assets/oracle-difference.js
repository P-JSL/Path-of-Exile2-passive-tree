/**
 * Compare the game's ordinary passive tree against Oracle's The Unseen Path.
 * The only added passive IDs are those explicitly flagged by the original
 * game export (unlockConstraint.ascendancy === "Oracle").
 * The comparison does not unlock, allocate or alter any nodes.
 */
export function oracleDifference(tree, ascendancy = 'Oracle') {
  if (!tree || ascendancy !== 'Oracle') return {nodes:[], edges:[], baseCount:0, groups:[]};
  const base = [...tree.nodes.values()].filter(node=>!node.ascendancyName && !node.hiddenOracle);
  const added = [...tree.nodes.values()].filter(node=>!node.ascendancyName &&
    node.unlockConstraint?.ascendancy === 'Oracle');
  const byId = new Set(added.map(node=>node.id));
  const passive = new Set([...base.map(node=>node.id), ...byId]);
  const edges = tree.edges.filter(edge =>
    (byId.has(edge.a) || byId.has(edge.b)) &&
    passive.has(edge.a) && passive.has(edge.b) &&
    Math.hypot((tree.nodes.get(edge.a)?.x ?? 0) - (tree.nodes.get(edge.b)?.x ?? 0),
      (tree.nodes.get(edge.a)?.y ?? 0) - (tree.nodes.get(edge.b)?.y ?? 0)) <= 3000)
    .map(edge=>({...edge,from:tree.nodes.get(edge.a),to:tree.nodes.get(edge.b)}));
  // Real GGG group IDs are retained for identifying physically separate areas.
  const groups = new Map();
  for(const node of added) {
    const group=String(node.group ?? '?');
    if(!groups.has(group)) groups.set(group,[]);
    groups.get(group).push(node);
  }
  const ordered = [...groups].sort((a,b)=>
    Math.min(...a[1].map(n=>n.y)) - Math.min(...b[1].map(n=>n.y)) ||
    Number(a[0]) - Number(b[0]));
  return {
    nodes:added,edges,baseCount:base.length,
    groups:ordered.map(([id,nodes])=>({id,nodes:[...nodes].sort((a,b)=>a.id-b.id)}))
  };
}
