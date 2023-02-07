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
import {
  transitionDuration,
  useSessionStorage,
  useSessionStorageNodesHandle,
} from '../constants'
import randomPhrases from './randomPhrases'
import { getHandleId, getNodeId } from './utils'

export type CustomNodeData = {
  label: string
  sourceHandleId: string
  targetHandleId: string
  metaPressed: boolean
}

/* -------------------------------------------------------------------------- */

const connectionNodeIdSelector = (state: ReactFlowState) =>
  state.connectionNodeId

export const CustomNode = memo(({ id, data, xPos, yPos }: NodeProps) => {
  const { label, sourceHandleId, targetHandleId, metaPressed } =
    data as CustomNodeData
  const connectionNodeId = useStore(connectionNodeIdSelector)

  // is the node being source of an ongoing new connection?
  const isTarget = connectionNodeId && connectionNodeId !== id

  return (
    <div
      className={`customNodeBody${metaPressed ? ' customNodeMetaPressed' : ''}`}
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
        <span>{label}</span>
      </div>
    </div>
  )
})

/* -------------------------------------------------------------------------- */

export const customAddNodes = (
  addNodes: Instance.AddNodes<Node>,
  getNodes: Instance.GetNodes<undefined>,
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
      label: label,
      sourceHandleId: getHandleId(),
      targetHandleId: getHandleId(),
      metaPressed: false,
    } as CustomNodeData,
    position: { x, y },
  } as Node

  addNodes(newNode)

  if (toFitView && fitView)
    setTimeout(() => {
      fitView({
        duration: transitionDuration,
      })

      // ! store in session storage
      if (useSessionStorage)
        sessionStorage.setItem(
          useSessionStorageNodesHandle,
          JSON.stringify(getNodes())
        )
    }, 0)
}
