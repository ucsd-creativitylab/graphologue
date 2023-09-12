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
  useReactFlow,
} from 'reactflow'

import { ReactComponent as DashLine } from '../media/dashLine.svg'
import { ReactComponent as PlainLine } from '../media/plainLine.svg'
import { ReactComponent as ArrowLine } from '../media/arrowLine.svg'

import { styles } from '../constants'
import { FlowContext } from '../components/Contexts'
import { getMarkerId } from './CustomDefs'
import { MagicToolbox, MagicToolboxItem } from './MagicToolbox'
import { getEdgeId, getEdgeParams } from '../utils/utils'
import { GeneratedInformation } from './Node'

/* -------------------------------------------------------------------------- */

export interface CustomEdgeData {
  label: string
  customType: 'dash' | 'plain' | 'arrow'
  editing: boolean
  generated: GeneratedInformation
}

interface CustomEdgeProps extends EdgeProps {
  data: CustomEdgeData
}
export const CustomEdge = memo(
  ({
    id,
    source,
    target,
    sourceHandleId,
    targetHandleId,
    animated,
    data,
    markerEnd,
    selected,
  }: CustomEdgeProps) => {
    const sourceNode = useStore(
      useCallback(store => store.nodeInternals.get(source), [source]),
    )
    const targetNode = useStore(
      useCallback(store => store.nodeInternals.get(target), [target]),
    )

    if (!sourceNode || !targetNode) return null

    const { customType } = data as CustomEdgeData

    const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)
    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    })

    let customMarkerEnd = undefined
    if (customType === 'arrow') {
      // if (isExplainedByMagicNode)
      //   customMarkerEnd = `url(#${getMarkerId(
      //     styles.edgeColorStrokeExplained,
      //   )})`
      if (selected)
        customMarkerEnd = `url(#${getMarkerId(styles.edgeColorStrokeSelected)})`
      else customMarkerEnd = markerEnd as string
    }

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
          strokeDasharray={
            customType === 'dash' ? styles.edgeDashLineArray : undefined
          }
          markerEnd={customMarkerEnd}
        />
        <EdgeCustomLabel
          edgeId={id}
          edgeData={data as CustomEdgeData}
          labelX={labelX}
          labelY={labelY}
          connection={{
            source,
            target,
            sourceHandle: sourceHandleId || null,
            targetHandle: targetHandleId || null,
          }}
          selected={selected || false}
        />
      </>
    )
  },
)

export const getNewEdge = (
  params: Connection,
  dataOptions?: CustomEdgeData,
) => {
  const data: CustomEdgeData = {
    ...({
      label: '',
      customType: 'plain',
      editing: false,
      generated: {
        pseudo: false,
        originRanges: [],
        originTexts: [],
      },
    } as CustomEdgeData),
    ...(dataOptions || {}),
  }
  return {
    ...params,
    id: getEdgeId(params.source || '', params.target || ''),
    data: data,
    selected: false,
  } as Edge
}

/* -------------------------------------------------------------------------- */

// ! edge label component

type EdgeCustomLabelProps = {
  edgeId: string
  edgeData: CustomEdgeData
  labelX: number
  labelY: number
  connection: Connection
  selected: boolean
  // roughZoomLevel: number
}
export const EdgeCustomLabel = memo(
  ({
    edgeId,
    edgeData,
    labelX,
    labelY,
    connection,
    selected,
  }: // roughZoomLevel,
  EdgeCustomLabelProps) => {
    const { setEdges } = useReactFlow()
    const { initialSelectItem } = useContext(FlowContext)

    const useToolbox =
      selected &&
      initialSelectItem.type === 'edge' &&
      initialSelectItem.id === edgeId

    // ! switch custom edge type
    const handleSwitchCustomEdgeType = useCallback(
      (newType: string) => {
        setEdges((eds: Edge[]) => {
          return eds.map(ed => {
            if (ed.id === edgeId) {
              return {
                ...ed,
                data: {
                  ...ed.data,
                  customType: newType,
                },
              }
            }
            return ed
          })
        })
      },
      [edgeId, setEdges],
    )

    return (
      <foreignObject
        className={`edge-label-wrapper`}
        x={labelX}
        y={labelY - 4} // ! why
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="super-wrapper super-wrapper-edge super-wrapper-static-text super-wrapper-static-text-edge">
          <span className="edge-label">{edgeData.label}</span>

          {edgeData.label.length > 0 && (
            <div className="content-tooltip">{edgeData.label}</div>
          )}

          {/* -------------------------------------------------------------------------- */}
          {useToolbox ? (
            <MagicToolbox
              className={`edge-label-toolbox${
                useToolbox ? ' magic-toolbox-show' : ''
              }`}
            >
              <MagicToolboxItem title="switch type">
                <EdgeCustomTypeSwitch
                  currentType={edgeData.customType}
                  handleChange={handleSwitchCustomEdgeType}
                />
              </MagicToolboxItem>
            </MagicToolbox>
          ) : (
            <></>
          )}
          {/* -------------------------------------------------------------------------- */}
        </div>
      </foreignObject>
    )
  },
)

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
    </g>
  ) as unknown as ConnectionLineComponent
}

export const customConnectionLineStyle = {
  strokeWidth: styles.edgeWidth,
  stroke: styles.edgeColorStrokeDefault,
}

export const customEdgeOptions = {
  type: 'simple',
  animated: false, // ? do we want any animation here?
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: styles.edgeMarkerSize,
    height: styles.edgeMarkerSize,
    color: styles.edgeColorStrokeDefault,
  },
} as DefaultEdgeOptions

/* -------------------------------------------------------------------------- */

interface EdgeCustomTypeSwitchProps {
  currentType: string
  handleChange: (newType: string) => void
}
export const EdgeCustomTypeSwitch = ({
  currentType,
  handleChange,
}: EdgeCustomTypeSwitchProps) => {
  const getClassName = (typeSelected: boolean) =>
    `type-switch-button magic-toolbox-button${typeSelected ? ' selected' : ''}`
  return (
    <div className="edge-custom-type-switch">
      <button
        className={getClassName(currentType === 'dash')}
        onClick={() => {
          handleChange('dash')
        }}
      >
        <DashLine />
      </button>
      <button
        className={getClassName(currentType === 'plain')}
        onClick={() => {
          handleChange('plain')
        }}
      >
        <PlainLine />
      </button>
      <button
        className={getClassName(currentType === 'arrow')}
        onClick={() => {
          handleChange('arrow')
        }}
      >
        <ArrowLine />
      </button>
    </div>
  )
}
