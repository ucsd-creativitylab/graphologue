import { createContext } from 'react'
import { ReactFlowInstance } from 'reactflow'

export const FlowContext = createContext<ReactFlowInstance>(
  {} as ReactFlowInstance
)
