import { Edge, FitView, Instance, Node } from 'reactflow'
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

  const suggestedPrompts = generateSuggestedPrompts(sourceComponents)

  addMagicNode(addNodes, right + nodeGap, top, {
    sourceComponents,
    suggestedPrompts,
    fitView: fitView,
    toFitView: true,
  } as AddMagicNodeOptions)
}

export const generateSuggestedPrompts = (
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

  // naive prompt
  let naivePrompt = ''
  if (labels.length === 1) naivePrompt = `Explain ${labels[0]}.`
  else naivePrompt = `What is the relationship between ${labels.join(' and ')}?`

  return [naivePrompt]
}
