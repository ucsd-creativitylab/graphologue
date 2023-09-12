import { Edge, Node } from 'reactflow'

import {
  EdgeEntity,
  NodeEntity,
  OriginRange,
  QuestionAndAnswerSynced,
} from '../App'
import { getNewEdge } from '../componentsFlow/Edge'
import { CustomNodeData, getNewCustomNode } from '../componentsFlow/Node'
import { styles } from '../constants'
import { constructGraph } from './graphConstruct'

import {
  EdgePair,
  getEntitySource,
  getNodeEntityFromNodeEntityId,
  havePair,
  nodeLabelling,
  pairTargetIdHasPair,
  saliencyAHigherThanB,
} from './responseProcessing'
import { getHandleId } from './utils'
// import { smartLayout } from './smartLayout'

/* -------------------------------------------------------------------------- */

interface NodeMention {
  // mentionEdgeId: string;
  mentionOriginRange: OriginRange
  mentionOriginText: string
}

const _addMentionedNode = (
  nodeIdsMentionedByEdges: {
    [nodeId: string]: NodeMention[]
  },
  nodeId: string,
  mentionEdge: EdgeEntity,
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
  graph: dagre.graphlib.Graph<{}>,
  rawNodeEntities: NodeEntity[],
  rawEdgeEntities: EdgeEntity[],
  synced: QuestionAndAnswerSynced,
  collapsedNodeIds: string[],
): {
  nodes: Node[]
  edges: Edge[]
} => {
  const { saliencyFilter } = synced

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
      edgePairs.forEach((edgePair, index) => {
        edgeEntities.push({
          edgeLabel,
          edgePairs: [edgePair],
          originRange,
          originText,
        })

        // edgeEntities.push(rawEdgeEntity)

        const { sourceId, targetId } = edgePair
        _addMentionedNode(nodeIdsMentionedByEdges, sourceId, rawEdgeEntity)
        _addMentionedNode(nodeIdsMentionedByEdges, targetId, rawEdgeEntity)
      })
    } else {
      // split the edge
      const pseudoNodeId = `${nodeLabelling}-${originRange.start}-${originRange.end}`
      const addedPairs: EdgePair[] = []

      edgePairs.forEach(({ saliency, sourceId, targetId }, index) => {
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
          saliency,
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
          saliency,
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
          }),
        ),
      })
    }
  })

  /* -------------------------------------------------------------------------- */

  // filter node entities by collapsed nodes
  const collapsedHiddenNodeIds: Set<string> = new Set()
  const collapseEndPoints = new Set([...collapsedNodeIds])
  const collapseEndPointsAdded: Set<string> = new Set([...collapsedNodeIds])

  while (collapseEndPoints.size > 0) {
    const collapseEndPointsLoop = [...collapseEndPoints]
    collapseEndPointsLoop.forEach(collapseEndPoint => {
      // if (collapsedHiddenNodeIds.includes(collapseEndPoint)) {
      //   collapseEndPoints.splice(collapseEndPoints.indexOf(collapseEndPoint), 1)
      //   return
      // }

      edgeEntities.forEach(({ edgePairs }) => {
        edgePairs.forEach(({ sourceId, targetId }) => {
          if (sourceId === collapseEndPoint) {
            collapsedHiddenNodeIds.add(targetId)

            if (
              pairTargetIdHasPair(edgeEntities, targetId) &&
              !collapseEndPointsAdded.has(targetId)
            ) {
              collapseEndPoints.add(targetId)
              collapseEndPointsAdded.add(targetId)
            }
          }
        })
      })

      collapseEndPoints.delete(collapseEndPoint)
    })
  }

  // ! filter node and edge entities

  const filteredEdgeEntities = edgeEntities.filter(edgeEntity => {
    // const {
    //   originRange: { answerObjectId },
    // } = edgeEntity
    const { sourceId, targetId, saliency } = edgeEntity.edgePairs[0]

    // hidden node filter
    if (
      collapsedHiddenNodeIds.has(sourceId) ||
      collapsedHiddenNodeIds.has(targetId)
    )
      return false

    // saliency filter
    if (saliencyAHigherThanB(saliencyFilter, saliency)) return false

    // highlight answer part filter
    // * filtered in mergeEdgeEntities
    // if (
    //   highlightedAnswerObjectIds.length > 0 &&
    //   !highlightedAnswerObjectIds.includes(answerObjectId)
    // )
    //   return false

    // ? disable edge to the first node // TODO any better way?
    if (sourceId === targetId || targetId === '$N1') return false

    // if the edge doesn't have a label, and there are other edges between the same nodes,
    // then eliminate this edge
    const edgesBetweenSourceTarget = edgeEntities.filter(
      _e =>
        _e.edgePairs[0].sourceId === sourceId &&
        _e.edgePairs[0].targetId === targetId,
    )

    const edgeIsTheFirstOneBetweenSourceTarget =
      edgeEntities.findIndex(
        _e =>
          _e.edgePairs[0].sourceId === sourceId &&
          _e.edgePairs[0].targetId === targetId,
      ) === edgeEntities.indexOf(edgeEntity)

    if (edgesBetweenSourceTarget.length > 1) {
      // if there are more than one edges between the same nodes

      // remove all the edges that don't have a label except the first one
      if (
        edgeEntity.edgeLabel === '' &&
        !edgeIsTheFirstOneBetweenSourceTarget
      ) {
        return false
      }

      // remove the edge if there are edges with higher saliency
      const edgesWithHigherSaliency = edgesBetweenSourceTarget.filter(_e =>
        saliencyAHigherThanB(_e.edgePairs[0].saliency, saliency),
      )
      if (edgesWithHigherSaliency.length > 0) {
        return false
      }

      // remove the edge if there are edges with the same saliency and this is not the first one
      const edgesWithSameSaliency = edgesBetweenSourceTarget.filter(
        _e => _e.edgePairs[0].saliency === saliency,
      )
      if (
        edgesWithSameSaliency.length > 1 &&
        edgesWithSameSaliency.findIndex(
          _e =>
            _e.edgePairs[0].sourceId === sourceId &&
            _e.edgePairs[0].targetId === targetId,
        ) !== edgesWithSameSaliency.indexOf(edgeEntity)
      ) {
        return false
      }
    }

    return true
  })

  // !
  const filteredNodeEntities = nodeEntities.filter(nodeEntity => {
    // eliminate orphan nodes
    const { id } = nodeEntity

    if (id === '$N1') return true

    if (nodeEntities.length === 1 && collapsedHiddenNodeIds.size !== 0)
      return true

    if (collapsedHiddenNodeIds.has(id)) return false

    // if (
    //   highlightedCoReferenceOriginRanges.some(range =>
    //     range.nodeIds.includes(id)
    //   )
    // )
    //   return true

    return (
      // that's all edges
      filteredEdgeEntities.find(
        edgeEntity =>
          edgeEntity.edgePairs[0].sourceId === id ||
          edgeEntity.edgePairs[0].targetId === id,
      ) !== undefined
    )
  })

  // ! construct positioned graph
  const computedNodes = constructGraph(
    graph,
    nodeEntities,
    edgeEntities,
    filteredNodeEntities.length ? filteredNodeEntities : nodeEntities, // you don't want to remove everything
    filteredEdgeEntities,
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

  // node entities to nodes
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
          pseudo: entity.pseudo,
          originRanges,
          originTexts,
        },
      ),
    )
  })

  // edge entities to edges
  filteredEdgeEntities.forEach(
    ({ edgeLabel, edgePairs, originRange, originText }) => {
      edgePairs.forEach(({ sourceId, targetId }) => {
        const targetNode: Node<CustomNodeData> | undefined = nodes.find(
          node => node.id === targetId,
        )
        if (!targetNode) return null

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
              customType: targetNode.data.generated.pseudo ? 'plain' : 'arrow',
              editing: false,
              generated: {
                pseudo: false,
                originRanges: [originRange],
                originTexts: [originText],
              },
            },
          ),
        )
      })
    },
  )

  return {
    nodes,
    edges,
  }
}
