import React, { memo, useCallback, useContext, useRef } from 'react'
import { ControlButton, Controls, Edge, Node, useReactFlow } from 'reactflow'

// import AddRoundedIcon from '@mui/icons-material/AddRounded'
// import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded'
// import StarRoundedIcon from '@mui/icons-material/StarRounded'
// import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
// import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
// import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
// import LaptopChromebookRoundedIcon from '@mui/icons-material/LaptopChromebookRounded'
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
// import SwipeRoundedIcon from '@mui/icons-material/SwipeRounded'
// import KeyboardOptionKeyRoundedIcon from '@mui/icons-material/KeyboardOptionKeyRounded'
// import MouseRoundedIcon from '@mui/icons-material/MouseRounded'
// import EditRoundedIcon from '@mui/icons-material/EditRounded'
// import UndoRoundedIcon from '@mui/icons-material/UndoRounded'
// import RedoRoundedIcon from '@mui/icons-material/RedoRounded'
// import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
// import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded'
// import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded'
import AlignHorizontalLeftRoundedIcon from '@mui/icons-material/AlignHorizontalLeftRounded'
////
// import SignalWifi1BarRoundedIcon from '@mui/icons-material/SignalWifi1BarRounded'
// import SignalWifi3BarRoundedIcon from '@mui/icons-material/SignalWifi3BarRounded'
// import SignalWifi4BarRoundedIcon from '@mui/icons-material/SignalWifi4BarRounded'

import { customAddNodes } from './Node'
import {
  adjustNewNodePositionAvoidIntersections,
  getGraphBounds,
} from '../utils/utils'
import {
  hardcodedNodeSize,
  styles,
  transitionDuration,
  viewFittingOptions,
} from '../constants'

// import defaultExample from '../examples/default.json'
import { FlowContext } from '../components/Contexts'
import { InterchangeContext } from '../components/Interchange'
import { AnswerBlockContext } from '../components/Answer'

