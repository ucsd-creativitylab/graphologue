import { memo, useCallback } from 'react'
import {
  Connection,
  ConnectionLineComponent,
  ConnectionLineComponentProps,
  DefaultEdgeOptions,
  Edge,
  EdgeProps,
  getStraightPath,
  MarkerType,
  useStore,
} from 'reactflow'
import { styles } from '../constants'
import { getMarkerId } from './CustomDefs'
import { getEdgeParams } from './utils'

/* -------------------------------------------------------------------------- */

export type CustomEdgeData = {
  label: string
  className?: string
}

export const CustomEdge = memo(
  ({ id, source, target, animated, data, markerEnd, selected }: EdgeProps) => {
    const sourceNode = useStore(
      useCallback(store => store.nodeInternals.get(source), [source])
    )
    const targetNode = useStore(
      useCallback(store => store.nodeInternals.get(target), [target])
    )

    if (!sourceNode || !targetNode) return null

    const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)
    const [edgePath] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    })

    return (
      <>
        <path
          id={`${id}-background`}
          className={`react-flow__edge-path-background${
            selected ? ' path-background-selected' : ''
          }${data.className ? ` ${data.className}` : ''}`}
          d={edgePath}
        />
        <path
          id={id}
          className={`react-flow__edge-path${selected ? ' path-selected' : ''}${
            data.className ? ` ${data.className}` : ''
          }`}
          d={edgePath}
          markerEnd={
            selected
              ? `url(#${getMarkerId(styles.edgeColorStrokeSelected)})`
              : (markerEnd as string)
          }
        />
      </>
    )
  }
)

export const getNewEdge = (params: Connection) => {
  return {
    ...params,
    id: `${params.source}---${params.target}`,
    data: {
      label: '',
    } as CustomEdgeData,
  } as Edge
}

/* -------------------------------------------------------------------------- */

export const CustomConnectionLine = ({
  fromX,
  fromY,
  toX,
  toY,
  connectionLineStyle,
}: ConnectionLineComponentProps): any => {
  const [edgePath] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  })

  return (
    <g>
      <path
        style={{
          ...connectionLineStyle,
          stroke: `${styles.edgeColorStrokeDefault}99`,
        }}
        fill="none"
        strokeLinecap="round"
        d={edgePath}
      />
      {/* <circle
        cx={toX}
        cy={toY}
        fill={styles.edgeColorStrokeDefault}
        r={1}
        stroke={styles.edgeColorStrokeDefault}
        strokeWidth={styles.edgeWidth}
      /> */}
    </g>
  ) as unknown as ConnectionLineComponent
}

export const customConnectionLineStyle = {
  strokeWidth: styles.edgeWidth,
  stroke: styles.edgeColorStrokeDefault,
}

export const customEdgeOptions = {
  type: 'custom',
  animated: false,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: styles.edgeMarkerSize,
    height: styles.edgeMarkerSize,
    color: styles.edgeColorStrokeDefault,
  },
  labelStyle: { fill: styles.edgeColorLabelDefault },
} as DefaultEdgeOptions
