import {
  AnswerObject,
  AnswerObjectEntitiesTarget,
  EdgeEntity,
  NodeEntity,
  NodeEntityIndividual,
  OriginRange,
} from '../App'
import { ListDisplayFormat } from '../components/Answer'

export const nodeAnnotationRegex =
  /\[([^[\]()]+(?:\([^)]*\))*)\s\((\$N\d+)\)\]/g
export const edgeAnnotationRegex =
  /\[((?:(?!\[).)+) \((\$[HML], \$N\d+, \$N\d+(?:; ?\$[HML], \$N\d+, \$N\d+)*)\)\]/g
export const AnnotationRemovalRegex =
  /\[([^[\]]+?)\s\((?:\$N\d+(?:,\s\$N\d+)*(?:;\s?)?)+\)\]/g

export const nodeLabelling = '$N'
export const edgeLabelling = '$E'

export const removeLastBracket = (text: string, eliminateAfter = false) => {
  // locate the last unmatched '[' and its position
  const lastOpenBracketIndex = text.lastIndexOf('[')
  const lastCloseBracketIndex = text.lastIndexOf(']')

  // remove everything after the last unmatched '[' (including itself)
  if (lastOpenBracketIndex > lastCloseBracketIndex) {
    if (lastOpenBracketIndex === text.length - 1)
      return text.substring(0, lastOpenBracketIndex)

    let afterBracket = text.substring(lastOpenBracketIndex + 1)

    return (
      text.substring(0, lastOpenBracketIndex) +
      (eliminateAfter
        ? ''
        : cleanStreamedAnnotationsRealtime(afterBracket).replace(
            /\$(?:H|M|L|)|[;,]\s*/g,
            ' ', // TODO polish
          ))
    )
  }

  return text
}

export const removeAnnotations = (text: string) => {
  let cleanedText = text.replace(
    /\[([^[\]()]+(?:\([^)]*\))*)\s\(((?:\$[HML],\s)?\$N\d+(?:,\s\$N\d+)*(?:;\s?(?:\$[HML],\s)?\$N\d+(?:,\s\$N\d+)*)*)\)\]/g,
    // /\[([^[\]]+?)\s\((?:\$N\d+(?:,\s\$N\d+)*(?:;\s?)?)+\)\]/g,
    (match, label) => label,
  )

  return removeLastBracket(cleanedText)
}

export type AnnotationType = 'node' | 'edge' | 'none'

export type RelationshipSaliency = 'high' | 'low'

export const Saliency: {
  H: RelationshipSaliency
  L: RelationshipSaliency
} = {
  H: 'high',
  L: 'low',
}

export interface EdgePair {
  saliency: RelationshipSaliency
  sourceId: string
  targetId: string
}

export interface NodeInformation {
  nodeLabel: string
  id: string
}

export interface EdgeInformation {
  edgeLabel: string
  edgePairs: EdgePair[]
}

export const getAnnotationType = (annotation: string): AnnotationType => {
  if (nodeAnnotationRegex.test(annotation)) {
    return 'node'
  } else if (edgeAnnotationRegex.test(annotation)) {
    return 'edge'
  } else {
    return 'none'
  }
}

export const parseNodes = (
  annotatedNodeString: string,
  answerObjectId: string,
): NodeEntityIndividual[] => {
  const matches = [...annotatedNodeString.matchAll(nodeAnnotationRegex)]
  return matches.map(match => ({
    nodeLabel: match[1],
    id: match[2],
    originRange: {
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      answerObjectId,
      nodeIds: [match[2]],
    },
    originText: match[0],
  }))
}

export const parseEdges = (
  annotatedRelationshipString: string,
  answerObjectId: string,
): EdgeEntity[] => {
  const matches = [...annotatedRelationshipString.matchAll(edgeAnnotationRegex)]
  return matches.map(match => {
    const edgeLabel = match[1]
    const edgePairs = match[2]
      .split(';')
      .map(pair => {
        const nodes = pair.split(',').map(node => node.trim())

        if (nodes.length !== 3) return null

        return {
          saliency: parseSaliency(nodes[0]),
          sourceId: nodes[1],
          targetId: nodes[2],
        }
      })
      .filter(pair => pair !== null) as EdgePair[]

    return {
      edgeLabel,
      edgePairs,
      originRange: {
        start: match.index ?? 0,
        end: (match.index ?? 0) + match[0].length,
        answerObjectId,
        nodeIds: [
          ...new Set(edgePairs.flatMap(pair => [pair.sourceId, pair.targetId])),
        ],
      },
      originText: match[0],
    }
  })
}

