import React, { useCallback, useState, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
} from 'reactflow';
import Grid from '@mui/material/Grid';
// import Paper from '@mui/material/Paper';

import { EdgeData } from './components/Edge';
import { NodeData } from './components/Node';
import { EdgeContext, EdgeContextProps } from './components/EdgeContext';

import 'reactflow/dist/style.css';

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
    <Grid container>
      <Grid item xs={12}>
        <div style={{ width: '1500px', height: '700px' }}>
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
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              snapToGrid={true}
              // edgeTypes={edgeTypes}
              fitView
              attributionPosition="top-right"
              // data
              // setNodes={setNodes}
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </EdgeContext.Provider>
        </div>
      </Grid>
    </Grid>
  );
};

export default App;
