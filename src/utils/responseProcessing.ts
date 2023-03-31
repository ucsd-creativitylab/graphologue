import {
  EdgeEntity,
  NodeEntity,
  NodeEntityIndividual,
  OriginAnswerRange,
} from '../App'

export const nodeAnnotationRegex =
  /\[([^[\]()]+(?:\([^)]*\))*)\s\((\$N\d+)\)\]/g
export const edgeAnnotationRegex =
  /\[([^[\]()]+?)\s\(((?:\$N\d+(?:,\s\$N\d+)+;?\s?)+)\)\]/g
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
            /[$,;\s]+/g,
            ' ' // TODO polish
          ))
    )
  }

  return text
}

export const removeAnnotations = (text: string) => {
  let cleanedText = text.replace(
    /\[([^[\]]+?)\s\((?:\$N\d+(?:,\s\$N\d+)*(?:;\s?)?)+\)\]/g,
    (match, label) => label
  )

  return removeLastBracket(cleanedText)
}

export type AnnotationType = 'node' | 'edge' | 'none'

export interface EdgePair {
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
  offset = 0
): NodeEntityIndividual[] => {
  const matches = [...annotatedNodeString.matchAll(nodeAnnotationRegex)]
  return matches.map(match => ({
    nodeLabel: match[1],
    id: match[2],
    originRange: {
      start: (match.index ?? 0) + offset,
      end: (match.index ?? 0) + match[0].length + offset,
    },
    originText: match[0],
  }))
}

export const parseEdges = (
  annotatedRelationshipString: string,
  offset = 0
): EdgeEntity[] => {
  const matches = [...annotatedRelationshipString.matchAll(edgeAnnotationRegex)]
  return matches.map(match => {
    const edgeLabel = match[1]
    const edgePairs = match[2].split(';').map(pair => {
      const nodes = pair.split(',').map(node => node.trim())
      return {
        sourceId: nodes[0],
        targetId: nodes[1],
      }
    })
    return {
      edgeLabel,
      edgePairs,
      originRange: {
        start: (match.index ?? 0) + offset,
        end: (match.index ?? 0) + match[0].length + offset,
      },
      originText: match[0],
    }
  })
}

export const nodeIndividualsToNodeEntities = (
  nodeIndividuals: NodeEntityIndividual[]
): NodeEntity[] => {
  const nodeEntities: NodeEntity[] = []

  nodeIndividuals.forEach(node => {
    const existingNode = nodeEntities.find(
      nodeEntity => nodeEntity.id === node.id
    )

    if (existingNode) {
      existingNode.individuals.push(node)
    } else {
      nodeEntities.push({
        id: node.id,
        displayNodeLabel: node.nodeLabel,
        pseudo: false,
        individuals: [node],
      })
    }
  })

  console.log(nodeEntities)
  return nodeEntities
}

/* -------------------------------------------------------------------------- */

// helpers

export const havePair = (pairs: EdgePair[], pair: EdgePair) => {
  return pairs.some(
    p => p.sourceId === pair.sourceId && p.targetId === pair.targetId
  )
}

export const getNodeEntityFromNodeEntityId = (
  nodeEntities: NodeEntity[],
  id: string
): NodeEntity | null => {
  const nodeEntity = nodeEntities.find(node => node.id === id)
  if (nodeEntity) return nodeEntity
  return null
}

export const getEntitySource = (entity: NodeEntity) => {
  const originRanges: OriginAnswerRange[] = []
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
