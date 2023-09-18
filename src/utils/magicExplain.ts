import { Node, Edge } from 'reactflow'

import {
  NodeLabelAndTags,
  matchItemsInQuotes,
  nodeAndTagsToString,
  nodeToString,
} from './utils'

export interface PromptSourceComponentsType {
  nodes: string[]
  edges: string[]
}

export const generateSuggestedPrompts = (
  nodes: Node[],
  edges: Edge[],
  sourceComponents: PromptSourceComponentsType,
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
              sourceNode,
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
  target: 'response' | 'verify',
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
      `[^]*Google search queries([^]*)Research papers([^]*)`,
      'gm',
    )
    const match = regex.exec(responseText) || ['', '', '']

    return {
      searchQueries: matchItemsInQuotes(match[1].trim()),
      researchPaperKeywords: matchItemsInQuotes(match[2].trim()),
      parsedResponse: '',
    }
  }
}
