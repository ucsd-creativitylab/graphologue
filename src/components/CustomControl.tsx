import React, { useCallback } from 'react'
import {
  ControlButton,
  Controls,
  FitBounds,
  FitView,
  GetViewport,
  Instance,
  Node,
  SetViewport,
} from 'reactflow'

import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import LaptopChromebookRoundedIcon from '@mui/icons-material/LaptopChromebookRounded'
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
import SwipeRoundedIcon from '@mui/icons-material/SwipeRounded'
import KeyboardCommandKeyRoundedIcon from '@mui/icons-material/KeyboardCommandKeyRounded'
// import MouseRoundedIcon from '@mui/icons-material/MouseRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'

import { customAddNodes } from './Node'
import { getGraphBounds } from './utils'
import {
  transitionDuration,
  useSessionStorageEdgesHandle,
  useSessionStorageNodesHandle,
} from '../constants'

type CustomControlsProps = {
  fitView: FitView
  fitBounds: FitBounds
  addNodes: Instance.AddNodes<Node>
  getNodes: Instance.GetNodes<undefined>
  setViewport: SetViewport
  getViewport: GetViewport
  deleteElements: Instance.DeleteElements
}
export const CustomControls = (props: CustomControlsProps) => {
  const _returnToOrigin = useCallback(() => {
    props.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: transitionDuration })
  }, [props])

  /* -------------------------------------------------------------------------- */
  // !
  const handleSetViewport = useCallback(() => {
    const nodes = props.getNodes()

    if (!nodes.length) return _returnToOrigin()

    const graphBonds = getGraphBounds(nodes)
    props.fitBounds(graphBonds, {
      padding: 0.1,
      duration: transitionDuration,
    })
  }, [props, _returnToOrigin])

  // !
  const handleAddNode = useCallback(() => {
    const { x, y, zoom } = props.getViewport()

    // add nodes at the center of the viewport
    // TODO adjust the location of the new node by its size, so that it appears at the center of the viewport
    customAddNodes(
      props.addNodes,
      props.getNodes,
      window.innerWidth / zoom / 2 - x / zoom,
      window.innerHeight / zoom / 2 - y / zoom,
      undefined,
      props.fitView,
      true
    )
  }, [props])

  // !
  const handleClearCanvas = useCallback(() => {
    // remove all nodes
    props.deleteElements({ nodes: props.getNodes() })
    // ! clear session storage
    sessionStorage.removeItem(useSessionStorageNodesHandle)
    sessionStorage.removeItem(useSessionStorageEdgesHandle)

    return _returnToOrigin()
  }, [props, _returnToOrigin])

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
        <span>add node</span>
      </ControlButton>

      <ControlButton onClick={handleClearCanvas}>
        <span>clear canvas</span>
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
            <KeyboardCommandKeyRoundedIcon />
            <span>
              press meta key to <strong>connect</strong>
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

const ControlButtonTooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="control-button-tooltip pointer-events-no">{children}</div>
)

const TooltipLine = ({ children }: { children: React.ReactNode }) => (
  <div className="tooltip-line">{children}</div>
)
