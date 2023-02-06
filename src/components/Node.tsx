import { Instance, Node } from 'reactflow'
import { getNodeId } from './utils'

export interface NodeData {
  id: string
  type: 'input' | 'output' | 'default'
  data: { label: string }
  position: { x: number; y: number }
}

export const customAddNodes = (
  addNodes: Instance.AddNodes<Node>,
  x: number,
  y: number
) => {
  addNodes({
    id: getNodeId(),
    type: 'default',
    data: { label: 'default' },
    position: { x, y },
  } as Node)
}
