import { useCallback } from 'react'
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

import { customAddNodes } from './Node'
import { getGraphBounds } from './utils'
import { transitionDuration } from '../constants'

type CustomControlsProps = {
  fitView: FitView
  fitBounds: FitBounds
  addNodes: Instance.AddNodes<Node>
  getNodes: Instance.GetNodes<undefined>
  setViewport: SetViewport
  getViewport: GetViewport
}
export const CustomControls = (props: CustomControlsProps) => {
  const handleSetViewport = useCallback(() => {
    const nodes = props.getNodes()

    if (!nodes.length)
      return props.setViewport(
        { x: 0, y: 0, zoom: 1 },
        { duration: transitionDuration }
      )

    const graphBonds = getGraphBounds(nodes)
    props.fitBounds(graphBonds, {
      padding: 0.1,
      duration: transitionDuration,
    })
  }, [props])

  const handleAddNode = useCallback(() => {
    const { x, y, zoom } = props.getViewport()

    // add nodes at the center of the viewport
    // TODO adjust the location of the new node by its size, so that it appears at the center of the viewport
    customAddNodes(
      props.addNodes,
      window.innerWidth / zoom / 2 - x / zoom,
      window.innerHeight / zoom / 2 - y / zoom
    )
  }, [props])

  return (
    <Controls
      showZoom={false}
      showInteractive={false}
      showFitView={false}
      position="top-center"
    >
      <ControlButton className="title-button" onClick={handleSetViewport}>
        <span id="title">Graphologue</span>
      </ControlButton>

      <ControlButton onClick={handleAddNode}>
        {/* <AddBoxIcon /> */}
        <span>add node</span>
      </ControlButton>
    </Controls>
  )
}
