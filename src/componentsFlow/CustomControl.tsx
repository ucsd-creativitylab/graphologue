import React, { memo, useCallback, useContext } from 'react'
import { ControlButton, Controls, Edge, Node, useReactFlow } from 'reactflow'

import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded'
import AlignHorizontalLeftRoundedIcon from '@mui/icons-material/AlignHorizontalLeftRounded'

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

import { FlowContext } from '../components/Contexts'
import { InterchangeContext } from '../components/Interchange'
import {
  AnswerBlockContext,
  ReactFlowObjectContext,
} from '../components/Answer'
import { makeFlowTransition } from '../utils/flowChangingTransition'

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
  flowWrapperRef: React.RefObject<HTMLDivElement>
}

/**
 * Controls in each diagram canvas.
 */
export const CustomControls = memo((_: CustomControlsProps) => {
  const { setViewport, fitView, fitBounds, getViewport, getNodes, addNodes } =
    useReactFlow()
  const { selectNodes } = useContext(FlowContext)
  const {
    // questionAndAnswer,
    handleSwitchSaliency,
  } = useContext(InterchangeContext)
  const { handleOrganizeNodes } = useContext(AnswerBlockContext)
  const { generatingFlow } = useContext(ReactFlowObjectContext)

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
      window.innerHeight / zoom / 2 - y / zoom - height / zoom / 2,
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
    makeFlowTransition()
    handleSwitchSaliency()
  }, [handleSwitchSaliency])

  return (
    <Controls
      showZoom={false}
      showInteractive={false}
      showFitView={false}
      position="top-right"
    >
      {generatingFlow && (
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
    </Controls>
  )
})
