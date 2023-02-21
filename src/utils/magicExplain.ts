import { Node, Edge, FitView, Instance } from 'reactflow'
import { hardcodedNodeSize, nodeGap } from '../constants'

import { addMagicNode, AddMagicNodeOptions } from '../components/MagicNode'
import {
  adjustNewNodePositionAvoidIntersections,
  getComponentsBounds,
  nodeAndTagsToString,
  nodeToString,
} from './utils'
import { NodeLabelAndTags } from './promptsAndResponses'

export interface PromptSourceComponentsType {
  nodes: Node[]
  edges: Edge[]
}

export const magicExplain = (
  nodes: Node[],
  sourceComponents: PromptSourceComponentsType,
  addNodes: Instance.AddNodes<Node>,
  fitView: FitView
) => {
  const { nodes: selectedNodes, edges: selectedEdges } = sourceComponents

  const { top, right } = getComponentsBounds(
    selectedNodes as Node[],
    selectedEdges as Edge[],
    nodes as Node[]
  )

  const suggestedPrompts = generateSuggestedPrompts(nodes, sourceComponents)

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
  addMagicNode(addNodes, adjustedX, adjustedY, {
    sourceComponents,
    suggestedPrompts,
    fitView: fitView,
    toFitView: true,
  } as AddMagicNodeOptions)
}

export const generateSuggestedPrompts = (
  nodes: Node[],
  sourceComponents: PromptSourceComponentsType
): string[] => {
  const nodeLabelAndTags: NodeLabelAndTags[] = sourceComponents.nodes
    .map((node: Node) => {
      return { label: node.data.label, tags: node.data.tags }
    })
    .filter(item => item.label.length)

  const nodeLabels = nodeLabelAndTags.map(item => item.label)
  const edgeLabels = sourceComponents.edges
    .map((edge: Edge) => edge.data.label)
    .filter(label => label.length)

  const labels = [...nodeLabels, ...edgeLabels]

  if (labels.length === 0) return ['Tell me something interesting.']

  const magicPrompts = []

  // ! edge-based prompt
  if (sourceComponents.edges.length > 0) {
    const edgePrompts = sourceComponents.edges
      .map((edge: Edge) => {
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
