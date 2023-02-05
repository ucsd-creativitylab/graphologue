import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
} from 'reactflow';

import { EdgeData } from './components/Edge';
import { NodeData } from './components/Node';
import { EdgeContext, EdgeContextProps } from './components/EdgeContext';

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties;

const defaultNodes: NodeData[] = [];
const defaultEdges: EdgeData[] = [];

// const edgeTypes = {
//   custom: CustomEdge,
// };

const App = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);

  const onConnect = useCallback((params: any) => {
    console.log(params);
    setEdges((e) /* edges */ => addEdge(params, e));
  }, []);

  return (
    <EdgeContext.Provider
      value={
        {
          nodes,
          edges,
          onConnect,
          setNodes,
          onNodesChange,
        } as EdgeContextProps
      }
    >
      <ReactFlow
        // basic
        nodes={nodes}
        edges={edges}
        // edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        // flow view
        style={reactFlowWrapperStyle}
        fitView={true}
        snapGrid={[15, 15]}
        attributionPosition="top-right"
        // edge specs
        elevateEdgesOnSelect={true}
      >
        <MiniMap />
        {/* <Controls /> */}
        <Background />
      </ReactFlow>
    </EdgeContext.Provider>
  );
};

export default App;
