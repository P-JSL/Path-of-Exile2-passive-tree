import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTree, visibleNodes, shortestAllocationPath, pruneAllocations } from '../assets/tree-model.js';
const base = {
  classes: [{ name: 'Druid', ascendancies: [{ name: 'Oracle' }] }],
  groups: { 1: { x: 0, y: 0 }, 2: { x: 100, y: 0 }, 3: { x: 200, y: 0 }, 4: { x: 300, y: 0 }, 5: { x: 100, y: 100 } },
  constants: { orbitRadii: [0], orbitAnglesByOrbit: [[0]] },
  nodes: {
    1: { skill: 1, name: 'START', group: 1, orbit: 0, orbitIndex: 0, stats: [], classesStart: ['Druid'], connections: [{ id: 2 }] },
    2: { skill: 2, name: 'Damage', group: 2, orbit: 0, orbitIndex: 0, stats: ['20% increased Damage'], connections: [{ id: 1 }, { id: 3 }, { id: 5 }] },
    3: { skill: 3, name: 'Keystone', group: 3, orbit: 0, orbitIndex: 0, isKeystone: true, stats: [], connections: [{ id: 2 }, { id: 4 }] },
    4: { skill: 4, name: 'Oracle Hidden', group: 4, orbit: 0, orbitIndex: 0, isNotable: true, stats: [], unlockConstraint: { ascendancy: 'Oracle', nodes: [8] }, connections: [{ id: 3 }] },
    5: { skill: 5, name: 'Alternative', group: 5, orbit: 0, orbitIndex: 0, stats: [], connections: [{ id: 2 }] },
    8: { skill: 8, name: 'The Unseen Path', group: 5, orbit: 0, orbitIndex: 0, ascendancyName: 'Oracle', isNotable: true, stats: [], connections: [{ id: 9 }] },
    9: { skill: 9, name: 'Oracle', group: 5, orbit: 0, orbitIndex: 0, ascendancyName: 'Oracle', isAscendancyStart: true, stats: [], connections: [{ id: 8 }] }
  }
};
test('preserves coordinates, IDs, links, starts, classifications', () => {
  const tree = buildTree(base);
  assert.equal(tree.nodes.get(2).x, 100);
  assert.equal(tree.nodes.get(3).category, 'keystone');
  assert.equal(tree.classStarts.get('Druid'), 1);
  assert.equal(tree.ascStarts.get('Oracle'), 9);
  assert.ok(tree.adjacent.get(3).has(2));
  assert.equal(tree.edges.length, 5);
  assert.deepEqual(tree.orbitRadii, [0]);
});
test('one-based group indices resolve to their owning game-exported group', () => {
  const raw = {
    ...base,
    groups: [
      { x: 17, y: 30, nodes: [1] },
      { x: 222, y: 30, nodes: [2] },
      { x: 350, y: 30, nodes: [3] },
      { x: 451, y: 30, nodes: [4] },
      { x: 250, y: 110, nodes: [5, 8, 9] }
    ]
  };
  const result = buildTree(raw);
  assert.equal(result.nodes.get(1).x, 17);
  assert.equal(result.nodes.get(2).x, 222);
  assert.equal(result.nodes.get(3).x, 350);
  assert.equal(result.nodes.get(4).x, 451);
});
test('Oracle unlock condition gates visibility in the ordinary scene', () => {
  const tree = buildTree(base);
  assert.equal(visibleNodes(tree, 'passive', 'Oracle', false).some(n => n.id === 4), false);
  assert.equal(visibleNodes(tree, 'passive', 'Oracle', true).some(n => n.id === 4), true);
  assert.deepEqual(visibleNodes(tree, 'ascendancy', 'Oracle', true).map(n => n.id).sort(), [8, 9]);
});
test('path allocation chooses actual connections rather than geometry guesses', () => {
  const tree = buildTree(base), ids = new Set([1, 2, 3, 4, 5]);
  assert.deepEqual(shortestAllocationPath(tree, 4, ids, new Set(), 1), [2, 3, 4]);
  assert.deepEqual(shortestAllocationPath(tree, 4, ids, new Set([2, 3]), 1), [4]);
  assert.equal(shortestAllocationPath(tree, 8, ids, new Set(), 1), null);
});
test('refund prunes disconnected branches but preserves other allocated paths', () => {
  const tree = buildTree(base), ids = new Set([1, 2, 3, 4, 5]);
  const result = pruneAllocations(tree, new Set([2, 4, 5]), 1, ids);
  assert.deepEqual([...result.result].sort(), [2, 5]);
  assert.equal(result.removed, 1);
});

test('disconnected imported allocations cannot serve as new pathfinding roots', () => {
  const model = buildTree({
    ...base,
    groups: { ...base.groups, 6: { x: 500, y: 0 }, 7: { x: 600, y: 0 } },
    nodes: {
      ...base.nodes,
      11: { skill: 11, name: 'Orphan', group: 6, orbit: 0, orbitIndex: 0, stats: [], connections: [{id:12}] },
      12: { skill: 12, name: 'Orphan target', group: 7, orbit: 0, orbitIndex: 0, stats: [], connections: [{id:11}] }
    }
  });
  const ids = new Set(model.nodes.keys());
  assert.equal(shortestAllocationPath(model, 12, ids, new Set([11]), 1), null);
  assert.deepEqual(shortestAllocationPath(model, 3, ids, new Set([2,11]), 1), [3]);
});
