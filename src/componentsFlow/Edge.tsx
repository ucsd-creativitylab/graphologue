import { memo, useCallback, useContext } from 'react'
import {
  Connection,
  ConnectionLineComponent,
  ConnectionLineComponentProps,
  DefaultEdgeOptions,
  Node,
  Edge,
  EdgeProps,
  getStraightPath,
  MarkerType,
  useStore,
  useReactFlow,
} from 'reactflow'

import LinearScaleRoundedIcon from '@mui/icons-material/LinearScaleRounded'

import { ReactComponent as DashLine } from '../media/dashLine.svg'
import { ReactComponent as PlainLine } from '../media/plainLine.svg'
import { ReactComponent as ArrowLine } from '../media/arrowLine.svg'

import { hardcodedNodeSize, hideEdgeTextZoomLevel, styles } from '../constants'
import { FlowContext } from '../components/Contexts'
import { getMarkerId } from './CustomDefs'
import {
  MagicSuggestItem,
  MagicToolbox,
  MagicToolboxButton,
  MagicToolboxItem,
} from './MagicToolbox'
import { SuperTextEditor } from './SuperTextEditor'
import { getEdgeId, getEdgeParams, getNodeLabelAndTags } from '../utils/utils'
import { customAddNodes, GeneratedInformation } from './Node'
import { MagicNodeData } from './MagicNode'

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
      useCallback(store => store.nodeInternals.get(source), [source])
    )
    const targetNode = useStore(
      useCallback(store => store.nodeInternals.get(target), [target])
    )
    const zoomLevel = useStore(useCallback(store => store.transform[2], []))

    const { selectedComponents } = useContext(FlowContext)
    const { getNodes, getEdges } = useReactFlow()

    if (!sourceNode || !targetNode) return null

    const { customType } = data as CustomEdgeData

    const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode)
    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    })

    // check if this node is explained by a magic node
    const selectedMagicNodes = selectedComponents.nodes.filter(
      (nodeId: string) => {
        return nodeId.includes('magic-node-')
      }
    )
    const isExplainedByMagicNode = selectedMagicNodes.some((nodeId: string) => {
      const node = getNodes().find(node => node.id === nodeId)
      if (!node) return false

      const {
        sourceComponents: { edges: edgeIds },
      } = node.data as MagicNodeData

      const edges = getEdges().filter(edge => {
        return edgeIds.includes(edge.id)
      })

      for (const ed of edges) {
        if (ed.id === id) return true
      }
      return false
    })

    let customMarkerEnd = undefined
    if (customType === 'arrow') {
      if (isExplainedByMagicNode)
        customMarkerEnd = `url(#${getMarkerId(
          styles.edgeColorStrokeExplained
        )})`
      else if (selected)
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
          }${isExplainedByMagicNode ? ' edge-explained' : ''}`}
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
          roughZoomLevel={zoomLevel}
        />
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

export const getNewEdge = (
  params: Connection,
  dataOptions?: CustomEdgeData
) => {
  const data: CustomEdgeData = {
    ...({
      label: '',
      customType: 'plain',
      editing: false,
      generated: {
        temporary: false,
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

// !for magic suggestions
const getRelevantNodesForEdge = (connection: Connection, nodes: Node[]) => {
  const targetNode = nodes.find(node => node.id === connection.target)
  const sourceNode = nodes.find(node => node.id === connection.source)

  if (
    targetNode &&
    sourceNode &&
    (targetNode.data.label.length > 0 || sourceNode.data.label.length > 0)
  )
    return [targetNode, sourceNode]

  return nodes
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
  roughZoomLevel: number
}
export const EdgeCustomLabel = memo(
  ({
    edgeId,
    edgeData,
    labelX,
    labelY,
    connection,
    selected,
    roughZoomLevel,
  }: EdgeCustomLabelProps) => {
    const { getNodes, addNodes, setEdges, fitView } = useReactFlow()
    const { selectedComponents, selectNodes } = useContext(FlowContext)

    const moreThanOneComponentsSelected =
      selectedComponents.nodes.length + selectedComponents.edges.length > 1

    // ! add node from edge
    const handleAddNodeFromEdge = useCallback(() => {
      const { width: nodeWidth, height: nodeHeight } = hardcodedNodeSize
      const {
        target: originalTarget,
        source: originalSource,
        targetHandle: originalTargetHandle,
        sourceHandle: originalSourceHandle,
      } = connection

      const { nodeId, targetHandleId, sourceHandleId } = customAddNodes(
        addNodes,
        selectNodes,
        labelX - nodeWidth / 2,
        labelY - nodeHeight / 2,
        {
          label: edgeData.label,
          select: false,
          editing: false,
          styleBackground: styles.nodeColorDefaultGrey,
          toFitView: false,
          fitView: fitView,
        }
      )

      // originalSource -------------> originalTarget
      // originalSource -> new node -> originalTarget
      setEdges((eds: Edge[]) => {
        return eds
          .filter(ed => ed.id !== edgeId) // remove the original edge
          .concat([
            getNewEdge(
              {
                source: originalSource,
                sourceHandle: originalSourceHandle,
                target: nodeId,
                targetHandle: targetHandleId,
              },
              {
                label: '',
                customType: edgeData.customType,
                editing: false,
                generated: {
                  temporary: false,
                  sourceAnswerObjectIds: new Set(),
                },
              }
            ),
            getNewEdge(
              {
                source: nodeId,
                sourceHandle: sourceHandleId,
                target: originalTarget,
                targetHandle: originalTargetHandle,
              },
              {
                label: '',
                customType: edgeData.customType,
                editing: false,
                generated: {
                  temporary: false,
                  sourceAnswerObjectIds: new Set(),
                },
              }
            ),
          ])
      })
    }, [
      addNodes,
      connection,
      edgeData.customType,
      edgeData.label,
      edgeId,
      fitView,
      labelX,
      labelY,
      selectNodes,
      setEdges,
    ])

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
      [edgeId, setEdges]
    )

    return (
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
          targetId={edgeId}
          content={edgeData.label}
          editing={edgeData.editing}
          background={'white'}
          selected={selected}
          textareaRef={null}
        >
          {/* -------------------------------------------------------------------------- */}
          {!moreThanOneComponentsSelected && selected ? (
            <MagicToolbox
              className={`edge-label-toolbox${
                !moreThanOneComponentsSelected && selected
                  ? ' magic-toolbox-show'
                  : ''
              }`}
              zoom={roughZoomLevel}
            >
              {edgeData.label.length === 0 && selected ? (
                <MagicSuggestItem
                  target="edge"
                  targetId={edgeId}
                  nodeLabelAndTags={getNodeLabelAndTags(
                    getRelevantNodesForEdge(connection, getNodes())
                  )}
                  edgeLabels={[]}
                  disabled={moreThanOneComponentsSelected}
                />
              ) : (
                <></>
              )}

              <MagicToolboxItem title="switch type">
                <EdgeCustomTypeSwitch
                  currentType={edgeData.customType}
                  handleChange={handleSwitchCustomEdgeType}
                />
              </MagicToolboxItem>

              <MagicToolboxItem title="make node">
                <MagicToolboxButton
                  content={
                    <>
                      <LinearScaleRoundedIcon />
                      <span>
                        {edgeData.label.length ? 'convert to node' : 'add node'}
                      </span>
                    </>
                  }
                  onClick={handleAddNodeFromEdge}
                />
              </MagicToolboxItem>
            </MagicToolbox>
          ) : (
            <></>
          )}
          {/* -------------------------------------------------------------------------- */}
        </SuperTextEditor>
      </foreignObject>
    )
  }
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
