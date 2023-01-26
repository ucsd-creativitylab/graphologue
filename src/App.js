import React, {useCallback, useState, useStore, useRef} from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    MiniMap,
    Controls,
    Background,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import CustomEdge from './CustomEdge';
import MediaCard from './components/MediaCard';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import {EdgeContext} from "./EdgeContext";


const initialNodes = [
    {id: 'edges-1', type: 'input', data: {label: 'PINK1'}, position: {x: 50, y: 0},},
    {id: 'edges-2', data: {label: 'Parkinsons Disease'}, position: {x: 350, y: 100}},
    {id: 'edges-2a', data: {label: 'Tremor'}, position: {x: 0, y: 180}},
    {id: 'edges-3a', data: {label: 'Anxiety'}, position: {x: 580, y: 380}},
    //{ id: 'edges-6', type: 'output', data: { label: 'Output 6' }, position: { x: 50, y: 550 },},
    //{ id: 'edges-7', type: 'output', data: { label: 'Output 7' }, position: { x: 250, y: 550 },},
    {id: 'edges-3', data: {label: 'Motor Symptom'}, position: {x: 750, y: 200}},
    {id: 'edges-4', type: 'output', data: {label: 'Sleeping Disorder'}, position: {x: 400, y: 300}},
    {id: 'edges-5', data: {label: 'Pervasive Developmental Disorder'}, position: {x: 250, y: 400}},
    {
        id: 'edges-8', type: 'output', data: {label: 'Language Development'}, position: {x: 25, y: 500},
    },
];

const initialEdges = [
    {
        id: 'edges-e1-2',
        source: 'edges-1',
        target: 'edges-2',
        type: 'custom',
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-e2-2a',
        source: 'edges-2',
        target: 'edges-2a',
        type: 'custom',
        animated: true,
        data: {text: 'is related to'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-e2-3',
        source: 'edges-2',
        target: 'edges-3',
        type: 'custom',
        animated: true,
        data: {text: 'is related to'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-2-4',
        source: 'edges-2',
        target: 'edges-4',
        type: 'custom',
        animated: true,
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-e3-3a',
        source: 'edges-3',
        target: 'edges-3a',
        type: 'custom',
        animated: true,
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-3a-4',
        source: 'edges-4',
        target: 'edges-5',
        type: 'custom',
        animated: true,
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-e5-6',
        source: 'edges-5',
        target: 'edges-6',
        label: 'styled label',
        labelStyle: {fill: 'red', fontWeight: 700},
        markerEnd: {type: MarkerType.Arrow,},
    },
    {
        id: 'edges-e5-7',
        source: 'edges-5',
        target: 'edges-7',
        label: 'label with styled bg',
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        labelBgStyle: {fill: '#FFCC00', color: '#fff', fillOpacity: 0.7},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-e5-8',
        source: 'edges-5',
        target: 'edges-8',
        type: 'custom',
        animated: true,
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
    {
        id: 'edges-3a-5',
        source: 'edges-3a',
        target: 'edges-5',
        type: 'custom',
        animated: true,
        data: {text: 'has an impact on'},
        markerEnd: {type: MarkerType.ArrowClosed,},
    },
];

const edgeTypes = {
    custom: CustomEdge,
};

const App = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const yPos = useRef(0);
    const [preReq, setPreReq] = useState('false')

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

    return (
        <Grid container>
            <Grid item xs={12}>
                    <div style={{width: "1500px", height: "700px"}}>
                        <EdgeContext.Provider value={{nodes, edges, onConnect, setNodes, onNodesChange}}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                snapToGrid={true}
                                edgeTypes={edgeTypes}
                                fitView
                                attributionPosition="top-right"
                                data
                                setNodes={setNodes}
                            >
                                <MiniMap/>
                                <Controls/>
                                <Background/>
                            </ReactFlow>
                        </EdgeContext.Provider>
                    </div>
            </Grid>
        </Grid>


    );
};

export default App;


