import React, {
  useCallback,
  BaseSyntheticEvent,
  useEffect,
  useRef,
} from 'react'
import ReactFlow, {
  useReactFlow,
  useNodesState,
  useEdgesState,
  useKeyPress,
  MiniMap,
  Background,
  SelectionMode,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  EdgeMarker,
} from 'reactflow'

import {
  CustomConnectionLine,
  CustomEdge,
  CustomEdgeData,
  customConnectionLineStyle,
  customEdgeOptions,
} from './components/Edge'
import { CustomNode, CustomNodeData } from './components/Node'
import { CustomControls } from './components/CustomControl'
import { CustomMarkerDefs } from './components/CustomDefs'
import { styles } from './constants'
import { FlowContext } from './components/Contexts'
import { getItem, storeItem } from './components/storage'
import { useTimeMachine } from './components/timeMachine'

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

const storedData = getItem()
const defaultNodes = storedData.nodes as Node[]
const defaultEdges = storedData.edges as Edge[]

const nodeTypes = {
  custom: CustomNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
} as EdgeTypes

const Flow = () => {
  const thisReactFlowInstance = useReactFlow()
  const {
    setNodes,
    setEdges,
    setViewport,
    addEdges,
    toObject,
  }: ReactFlowInstance = thisReactFlowInstance

  // use default nodes and edges
  const [nodes, , onNodesChange] = useNodesState(defaultNodes)
  const [edges, , onEdgesChange] = useEdgesState(defaultEdges)

  /* -------------------------------------------------------------------------- */
  // ! internal states
  const anyNodeDragging = useRef(false)
  const { setTime, undoTime, redoTime, canUndo, canRedo } = useTimeMachine(
    toObject(),
    setNodes,
    setEdges,
    setViewport
  )
  /* -------------------------------------------------------------------------- */

  // store to session storage and push to time machine
  useEffect(() => {
    if (anyNodeDragging.current) return
    storeItem(toObject(), setTime)
  }, [nodes, edges, toObject, setTime])

  // keys
  const metaPressed = useKeyPress(['Meta', 'Alt'])
  // const undoPressed = useKeyPress('Meta+z')
  // const redoPressed = useKeyPress('Meta+x')

  useEffect(() => {
    setNodes((nds: Node[]) => {
      return nds.map(nd => {
        return {
          ...nd,
          data: {
            ...nd.data,
            metaPressed,
          } as CustomNodeData,
        } as Node
      })
    })
  }, [metaPressed, setNodes])

  // useEffect(() => {
  //   if (undoPressed && canUndo) undoTime()
  // }, [undoPressed, canUndo, undoTime])

  // useEffect(() => {
  //   if (redoPressed && canRedo) redoTime()
  // }, [redoPressed, canRedo, redoTime])

  // ! on connect
  const onConnect = useCallback(
    (params: Connection) => {
      addEdges(
        // overwrite default edge configs here
        {
          ...params,
          id: `${params.source}---${params.target}`,
          data: {
            label: '',
          } as CustomEdgeData,
        } as Edge
      )
    },
    [addEdges]
  )

  /* -------------------------------------------------------------------------- */
  // ! node

  // ! node right click
  const handleNodeContextMenu = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log(e)
  }, [])

  const handleNodeDoubleClick = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      e.preventDefault()
      e.stopPropagation()

      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (node.id !== nd.id) return nd
          else {
            return {
              ...nd,
              data: {
                ...nd.data,
                editing: true,
              },
            }
          }
        })
      })
    },
    [setNodes]
  )

  const handleNodeDragStart = useCallback(() => {
    anyNodeDragging.current = true
  }, [])

  const handleNodeDragStop = useCallback(() => {
    anyNodeDragging.current = false
  }, [])

  /* -------------------------------------------------------------------------- */
  // ! pane

  const handlePaneClick = useCallback(() => {
    setNodes((nds: Node[]) => {
      return nds.map((nd: Node) => {
        if (!nd.data.editing) return nd
        return {
          ...nd,
          data: {
            ...nd.data,
            editing: false,
          } as CustomNodeData,
        } as Node
      })
    })
  }, [setNodes])

  // const handlePaneContextMenu = useCallback((e: BaseSyntheticEvent) => {
  //   e.preventDefault()
  //   e.stopPropagation()
  // }, [])

  return (
    <FlowContext.Provider value={thisReactFlowInstance}>
      <ReactFlow
        className={metaPressed ? 'flow-meta-pressed' : ''}
        // basic
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        // flow view
        style={reactFlowWrapperStyle}
        fitView={false}
        attributionPosition="top-right"
        // edge specs
        elevateEdgesOnSelect={true}
        defaultEdgeOptions={customEdgeOptions} // adding a new edge with this configs without notice
        connectionLineComponent={CustomConnectionLine}
        connectionLineStyle={customConnectionLineStyle}
        // viewport control
        panOnScroll={true}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        // ! actions
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        // onPaneContextMenu={handlePaneContextMenu}
      >
        <CustomMarkerDefs
          markerOptions={
            {
              color: styles.edgeColorStrokeSelected,
            } as EdgeMarker
          }
        />
        <MiniMap
          pannable={true}
          // nodeStrokeColor={n => {
          //   if (n.selected) return styles.edgeColorStrokeSelected
          //   else return 'none'
          // }}
          nodeColor={n => {
            if (n.data.editing) return `#ff06b7aa`
            else if (n.selected) return `${styles.edgeColorStrokeSelected}aa`
            else return '#cfcfcf'
          }}
        />
        <CustomControls
          nodes={nodes}
          edges={edges}
          undoTime={undoTime}
          redoTime={redoTime}
          setTime={setTime}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <Background color="#008ddf" />
      </ReactFlow>
    </FlowContext.Provider>
  )
}

const ReactFlowComponent = () => {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  )
}

export default ReactFlowComponent
