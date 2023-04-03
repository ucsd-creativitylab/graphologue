import React, {
  useCallback,
  BaseSyntheticEvent,
  MouseEvent,
  useRef,
  useState,
  DragEvent,
  memo,
  useContext,
} from 'react'
import ReactFlow, {
  useReactFlow,
  Background,
  SelectionMode,
  NodeTypes,
  EdgeTypes,
  ReactFlowInstance,
  Node,
  Edge,
  EdgeMarker,
  OnConnectStartParams,
  useOnViewportChange,
  Viewport,
  useNodesState,
  useEdgesState,
  OnConnectStart,
  OnConnectEnd,
} from 'reactflow'
import isEqual from 'react-fast-compare'

import {
  CustomConnectionLine,
  CustomEdge,
  CustomEdgeData,
  customConnectionLineStyle,
  customEdgeOptions,
} from './Edge'
import { customAddNodes, CustomNode, CustomNodeData } from './Node'
import { CustomControls } from './CustomControl'
import { CustomMarkerDefs } from './CustomDefs'
import {
  hardcodedNodeSize,
  styles,
  useTokenDataTransferHandle,
} from '../constants'
import { FlowContext } from '../components/Contexts'
import { useTimeMachine } from '../utils/timeMachine'
import { roundTo } from '../utils/utils'
import { PromptSourceComponentsType } from '../utils/magicExplain'
import { MagicNode } from './MagicNode'
import { EntityType } from '../utils/socket'
import { CustomGroupNode } from './GroupNode'
import { ModelForMagic } from '../utils/openAI'
import { ReactFlowObjectContext } from '../components/Answer'
import { SimpleEdge } from './SimpleEdge'
import { InterchangeContext } from '../components/Interchange'
import { OriginRange } from '../App'

const reactFlowWrapperStyle = {
  width: '100%',
  height: '100%',
} as React.CSSProperties

// const storedData = getItem()
// const storedData = {
//   nodes: [],
//   edges: [],
// }
// const defaultNodes = storedData.nodes as Node[]
// const defaultEdges = storedData.edges as Edge[]

const defaultNodes: Node[] = []
const defaultEdges: Edge[] = []

const nodeTypes = {
  custom: CustomNode,
  magic: MagicNode,
  group: CustomGroupNode,
} as NodeTypes

const edgeTypes = {
  custom: CustomEdge,
  simple: SimpleEdge,
} as EdgeTypes

