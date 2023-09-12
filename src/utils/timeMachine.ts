import { useRef } from 'react'
import {
  Instance,
  Edge,
  Node,
  ReactFlowJsonObject,
  SetViewport,
} from 'reactflow'
import isEqual from 'react-fast-compare'

import { CustomNodeData } from '../componentsFlow/Node'
import { CustomEdgeData } from '../componentsFlow/Edge'
import {
  deepCopyEdges,
  deepCopyNodes,
  deepCopyStoredData,
  deepCopyStoredDataList,
} from './storage'
import { timeMachineMaxSize, transitionDuration } from '../constants'

// a fully copilot generated function
export const useTimeMachine = (
  present: ReactFlowJsonObject,
  setNodes: Instance.SetNodes<Node>,
  setEdges: Instance.SetEdges<Edge>,
  setViewport: SetViewport,
) => {
  const past = useRef<ReactFlowJsonObject[]>([])
  const future = useRef<ReactFlowJsonObject[]>([])
  const timeMachinePresent = useRef(present)
  const timeTraveling = useRef(false)

  const canUndo = past.current.length > 0
  const canRedo = future.current.length > 0

  // use previous
  // useEffect(() => {
  //   timeMachinePresent.current = deepCopyStoredData(present)
  // }, [present])

  const undoTime = (): void => {
    if (canUndo) {
      timeTraveling.current = true

      const newPresent = deepCopyStoredData(
        past.current[past.current.length - 1],
      )

      future.current = deepCopyStoredDataList([
        timeMachinePresent.current,
        ...future.current,
      ])
      timeMachinePresent.current = newPresent
      past.current = deepCopyStoredDataList(
        past.current.slice(0, past.current.length - 1),
      )

      setNodes(deepCopyNodes(newPresent.nodes))
      setEdges(deepCopyEdges(newPresent.edges))
      setViewport(
        { ...newPresent.viewport },
        {
          duration: transitionDuration,
        },
      )
    }
  }

  const redoTime = () => {
    if (canRedo) {
      timeTraveling.current = true

      const newPresent = deepCopyStoredData(future.current[0])
      past.current = deepCopyStoredDataList([
        ...past.current,
        timeMachinePresent.current,
      ])
      timeMachinePresent.current = newPresent
      future.current = deepCopyStoredDataList(future.current.slice(1))

      setNodes(deepCopyNodes(newPresent.nodes))
      setEdges(deepCopyEdges(newPresent.edges))
      setViewport(
        { ...newPresent.viewport },
        {
          duration: transitionDuration,
        },
      )
    }
  }

  const setTime = (newPresent: ReactFlowJsonObject) => {
    if (timeTraveling.current) return (timeTraveling.current = false)

    if (!equalDataAcrossTime(newPresent, timeMachinePresent.current)) {
      past.current = deepCopyStoredDataList([
        ...past.current,
        timeMachinePresent.current,
      ])
      // if past is too long, remove the oldest
      if (past.current.length > timeMachineMaxSize) past.current.shift()

      timeMachinePresent.current = deepCopyStoredData(newPresent)
      future.current = []
    }
  }

  const getPast = () =>
    deepCopyStoredData(past.current[past.current.length - 1])

  return {
    setTime,
    undoTime,
    redoTime,
    getPast,
    canUndo,
    canRedo,
  }
}

export const equalDataAcrossTime = (
  past: ReactFlowJsonObject,
  present: ReactFlowJsonObject,
) => {
  // use isEqual from react-fast-compare to compare the data
  // but exclude the data.editing, and selected properties for nodes
  // and exclude the selected property for edges
  return isEqual(
    {
      nodes:
        past.nodes?.map(node => {
          const { selected, width, height, ...rest } = node
          const { editing, ...restData } = node.data as CustomNodeData
          return {
            ...rest,
            data: restData,
          }
        }) || [],
      edges:
        past.edges?.map(edge => {
          const { selected, ...rest } = edge
          const { editing, ...restData } = edge.data as CustomEdgeData
          return {
            ...rest,
            data: restData,
          }
        }) || [],
    },
    {
      nodes:
        present.nodes?.map(node => {
          const { selected, width, height, ...rest } = node
          const { editing, ...restData } = node.data as CustomNodeData
          return {
            ...rest,
            data: restData,
          }
        }) || [],
      edges:
        present.edges?.map(edge => {
          const { selected, ...rest } = edge
          const { editing, ...restData } = edge.data as CustomEdgeData
          return {
            ...rest,
            data: restData,
          }
        }) || [],
    },
  )
}
