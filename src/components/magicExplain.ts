import { Edge, Node } from 'reactflow'

export interface PromptType {
  nodes: Node[]
  edges: Edge[]
}

export const magicExplain = (prompt: PromptType) => {
  console.log('magicExplain', prompt)
}