export const getPartNodeIds = (part: string): string[] => {
  const partType = getAnnotationType(part)

  if (partType === 'node')
    return parseNodes(part, '')?.map(node => node.id) ?? []
  if (partType === 'edge')
    return parseEdges(part, '')[0]?.originRange.nodeIds ?? []
  return []
}

export const parseSaliency = (saliency: string): RelationshipSaliency => {
  if (saliency === '$H') return 'high'
  if (saliency === '$L') return 'low'
  return 'high' // ?
}

export const nodeIndividualsToNodeEntities = (
  nodeIndividuals: NodeEntityIndividual[],
): NodeEntity[] => {
  const nodeEntities: NodeEntity[] = []

  nodeIndividuals.forEach(node => {
    const existingNode = nodeEntities.find(
      nodeEntity => nodeEntity.id === node.id,
    )

    if (existingNode) {
      existingNode.individuals.push(node)
      // pick the longest node label for display label
      existingNode.displayNodeLabel = existingNode.individuals.reduce(
        (acc, cur) => (cur.nodeLabel.length > acc.length ? cur.nodeLabel : acc),
        existingNode.displayNodeLabel,
      )
    } else {
      nodeEntities.push({
        id: node.id,
        displayNodeLabel: node.nodeLabel,
        pseudo: false,
        individuals: [node],
      })
    }
  })

  // console.log(nodeEntities)
  return nodeEntities
}

/* -------------------------------------------------------------------------- */

// helpers

export const havePair = (pairs: EdgePair[], pair: EdgePair) => {
  return pairs.some(
    p => p.sourceId === pair.sourceId && p.targetId === pair.targetId,
  )
}

export const getNodeEntityFromNodeEntityId = (
  nodeEntities: NodeEntity[],
  id: string,
): NodeEntity | null => {
  const nodeEntity = nodeEntities.find(node => node.id === id)
  if (nodeEntity) return nodeEntity
  return null
}

export const getEntitySource = (entity: NodeEntity) => {
  const originRanges: OriginRange[] = []
  const originTexts: string[] = []
  entity.individuals.map(individual => {
    originRanges.push(individual.originRange)
    originTexts.push(individual.originText)

    return null
  })

  return {
    originRanges,
    originTexts,
  }
}

const streamCleaningAnnotationRegex = /(\$N\d*(?=[,;)]|$)|\(|\))/g
export const cleanStreamedAnnotationsRealtime = (streamedInput: string) => {
  const cleanSegment = streamedInput.replace(streamCleaningAnnotationRegex, '')
  return cleanSegment
}

export const splitAnnotatedSentences = (text: string): string[] => {
  const sentences: string[] = []
  let sentenceStart = 0
  let inAnnotation = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '[') {
      inAnnotation = true
    } else if (char === ']') {
      inAnnotation = false
    }

    if (
      !inAnnotation &&
      char === '.' &&
      (i === text.length - 1 || text[i + 1].match(/\s/))
    ) {
      sentences.push(text.slice(sentenceStart, i + 1))
      sentenceStart = i + 1
    }
  }

  if (sentenceStart < text.length) {
    sentences.push(text.slice(sentenceStart))
  }

  return sentences
}

export const listDisplayToEntityTarget = (
  listDisplay: ListDisplayFormat,
): AnswerObjectEntitiesTarget => {
  return {
    original: 'originText',
    summary: 'summary',
    slide: 'originText',
  }[listDisplay] as AnswerObjectEntitiesTarget
}

export const mergeNodeEntities = (
  answerObjects: AnswerObject[],
  answerObjectIdsHidden: string[],
) => {
  const nodeEntities: NodeEntity[] = []

  answerObjects.forEach(answerObject => {
    if (answerObjectIdsHidden.includes(answerObject.id)) return

    answerObject[
      listDisplayToEntityTarget(answerObject.answerObjectSynced.listDisplay)
    ].nodeEntities.forEach(nodeEntity => {
      const existingNode = nodeEntities.find(n => n.id === nodeEntity.id)

      if (existingNode) {
        existingNode.individuals.push(...nodeEntity.individuals)
      } else {
        nodeEntities.push(nodeEntity)
      }
    })
  })

  return nodeEntities
}

