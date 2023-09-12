import React, { memo } from 'react'
import { EdgeProps, getSmoothStepPath } from 'reactflow'

import { CustomEdgeData, EdgeCustomLabel } from './Edge'
import { styles } from '../constants'
import { getMarkerId } from './CustomDefs'

export const SimpleEdge = memo(
  ({
    id,
    source,
    target,
    sourceHandleId,
    targetHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
    selected,
  }: EdgeProps) => {
    const { customType } = data as CustomEdgeData

    const [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    let customMarkerEnd = undefined
    if (customType === 'arrow') {
      // if (isExplainedByMagicNode)
      //   customMarkerEnd = `url(#${getMarkerId(
      //     styles.edgeColorStrokeExplained
      //   )})`
      if (selected)
        customMarkerEnd = `url(#${getMarkerId(styles.edgeColorStrokeSelected)})`
      else customMarkerEnd = markerEnd as string
    }

    return (
      <>
        <path
          id={`${id}-background`}
          className={`react-flow__edge-path-background${
            selected ? ' path-background-selected' : ''
          }`}
          d={edgePath}
        />

        <path
          key={`${id}-${customType}${selected ? '-selected' : ''}`}
          id={id}
          style={style}
          className={`react-flow__edge-path react-flow__edge-path-${customType}${
            selected ? ' path-selected' : ''
          }`}
          d={edgePath}
          strokeLinecap={customType === 'arrow' ? 'butt' : 'round'}
          strokeDasharray={
            customType === 'dash' ? styles.edgeDashLineArray : undefined
          }
          markerEnd={customMarkerEnd}
        />
        {(data as CustomEdgeData).label && (
          <EdgeCustomLabel
            edgeId={id}
            edgeData={data}
            labelX={getEdgeLabelXPosition(
              data.label,
              sourceX,
              sourceY,
              targetX,
              targetY,
            )}
            labelY={targetY - 8} // gap
            connection={{
              source,
              target,
              sourceHandle: sourceHandleId || null,
              targetHandle: targetHandleId || null,
            }}
            selected={selected || false}
          />
        )}
      </>
    )
  },
)

const getEdgeLabelXPosition = (
  content: string,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) => {
  if (content.length > 0 && Math.abs(sourceY - targetY) < 2)
    return (sourceX + targetX) / 2
  else
    return (
      0.75 * targetX + 0.25 * sourceX
      // hardcodedEdgeLabelWidthEstimation(content) / 2
    )
}
