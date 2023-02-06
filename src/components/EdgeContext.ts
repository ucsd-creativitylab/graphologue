import { createContext } from 'react'
import { Edge, Node, OnNodesChange } from 'reactflow'
import { EdgeData } from './Edge'
import { NodeData } from './Node'

// { nodes, edges, onConnect, setNodes, onNodesChange }
export interface EdgeContextProps {
  nodes: Node<{ label: string }>[] | undefined
  edges: Edge<{ label: string }>[] | undefined
  onConnect: ((source: string, target: string) => void) | undefined // ! to be fixed
  setNodes: ((nodes: NodeData[]) => void) | undefined // ! to be fixed
  onNodesChange: OnNodesChange | undefined
}

export const EdgeContext = createContext({} as EdgeContextProps)
