import { Edge, Node } from 'reactflow'

import { EdgeEntity, NodeEntity, OriginAnswerRange } from '../App'
import { getNewEdge } from '../componentsFlow/Edge'
import { getNewCustomNode } from '../componentsFlow/Node'
import { styles } from '../constants'
import { constructGraph } from './graphConstruct'

import {
  EdgePair,
  getEntitySource,
  getNodeEntityFromNodeEntityId,
  havePair,
  nodeLabelling,
} from './responseProcessing'
import { getHandleId } from './utils'
// import { smartLayout } from './smartLayout'

/* -------------------------------------------------------------------------- */

interface NodeMention {
  // mentionEdgeId: string;
  mentionOriginRange: OriginAnswerRange
  mentionOriginText: string
}

const _addMentionedNode = (
  nodeIdsMentionedByEdges: {
    [nodeId: string]: NodeMention[]
  },
  nodeId: string,
  mentionEdge: EdgeEntity
) => {
  if (!nodeIdsMentionedByEdges[nodeId]) {
    nodeIdsMentionedByEdges[nodeId] = []
  }

  const { originRange, originText } = mentionEdge

  nodeIdsMentionedByEdges[nodeId].push({
    mentionOriginRange: originRange,
    mentionOriginText: originText,
  })
}

export const answerObjectsToReactFlowObject = (
  rawNodeEntities: NodeEntity[],
  rawEdgeEntities: EdgeEntity[]
): {
  nodes: Node[]
  edges: Edge[]
} => {
  // build nodes and edges from node and edge entities
  const nodes: Node[] = []
  const edges: Edge[] = []

  // const rawNodeEntities = answerObjects.reduce(
  //   (acc, { nodeEntities }) => [...acc, ...nodeEntities],
  //   [] as NodeEntity[]
  // )
  // const rawEdgeEntities = answerObjects.reduce(
  //   (acc, { edgeEntities }) => [...acc, ...edgeEntities],
  //   [] as EdgeEntity[]
  // )

  const nodeEntities: NodeEntity[] = [...rawNodeEntities]
  const edgeEntities: EdgeEntity[] = []

  // split edges and construct pseudo node entities
  const nodeIdsMentionedByEdges: {
    [nodeId: string]: NodeMention[]
  } = {}
  rawEdgeEntities.forEach(rawEdgeEntity => {
    const { edgeLabel, edgePairs, originRange, originText } = rawEdgeEntity

    if (edgePairs.length === 1) {
      edgeEntities.push(rawEdgeEntity)

      const { sourceId, targetId } = edgePairs[0]
      _addMentionedNode(nodeIdsMentionedByEdges, sourceId, rawEdgeEntity)
      _addMentionedNode(nodeIdsMentionedByEdges, targetId, rawEdgeEntity)
    } else {
      // split the edge
      const pseudoNodeId = `${nodeLabelling}-${originRange.start}-${originRange.end}`
      const addedPairs: EdgePair[] = []

      edgePairs.forEach(({ sourceId, targetId }, index) => {
        // add one pseudo node
        // const pseudoNodeId = `${nodeLabelling}-${sourceId}-${targetId}`

        if (!getNodeEntityFromNodeEntityId(nodeEntities, pseudoNodeId)) {
          nodeEntities.push({
            id: pseudoNodeId,
            displayNodeLabel: edgeLabel,
            pseudo: true,
            individuals: [
              {
                id: pseudoNodeId,
                nodeLabel: edgeLabel,
                originRange,
                originText,
              },
            ],
          })
        }

        // extended edge 1 - source to pseudo node
        const sourceToPseudoPair = {
          sourceId,
          targetId: pseudoNodeId,
        }
        if (!havePair(addedPairs, sourceToPseudoPair)) {
          edgeEntities.push({
            edgeLabel: '',
            edgePairs: [sourceToPseudoPair],
            // id: `${edgeLabelling}-${sourceId}-${pseudoNodeId}`,
            originRange,
            originText,
          })
        }

        // extended edge 2 - pseudo node to target
        const pseudoToTargetPair = {
          sourceId: pseudoNodeId,
          targetId,
        }
        if (!havePair(addedPairs, pseudoToTargetPair)) {
          edgeEntities.push({
            edgeLabel: '',
            edgePairs: [pseudoToTargetPair],
            // id: `${edgeLabelling}-${pseudoNodeId}-${targetId}`,
            originRange,
            originText,
          })
        }

        _addMentionedNode(nodeIdsMentionedByEdges, sourceId, rawEdgeEntity)
        _addMentionedNode(nodeIdsMentionedByEdges, targetId, rawEdgeEntity)
      })
    }
  })

  // check all node ids mentioned by edges are in node entities
  Object.keys(nodeIdsMentionedByEdges).forEach(nodeId => {
    const nodeEntity = getNodeEntityFromNodeEntityId(nodeEntities, nodeId)

    if (!nodeEntity) {
      const nodeMentions = nodeIdsMentionedByEdges[nodeId]

      // add a temp node
      nodeEntities.push({
        id: nodeId,
        displayNodeLabel: '...',
        pseudo: false,
        individuals: nodeMentions.map(
          ({ mentionOriginRange, mentionOriginText }) => ({
            id: nodeId,
            nodeLabel: '...',
            originRange: mentionOriginRange,
            originText: mentionOriginText,
          })
        ),
      })
    }
  })

  const filteredEdgeEntities = edgeEntities.filter(edgeEntity => {
    const { sourceId, targetId } = edgeEntity.edgePairs[0]
    return sourceId !== targetId
  })

  const filteredNodeEntities = nodeEntities.filter(nodeEntity => {
    // eliminate orphan nodes
    const { id } = nodeEntity
    return (
      filteredEdgeEntities.find(
        edgeEntity =>
          edgeEntity.edgePairs[0].sourceId === id ||
          edgeEntity.edgePairs[0].targetId === id
      ) !== undefined
    )
  })

  // construct positioned graph
  const computedNodes = constructGraph(
    filteredNodeEntities,
    filteredEdgeEntities
  )
  // const computedNodes = await smartLayout(
  //   filteredNodeEntities.map(nodeEntity => ({
  //     id: nodeEntity.id,
  //     width: hardcodedNodeWidthEstimation(nodeEntity.displayNodeLabel),
  //     height: hardcodedNodeSize.height,
  //   })),
  //   filteredEdgeEntities.map(edgeEntity => [
  //     edgeEntity.edgePairs[0].sourceId,
  //     edgeEntity.edgePairs[0].targetId,
  //   ])
  // )

  const newNodesTracker: {
    [nodeId: string]: {
      sourceHandleId: string
      targetHandleId: string
    }
  } = {}

  computedNodes.map(({ id, x, y }) => {
    const entity = getNodeEntityFromNodeEntityId(nodeEntities, id)
    if (!entity) return null

    const { originRanges, originTexts } = getEntitySource(entity)

    newNodesTracker[id] = {
      sourceHandleId: getHandleId(),
      targetHandleId: getHandleId(),
    }

    return nodes.push(
      getNewCustomNode(
        id,
        entity.displayNodeLabel,
        x,
        y,
        newNodesTracker[id].sourceHandleId,
        newNodesTracker[id].targetHandleId,
        false, // selected
        false, // editing
        entity.pseudo
          ? styles.nodeColorDefaultGrey
          : styles.nodeColorDefaultWhite, // expanded edge label will be grey
        {
          originRanges,
          originTexts,
        }
      )
    )
  })

  filteredEdgeEntities.forEach(
    ({ edgeLabel, edgePairs, originRange, originText }) => {
      edgePairs.forEach(({ sourceId, targetId }) => {
        edges.push(
          getNewEdge(
            {
              source: sourceId,
              target: targetId,
              sourceHandle: newNodesTracker[sourceId].sourceHandleId,
              targetHandle: newNodesTracker[targetId].targetHandleId,
            },
            {
              label: edgeLabel,
              customType: 'arrow',
              editing: false,
              generated: {
                originRanges: [originRange],
                originTexts: [originText],
              },
            }
          )
        )
      })
    }
  )

  return {
    nodes,
    edges,
  }
}
