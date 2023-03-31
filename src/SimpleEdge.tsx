import React, { memo } from 'react'
import { EdgeProps, getBezierPath } from 'reactflow'
import { CustomEdgeData } from './components/Edge'
import { styles } from './constants'
import { getMarkerId } from './components/CustomDefs'

export const SimpleEdge = memo(
  ({
    id,
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

    const [edgePath] = getBezierPath({
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
          // }${data.className ? ` ${data.className}` : ''}`}
          d={edgePath}
        />

        <path
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
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: 12 }}
            startOffset="50%"
            textAnchor="middle"
          >
            {data.label}
          </textPath>
        </text>
      </>
    )
  }
)