const Flow = () => {
  const { handleSetSyncedCoReferenceOriginRanges } =
    useContext(InterchangeContext)
  const { generatingFlow } = useContext(ReactFlowObjectContext)

  const thisReactFlowInstance = useReactFlow()
  const {
    setNodes,
    setEdges,
    setViewport,
    addNodes,
    // addEdges,
    toObject,
    // fitView,
    getViewport,
  }: ReactFlowInstance = thisReactFlowInstance

  // useLayout({
  //   direction: 'LR',
  // })

  // use default nodes and edges
  const [nodes, , onNodesChange] = useNodesState(defaultNodes)
  const [edges, , onEdgesChange] = useEdgesState(defaultEdges)

  // const onNodesChange = useCallback(() => {}, [])
  // const onEdgesChange = useCallback(() => {}, [])

  // fit to view on page load
  // ? need it?
  /*
  useEffect(() => {
    fitView(viewFittingOptions)
  }, [fitView])
  */

  // const reactFlowWrapperElement = document.querySelector(
  //   '.react-flow__renderer'
  // ) as HTMLElement
  // const { width, height } = reactFlowWrapperElement.getBoundingClientRect()

  const defaultViewport = {
    x: (window.innerWidth * 0.5) / 2,
    y: Math.min(window.innerHeight * 0.3, 1000) / 2,
    zoom: 1,
  }

  /* -------------------------------------------------------------------------- */
  // ! internal states
  const reactFlowWrapper = useRef(null)

  const [selectedComponents] = useState({
    nodes: [],
    edges: [],
  } as PromptSourceComponentsType)

  // const currentConnectingNode = useRef({
  //   id: '',
  //   sourceHandleId: '',
  // })

  // const anyNodeDragging = useRef(false)
  const { undoTime, redoTime, canUndo, canRedo } = useTimeMachine(
    toObject(),
    setNodes,
    setEdges,
    setViewport
  )

  // viewport
  const [roughZoomLevel, setRoughZoomLevel] = useState(
    roundTo(getViewport().zoom, 2)
  )
  useOnViewportChange({
    onChange: (v: Viewport) => {
      if (roughZoomLevel !== roundTo(getViewport().zoom, 2))
        setRoughZoomLevel(roundTo(getViewport().zoom, 2))
    },
  })

  const initialSelectItem = useRef<{
    selected: boolean
    type: 'node' | 'edge'
    id: string
  }>({
    selected: false,
    type: 'node',
    id: '',
  })

  /* -------------------------------------------------------------------------- */

  // ! store to session storage and push to time machine
  /*
  useEffect(() => {
    const dragging = nodes.find((nd: Node) => nd.dragging)
    if (dragging) return

    // if text editing then don't store
    const editing =
      nodes.find((nd: Node) => nd.type === 'custom' && nd.data.editing) ||
      edges.find((ed: Edge) => ed.data.editing)
    if (editing) return

    // ! store and save in time machine
    // storeItem(toObject(), setTime)

    // ! update selected
    // TODO any more efficient way to do this?
    const selectedNodes = nodes.filter((nd: Node) => nd.selected)
    const selectedEdges = edges.filter((ed: Edge) => ed.selected)
    if (
      !isEqual(selectedComponents.nodes, selectedNodes) ||
      !isEqual(selectedComponents.edges, selectedEdges)
    )
      setSelectedComponents({
        nodes: selectedNodes.map((nd: Node) => nd.id),
        edges: selectedEdges.map((ed: Edge) => ed.id),
      })
  }, [nodes, edges, toObject, setTime, selectedComponents])
  */

  // ! keys
  // const metaPressed = useKeyPress(['Ctrl', 'Alt', 'Space'])
  // * const metaPressed = useKeyPress(['Alt'])
  const metaPressed = false
  // const undoPressed = useKeyPress('Meta+z')
  // const redoPressed = useKeyPress('Meta+x')

  // useEffect(() => {
  //   if (undoPressed && canUndo) undoTime()
  // }, [undoPressed, canUndo, undoTime])

  // useEffect(() => {
  //   if (redoPressed && canRedo) redoTime()
  // }, [redoPressed, canRedo, redoTime])

  // ! on connect
  /*
  const onConnect = useCallback(
    (params: Connection) => {
      addEdges(
        // overwrite default edge configs here
        getNewEdge(params)
      )
    },
    [addEdges]
  )
  */
  const onConnect = useCallback(() => {}, [])

  /* -------------------------------------------------------------------------- */
  // ! node

  // node - set editing status
  const doSetNodesEditing = useCallback(
    (nodeIds: string[], editing: boolean) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (!nodeIds.includes(nd.id) || nd.type !== 'custom') return nd
          else {
            return {
              ...nd,
              data: {
                ...nd.data,
                editing,
              },
            }
          }
        })
      })
    },
    [setNodes]
  )

  const selectNodes = useCallback(
    (nodeIds: string[]) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (!nodeIds.includes(nd.id))
            return {
              ...nd,
              selected: false,
            }
          else
            return {
              ...nd,
              selected: true,
            }
        })
      })
    },
    [setNodes]
  )

  // ! node right click
  const handleNodeContextMenu = useCallback((e: BaseSyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const selectNodeAndEdges = useCallback(
    (node: Node) => {
      setNodes((nds: Node[]) => {
        return nds.map((nd: Node) => {
          if (nd.id === node.id)
            return {
              ...nd,
              selected: true,
            }
          else if (nd.id !== node.id && nd.type === 'custom')
            return {
              ...nd,
              selected: false,
            }
          else return nd
        })
      })

      setEdges((eds: Edge[]) => {
        return eds.map((ed: Edge) => {
          if (ed.source === node.id || ed.target === node.id)
            return {
              ...ed,
              selected: true,
            }
          else return ed
        })
      })
    },
    [setEdges, setNodes]
  )

  const handleNodeClick = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      // select the node and all its edges
      selectNodeAndEdges(node)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    [selectNodeAndEdges]
  )

  const handleNodeDoubleClick = useCallback(
    (e: BaseSyntheticEvent, node: Node) => {
      // e.preventDefault()
      // e.stopPropagation()
      // if (node.type === 'custom') doSetNodesEditing([node.id], true)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    []
  )

  const handleNodeDragStart = useCallback(
    (e: MouseEvent, node: Node) => {
      // anyNodeDragging.current = true
      selectNodeAndEdges(node)
      initialSelectItem.current = {
        selected: true,
        type: 'node',
        id: node.id,
      }
    },
    [selectNodeAndEdges]
  )

  const handleNodeDragStop = useCallback((e: MouseEvent, node: Node) => {
    // anyNodeDragging.current = false
    // selectNodeAndEdges(node)
  }, [])

  /* -------------------------------------------------------------------------- */

  // ! drag and drop from tokens

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()

      const token = JSON.parse(
        e.dataTransfer.getData(`application/${useTokenDataTransferHandle}`)
      ) as EntityType

      // check if the dropped element is valid
      if (typeof token === 'undefined' || !token || !token.value) {
        return
      }

      const position = thisReactFlowInstance.project({
        x: e.clientX,
        y: e.clientY,
      })

      // add by drop tokens
      customAddNodes(
        addNodes,
        selectNodes,
        position.x - hardcodedNodeSize.width / 2,
        position.y - hardcodedNodeSize.height / 2,
        {
          label: `${token.value}`,
          select: false,
          editing: false,
          styleBackground: styles.nodeColorDefaultWhite,
          toFitView: false,
          fitView: undefined,
        }
      )
    },
    [addNodes, selectNodes, thisReactFlowInstance]
  )

  /* -------------------------------------------------------------------------- */
  // ! edge

  // build new nodes on drag out
  /*
  const onConnectStart = useCallback(
    (_: MouseEvent, { nodeId, handleId }: OnConnectStartParams) => {
      currentConnectingNode.current.id = nodeId || ''
      currentConnectingNode.current.sourceHandleId = handleId || ''
    },
    []
  )
  */
  const onConnectStart = useCallback(
    (_: MouseEvent, { nodeId, handleId }: OnConnectStartParams) => {},
    []
  )

  /*
  const onConnectEnd = useCallback(
    (event: any) => {
      const targetIsPane = (event.target as HTMLElement).classList.contains(
        'react-flow__pane'
      )

      // ! drop to an empty space
      if (targetIsPane && reactFlowWrapper.current) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const { top, left } = (
          reactFlowWrapper.current as HTMLElement
        ).getBoundingClientRect()
        const { x, y, zoom } = getViewport()
        const { width: nodeWidth, height: nodeHeight } = hardcodedNodeSize

        // add by drop edge
        const { nodeId, targetHandleId } = customAddNodes(
          addNodes,
          selectNodes,
          event.clientX / zoom - left - x / zoom - nodeWidth / 2,
          event.clientY / zoom - top - y / zoom - nodeHeight / 2,
          {
            label: '',
            select: true,
            editing: false,
            styleBackground: styles.nodeColorDefaultWhite,
            toFitView: false,
            fitView: fitView,
          }
        )
        setEdges(eds =>
          eds.concat(
            getNewEdge({
              source: currentConnectingNode.current.id,
              sourceHandle: currentConnectingNode.current.sourceHandleId,
              target: nodeId,
              targetHandle: targetHandleId,
            })
          )
        )

        // setTimeout(() => {
        //   doSetNodeEditing([nodeId], true)
        // }, 50)
      }
    },
    [getViewport, addNodes, selectNodes, fitView, setEdges]
  )
  */
  const onConnectEnd = useCallback((event: any) => {}, [])

  const doSetEdgesEditing = useCallback(
    (edgeIds: string[], editing: boolean) => {
      setEdges((eds: Edge[]) => {
        return eds.map((ed: Edge) => {
          if (!edgeIds.includes(ed.id)) return ed
          else {
            return {
              ...ed,
              data: {
                ...ed.data,
                editing,
              },
            }
          }
        })
      })
    },
    [setEdges]
  )

  const handleEdgeClick = useCallback((e: MouseEvent, edge: Edge) => {
    initialSelectItem.current = {
      selected: true,
      type: 'edge',
      id: edge.id,
    }
  }, [])

  const handleEdgeDoubleClick = useCallback(
    (e: BaseSyntheticEvent, edge: Edge) => {
      // e.preventDefault()
      // e.stopPropagation()
      // setEdges((nds: Edge[]) => {
      //   return nds.map((nd: Edge) => {
      //     if (edge.id !== nd.id) return nd
      //     else {
      //       return {
      //         ...nd,
      //         data: {
      //           ...nd.data,
      //           editing: true,
      //         },
      //       }
      //     }
      //   })
      // })
      initialSelectItem.current = {
        selected: true,
        type: 'edge',
        id: edge.id,
      }
    },
    []
  )

  /* -------------------------------------------------------------------------- */
  // ! pane

  // const lastClickTime = useRef<number | null>(null)
  const handlePaneClick = useCallback(
    (e: MouseEvent) => {
      // if any node is editing
      if (nodes.some(nd => nd.data?.editing))
        setNodes((nds: Node[]) => {
          return nds.map((nd: Node) => {
            if (!nd.data.editing || nd.type !== 'custom') return nd
            return {
              ...nd,
              data: {
                ...nd.data,
                editing: false,
              } as CustomNodeData,
            } as Node
          })
        })

      handleSetSyncedCoReferenceOriginRanges([] as OriginRange[])

      initialSelectItem.current = {
        selected: false,
        type: 'node',
        id: '',
      }

      // check if it's a double click
      /*
      if (lastClickTime.current) {
        const now = performance.now()
        const delta = now - lastClickTime.current

        if (delta < 300) {
          // double click
          e.preventDefault()
          e.stopPropagation()

          // add by double click
          const { x, y, zoom } = getViewport()
          const { width: nodeWidth, height: nodeHeight } = hardcodedNodeSize

          // add by double click
          customAddNodes(
            addNodes,
            selectNodes,
            e.clientX / zoom - x / zoom - nodeWidth / 2,
            e.clientY / zoom - y / zoom - nodeHeight / 2,
            {
              label: '',
              select: true,
              editing: false,
              styleBackground: styles.nodeColorDefaultWhite,
              toFitView: false,
              fitView: fitView,
            }
          )
        }
      }
      lastClickTime.current = performance.now()
      */
    },
    [handleSetSyncedCoReferenceOriginRanges, nodes, setNodes]
  )

  // const handlePaneContextMenu = useCallback((e: BaseSyntheticEvent) => {
  //   e.preventDefault()
  //   e.stopPropagation()
  // }, [])

  /* -------------------------------------------------------------------------- */
  // ! chat

  const handleNodeMouseEnter = useCallback(
    (e: MouseEvent, node: Node) => {
      const { data } = node
      const {
        generated: { originRanges },
      } = data as CustomNodeData
      handleSetSyncedCoReferenceOriginRanges(originRanges)
    },
    [handleSetSyncedCoReferenceOriginRanges]
  )

  const handleNodeMouseLeave = useCallback(
    (e: MouseEvent, node: Node) => {
      handleSetSyncedCoReferenceOriginRanges(
        nodes
          .filter((nd: Node) => nd.selected)
          .map(selectedNode => {
            const node = nodes.find((nd: Node) => nd.id === selectedNode.id)
            if (!node) return null

            const { data } = node
            const {
              generated: { originRanges },
            } = data as CustomNodeData

            return originRanges
          })
          .filter(
            (
              originRanges: OriginRange[] | null
            ): originRanges is OriginRange[] => originRanges !== null
          )
          .flat(1) as OriginRange[]
      )
    },
    [handleSetSyncedCoReferenceOriginRanges, nodes]
  )

  const handleEdgeMouseEnter = useCallback(
    (e: MouseEvent, edge: Edge<CustomEdgeData>) => {
      if (edge.data?.generated?.originRanges)
        handleSetSyncedCoReferenceOriginRanges(
          edge?.data.generated?.originRanges
        )
    },
    [handleSetSyncedCoReferenceOriginRanges]
  )

  const handleEdgeMouseLeave = useCallback(
    (e: MouseEvent, edge: Edge<CustomEdgeData>) => {
      handleSetSyncedCoReferenceOriginRanges(
        edges
          .filter((ed: Edge) => ed.selected)
          .map(selectedEdge => {
            const edge = edges.find(ed => ed.id === selectedEdge.id)
            if (!edge) return null

            return edge.data?.generated?.originRanges ?? null
          })
          .filter(
            (
              originRanges: OriginRange[] | null
            ): originRanges is OriginRange[] => !!originRanges
          )
          .flat(1) as OriginRange[]
      )
    },
    [edges, handleSetSyncedCoReferenceOriginRanges]
  )

  const [modelForMagic, setModelForMagic] = useState<ModelForMagic>('gpt-4')

  const handleScroll = useCallback((e: any) => {}, [])

  return (
    <FlowContext.Provider
      value={{
        metaPressed,
        model: modelForMagic,
        selectedComponents: selectedComponents,
        initialSelectItem: initialSelectItem.current,
        doSetNodesEditing,
        doSetEdgesEditing,
        selectNodes,
        setModel: setModelForMagic,
      }}
    >
      <div
        className={`react-flow-wrapper${
          generatingFlow ? ' generating-flow' : ''
        }`}
        ref={reactFlowWrapper}
      >
        <ReactFlow
          className={`${metaPressed ? 'flow-meta-pressed' : ''}`}
          // basic
          defaultViewport={defaultViewport}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart as OnConnectStart}
          onConnectEnd={onConnectEnd as OnConnectEnd}
          // flow view
          style={reactFlowWrapperStyle}
          fitView={false}
          attributionPosition="bottom-right"
          maxZoom={1}
          // edge specs
          elevateEdgesOnSelect={false}
          defaultEdgeOptions={customEdgeOptions} // adding a new edge with this configs without notice
          connectionLineComponent={CustomConnectionLine}
          connectionLineStyle={customConnectionLineStyle}
          // viewport control
          panOnScroll={false}
          zoomOnScroll={false}
          preventScrolling={false}
          selectionOnDrag={false}
          panOnDrag={[0, 1, 2]}
          selectionMode={SelectionMode.Full}
          // ! actions
          onScroll={handleScroll}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onEdgeClick={handleEdgeClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onPaneClick={handlePaneClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          // onPaneContextMenu={handlePaneContextMenu}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
        >
          <CustomMarkerDefs
            markerOptions={
              {
                color: styles.edgeColorStrokeSelected,
              } as EdgeMarker
            }
          />
          <CustomMarkerDefs
            markerOptions={
              {
                color: styles.edgeColorStrokeExplained,
              } as EdgeMarker
            }
          />
          {/* <MiniMap
            position={'bottom-left'}
            pannable={true}
            // nodeStrokeColor={n => {
            //   if (n.selected) return styles.edgeColorStrokeSelected
            //   else return 'none'
            // }}
            nodeColor={n => {
              switch (n.type) {
                case 'custom':
                  if (n.data?.editing) return `#ff06b7aa`
                  if (n.selected) {
                    if (n.extent === 'parent')
                      return `${styles.edgeColorStrokeSelected}aa`
                    else return `${styles.edgeColorStrokeSelected}aa`
                  }
                  break

                case 'magic':
                  if (n.selected) return `${styles.edgeColorStrokeExplained}aa`
                  break

                case 'group':
                  if (n.selected) return `${styles.edgeColorStrokeExplained}66`
                  break

                default:
                  break
              }
              return '#cfcfcf'
            }}
            // nodeStrokeColor={n => {
            //   if (n.extent === 'parent' && n.selected)
            //     return `${styles.edgeColorStrokeSelected}`
            //   return 'none'
            // }}
          /> */}
          <CustomControls
            nodes={nodes}
            edges={edges}
            selectedComponents={selectedComponents}
            undoTime={undoTime}
            redoTime={redoTime}
            canUndo={canUndo}
            canRedo={canRedo}
            flowWrapperRef={reactFlowWrapper}
            // notesOpened={notesOpened}
            // setNotesOpened={setNotesOpened}
          />
          <Background color="#008ddf" />
        </ReactFlow>
      </div>
    </FlowContext.Provider>
  )
}

