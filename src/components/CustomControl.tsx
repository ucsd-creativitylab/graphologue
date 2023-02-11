import React, { memo, useCallback, useContext } from 'react'
import { ControlButton, Controls, Edge, Node } from 'reactflow'

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
import TheatersRoundedIcon from '@mui/icons-material/TheatersRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'

import { customAddNodes } from './Node'
import { getGraphBounds } from './utils'
import {
  hardcodedNodeSize,
  terms,
  transitionDuration,
  viewFittingPadding,
} from '../constants'
import { FlowContext } from './Contexts'
import { magicExplain } from './magicExplain'

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
      deleteElements,
    } = useContext(FlowContext)

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
      // TODO adjust the location of the new node by its size, so that it appears at the center of the viewport
      customAddNodes(
        addNodes,
        window.innerWidth / zoom / 2 - x / zoom - width / zoom / 2,
        window.innerHeight / zoom / 2 - y / zoom - height / zoom / 2,
        {
          label: '',
          editing: false,
          fitView,
          toFitView: true,
        }
      )
    }, [addNodes, fitView, getViewport])

    // !
    const handleClearCanvas = useCallback(() => {
      // remove all nodes
      deleteElements({ nodes: getNodes() })

      return _returnToOrigin()
    }, [_returnToOrigin, deleteElements, getNodes])

    /* -------------------------------------------------------------------------- */

    // ! explain

    const handleExplain = useCallback(() => {
      magicExplain(selectedComponents)
    }, [selectedComponents])

    /* -------------------------------------------------------------------------- */

    const isEmptyCanvas = nodes.length === 0
    const anyThingSelected =
      selectedComponents.nodes.length > 0 || selectedComponents.edges.length > 0

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
            (!anyThingSelected ? ' disabled-control-button' : '')
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

        <ControlButton
          className={canUndo ? '' : 'disabled-control-button'}
          onClick={undoTime}
        >
          <UndoRoundedIcon />
          <span>undo</span>
          {/* <ControlButtonTooltip>
            <TooltipLine>
              <KeyboardCommandKeyRoundedIcon /> + z
            </TooltipLine>
          </ControlButtonTooltip> */}
        </ControlButton>

        <ControlButton
          className={canRedo ? '' : 'disabled-control-button'}
          onClick={redoTime}
        >
          <RedoRoundedIcon />
          <span>redo</span>
          {/* <ControlButtonTooltip>
            <TooltipLine>
              <KeyboardCommandKeyRoundedIcon /> + x
            </TooltipLine>
          </ControlButtonTooltip> */}
        </ControlButton>

        <ControlButton onClick={() => {}}>
          <TheatersRoundedIcon />
          <span>examples</span>
          <ControlButtonTooltip>
            <TooltipLine>coming soon</TooltipLine>
          </ControlButtonTooltip>
        </ControlButton>

        <ControlButton onClick={() => {}}>
          <FileDownloadRoundedIcon />
          <span>save</span>
          <ControlButtonTooltip>
            <TooltipLine>coming soon</TooltipLine>
          </ControlButtonTooltip>
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
