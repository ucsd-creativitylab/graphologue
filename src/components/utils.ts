import { Node, Position } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'

export const getNodeId = () => `node-${uuidv4()}`
export const getHandleId = () => `handle-${uuidv4()}`
export const getEdgeId = () => `edge-${uuidv4()}`

/* -------------------------------------------------------------------------- */
// ! generate edge params

const getNodeIntersection = (intersectionNode: Node, targetNode: Node) => {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode
  const targetPosition = targetNode.positionAbsolute

  const w = intersectionNodeWidth! / 2
  const h = intersectionNodeHeight! / 2

  const x2 = intersectionNodePosition!.x + w
  const y2 = intersectionNodePosition!.y + h
  const x1 = targetPosition!.x + w
  const y1 = targetPosition!.y + h

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h)
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1))
  const xx3 = a * xx1
  const yy3 = a * yy1
  const x = w * (xx3 + yy3) + x2
  const y = h * (-xx3 + yy3) + y2

  return { x, y }
}

type IntersectionPoint = {
  x: number
  y: number
}
const getEdgePosition = (node: Node, intersectionPoint: IntersectionPoint) => {
  const n = { ...node.positionAbsolute, ...node }
  const nx = Math.round(n.x!)
  const ny = Math.round(n.y!)
  const px = Math.round(intersectionPoint.x)
  const py = Math.round(intersectionPoint.y)

  if (px <= nx + 1) {
    return Position.Left
  }
  if (px >= nx + n.width! - 1) {
    return Position.Right
  }
  if (py <= ny + 1) {
    return Position.Top
  }
  if (py >= n.y! + n.height! - 1) {
    return Position.Bottom
  }

  return Position.Top
}

export const getEdgeParams = (source: Node, target: Node) => {
  const sourceIntersectionPoint = getNodeIntersection(source, target)
  const targetIntersectionPoint = getNodeIntersection(target, source)

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint)
  const targetPos = getEdgePosition(target, targetIntersectionPoint)

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  }
}

/* -------------------------------------------------------------------------- */
// get graph bounds

export const getGraphBounds = (nodes: Node[]) => {
  const bounds = {
    x: Infinity,
    y: Infinity,
    width: -Infinity,
    height: -Infinity,
  }

  nodes.forEach(node => {
    const {
      position: { x, y },
      width,
      height,
    } = node

    if (x! < bounds.x) bounds.x = x!
    if (y! < bounds.y) bounds.y = y!
    if (x! + width! > bounds.width) bounds.width = x! + width!
    if (y! + height! > bounds.height) bounds.height = y! + height!
  })

  bounds.width -= bounds.x
  bounds.height -= bounds.y

  return bounds
}
