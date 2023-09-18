import { Edge, Node, Position } from 'reactflow'
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid'

import { CustomNodeData, NodeSnippet } from '../componentsFlow/Node'
import { hardcodedNodeSize, nodeGap, nodePosAdjustStep } from '../constants'
import { PostConstructionPseudoNodeObject } from './graphConstruct'
import { Tokenization } from './socket'

export const getSimpleNodeId = (baseId: string) => `node-${baseId}`
export const getNodeId = (nodeLabel?: string, extraId?: string) =>
  (nodeLabel ? `node-${uuidv5(nodeLabel, uuidv5.URL)}` : `node-${uuidv4()}`) +
  (extraId ? `-${extraId}` : '')
export const getMagicNodeId = () => `magic-node-${uuidv4()}`
export const getGroupNodeId = () => `group-node-${uuidv4()}`

export const getHandleId = () => `handle-${uuidv4()}`
export const getEdgeId = (sourceId: string, targetId: string) =>
  `edge-${sourceId}---${targetId}---${uuidv4()}`
export const getNoteId = () => `note-${uuidv4()}`

/* -------------------------------------------------------------------------- */

export interface NodeLabelAndTags {
  label: string
  tags: string[]
}

export const predefinedResponses = {
  modelDown: () =>
    'The model is down. Again, the model is D-O-W-N. Please try again later.',
  noValidModelText: () => 'We cannot find an answer. Please try again.',
  noValidResponse: () => 'response unavailable',
  noValidTags: () => 'no available tags',
  waitingPlaceholder: () => '[ loading... ]',
}

export const isValidResponse = (response: string) => {
  return (
    response !== predefinedResponses.modelDown() &&
    response !== predefinedResponses.noValidModelText() &&
    response !== predefinedResponses.noValidResponse() &&
    response !== predefinedResponses.noValidTags() &&
    response !== predefinedResponses.waitingPlaceholder()
  )
}

/* -------------------------------------------------------------------------- */

export const getNodeLabelAndTags = (nodes: Node[]): NodeLabelAndTags[] => {
  const labelAndTags: NodeLabelAndTags[] = []

  nodes.forEach(node => {
    if (node.type === 'custom' && node.data.label)
      labelAndTags.push({
        label: node.data.label,
        tags: node.data.tags || [],
      })
  })
  return labelAndTags
}

export const getEdgeLabels = (edges: Edge[]) => {
  const labels: string[] = []
  edges.forEach(edge => {
    if (edge.data.label) labels.push(edge.data.label)
  })
  return labels
}

export const tagsToString = (tags: string[]) => {
  return tags.length > 0 ? ` (${tags.join(', ')})` : ''
}

export const nodeToString = (node: Node) => {
  return `${node.data.label}${tagsToString(node.data.tags)}`
}

export const nodeAndTagsToString = (item: NodeLabelAndTags) => {
  return `${item.label}${tagsToString(item.tags)}`
}

export const slowDeepCopy = (obj: Object | Object[]) => {
  return JSON.parse(JSON.stringify(obj))
}

export const sleep = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const isStringRoughEqual = (a: string, b: string) => {
  return a.toLowerCase().trim() === b.toLowerCase().trim()
}

export const removeQuotes = (str: string) => {
  // remove quotation marks at the beginning and end of the string, if any
  return str.replace(/^"(.+(?="$))"$/, '$1')
}

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

