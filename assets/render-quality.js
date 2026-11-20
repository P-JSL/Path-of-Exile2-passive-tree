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


/**
 * Screen-space radius of a standard passive. Oracle comparison markers must
 * use the same radius, including at full-tree zoom, or hundreds of rings
 * overwhelm the actual node topology on mobile.
 */
export function normalNodeRadius(zoom) {
  return Math.max(1.2, Math.min(9, zoom * 21));
}

/** Scale emphasis with the tree rather than imposing fixed 7–17 px halos. */
export function oracleOverlayStyle(zoom) {
  const radius = normalNodeRadius(zoom);
  return {
    radius,
    lineWidth: Math.max(.8, Math.min(1.6, .75 + zoom * 2)),
    connectorWidth: Math.max(.65, Math.min(2.8, .9 + zoom * 2)),
    doubleRing: zoom >= .28 && radius >= 5
  };
}
