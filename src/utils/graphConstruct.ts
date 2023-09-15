import dagre from 'dagre'

import { EdgeEntity, NodeEntity, OriginRange } from '../App'
import { hardcodedNodeWidthEstimation } from '../componentsFlow/Node'
import { hardcodedNodeSize } from '../constants'

export const processTriplet = (
  triplet: string[],
  linkedOriginalText?: string,
): string[] => {
  // ! process the edge label
  // make the edge the lower case
  triplet[1] = triplet[1].toLowerCase()
  // avoid underscore
  triplet[1] = triplet[1].replace(/_/g, ' ')
  // ? [experimental] remove is, was, are, were, etc.
  // TODO optimize?
  triplet[1] = triplet[1].replace(
    /(?:^|\s)(is|was|are|were|has|have|had|does|do|did|a|an|the)(?=\s|$)/g,
    '',
  )

  // ! process everything
  // trim
  triplet.forEach((t, ind) => (triplet[ind] = t.trim()))
  // remove line breaks, and other special characters, like semi-colon
  triplet.forEach(
    (t, ind) => (triplet[ind] = t.replace(/[^a-zA-Z0-9 ,.!?&()]+/g, '')),
  )

  // ! process the subject
  // remove the 's
  triplet[0] = triplet[0].replace(/'s/g, '')
  // remove comma from the start and end
  triplet[0] = triplet[0].replace(/^,|,$/g, '')

  if (linkedOriginalText) return [...triplet, linkedOriginalText]
  else return triplet
}

// ? why - what if there are two 'contains' from two subjects?
export const wrapWithHiddenExpandId = (text: string, id: string) => {
  return `${text}____${id}____`
}

export const removeHiddenExpandId = (text: string) => {
  return text.replace(/____.*?____/g, '')
}

export const hasHiddenExpandId = (text: string) => {
  return text.includes('____')
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export const constructGraph = (
  graph: dagre.graphlib.Graph<{}>,
  rawNodeEntities: NodeEntity[],
  rawEdgeEntities: EdgeEntity[],
  nodeEntities: NodeEntity[],
  edgeEntities: EdgeEntity[],
) => {
  // https://github.com/dagrejs/dagre/wiki#an-example-layout
  graph.setGraph({
    rankdir: 'LR',
    // align: 'UL',
    ranksep: 90, // !
    nodesep: 15, // !
    // ranker: 'longest-path',
  })
  graph.setDefaultEdgeLabel(function () {
    return ''
  })

  // for (const nId of graph.nodes()) {
  //   graph.removeNode(nId)
  // }

  rawNodeEntities.forEach(nodeE => {
    // check if the node is nodeEntities
    const nodeEntity = nodeEntities.find(nE => nE.id === nodeE.id)

    if (!nodeEntity) {
      graph.removeNode(nodeE.id)
    } else {
      graph.setNode(nodeE.id, {
        label: nodeE.id,
        width: hardcodedNodeWidthEstimation(
          nodeE.displayNodeLabel,
          nodeE.pseudo,
        ),
        height: hardcodedNodeSize.height,
      })
    }
  })

  rawEdgeEntities.forEach(edgeE => {
    const edgeLabel = edgeE.edgeLabel
    const edgePair = edgeE.edgePairs[0]

    // check if the edge is edgeEntities
    const edgeEntity = edgeEntities.find(eE => {
      return (
        edgePair.sourceId === eE.edgePairs[0].sourceId &&
        edgePair.targetId === eE.edgePairs[0].targetId &&
        edgeLabel === eE.edgeLabel
      )
    })

    if (!edgeEntity) {
      graph.removeEdge(edgePair.sourceId, edgePair.targetId)
    } else {
      graph.setEdge(edgePair.sourceId, edgePair.targetId, {
        label: edgeE.edgeLabel,
      })
    }
  })

  // ! compute
  dagre.layout(graph)
  // console.log('* graph layout')

  // print the graph
  const nodes: {
    id: string
    x: number
    y: number
  }[] = []
  graph.nodes().forEach(v => {
    nodes.push({
      id: graph.node(v).label as string,
      x: graph.node(v).x,
      y: graph.node(v).y,
    })
  })

  return nodes
}

export const nodeWithMostChildren = (
  nodeEntities: NodeEntity[],
  edgeEntities: EdgeEntity[],
): string | null => {
  // find the node with the most children (including children's children)

  const nodeChildrenCount: {
    [key: string]: {
      count: number
      accumulatedCount: number
      childrenNodeIds: string[]
    }
  } = {}

  nodeEntities.forEach(nodeE => {
    nodeChildrenCount[nodeE.id] = {
      count: 0,
      accumulatedCount: 0,
      childrenNodeIds: [],
    }
  })

  edgeEntities.forEach(edgeE => {
    edgeE.edgePairs.forEach(edgePair => {
      nodeChildrenCount[edgePair.sourceId].count++
      nodeChildrenCount[edgePair.sourceId].childrenNodeIds.push(
        edgePair.targetId,
      )
    })
  })

  // recursively accumulate children's children
  const accumulateChildrenNodesCount = (
    acc: number,
    visitedNodeIds: Set<string>,
    nodeId: string,
  ) => {
    visitedNodeIds.add(nodeId)

    const childrenNodeIds = nodeChildrenCount[nodeId].childrenNodeIds
    if (childrenNodeIds.length === 0) return acc

    childrenNodeIds.forEach(childNodeId => {
      const childNode = nodeChildrenCount[childNodeId]

      if (childNode.childrenNodeIds.length === 0) {
        // no children
      } else {
        // has children
        if (visitedNodeIds.has(childNodeId)) return acc

        acc += accumulateChildrenNodesCount(
          childNode.count,
          visitedNodeIds,
          childNodeId,
        )
      }
    })

    return acc
  }

  nodeEntities.forEach(nodeE => {
    nodeChildrenCount[nodeE.id].accumulatedCount = accumulateChildrenNodesCount(
      nodeChildrenCount[nodeE.id].count,
      new Set(),
      nodeE.id,
    )
  })

  let nodeWithMostChildren: string | null = null
  let maxCount = 0
  Object.keys(nodeChildrenCount).forEach(nodeId => {
    const count = nodeChildrenCount[nodeId].accumulatedCount
    if (count > maxCount) {
      maxCount = count
      nodeWithMostChildren = nodeId
    }
  })

  return nodeWithMostChildren
}

/* -------------------------------------------------------------------------- */
// not using!
export const constructGraphChat = (annotatedRelationships: {
  answerObjectId: string
  relationships: {
    relationship: [string, string, string]
    origin: OriginRange
  }[]
}) => {
  const { answerObjectId, relationships } = annotatedRelationships

  // https://github.com/dagrejs/dagre/wiki#an-example-layout
  var pseudoGraph = new dagre.graphlib.Graph()
  pseudoGraph.setGraph({
    rankdir: 'LR',
    // align: 'UL',
    ranksep: 100,
    nodesep: 30,
  })
  pseudoGraph.setDefaultEdgeLabel(function () {
    return ''
  })

  // addedNodes tracks which nodes have been added to the graph, and also
  // which answer objects they are associated with
  const addedNodes: {
    [key: string]: Set<string>
  } = {}

  const nodesToOrigins: {
    [key: string]: OriginRange[]
  } = {}

  relationships.forEach(({ relationship: [a, edge, b], origin }) => {
    if (!(a in addedNodes)) {
      pseudoGraph.setNode(a, {
        label: a,
        // TODO
        // width: hardcodedNodeWidthEstimation(removeHiddenExpandId(a)),
        width: hardcodedNodeSize.width,
        height: hardcodedNodeSize.height,
      })
      addedNodes[a] = new Set()
      nodesToOrigins[a] = []
    }
    addedNodes[a].add(answerObjectId)
    // nodesToOrigins[a] = addOrMergeRanges(nodesToOrigins[a], origin)

    if (!(b in addedNodes)) {
      pseudoGraph.setNode(b, {
        label: b,
        // TODO
        // width: hardcodedNodeWidthEstimation(removeHiddenExpandId(b)),
        width: hardcodedNodeSize.width,
        height: hardcodedNodeSize.height,
      })
      addedNodes[b] = new Set()
      nodesToOrigins[b] = []
    }
    addedNodes[b].add(answerObjectId)
    // nodesToOrigins[b] = addOrMergeRanges(nodesToOrigins[b], origin)

    pseudoGraph.setEdge(a, b, { label: edge })
  })

  // ! compute
  dagre.layout(pseudoGraph)

  // print the graph
  const nodes: {
    label: string
    x: number
    y: number
  }[] = []
  pseudoGraph.nodes().forEach(v => {
    nodes.push({
      label: pseudoGraph.node(v).label as string,
      x: pseudoGraph.node(v).x,
      y: pseudoGraph.node(v).y,
    })
  })

  return {
    nodes,
    nodesToAnswerObjectIds: addedNodes,
    nodesToOrigins,
  }
}

export interface PostConstructionPseudoNodeObject {
  id: string
  label: string
  position: {
    x: number
    y: number
  }
  width: number
  height: number
  sourceHandleId: string
  targetHandleId: string
}