const ReactFlowComponent = memo(({ id }: { id: string }) =>
  //   {
  //   answerRelationships,
  // }: {
  //   answerRelationships: {
  //     answerObjectId: string
  //     origin: OriginRange[]
  //     relationships: AnswerRelationshipObject[]
  //   }[]
  // }
  {
    /* -------------------------------------------------------------------------- */
    // ! notebook
    // const notebookRef = useRef<HTMLDivElement>(null)

    // try to retrieve notes from session storage
    /*
  const notesFromSessionStorage = sessionStorage.getItem(
    useSessionStorageNotesHandle
  )
  const notesFromSessionStorageParsed = notesFromSessionStorage
    ? JSON.parse(notesFromSessionStorage)
    : null

  const [notes] = useState<Note[]>(notesFromSessionStorageParsed?.notes || [])
  const [notesOpened] = useState<boolean>(
    notesFromSessionStorageParsed?.notesOpened || false
  )
  */

    // * save notes
    /*
  useEffect(() => {
    // save notes to session storage
    sessionStorage.setItem(
      useSessionStorageNotesHandle,
      JSON.stringify({
        notes,
        notesOpened,
      })
    )
  }, [notes, notesOpened])
  */

    // const spotlightNotes = useCallback(async () => {
    //   if (notesOpened) return
    //   if (notebookRef.current) {
    //     await sleep(5)
    //     notebookRef.current.style.transform = 'translateX(-15rem)'
    //     await sleep(750)
    //     notebookRef.current.style.transform = 'translateX(0)'
    //   }
    // }, [notesOpened])

    // const addNote = useCallback(
    //   (note: Note) => {
    //     if (note.type === 'magic') {
    //       if (
    //         notes.find(
    //           n =>
    //             n.data.magicNodeId === note.data.magicNodeId &&
    //             n.data.response === note.data.response
    //         )
    //       )
    //         return

    //       setNotes(notes.concat(note))
    //       if (!notesOpened) spotlightNotes()
    //     }
    //   },
    //   [notes, notesOpened, spotlightNotes]
    // )

    // const deleteNote = useCallback(
    //   (noteId: string) => {
    //     const newNotes = notes.filter(n => n.id !== noteId)
    //     setNotes(newNotes)

    //     if (newNotes.length === 0)
    //       setTimeout(() => setNotesOpened(false), slowInteractionWaitTimeout)
    //   },
    //   [notes]
    // )
    /* -------------------------------------------------------------------------- */

    return (
      <>
        {/* <Flow notesOpened={notesOpened} setNotesOpened={setNotesOpened} /> */}
        <Flow key={`flow-${id}`} />
        {/* <NotebookContext.Provider
        value={{
          notes,
          setNotes,
          notesOpened,
          setNotesOpened,
          addNote,
          deleteNote,
        }}
      >
        <NoteBook notebookRef={notebookRef} />
      </NotebookContext.Provider> */}
      </>
    )
  }, isEqual)

export default ReactFlowComponent
