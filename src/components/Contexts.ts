import { createContext } from 'react'
import { ReactFlowInstance } from 'reactflow'

type FlowContextType = ReactFlowInstance & {
  metaPressed: boolean
}
export const FlowContext = createContext<FlowContextType>({} as FlowContextType)
