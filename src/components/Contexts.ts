import { createContext } from 'react'
import { Edge, Node, ReactFlowInstance } from 'reactflow'

export interface FlowContextType extends ReactFlowInstance {
  metaPressed: boolean
  doSetNodesEditing: (nodeIds: string[], editing: boolean) => void
  doSetEdgesEditing: (edgeIds: string[], editing: boolean) => void
}
export const FlowContext = createContext<FlowContextType>({} as FlowContextType)

export interface EdgeContextType {
  roughZoomLevel: number
  selectedComponents: {
    nodes: Node[]
    edges: Edge[]
  }
}
export const EdgeContext = createContext<EdgeContextType>({} as EdgeContextType)
