import { Edge, Node, ReactFlowJsonObject } from 'reactflow'

import { useSessionStorage, useSessionStorageHandle } from '../constants'
import { CustomEdgeData } from '../componentsFlow/Edge'
import { CustomNodeData } from '../componentsFlow/Node'

const standardViewport = {
  x: 0,
  y: 0,
  zoom: 1,
}

export const storeItem = (
  data: ReactFlowJsonObject,
  setTime: (d: ReactFlowJsonObject) => void,
) => {
  const copiedData = deepCopyStoredData(data)
  const cleanData = cleanStoredData(copiedData)

  setTime(cleanData)

  if (useSessionStorage)
    sessionStorage.setItem(useSessionStorageHandle, JSON.stringify(cleanData))
}

export const getItem = (): ReactFlowJsonObject => {
  if (useSessionStorage)
    return JSON.parse(
      sessionStorage.getItem(useSessionStorageHandle) ||
        JSON.stringify({
          nodes: [],
          edges: [],
          viewport: { ...standardViewport },
        } as ReactFlowJsonObject),
    )
  return {
    nodes: [],
    edges: [],
    viewport: { ...standardViewport },
  } as ReactFlowJsonObject
}

export const cleanStoredData = (
  data: ReactFlowJsonObject,
): ReactFlowJsonObject => {
  // make sure all editing, selected, etc. properties are false
  const nodes =
    data.nodes
      ?.map((node: Node) => {
        // node.width = undefined
        // node.height = undefined
        node.selected = false

        // data
        node.data.editing = false

        return node
      })
      .filter((node: Node) => {
        if (node.type !== 'custom') return true

        // const d = node.data as CustomNodeData
        // return d.generated.temporary !== true
        return true
      }) || []

  const edges =
    data.edges
      ?.map((edge: Edge) => {
        edge.selected = false

        // data
        edge.data.editing = false

        return edge
      })
      .filter((edge: Edge) => {
        // const d = edge.data as CustomEdgeData
        // return d.generated.temporary !== true
        return true
      }) || []

  return {
    nodes,
    edges,
    viewport: { ...data.viewport } || { ...standardViewport },
  } as ReactFlowJsonObject
}

export const deepCopyNodes = (nodes: Node[]): Node[] => {
  return (
    nodes?.map(n => {
      return {
        ...n,
        data: {
          ...n.data,
          generated: {
            ...n.data.generated,
          },
        } as CustomNodeData,
      }
    }) || []
  )
}

export const deepCopyEdges = (edges: Edge[]): Edge[] => {
  return (
    edges?.map(e => {
      return {
        ...e,
        data: {
          ...e.data,
          generated: {
            ...e.data.generated,
          },
        } as CustomEdgeData,
      }
    }) || []
  )
}

export const deepCopyStoredData = (
  storedData: ReactFlowJsonObject,
): ReactFlowJsonObject => {
  return {
    nodes: deepCopyNodes(storedData.nodes),
    edges: deepCopyEdges(storedData.edges),
    viewport: { ...storedData?.viewport } || { ...standardViewport },
  } as ReactFlowJsonObject
}

export const deepCopyStoredDataList = (
  storedDataList: ReactFlowJsonObject[],
): ReactFlowJsonObject[] => {
  return storedDataList.map(d => deepCopyStoredData(d))
}
