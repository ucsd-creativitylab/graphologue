export interface BoundingRect {
  x: number
  y: number
  width: number
  height: number
}

export const BoundingAInBoundingB = (
  boundingA: BoundingRect,
  boundingB: BoundingRect,
) => {
  return (
    boundingA.x >= boundingB.x &&
    boundingA.y >= boundingB.y &&
    boundingA.x + boundingA.width <= boundingB.x + boundingB.width &&
    boundingA.y + boundingA.height <= boundingB.y + boundingB.height
  )
}

export const minMoveBringBoundingAIntoB = (
  boundingA: BoundingRect,
  boundingB: BoundingRect,
  paddingX: number,
  paddingY: number,
): {
  x: number
  y: number
} => {
  const move = { x: 0, y: 0 }

  let { x: aX, y: aY, width: aWidth, height: aHeight } = boundingA
  let { x: bX, y: bY, width: bWidth, height: bHeight } = boundingB

  if (aX < bX) move.x = bX - aX + paddingX
  else if (aX + aWidth > bX + bWidth)
    move.x = bX + bWidth - aX - aWidth - paddingX

  if (aY < bY) move.y = bY - aY + paddingY
  else if (aY + aHeight > bY + bHeight)
    move.y = bY + bHeight - aY - aHeight - paddingY

  // give up when boundingA is already in B
  return move
}
