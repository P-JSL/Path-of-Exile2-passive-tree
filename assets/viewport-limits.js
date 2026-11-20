/** Keep a pannable tree near the viewport without hiding the actual outer nodes.
 * Bounds are from exported passive coordinates; no fabricated skill positions.
 */
export function clampTreeViewport(bounds, centerX, centerY, width, height, zoom) {
  if (!bounds || !Number.isFinite(zoom) || zoom <= 0 ||
      !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return { x:centerX, y:centerY };
  // Allow modest overscroll to inspect nodes along the tree perimeter, while
  // preventing unconstrained dragging into an empty world.
  const overhangX = Math.min(1400, width / zoom * .18);
  const overhangY = Math.min(1400, height / zoom * .18);
  return {
    x: Math.max(bounds.minX - overhangX, Math.min(bounds.maxX + overhangX, centerX)),
    y: Math.max(bounds.minY - overhangY, Math.min(bounds.maxY + overhangY, centerY))
  };
}
