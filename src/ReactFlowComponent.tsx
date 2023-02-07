import React, { useCallback, BaseSyntheticEvent, useEffect } from 'react'
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

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

const defaultNodes: Node[] = []
const defaultEdges: Edge[] = []

const nodeTypes = {
  custom: CustomNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
} as EdgeTypes

const Flow = () => {
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
  }: ReactFlowInstance = useReactFlow()
  const [nodes, setNodesState, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(defaultEdges)

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

      // ! add to session storage
      // TODO
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

  const handleNodeDoubleClick = useCallback((e: BaseSyntheticEvent) => {}, [])

  /* -------------------------------------------------------------------------- */

  const handlePaneContextMenu = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('onPaneContextMenu')
  }, [])

  return (
    <ReactFlow
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
      elevateEdgesOnSelect={false}
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
      onPaneContextMenu={handlePaneContextMenu}
    >
      <CustomMarkerDefs
        markerOptions={
          {
            color: styles.edgeColorStrokeSelected,
          } as EdgeMarker
        }
      />
      <MiniMap pannable={true} />
      <CustomControls
        fitView={fitView}
        fitBounds={fitBounds}
        addNodes={addNodes}
        getNodes={getNodes}
        setViewport={setViewport}
        getViewport={getViewport}
        deleteElements={deleteElements}
      />
      <Background color="#777" />
    </ReactFlow>
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
