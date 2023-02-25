import React, { memo, useCallback } from 'react'
import { ControlButton, Controls, Edge, Node, useReactFlow } from 'reactflow'

import AddRoundedIcon from '@mui/icons-material/AddRounded'
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import LaptopChromebookRoundedIcon from '@mui/icons-material/LaptopChromebookRounded'
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
import SwipeRoundedIcon from '@mui/icons-material/SwipeRounded'
import KeyboardOptionKeyRoundedIcon from '@mui/icons-material/KeyboardOptionKeyRounded'
// import MouseRoundedIcon from '@mui/icons-material/MouseRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import UndoRoundedIcon from '@mui/icons-material/UndoRounded'
import RedoRoundedIcon from '@mui/icons-material/RedoRounded'
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded'
import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'

import { customAddNodes } from './Node'
import {
  adjustNewNodePositionAvoidIntersections,
  downloadData,
  getGraphBounds,
} from '../utils/utils'
import {
  hardcodedNodeSize,
  terms,
  transitionDuration,
  viewFittingPadding,
} from '../constants'
import { magicExplain } from '../utils/magicExplain'

import defaultExample from '../examples/default.json'

type CustomControlsProps = {
  nodes: Node[]
  edges: Edge[]
  selectedComponents: {
    nodes: Node[]
    edges: Edge[]
  }
  undoTime: () => void
  redoTime: () => void
  canRedo: boolean
  canUndo: boolean
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
  }: CustomControlsProps) => {
    const {
      setViewport,
      fitView,
      fitBounds,
      getViewport,
      getNodes,
      addNodes,
      addEdges,
      deleteElements,
      toObject,
    } = useReactFlow()

    const _returnToOrigin = useCallback(() => {
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: transitionDuration })
    }, [setViewport])

    /* -------------------------------------------------------------------------- */
    // !
    const handleSetViewport = useCallback(() => {
      const nodes = getNodes()

      if (!nodes.length) return _returnToOrigin()

      const graphBonds = getGraphBounds(nodes)
      fitBounds(graphBonds, {
        padding: viewFittingPadding,
        duration: transitionDuration,
      })
    }, [_returnToOrigin, fitBounds, getNodes])

    // !
    const handleAddNode = useCallback(() => {
      const { x, y, zoom } = getViewport()
      const { width, height } = hardcodedNodeSize

      // add nodes at the center of the viewport
      const { adjustedX, adjustedY } = adjustNewNodePositionAvoidIntersections(
        getNodes(),
        window.innerWidth / zoom / 2 - x / zoom - width / zoom / 2,
        window.innerHeight / zoom / 2 - y / zoom - height / zoom / 2
      )
      customAddNodes(addNodes, adjustedX, adjustedY, {
        label: '',
        editing: false,
        fitView,
        toFitView: true,
      })
    }, [addNodes, fitView, getNodes, getViewport])

    // !
    const handleClearCanvas = useCallback(() => {
      // remove all nodes
      deleteElements({ nodes: getNodes() })

      return _returnToOrigin()
    }, [_returnToOrigin, deleteElements, getNodes])

    /* -------------------------------------------------------------------------- */

    // ! explain

    const handleExplain = useCallback(() => {
      magicExplain(
        nodes,
        {
          edges: selectedComponents.edges,
          nodes: selectedComponents.nodes.filter(
            // you cannot explain a magic node
            (node: Node) => node.type !== 'magic'
          ),
        },
        addNodes,
        fitView
      )
    }, [addNodes, fitView, nodes, selectedComponents])

    /* -------------------------------------------------------------------------- */

    const handleSaveFile = useCallback(() => {
      downloadData(
        toObject(),
        // 'graphologue.json' with current time
        `graphologue-${new Date().toJSON().slice(0, 10)}.json`
      )
    }, [toObject])

    /* -------------------------------------------------------------------------- */

    // ! load example

    const handleLoadExample = useCallback(async () => {
      if (defaultExample) {
        const { nodes, edges } = defaultExample

        // TODO instead of clearing the canvas, preserve the current nodes and add example nodes on the side
        // clear the canvas
        handleClearCanvas()

        // add nodes
        addNodes(nodes as Node[])

        // add edges
        addEdges(edges as Edge[])

        // fit view
        setTimeout(
          () =>
            fitView({
              padding: viewFittingPadding,
              duration: transitionDuration,
            }),
          0
        )
      }
    }, [addEdges, addNodes, fitView, handleClearCanvas])

    /* -------------------------------------------------------------------------- */

    const isEmptyCanvas = nodes.length === 0
    // you cannot explain a magic node
    const anyCustomNodesOrEdgesSelected =
      selectedComponents.nodes.some(
        node => node.type !== 'magic' && node.selected
      ) || selectedComponents.edges.length > 0

    return (
      <Controls
        showZoom={false}
        showInteractive={false}
        showFitView={false}
        position="top-left"
      >
        <ControlButton className="title-button" onClick={handleSetViewport}>
          <span id="title">Graphologue</span>
          <ControlButtonTooltip>
            <TooltipLine>
              <FitScreenRoundedIcon />
              <span>fit view</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton onClick={handleAddNode}>
          <AddRoundedIcon />
          <span>add node</span>
        </ControlButton>

        <ControlButton
          className={isEmptyCanvas ? 'disabled-control-button' : ''}
          onClick={handleClearCanvas}
        >
          <GridOnRoundedIcon />
          <span>clear</span>
        </ControlButton>

        <ControlButton
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
              <span>ask {terms.gpt}</span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton onClick={() => {}}>
          <FormatListBulletedRoundedIcon />
          <span>notes</span>
          <ControlButtonTooltip>
            <TooltipLine>coming soon</TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton
          className={canUndo ? '' : 'disabled-control-button'}
          onClick={undoTime}
        >
          <UndoRoundedIcon />
          <ControlButtonTooltip>
            <TooltipLine>
              {/* <KeyboardCommandKeyRoundedIcon /> + z */}
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
              {/* <KeyboardCommandKeyRoundedIcon /> + x */}
              redo
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton onClick={handleSaveFile}>
          <FileDownloadRoundedIcon />
          <span>save</span>
          {/* <ControlButtonTooltip>
            <TooltipLine>save as a file</TooltipLine>
          </ControlButtonTooltip> */}
        </ControlButton>

        <ControlButton onClick={handleLoadExample}>
          <TheatersRoundedIcon />
          <span>examples</span>
          {/* <ControlButtonTooltip>
            <TooltipLine>coming soon</TooltipLine>
          </ControlButtonTooltip> */}
        </ControlButton>

        <ControlButton className="tips-button">
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
                press option key to <strong>connect</strong>
              </span>
            </TooltipLine>
            <TooltipLine>
              <EditRoundedIcon />
              <span>
                double click to <strong>edit text</strong>
              </span>
            </TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>
      </Controls>
    )
  }
)

const ControlButtonTooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="control-button-tooltip pointer-events-no">{children}</div>
)

const TooltipLine = ({ children }: { children: React.ReactNode }) => (
  <div className="tooltip-line">{children}</div>
)
