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

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

const defaultNodes = getItem('node') as Node[]
const defaultEdges = getItem('edge') as Edge[]

const nodeTypes = {
  custom: CustomNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
} as EdgeTypes

const Flow = () => {
  const thisReactFlowInstance = useReactFlow()
  const {
    fitView,
    fitBounds,
    addNodes,
    setNodes,
    getNodes,
    addEdges,
    setEdges,
    getEdges,
    setViewport,
    getViewport,
    deleteElements,
  }: ReactFlowInstance = thisReactFlowInstance

  const [nodes, setNodesState, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(defaultEdges)

  /* -------------------------------------------------------------------------- */
  // ! internal states
  const anyNodeDragging = useRef(false)
  /* -------------------------------------------------------------------------- */

  // store to session storage
  useEffect(() => {
    if (anyNodeDragging.current) return
    storeItem('node', JSON.stringify(nodes))
  }, [nodes])

  useEffect(() => {
    if (anyNodeDragging.current) return
    storeItem('edge', JSON.stringify(edges))
  }, [edges])

  // keys
  const metaPressed = useKeyPress('Meta')
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

  const handleNodeDragStart = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      anyNodeDragging.current = true
    },
    []
  )

  const handleNodeDragStop = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      anyNodeDragging.current = false
    },
    []
  )

  /* -------------------------------------------------------------------------- */
  // ! pane

  const handlePaneClick = useCallback(
    (e: BaseSyntheticEvent) => {
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
    },
    [setNodes]
  )

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
          nodeStrokeColor={n => {
            if (n.selected) return styles.edgeColorStrokeSelected
            else return 'none'
          }}
          nodeColor={n => {
            if (n.data.editing) return `#ff06b766`
            else return '#cfcfcf'
          }}
        />
        <CustomControls
          fitView={fitView}
          fitBounds={fitBounds}
          addNodes={addNodes}
          getNodes={getNodes}
          setViewport={setViewport}
          getViewport={getViewport}
          deleteElements={deleteElements}
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