export const mergeEdgeEntities = (
  answerObjects: AnswerObject[],
  answerObjectIdsHidden: string[],
) => {
  const edgeEntities: EdgeEntity[] = []

  answerObjects.forEach(answerObject => {
    if (answerObjectIdsHidden.includes(answerObject.id)) return

    answerObject[
      listDisplayToEntityTarget(answerObject.answerObjectSynced.listDisplay)
    ].edgeEntities.forEach(edgeEntity => {
      edgeEntities.push(edgeEntity)
    })
  })

  return edgeEntities
}

export const findEntitySentence = (
  originRange: OriginRange,
  answer: string,
) => {
  const sentenceStart = answer.lastIndexOf('.', originRange.start) + 1
  const sentenceEnd = answer.indexOf('.', originRange.end)
  const sentence = answer.slice(sentenceStart, sentenceEnd + 1)
  return sentence
}

export const findEntityFromAnswerObjects = (
  answerObjects: AnswerObject[],
  entityId: string,
) => {
  const entity = answerObjects
    .map(
      answerObject =>
        answerObject[
          listDisplayToEntityTarget(answerObject.answerObjectSynced.listDisplay)
        ].nodeEntities,
    )
    .flat()
    .find(entity => entity.id === entityId)
  return entity
}

export const saliencyAHigherThanB = (
  sA: RelationshipSaliency,
  sB: RelationshipSaliency,
) => {
  if (sA === 'high' && sB === 'low') return true
  if (sA === 'high' && sB === 'high') return false
  if (sA === 'low' && sB === 'low') return false
  return false
}

export const findOrphanNodeEntities = (
  nodeEntities: NodeEntity[],
  edgeEntities: EdgeEntity[],
) => {
  return nodeEntities.filter(nodeEntity => {
    return (
      edgeEntities.find(edgeEntity =>
        edgeEntity.edgePairs.some(
          edgePair =>
            edgePair.sourceId === nodeEntity.id ||
            edgePair.targetId === nodeEntity.id,
        ),
      ) === undefined
    )
  })
}

export const findNowhereEdgeEntities = (
  nodeEntities: NodeEntity[],
  edgeEntities: EdgeEntity[],
) => {
  return edgeEntities.filter(edgeEntity => {
    // at least one in edgeEntity.edgePairs has a source or target that is not in nodeEntities
    return edgeEntity.edgePairs.some(edgePair => {
      return (
        nodeEntities.find(nodeEntity => nodeEntity.id === edgePair.sourceId) ===
          undefined ||
        nodeEntities.find(nodeEntity => nodeEntity.id === edgePair.targetId) ===
          undefined
      )
    })
  })
}

export const cleanSlideResponse = (slideResponse: string) => {
  // remove ``` at the beginning and end, if there is any
  const cleanedSlideResponse = slideResponse
    .replace(/^```/, '')
    .replace(/```$/, '')
  return cleanedSlideResponse
}

export const getRangeFromStart = (
  start: number,
  nodeEntities: NodeEntity[],
  edgeEntities: EdgeEntity[],
): OriginRange | undefined => {
  for (const nodeEntity of nodeEntities) {
    for (const individual of nodeEntity.individuals) {
      if (individual.originRange.start === start) {
        return individual.originRange
      }
    }
  }

  for (const edgeEntity of edgeEntities) {
    if (edgeEntity.originRange.start === start) {
      return edgeEntity.originRange
    }
  }
}

export const cleanNodeLabel = (label: string) => {
  // remove These, This, Those, That, A, An, The, Their, Its, etc.
  const cleanedLabel = label.replace(
    /^(these|this|those|that|a|an|the|their|its|his|her|their|our|my|your)\s/i,
    '',
  )

  return cleanedLabel
}

export const pairTargetIdHasPair = (
  edgeEntities: EdgeEntity[],
  targetId: string,
) => {
  return edgeEntities.some(edgeEntity =>
    edgeEntity.edgePairs.some(edgePair => edgePair.sourceId === targetId),
  )
}
