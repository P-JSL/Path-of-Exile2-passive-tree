/**
 * Fixed-size world-space lookup for the passive tree canvas.
 * Index once per scene instead of scanning every node and connector per frame.
 * Curved same-orbit connectors use the entire official orbit bounding square so
 * they remain visible even when both endpoints are offscreen.
 */
export class ViewportIndex {
  constructor(nodes, edges, nodeMap, radii = [], cellSize = 720) {
    this.cellSize = cellSize;
    this.nodeCells = new Map();
    this.edgeCells = new Map();
    for (const node of nodes) this.insert(this.nodeCells, node.x, node.y, node.x, node.y, node);
    for (const edge of edges) {
      const a = nodeMap.get(edge.a), b = nodeMap.get(edge.b);
      if (!a || !b) continue;
      const radius = radii[a.orbit] || 0;
      // A nonzero orbit link can pass through the viewport with both nodes out
      // of sight. Index the complete circle, not just the endpoint rectangle.
      if (edge.orbit && a.group === b.group && a.orbit === b.orbit &&
          Number.isFinite(a.groupX) && Number.isFinite(a.groupY) && radius > 0) {
        this.insert(this.edgeCells, a.groupX - radius, a.groupY - radius,
          a.groupX + radius, a.groupY + radius, edge);
      } else {
        this.insert(this.edgeCells, Math.min(a.x, b.x), Math.min(a.y, b.y),
          Math.max(a.x, b.x), Math.max(a.y, b.y), edge);
      }
    }
  }

  insert(cells, left, top, right, bottom, item) {
    const size = this.cellSize;
    for (let x = Math.floor(left / size); x <= Math.floor(right / size); x++) {
      for (let y = Math.floor(top / size); y <= Math.floor(bottom / size); y++) {
        const key = x + ':' + y;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(item);
      }
    }
  }

  query(cells, left, top, right, bottom, margin = 0) {
    const size = this.cellSize;
    const found = new Set();
    for (let x = Math.floor((left - margin) / size); x <= Math.floor((right + margin) / size); x++) {
      for (let y = Math.floor((top - margin) / size); y <= Math.floor((bottom + margin) / size); y++) {
        for (const item of cells.get(x + ':' + y) || []) found.add(item);
      }
    }
    return found;
  }

  visibleNodes(left, top, right, bottom, margin = 0) {
    return this.query(this.nodeCells, left, top, right, bottom, margin);
  }

  visibleEdges(left, top, right, bottom, margin = 0) {
    return this.query(this.edgeCells, left, top, right, bottom, margin);
  }

  nearest(x, y, radius) {
    let winner = null, smallest = radius * radius;
    for (const node of this.visibleNodes(x, y, x, y, radius)) {
      const dx = node.x - x, dy = node.y - y, distance = dx * dx + dy * dy;
      if (distance < smallest) { winner = node; smallest = distance; }
    }
    return winner;
  }
}
