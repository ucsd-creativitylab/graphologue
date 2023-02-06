import { useCallback } from 'react'
import { getBezierPath, MarkerType, useStore } from 'reactflow'
import { getEdgeParams } from './utils'

/* -------------------------------------------------------------------------- */

export interface EdgeData {
  id: string
  source: string
  target: string
  animated: boolean
  data: { label: string }
  markerEnd: MarkerType.ArrowClosed | MarkerType.Arrow
}

export const CustomEdge = ({
  id,
  source,
  target,
  animated,
  data,
  markerEnd,
}: EdgeData) => {
  const sourceNode = useStore(
    useCallback(store => store.nodeInternals.get(source), [source])
  )
  const targetNode = useStore(
    useCallback(store => store.nodeInternals.get(target), [target])
  )

  if (!sourceNode || !targetNode) {
    return null
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  })

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
    />
  )
}
