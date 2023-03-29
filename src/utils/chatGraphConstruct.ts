import { Edge, Node } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'

import { AnswerObject, AnswerRelationshipObject, RawAnswerRange } from '../App'
import { getNewEdge } from '../componentsFlow/Edge'
import {
  getNewCustomNode,
  hardcodedNodeWidthEstimation,
} from '../componentsFlow/Node'
import { hardcodedNodeSize, styles } from '../constants'
import { originTextToRange } from './chatAppUtils'
import {
  constructGraphChat,
  hasHiddenExpandId,
  PostConstructionPseudoNodeObject,
  processTriplet,
  removeHiddenExpandId,
  wrapWithHiddenExpandId,
} from './magicGraphConstruct'

import { promptTerms } from './promptsAndResponses'
import { getGraphBounds, getHandleId, getNodeId, removeQuotes } from './utils'

export const rawRelationsToGraphRelationsChat = (
  rawResponse: string,
  rawRelationsText: string
): AnswerRelationshipObject[] => {
  // console.log(rawRelationsText)

  // preprocess the response
  const textRelationshipsArray: string[][] = rawRelationsText
    .split('\n')
    .map((item: string) => {
      item = item.trim()

      if (
        (item.split(promptTerms.itemRelationshipConnector) ?? []).length !==
          3 ||
        (item.split(promptTerms.itemOriginalTextConnector) ?? []).length !==
          2 ||
        (item.match(/"/g) || []).length !== 2
      )
        return []

      const originalText = removeQuotes(
        item.split(promptTerms.itemOriginalTextConnector)[1].trim()
      )
      item = item.split(promptTerms.itemOriginalTextConnector)[0].trim()

      const triplet: string[] = item
        .split(promptTerms.itemRelationshipConnector)
        .map(i => i.trim())

      if (triplet.length !== 3) return []

      return processTriplet(triplet, originalText)
    })
    .filter((item: string[]) => item.length === 4)

  // ! post processing
  ////
  // * split objects
  const splittedRelationshipsArray: string[][] = []
  // textRelationshipsArray.length === 4
  textRelationshipsArray.forEach(item => {
    // split comma separated items
    if (item[2].includes(','))
      item[2].split(',').forEach(i => {
        splittedRelationshipsArray.push([item[0], item[1], i.trim(), item[3]])
      })
    else if (item[0].includes(','))
      item[0].split(',').forEach(i => {
        splittedRelationshipsArray.push([i.trim(), item[1], item[2], item[3]])
      })
    else splittedRelationshipsArray.push(item)
  })

  ////
  // * expand recurrent edges
  const expandedRelationshipsArray: string[][] = []
  const recurrentSubjectEdgePairs: {
    [key: string]: {
      count: number
      expanded: boolean
      expandHiddenId: string
    }
  } = {}

  splittedRelationshipsArray.map(item => {
    // do this only for non empty items
    if (item[1].length) {
      const key = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[key]) recurrentSubjectEdgePairs[key].count++
      else
        recurrentSubjectEdgePairs[key] = {
          count: 1,
          expanded: false,
          expandHiddenId: uuidv4(),
        }
    }
    return item
  })

  splittedRelationshipsArray.forEach(item => {
    if (item[1].length === 0) expandedRelationshipsArray.push(item)
    else {
      const thisSubjectEdgePair = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[thisSubjectEdgePair].count >= 2) {
        // ! need to expand
        const expandedEdgeItem = wrapWithHiddenExpandId(
          item[1],
          recurrentSubjectEdgePairs[thisSubjectEdgePair].expandHiddenId
        )

        if (!recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded) {
          // not expanded yet
          expandedRelationshipsArray.push([
            item[0],
            '',
            expandedEdgeItem,
            item[3],
          ])
          recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded = true
        }

        expandedRelationshipsArray.push([
          expandedEdgeItem,
          '',
          item[2],
          item[3],
        ])
        ////
      } else expandedRelationshipsArray.push(item)
    }
  })

  ////
  // * expand multiple edges
  const expandMultipleEdgesArray: string[][] = []
  const multipleEdgesPairs: {
    [key: string]: {
      count: number
      relationships: {
        relationship: string[]
        hiddenId: string
        originalText: string
      }[]
    }
  } = {}

  expandedRelationshipsArray.map(
    ([object, edge, subject, originalText]: string[]) => {
      if (edge.length) {
        const objectSubjectArray = [object, subject].sort()
        const key = objectSubjectArray.join(
          promptTerms.itemRelationshipConnector
        )
        if (multipleEdgesPairs[key]) {
          multipleEdgesPairs[key].count++
          multipleEdgesPairs[key].relationships.push({
            relationship: [object, edge, subject],
            hiddenId: uuidv4(),
            originalText: originalText,
          })
        } else
          multipleEdgesPairs[key] = {
            count: 1,
            relationships: [
              {
                relationship: [object, edge, subject],
                hiddenId: uuidv4(),
                originalText: originalText,
              },
            ],
          }
      }

      return [object, edge, subject]
    }
  )

  expandedRelationshipsArray.forEach(
    ([object, edge, subject, originalText]: string[]) => {
      if (edge.length === 0)
        expandMultipleEdgesArray.push([object, edge, subject, originalText])
      else {
        const objectSubjectArray = [object, subject].sort()
        const key = objectSubjectArray.join(
          promptTerms.itemRelationshipConnector
        )
        if (multipleEdgesPairs[key].count >= 2) {
          // ! need to expand
          multipleEdgesPairs[key].relationships.forEach(
            ({ relationship: [o, e, s], hiddenId, originalText }) => {
              const expandedEdgeItem = wrapWithHiddenExpandId(e, hiddenId)

              expandMultipleEdgesArray.push([
                o,
                '',
                expandedEdgeItem,
                originalText,
              ])
              expandMultipleEdgesArray.push([
                expandedEdgeItem,
                '',
                s,
                originalText,
              ])
            }
          )
        } else
          expandMultipleEdgesArray.push([object, edge, subject, originalText])
      }
    }
  )

  return expandMultipleEdgesArray
    .map(([object, edge, subject, originalText]) => ({
      origin: originTextToRange(rawResponse, originalText),
      originRawText: originalText,
      source: object,
      target: subject,
      edge: edge,
    }))
    .filter(r => r.source !== r.target) // * remove self-relationships
}

