import { Node, Edge, FitView, Instance } from 'reactflow'

import { hardcodedNodeSize, nodeGap } from '../constants'
import { addMagicNode, AddMagicNodeOptions } from '../components/MagicNode'
import {
  adjustNewNodePositionAvoidIntersections,
  getComponentsBounds,
  matchItemsInQuotes,
  nodeAndTagsToString,
  nodeToString,
} from './utils'
import { NodeLabelAndTags, promptTerms } from './promptsAndResponses'

export interface PromptSourceComponentsType {
  nodes: string[]
  edges: string[]
}

export const magicExplain = (
  nodes: Node[],
  edges: Edge[],
  sourceComponents: PromptSourceComponentsType,
  addNodes: Instance.AddNodes<Node>,
  selectNodes: (nodeIds: string[]) => void,
  fitView: FitView
) => {
  const { nodes: selectedNodesIds, edges: selectedEdgesIds } = sourceComponents

  const selectedNodes = nodes.filter(node => selectedNodesIds.includes(node.id))
  const selectedEdges = edges.filter(edge => selectedEdgesIds.includes(edge.id))

  const { top, right } = getComponentsBounds(
    selectedNodes as Node[],
    selectedEdges as Edge[],
    nodes as Node[]
  )

  const suggestedPrompts = generateSuggestedPrompts(
    nodes,
    edges,
    sourceComponents
  )

  // ! actual add magic node
  const { adjustedX, adjustedY } = adjustNewNodePositionAvoidIntersections(
    nodes.filter(node => node.type === 'magic'),
    right + nodeGap,
    top,
    hardcodedNodeSize.magicWidth,
    hardcodedNodeSize.magicHeight,
    {
      up: false,
      down: false,
      left: false,
      right: true,
    }
  )
  addMagicNode(addNodes, selectNodes, adjustedX, adjustedY, {
    select: true,
    sourceComponents,
    suggestedPrompts,
    fitView: fitView,
    toFitView: true,
  } as AddMagicNodeOptions)
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export const generateSuggestedPrompts = (
  nodes: Node[],
  edges: Edge[],
  sourceComponents: PromptSourceComponentsType
): string[] => {
  const nodeLabelAndTags: NodeLabelAndTags[] = sourceComponents.nodes
    .map((nodeId: string) => {
      const node = nodes.find((node: Node) => node.id === nodeId)
      return { label: node?.data.label ?? '', tags: node?.data.tags ?? [] }
    })
    .filter(item => item.label.length)

  const nodeLabels = nodeLabelAndTags.map(item => item.label)
  const edgeLabels = sourceComponents.edges
    .map((edgeId: string) => {
      const edge = edges.find((edge: Edge) => edge.id === edgeId)
      return edge?.data.label ?? ''
    })
    .filter(label => label.length)

  const labels = [...nodeLabels, ...edgeLabels]

  if (labels.length === 0) return ['Tell me something interesting.']

  const magicPrompts = []

  // ! edge-based prompt
  if (sourceComponents.edges.length > 0) {
    const edgePrompts = sourceComponents.edges
      .map((edgeId: string) => {
        const edge = edges.find((edge: Edge) => edge.id === edgeId)

        if (!edge) return ''

        const sourceId = edge.source
        const targetId = edge.target
        const sourceNode = nodes.find((node: Node) => node.id === sourceId)
        const targetNode = nodes.find((node: Node) => node.id === targetId)

        if (sourceNode && targetNode) {
          if (edge.data.label.length === 0)
            // the edge is empty yet
            return `What is the relationship between ${nodeToString(
              sourceNode
            )} and ${nodeToString(targetNode)}?`
          else
            return `How does ${nodeToString(sourceNode)} ${
              edge.data.label
            } ${nodeToString(targetNode)}?`
        }

        return ''
      })
      .filter(prompt => prompt.length > 0)
    const edgePrompt =
      edgePrompts.join(' ') +
      (edgePrompts.length > 1
        ? ` How are these ${edgePrompts.length} questions related?`
        : '')

    if (edgePrompt.length > 0) magicPrompts.push(edgePrompt)
  }

  // ! naive prompt for nodes
  let naivePrompt = ''
  if (nodeLabelAndTags.length === 1)
    naivePrompt = `Explain ${nodeAndTagsToString(nodeLabelAndTags[0])}.`
  else {
    naivePrompt = `What is the relationship between ${nodeLabelAndTags
      .map(item => nodeAndTagsToString(item))
      .join(' and ')}?`
  }
  if (naivePrompt.length > 0) magicPrompts.push(naivePrompt)

  return magicPrompts
}

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export const parseModelResponseText = (
  responseText: string,
  target: 'response' | 'verify'
): {
  parsedResponse: string
  searchQueries: string[]
  researchPaperKeywords: string[]
} => {
  if (target === 'response') {
    // const regex = new RegExp(`[^]*${promptTerms.answer}: "([^]*)"[^]*`, 'gm')
    // const match = regex.exec(responseText) || ['', '']

    return {
      parsedResponse: responseText.trim(),
      searchQueries: [],
      researchPaperKeywords: [],
    }
  } else {
    const regex = new RegExp(
      `[^]*${promptTerms.searchQueries}([^]*)${promptTerms.researchPapers}([^]*)`,
      'gm'
    )
    const match = regex.exec(responseText) || ['', '', '']

    return {
      searchQueries: matchItemsInQuotes(match[1].trim()),
      researchPaperKeywords: matchItemsInQuotes(match[2].trim()),
      parsedResponse: '',
    }
  }
}
