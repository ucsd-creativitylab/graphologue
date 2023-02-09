import { Edge, Node, ReactFlowJsonObject } from 'reactflow'

import { useSessionStorage, useSessionStorageHandle } from '../constants'
import { CustomEdgeData } from './Edge'
import { CustomNodeData } from './Node'

const standardViewport = {
  x: 0,
  y: 0,
  zoom: 1,
}

export const storeItem = (
  data: ReactFlowJsonObject,
  setTime: (d: ReactFlowJsonObject) => void
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
        } as ReactFlowJsonObject)
    )
  return {
    nodes: [],
    edges: [],
    viewport: { ...standardViewport },
  } as ReactFlowJsonObject
}

export const cleanStoredData = (
  data: ReactFlowJsonObject
): ReactFlowJsonObject => {
  // make sure all editing, selected, etc. properties are false
  const nodes =
    data.nodes?.map(node => {
      // node.width = undefined
      // node.height = undefined
      node.selected = false

      // data
      node.data.editing = false

      return node
    }) || []

  const edges =
    data.edges?.map(edge => {
      edge.selected = false
      return edge
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
        } as CustomEdgeData,
      }
    }) || []
  )
}

export const deepCopyStoredData = (
  storedData: ReactFlowJsonObject
): ReactFlowJsonObject => {
  return {
    nodes: deepCopyNodes(storedData.nodes),
    edges: deepCopyEdges(storedData.edges),
    viewport: { ...storedData?.viewport } || { ...standardViewport },
  } as ReactFlowJsonObject
}

export const deepCopyStoredDataList = (
  storedDataList: ReactFlowJsonObject[]
): ReactFlowJsonObject[] => {
  return storedDataList.map(d => deepCopyStoredData(d))
}