type CustomControlsProps = {
  nodes: Node[]
  edges: Edge[]
  selectedComponents: {
    nodes: string[]
    edges: string[]
  }
  undoTime: () => void
  redoTime: () => void
  canRedo: boolean
  canUndo: boolean
  // notesOpened: boolean
  // setNotesOpened: (notesOpened: boolean) => void
  flowWrapperRef: React.RefObject<HTMLDivElement>
}
export const CustomControls = memo(
  ({
    nodes,
    edges,
    selectedComponents,
    undoTime,
    redoTime,
    canUndo,
    canRedo,
    flowWrapperRef,
  }: // notesOpened,
  // setNotesOpened,
  CustomControlsProps) => {
    const {
      setViewport,
      fitView,
      fitBounds,
      getViewport,
      getNodes,
      addNodes,
      // addEdges,
      // deleteElements,
      // toObject,
    } = useReactFlow()
    // const { model, selectNodes, setModel } = useContext(FlowContext)
    const { selectNodes } = useContext(FlowContext)
    const {
      questionAndAnswer: {
        modelStatus: { modelParsing },
      },
      handleSwitchSaliency,
    } = useContext(InterchangeContext)
    const { handleOrganizeNodes } = useContext(AnswerBlockContext)

    const flowChangingTimer = useRef<NodeJS.Timer | null>(null)

    const _returnToOrigin = useCallback(() => {
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: transitionDuration })
    }, [setViewport])

    /* -------------------------------------------------------------------------- */
    // !
    const handleSetViewport = useCallback(() => {
      const nodes = getNodes()

      if (!nodes.length) return _returnToOrigin()

      const graphBonds = getGraphBounds(nodes)
      fitBounds(graphBonds, viewFittingOptions)
    }, [_returnToOrigin, fitBounds, getNodes])

    // !
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleAddNode = useCallback(() => {
      const { x, y, zoom } = getViewport()
      const { width, height } = hardcodedNodeSize

      // add nodes at the center of the viewport
      const { adjustedX, adjustedY } = adjustNewNodePositionAvoidIntersections(
        getNodes(),
        window.innerWidth / zoom / 2 - x / zoom - width / zoom / 2,
        window.innerHeight / zoom / 2 - y / zoom - height / zoom / 2
      )
      customAddNodes(addNodes, selectNodes, adjustedX, adjustedY, {
        label: '',
        select: true,
        editing: false,
        styleBackground: styles.nodeColorDefaultWhite,
        fitView,
        toFitView: true,
      })
    }, [addNodes, fitView, getNodes, getViewport, selectNodes])

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleSaliency = useCallback(() => {
      // using timeout, set the className of flowWrapperRef to .changing-flow
      // and remove it after 700ms

      if (flowChangingTimer.current) {
        clearTimeout(flowChangingTimer.current)
      }

      flowChangingTimer.current = setTimeout(() => {
        if (flowWrapperRef.current) {
          flowWrapperRef.current.classList.remove('changing-flow')
        }
      }, 700)

      if (flowWrapperRef.current) {
        flowWrapperRef.current.classList.add('changing-flow')
      }

      handleSwitchSaliency()
    }, [flowWrapperRef, handleSwitchSaliency])

    // !
    // const handleClearCanvas = useCallback(() => {
    //   // remove all nodes
    //   deleteElements({ nodes: getNodes() })

    //   return _returnToOrigin()
    // }, [_returnToOrigin, deleteElements, getNodes])

    // !
    // const handleChangeModel = useCallback(() => {
    //   setModel(model === 'gpt-4' ? 'gpt-3.5-turbo' : 'gpt-4')
    // }, [model, setModel])

    /* -------------------------------------------------------------------------- */

    // ! explain

    // const handleExplain = useCallback(() => {
    //   magicExplain(
    //     nodes,
    //     edges,
    //     {
    //       edges: selectedComponents.edges,
    //       nodes: selectedComponents.nodes.filter(
    //         // you cannot explain a magic node
    //         (nodeId: string) => {
    //           const node = nodes.find(node => node.id === nodeId)
    //           return node && node.type !== 'magic'
    //         }
    //       ),
    //     },
    //     addNodes,
    //     selectNodes,
    //     fitView
    //   )
    // }, [
    //   addNodes,
    //   edges,
    //   fitView,
    //   nodes,
    //   selectNodes,
    //   selectedComponents.edges,
    //   selectedComponents.nodes,
    // ])

    /* -------------------------------------------------------------------------- */

    // ! notebook

    // const handleToggleNotebook = useCallback(() => {
    //   setNotesOpened(!notesOpened)
    // }, [notesOpened, setNotesOpened])

    /* -------------------------------------------------------------------------- */

    // const handleSaveFile = useCallback(() => {
    //   downloadData(
    //     toObject(),
    //     // 'graphologue.json' with current time
    //     `graphologue-${new Date().toJSON().slice(0, 10)}.json`
    //   )
    // }, [toObject])

    /* -------------------------------------------------------------------------- */

    // ! load example

    // const handleLoadExample = useCallback(async () => {
    //   if (defaultExample) {
    //     const { nodes, edges } = defaultExample

    //     // TODO instead of clearing the canvas, preserve the current nodes and add example nodes on the side
    //     // clear the canvas
    //     handleClearCanvas()

    //     // add nodes
    //     addNodes(nodes as Node[])

    //     // add edges
    //     addEdges(edges as Edge[])

    //     // fit view
    //     setTimeout(() => fitView(viewFittingOptions), 0)
    //   }
    // }, [addEdges, addNodes, fitView, handleClearCanvas])

    /* -------------------------------------------------------------------------- */

    // const isEmptyCanvas = nodes.length === 0
    // // you cannot explain a magic node
    // const anyCustomNodesOrEdgesSelected =
    //   selectedComponents.nodes.some(nodeId => {
    //     const node = nodes.find(node => node.id === nodeId)
    //     return node && node.type !== 'magic' && node.selected
    //   }) || selectedComponents.edges.length > 0

    /*
    let saliencyTip = ''
    let saliencyComponent = <></>
    const saliencyComponentStyle: React.CSSProperties = {
      transform: 'rotate(180deg)',
    }
    if (saliencyFilter === 'high') {
      saliencyTip = 'showing only the most important relationships'
      saliencyComponent = (
        <SignalWifi1BarRoundedIcon style={saliencyComponentStyle} />
      )
    } else if (saliencyFilter === 'low') {
      saliencyTip = 'showing all relationships'
      saliencyComponent = (
        <SignalWifi4BarRoundedIcon style={saliencyComponentStyle} />
      )
    }
    */

    return (
      <Controls
        showZoom={false}
        showInteractive={false}
        showFitView={false}
        position="top-right"
      >
        {/* <ControlButton className="title-button" onClick={handleSetViewport}>
          <span id="title">Graphologue</span>
          <ControlButtonTooltip>
            <TooltipLine>
              <FitScreenRoundedIcon />
              <span>fit view</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {modelParsing && (
          <ControlButton className="tips-button">
            <HourglassTopRoundedIcon className="control-button-tips-icon loading-icon" />
            <span className="control-button-processing">still processing</span>
          </ControlButton>
        )}

        <ControlButton onClick={handleSetViewport}>
          <FitScreenRoundedIcon />
          <span>fit view</span>
        </ControlButton>

        <ControlButton onClick={handleOrganizeNodes}>
          <AlignHorizontalLeftRoundedIcon />
          <span>align nodes</span>
        </ControlButton>

        {/* <ControlButton onClick={handleSaliency}>
          {saliencyComponent}
          <span>saliency</span>

          <ControlButtonTooltip>
            <TooltipLine>
              <span>{saliencyTip}</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {/* <ControlButton onClick={handleAddNode}>
          <AddRoundedIcon />
          <span>add node</span>
        </ControlButton> */}

        {/* <ControlButton
          className={isEmptyCanvas ? 'disabled-control-button' : ''}
          onClick={handleClearCanvas}
        >
          <GridOnRoundedIcon />
          <span>clear</span>
        </ControlButton> */}

        {/* <ControlButton onClick={handleChangeModel}>
          {model === 'gpt-4' ? <StarRoundedIcon /> : <SpeedRoundedIcon />}
          {model === 'gpt-4' ? <span>smarter</span> : <span>faster</span>}

          <ControlButtonTooltip>
            <TooltipLine>
              <span>using {terms[model]}</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {/* <ControlButton
          className={
            'explain-button' +
            (!anyCustomNodesOrEdgesSelected ? ' disabled-control-button' : '')
          }
          onClick={handleExplain}
        >
          <AutoFixHighRoundedIcon className="control-button-explain-icon" />
          <span>explain</span>
          <ControlButtonTooltip>
            <TooltipLine>
              <span>ask {terms[model]}</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {/* <ControlButton
          onClick={handleToggleNotebook}
          className={notesOpened ? 'button-highlighted' : ''}
        >
          <FormatListBulletedRoundedIcon />
          <span>notes</span>
          <ControlButtonTooltip>
            <TooltipLine>
              {notesOpened ? 'close notebook' : 'open notebook'}
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {/* <ControlButton
          className={canUndo ? '' : ' disabled-control-button'}
          onClick={undoTime}
        >
          <UndoRoundedIcon />
          <ControlButtonTooltip>
            <TooltipLine>
              undo
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton
          className={canRedo ? '' : 'disabled-control-button'}
          onClick={redoTime}
        >
          <RedoRoundedIcon />
          <ControlButtonTooltip>
            <TooltipLine>
              redo
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}

        {/* <ControlButton onClick={handleSaveFile}>
          <FileDownloadRoundedIcon />
          <span>save</span>
        </ControlButton> */}

        {/* <ControlButton onClick={handleLoadExample}>
          <TheatersRoundedIcon />
          <span>examples</span>
        </ControlButton> */}

        {/* <ControlButton className="tips-button">
          <LightbulbRoundedIcon className="control-button-tips-icon" />
          <span className="control-button-tips">tips</span>

          <ControlButtonTooltip>
            <TooltipLine>
              <LaptopChromebookRoundedIcon />
              <span>
                use <strong>Chrome</strong> for best experience
              </span>
            </TooltipLine>
            <TooltipLine>
              <SwipeRoundedIcon />
              <span>
                scroll to <strong>pan around</strong>
              </span>
            </TooltipLine>
            <TooltipLine>
              <KeyboardOptionKeyRoundedIcon />
              <span>
                press option (alt) key to <strong>connect</strong>
              </span>
            </TooltipLine>
            <TooltipLine>
              <EditRoundedIcon />
              <span>
                double click to <strong>edit text</strong>
              </span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton> */}
      </Controls>
    )
  }
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ControlButtonTooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="control-button-tooltip pointer-events-no">{children}</div>
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TooltipLine = ({ children }: { children: React.ReactNode }) => (
  <div className="tooltip-line">{children}</div>
)
