import { createContext } from 'react'
import { ReactFlowInstance } from 'reactflow'

export interface FlowContextType extends ReactFlowInstance {
  metaPressed: boolean
  doSetNodesEditing: (nodeIds: string[], editing: boolean) => void
  doSetEdgesEditing: (edgeIds: string[], editing: boolean) => void
}
export const FlowContext = createContext<FlowContextType>({} as FlowContextType)

export interface EdgeContextType {
  roughZoomLevel: number
}
export const EdgeContext = createContext<EdgeContextType>({} as EdgeContextType)
