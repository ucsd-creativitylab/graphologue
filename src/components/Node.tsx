import { memo } from 'react'
import {
  Handle,
  Position,
  useStore,
  FitView,
  Instance,
  Node,
  ReactFlowState,
  NodeProps,
} from 'reactflow'
import { transitionDuration, viewFittingPadding } from '../constants'
import randomPhrases from './randomPhrases'
import { SuperTextEditor } from './SuperTextEditor'
import { getHandleId, getNodeId } from './utils'

export type CustomNodeData = {
  label: string
  sourceHandleId: string
  targetHandleId: string
  metaPressed: boolean
  // states
  editing: boolean
}

/* -------------------------------------------------------------------------- */

const connectionNodeIdSelector = (state: ReactFlowState) =>
  state.connectionNodeId

export const CustomNode = memo(
  ({ id, data, xPos, yPos, selected }: NodeProps) => {
    const { label, sourceHandleId, targetHandleId, metaPressed, editing } =
      data as CustomNodeData
    const connectionNodeId = useStore(connectionNodeIdSelector)

    // is the node being source of an ongoing new connection?
    const isTarget = connectionNodeId && connectionNodeId !== id

    return (
      <div
        className={`customNodeBody${
          metaPressed ? ' customNodeMetaPressed' : ''
        }`}
      >
        <Handle
          id={targetHandleId}
          className="customHandle targetHandle"
          position={Position.Right}
          type="target"
          style={{
            zIndex: isTarget ? 3 : 1,
          }}
        />
        <Handle
          id={sourceHandleId}
          className="customHandle sourceHandle"
          position={Position.Left}
          type="source"
          style={{
            zIndex: 2,
          }}
        />
        <div
          className={`customNodeContent${
            isTarget ? ' customNodeContentTarget' : ''
          }`}
          style={{
            zIndex: metaPressed ? 0 : 4,
          }}
        >
          <SuperTextEditor
            target="node"
            targetId={id}
            content={label}
            editable={editing}
          />
        </div>
      </div>
    )
  }
)

/* -------------------------------------------------------------------------- */
// ! add node

export const customAddNodes = (
  addNodes: Instance.AddNodes<Node>,
  x: number,
  y: number,
  label = randomPhrases(),
  fitView?: FitView,
  toFitView?: boolean
) => {
  const newNode = {
    id: getNodeId(),
    type: 'custom', // ! use custom node
    data: {
      label: '',
      sourceHandleId: getHandleId(),
      targetHandleId: getHandleId(),
      metaPressed: false,
      editing: true,
    } as CustomNodeData,
    position: { x, y },
    selected: true,
    width: 160, // ! are you sure?
    height: 43, // ! are you sure?
  } as Node

  addNodes(newNode)

  setTimeout(() => {
    if (toFitView && fitView)
      fitView({
        padding: viewFittingPadding,
        duration: transitionDuration,
      })
  }, 0)
}
