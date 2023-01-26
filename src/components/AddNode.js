import React, { useCallback, useState } from 'react';
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