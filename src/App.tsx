import React, { useCallback, BaseSyntheticEvent } from 'react'
import ReactFlow, {
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Background,
  SelectionMode,
  EdgeTypes,
  ReactFlowInstance,
  ReactFlowProvider,
} from 'reactflow'

import { CustomEdge, EdgeData } from './components/Edge'
import { NodeData } from './components/Node'
import { CustomControls } from './components/CustomControl'

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

const defaultNodes: NodeData[] = []
const defaultEdges: EdgeData[] = []

const edgeTypes = {
  custom: CustomEdge,
} as EdgeTypes

const Flow = () => {
  const {
    fitView,
    fitBounds,
    addNodes,
    getNodes,
    setViewport,
    getViewport,
  }: ReactFlowInstance = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)

  const onConnect = useCallback(
    (params: any) => {
      console.log(params)
      setEdges(eds => addEdge(params, eds))
    },
    [setEdges]
  )

  const onPaneContextMenu = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('onPaneContextMenu')
  }, [])

  return (
    <ReactFlow
      // basic
      nodes={nodes}
      edges={edges}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      // flow view
      style={reactFlowWrapperStyle}
      fitView={true}
      attributionPosition="top-right"
      // edge specs
      elevateEdgesOnSelect={true}
      // viewport control
      panOnScroll={true}
      selectionOnDrag={true}
      panOnDrag={[1, 2]}
      selectionMode={SelectionMode.Partial}
      //
      onPaneContextMenu={onPaneContextMenu}
    >
      <MiniMap pannable={true} />
      <CustomControls
        fitView={fitView}
        fitBounds={fitBounds}
        addNodes={addNodes}
        getNodes={getNodes}
        setViewport={setViewport}
        getViewport={getViewport}
      />
      <Background color="#777" />
    </ReactFlow>
  )
}

const App = () => {
  return (
    <ReactFlowProvider>
      {/* <EdgeContext.Provider
        value={
          {
            nodes,
            edges,
            onConnect,
            setNodes,
            onNodesChange,
          } as EdgeContextProps
        }
      ></EdgeContext.Provider> */}
      <Flow />
    </ReactFlowProvider>
  )
}

export default App