export const getGraphBounds = (
  nodes: Node[] | NodeSnippet[] | PostConstructionPseudoNodeObject[],
) => {
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

export const getComponentsBounds = (
  targetNodes: Node[],
  targetEdges: Edge[],
  nodes: Node[],
) => {
  const bounds = {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity,
  }

  // recover edges to nodes
  const nodesFromEdges = targetEdges.reduce((acc: any[], edge: Edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    return [...acc, sourceNode, targetNode]
  }, [] as Node[])

  targetNodes = [...targetNodes, ...nodesFromEdges]

  targetNodes.forEach(node => {
    const {
      position: { x, y },
      width,
      height,
    } = node

    if (x! < bounds.left) bounds.left = x!
    if (y! < bounds.top) bounds.top = y!
    if (x! + width! > bounds.right) bounds.right = x! + width!
    if (y! + height! > bounds.bottom) bounds.bottom = y! + height!
  })

  return bounds
}

const getCurrentIntersections = (
  nodes: Node[],
  node: {
    position: { x: number; y: number }
    width: number
    height: number
  },
) => {
  return nodes.filter(n => {
    return (
      node.position.x! + node.width! > n.position.x! &&
      node.position.x! < n.position.x! + n.width! &&
      node.position.y! + node.height! > n.position.y! &&
      node.position.y! < n.position.y! + n.height!
    )
  })
}

export const adjustNewNodePositionAvoidIntersections = (
  nodes: Node[],
  initialX: number,
  initialY: number,
  newNodeWidth = hardcodedNodeSize.width,
  newNodeHeight = hardcodedNodeSize.height,
  possibleDirections = {
    up: true,
    down: true,
    left: true,
    right: true,
  },
): {
  adjustedX: number
  adjustedY: number
} => {
  // loop through all nodes and check if the new node intersects with any of them
  const currentIntersections = getCurrentIntersections(nodes, {
    position: { x: initialX, y: initialY },
    width: newNodeWidth,
    height: newNodeHeight,
  })

  // if there are no intersections, return the initial position
  if (currentIntersections.length === 0)
    return { adjustedX: initialX, adjustedY: initialY }

  // if there are intersections, move to four directions until there are no intersections and return the new position with the least move
  const directions = []
  if (possibleDirections.right) directions.push({ x: 1, y: 0 })
  if (possibleDirections.down) directions.push({ x: 0, y: 1 })
  if (possibleDirections.left) directions.push({ x: -1, y: 0 })
  if (possibleDirections.up) directions.push({ x: 0, y: -1 })

  let adjustedX = initialX
  let adjustedY = initialY

  let minMove = Infinity
  const stepX = nodePosAdjustStep
  const stepY = nodePosAdjustStep

  directions.forEach(direction => {
    let x = initialX + direction.x * stepX
    let y = initialY + direction.y * stepY
    let move = 1

    while (
      getCurrentIntersections(nodes, {
        position: { x, y },
        width: newNodeWidth,
        height: newNodeHeight,
      }).length > 0
    ) {
      x += direction.x * stepX
      y += direction.y * stepY
      move++
    }

    if (move < minMove) {
      minMove = move
      adjustedX = x
      adjustedY = y
    }
  })

  return { adjustedX, adjustedY }
}

export const getPositionOffsetForGeneratedNodes = (
  pseudoGeneratedNodeObjects: PostConstructionPseudoNodeObject[],
  anchorNodes: Node[],
  anchorMagicNode: Node,
): { offsetX: number; offsetY: number } => {
  // get bounds of pseudoGeneratedNodeObjects
  const pseudoObjectsBounds = getGraphBounds(pseudoGeneratedNodeObjects)

  if (anchorNodes.length === 0) {
    // append to the right of the magic node
    return {
      offsetX:
        anchorMagicNode.position.x +
        (anchorMagicNode.width ?? hardcodedNodeSize.magicWidth) +
        nodeGap -
        pseudoObjectsBounds.x,
      offsetY: anchorMagicNode.position.y - pseudoObjectsBounds.y,
    }
  } else {
    let targetNode: Node
    if (anchorNodes.length === 1) {
      targetNode = anchorNodes[0]
    } else {
      targetNode = anchorNodes.reduce((acc, node) => {
        if (node.position.x < acc.position.x) return node
        return acc
      })
    }

    // find the corresponding pseudo object
    const pseudoObject = pseudoGeneratedNodeObjects.find(
      p => p.label === (targetNode.data as CustomNodeData).label,
    )
    if (!pseudoObject) return { offsetX: 0, offsetY: 0 }

    return {
      offsetX: targetNode.position.x - pseudoObject.position.x,
      offsetY: targetNode.position.y - pseudoObject.position.y,
    }
  }
}

/* -------------------------------------------------------------------------- */
// ! pure math

export const roundTo = (num: number, precision: number) => {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}

/* -------------------------------------------------------------------------- */
// ! pure string

export const matchItemsInQuotes = (str: string): string[] => {
  const regex = /"(.*?)"/g
  const matches = []
  let match

  while ((match = regex.exec(str))) {
    matches.push(match[1])
  }

  return matches
}

/* -------------------------------------------------------------------------- */

export const downloadData = (data: any, filename: string) => {
  // download json as a file
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/* -------------------------------------------------------------------------- */

export const isEmptyTokenization = (tokenization: Tokenization) => {
  for (const key in tokenization) {
    if (tokenization[key].length > 0) return false
  }
  return true
}

/* -------------------------------------------------------------------------- */

export const getCurrentTextSelection = () => {
  const selection = window.getSelection()
  if (!selection) return null
  const range = selection.getRangeAt(0)
  const text = range.toString()
  return text
}
