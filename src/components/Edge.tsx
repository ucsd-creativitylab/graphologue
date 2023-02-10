import { memo, useCallback, useContext } from 'react'
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
import { hideEdgeTextZoomLevel, styles } from '../constants'
import { EdgeContext } from './Contexts'
import { getMarkerId } from './CustomDefs'
import { SuperTextEditor } from './SuperTextEditor'
import { getEdgeParams } from './utils'

/* -------------------------------------------------------------------------- */

export interface CustomEdgeData {
  label: string
  customType: 'dosh' | 'plain' | 'arrow'
  editing: boolean
}

interface CustomEdgeProps extends EdgeProps {
  data: CustomEdgeData
}
export const CustomEdge = memo(
  ({
    id,
    source,
    target,
    animated,
    data,
    markerEnd,
    selected,
  }: CustomEdgeProps) => {
    const sourceNode = useStore(
      useCallback(store => store.nodeInternals.get(source), [source])
    )
    const targetNode = useStore(
      useCallback(store => store.nodeInternals.get(target), [target])
    )

    const { roughZoomLevel } = useContext(EdgeContext) // useContext cannot be called conditionally

    if (!sourceNode || !targetNode) return null

    const { label, customType, editing } = data as CustomEdgeData

    const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)
    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    })

    return (
      <>
        {/* background */}
        <path
          id={`${id}-background`}
          className={`react-flow__edge-path-background${
            selected ? ' path-background-selected' : ''
          }`}
          // }${data.className ? ` ${data.className}` : ''}`}
          d={edgePath}
        />

        {/* actual line here */}
        <path
          id={id}
          className={`react-flow__edge-path react-flow__edge-path-${customType}${
            selected ? ' path-selected' : ''
          }`}
          d={edgePath}
          strokeLinecap={customType === 'arrow' ? 'butt' : 'round'}
          markerEnd={
            customType === 'arrow'
              ? selected
                ? `url(#${getMarkerId(styles.edgeColorStrokeSelected)})`
                : (markerEnd as string)
              : undefined
          }
        />
        <foreignObject
          className={`edge-label-wrapper${
            roughZoomLevel < hideEdgeTextZoomLevel
              ? ' hidden-edge-label-wrapper'
              : ''
          }`}
          x={labelX}
          y={labelY - 4} // ! why
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <SuperTextEditor
            target="edge"
            targetId={id}
            content={label}
            editing={editing}
            selected={selected || false}
          />
        </foreignObject>
        {/* <text>
          <textPath
            href={`#${id}`}
            className="react-flow__edge-text"
            startOffset="50%"
            textAnchor="middle"
          >
            {label}
          </textPath>
        </text> */}
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
      customType: 'plain',
      editing: false,
    } as CustomEdgeData,
    selected: false,
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
  animated: false, // ? do we want any animation here?
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: styles.edgeMarkerSize,
    height: styles.edgeMarkerSize,
    color: styles.edgeColorStrokeDefault,
  },
} as DefaultEdgeOptions
