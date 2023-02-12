import { Node, Edge, FitView, Instance } from 'reactflow'
import { nodeGap } from '../constants'

import { addMagicNode, AddMagicNodeOptions } from './MagicNode'
import { getComponentsBounds } from './utils'

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

  addMagicNode(addNodes, right + nodeGap, top, {
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
  const nodeLabels = sourceComponents.nodes
    .map((node: Node) => node.data.label)
    .filter(label => label.length)

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
            return `What is the relationship between ${sourceNode?.data.label} and ${targetNode?.data.label}?`
          else
            return `How does ${sourceNode?.data.label} ${edge.data.label} ${targetNode?.data.label}?`
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
  if (nodeLabels.length === 1) naivePrompt = `Explain ${nodeLabels[0]}.`
  else
    naivePrompt = `What is the relationship between ${nodeLabels.join(
      ' and '
    )}?`
  if (naivePrompt.length > 0) magicPrompts.push(naivePrompt)

  return magicPrompts
}