/* -------------------------------------------------------------------------- */

export const answerInformationToReactFlowObject = (
  answerInformation: AnswerObject[]
): {
  nodes: Node[]
  edges: Edge[]
} => {
  // build nodes and edges from relationships
  const nodes: Node[] = []
  const edges: Edge[] = []

  let nodesVerticalOffset = 0

  answerInformation.forEach(
    ({ id: answerObjectId, relationships }: AnswerObject) => {
      const thisNodes: Node[] = []

      const annotatedRelationshipsForThisAnswerObject: {
        answerObjectId: string
        relationships: {
          relationship: [string, string, string]
          origin: RawAnswerRange
        }[]
      } = {
        answerObjectId,
        relationships: relationships.map(r => ({
          relationship: [r.source, r.edge, r.target],
          origin: r.origin,
        })),
      }

      const {
        nodes: computedNodes,
        nodesToAnswerObjectIds,
        nodesToOrigins,
      } = constructGraphChat(annotatedRelationshipsForThisAnswerObject)

      const pseudoNodeObjectsForThisAnswerObject = computedNodes.map(
        ({ label, x, y }) => {
          return {
            id: getNodeId(label, answerObjectId),
            label,
            position: {
              x,
              y,
            },
            width: hardcodedNodeWidthEstimation(removeHiddenExpandId(label)),
            height: hardcodedNodeSize.height,
            sourceHandleId: getHandleId(),
            targetHandleId: getHandleId(),
          } as PostConstructionPseudoNodeObject
        }
      )

      // nodes
      pseudoNodeObjectsForThisAnswerObject.forEach(
        (
          { id, label, position: { x, y }, sourceHandleId, targetHandleId },
          ind: number
        ) => {
          thisNodes.push(
            getNewCustomNode(
              id,
              removeHiddenExpandId(label),
              x,
              y + nodesVerticalOffset,
              sourceHandleId,
              targetHandleId,
              false,
              false,
              hasHiddenExpandId(label)
                ? styles.nodeColorDefaultGrey
                : styles.nodeColorDefaultWhite, // expanded edge label will be grey
              {
                temporary: false,
                sourceAnswerObjectIds: nodesToAnswerObjectIds[label],
                sourceOrigins: nodesToOrigins[label],
              }
            )
          )
        }
      )

      // get bounding box of nodes and update vertical offset
      if (thisNodes.length === 0) return

      const boundingBox = getGraphBounds(thisNodes)
      nodesVerticalOffset = boundingBox.y + boundingBox.height

      nodes.push(...thisNodes)

      // edges
      annotatedRelationshipsForThisAnswerObject.relationships.forEach(
        ({ relationship: [source, edge, target], origin }) => {
          const sourceNode = pseudoNodeObjectsForThisAnswerObject.find(
            n => n.label === source
          )
          const targetNode = pseudoNodeObjectsForThisAnswerObject.find(
            n => n.label === target
          )

          if (!sourceNode || !targetNode) return

          edges.push(
            getNewEdge(
              {
                source: sourceNode.id,
                target: targetNode.id,
                sourceHandle: sourceNode.sourceHandleId,
                targetHandle: targetNode.targetHandleId,
              },
              {
                label: edge,
                customType: 'arrow',
                editing: false,
                generated: {
                  temporary: false,
                  sourceAnswerObjectIds: new Set([answerObjectId]),
                  sourceOrigins: [origin],
                },
              }
            )
          )
        }
      )
      ////
    }
  )

  return {
    nodes,
    edges,
  }
}
