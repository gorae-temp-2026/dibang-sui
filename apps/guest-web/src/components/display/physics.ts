const DEFAULT_ENVELOPE_RADIUS = 190

export function randomInitPos(
  containerWidth: number,
  maxY: number,
  minY = 0,
  marginX = DEFAULT_ENVELOPE_RADIUS + 10,
) {
  const marginY = DEFAULT_ENVELOPE_RADIUS + 10
  const safeMinY = minY + marginY
  const safeMaxY = Math.max(safeMinY + marginY, maxY - marginY)
  return {
    x: marginX + Math.random() * (containerWidth - 2 * marginX),
    y: safeMinY + Math.random() * (safeMaxY - safeMinY),
  }
}
