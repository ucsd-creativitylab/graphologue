import { Edge, FitView, Instance, Node } from 'reactflow'
import { CustomEdgeData } from '../components/Edge'
import { CustomNodeData } from '../components/Node'
import { magicExplain, PromptSourceComponentsType } from './magicExplain'
import { VerifyLink } from './verification'

export interface ZenMemoryItem {
  masterSet: Set<{
    id: string
    label: string
  }>
  rawResponse: string
  rawLinks: VerifyLink[]
  rawGraphRelationships: string[][]
}

export const zenMemory: ZenMemoryItem[] = []

/* -------------------------------------------------------------------------- */

export const zenExplain = (
  nodes: Node[],
  edges: Edge[],
  sourceComponents: PromptSourceComponentsType,
  functions: {
    addNodes: Instance.AddNodes<Node>
    setNodes: Instance.SetNodes<Node>
    setEdges: Instance.SetEdges<Edge>
    fitView: FitView
    setZenMode: (zenMode: boolean) => void
    setZenModeLoading: (zenModeLoading: boolean) => void
  },
  initialZen: boolean
) => {
  const { nodes: selectedNodesIds, edges: selectedEdgesIds } = sourceComponents

  // const selectedNodes = nodes.filter(node => selectedNodesIds.includes(node.id))
  // const selectedEdges = edges.filter(edge => selectedEdgesIds.includes(edge.id))

  // ! go into zen mode
  functions.setNodes((nodes: Node[]) => {
    return nodes.map(node => {
      console.log(selectedNodesIds, node.id)

      if (selectedNodesIds.includes(node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            zenMaster: true,
          },
        }
      } else
        return {
          ...node,
          data: {
            ...node.data,
            zenMaster: false,
          },
          selected: false,
        }
    })
  })
  functions.setEdges((edges: Edge[]) => {
    return edges.map(edge => {
      if (selectedEdgesIds.includes(edge.id)) {
        return {
          ...edge,
          data: {
            ...edge.data,
            zenMaster: true,
          },
        }
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          zenMaster: false,
        },
        selected: false,
      }
    })
  })
  functions.setZenMode(true)
  // functions.setZenModeLoading(true)

  if (initialZen)
    magicExplain(
      nodes,
      edges,
      sourceComponents,
      functions.addNodes,
      functions.fitView
    )
}

/* -------------------------------------------------------------------------- */

export const removeZenBuddies = (
  setNodes: Instance.SetNodes<Node>,
  removeAll: boolean
) => {
  setNodes((nodes: Node[]) => {
    return nodes.filter(node => {
      if (removeAll) {
        if (node.data.zenBuddy) return false
      } else if (node.data.zenBuddy && !node.selected) {
        return false
      }

      return true
    })
  })
}

export const quitZenExplain = (
  nodes: Node[],
  edges: Edge[],
  sourceComponents: PromptSourceComponentsType,
  functions: {
    setNodes: Instance.SetNodes<Node>
    setEdges: Instance.SetEdges<Edge>
    fitView: FitView
    setZenMode: (zenMode: boolean) => void
    setZenModeLoading: (zenModeLoading: boolean) => void
  }
) => {
  // const { nodes: selectedNodesIds, edges: selectedEdgesIds } = sourceComponents

  // ! go out of zen mode
  functions.setNodes((nodes: Node[]) => {
    return nodes
      .filter(node => {
        if (node.data.zenBuddy && !node.selected) return false
        return true
      })
      .map(node => {
        return {
          ...node,
          selected: node.data.zenMaster,
          data: {
            ...node.data,
            zenMaster: false,
            zenBuddy: false,
          } as CustomNodeData,
        } as Node
      })
  })
  functions.setEdges((edges: Edge[]) => {
    return edges
      .filter(edge => {
        if (edge.data.zenBuddy && !edge.selected) return false
        return true
      })
      .map(edge => {
        return {
          ...edge,
          selected: edge.data.zenMaster,
          data: {
            ...edge.data,
            zenMaster: false,
            zenBuddy: false,
          } as CustomEdgeData,
        } as Edge
      })
  })
  functions.setZenMode(false)
  // functions.setZenModeLoading(false)
}
