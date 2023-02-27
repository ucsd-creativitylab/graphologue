import dagre from 'dagre'
import { hardcodedNodeSize } from '../constants'

import { getOpenAICompletion } from './openAI'
import {
  predefinedPrompts,
  predefinedResponses,
  promptTerms,
} from './promptsAndResponses'

export const constructGraphRelationsFromResponse = async (
  response: string
): Promise<string[][]> => {
  if (
    response.length === 0 ||
    response === predefinedResponses.modelDown() ||
    response === predefinedResponses.noValidModelText() ||
    response === predefinedResponses.noValidResponse()
  )
    return []

  const textRelationships = await getOpenAICompletion(
    predefinedPrompts.textToGraph(response)
  )

  if (textRelationships.error) {
    console.error(textRelationships.error)
    return []
  }

  const textRelationshipsText = textRelationships.choices[0].text
  if (textRelationshipsText.length === 0) return []

  // preprocess the response
  const textRelationshipsArray: string[][] = textRelationshipsText
    .split(promptTerms.itemBreaker)
    .map((item: string) => {
      item = item.trim()

      const triplet: string[] = item
        .split(promptTerms.itemRelationshipConnector)
        .map(i => i.trim())

      if (triplet.length !== 3) return []

      // ! process the edge label
      // make the edge the lower case
      // triplet[1] = triplet[1].toLowerCase()
      triplet[1] = triplet[1].replace(/_/g, ' ') // avoid underscore
      // ? [experimental] remove is, was, are, were, etc.
      // TODO optimize?
      triplet[1] = triplet[1].replace(
        /(?:^|\s)(is|was|are|were|has|have|had|does|do|did|a|an|the)(?=\s|$)/g,
        ''
      )

      // ! process everything
      // trim
      triplet.forEach((t, ind) => (triplet[ind] = t.trim()))
      // remove line breaks, and other special characters, like semi-colon
      triplet.forEach(
        (t, ind) => (triplet[ind] = t.replace(/[^a-zA-Z0-9 ,.!?&()]+/g, ''))
      )

      // ! process the subject
      // remove the 's
      triplet[0] = triplet[0].replace(/'s/g, '')
      // remove comma from the start and end
      triplet[0] = triplet[0].replace(/^,|,$/g, '')

      return triplet
    })
    .filter((item: string[]) => item.length === 3)

  // ! post processing
  ////
  const expandedRelationshipsArray: string[][] = []
  const recurrentSubjectEdgePairs: {
    [key: string]: {
      count: number
      expanded: boolean
    }
  } = {}
  textRelationshipsArray.map(item => {
    // do this only for non empty items
    if (item[1].length) {
      const key = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[key]) recurrentSubjectEdgePairs[key].count++
      else
        recurrentSubjectEdgePairs[key] = {
          count: 1,
          expanded: false,
        }
    }
    return item
  })
  textRelationshipsArray.forEach(item => {
    if (item[1].length === 0) expandedRelationshipsArray.push(item)
    else {
      const thisSubjectEdgePair = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[thisSubjectEdgePair].count >= 3) {
        // expand
        if (!recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded) {
          expandedRelationshipsArray.push([item[0], '', item[1]])
          recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded = true
        }
        expandedRelationshipsArray.push([item[1], '', item[2]])
      } else expandedRelationshipsArray.push(item)
    }
  })

  ////
  const finalRelationshipsArray: string[][] = []
  expandedRelationshipsArray.forEach(item => {
    // split comma separated items
    if (item[2].includes(','))
      item[2].split(',').forEach(i => {
        finalRelationshipsArray.push([item[0], item[1], i.trim()])
      })
    else finalRelationshipsArray.push(item)
  })

  return finalRelationshipsArray
}

/* -------------------------------------------------------------------------- */

export const constructGraph = (relationships: string[][]) => {
  // https://github.com/dagrejs/dagre/wiki#an-example-layout
  var pseudoGraph = new dagre.graphlib.Graph()
  pseudoGraph.setGraph({})
  pseudoGraph.setDefaultEdgeLabel(function () {
    return ''
  })

  const addedNode = new Set()
  relationships.forEach((item: string[]) => {
    if (!addedNode.has(item[0])) {
      pseudoGraph.setNode(item[0], {
        label: item[0],
        width: hardcodedNodeSize.width,
        height: hardcodedNodeSize.height,
      })
      addedNode.add(item[0])
    }

    if (!addedNode.has(item[2])) {
      pseudoGraph.setNode(item[2], {
        label: item[2],
        width: hardcodedNodeSize.width,
        height: hardcodedNodeSize.height,
      })
      addedNode.add(item[2])
    }

    pseudoGraph.setEdge(item[0], item[2], { label: item[1] })
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

  return nodes
}
