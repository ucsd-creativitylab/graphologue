import { useCallback } from 'react'
import { useReactFlow, useStoreApi } from 'reactflow'

function useDetachNodes() {
  // https://pro.reactflow.dev/examples/dynamic-grouping
  const { setNodes } = useReactFlow()
  const store = useStoreApi()

  const detachNodes = useCallback(
    (ids: string[], removeParentId?: string) => {
      const { nodeInternals } = store.getState()
      const nextNodes = Array.from(nodeInternals.values()).map(n => {
        if (ids.includes(n.id)) {
          const parentNode = nodeInternals.get(n.parentNode!)
          return {
            ...n,
            position: {
              x: n.position.x + parentNode!.positionAbsolute!.x,
              y: n.position.y + parentNode!.positionAbsolute!.y,
            },
            extent: undefined,
            parentNode: undefined,
          }
        }
        return n
      })
      setNodes(
        nextNodes.filter(n => !removeParentId || n.id !== removeParentId)
      )
    },
    [setNodes, store]
  )

  return detachNodes
}

export default useDetachNodes
