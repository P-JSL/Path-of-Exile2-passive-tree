/** Conservative low-detail mode for large PoE2 passive trees.
 * Retains every node and connection; reduces draw calls without hiding passives.
 */
export function useNormalNodeBatching(zoom, interacting, supportsPath2D) {
  return !!supportsPath2D && Number.isFinite(zoom) &&
    (zoom < 0.065 || (interacting && zoom < 0.28));
}

/** Normal nodes share just a few combinations of colors and opacity. */
export function normalNodePaint(node, allocated, searchDimmed, oracleLocked) {
  return {
    fill: allocated ? '#54d9b6' : '#111c2a',
    stroke: allocated ? '#6be0be' : node.hiddenOracle ? '#a99bea' : '#8194a3',
    alpha: oracleLocked && node.hiddenOracle ? 0.55 : searchDimmed ? 0.3 : 1
  };
}
