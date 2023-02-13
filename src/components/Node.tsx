import { memo, useContext } from 'react'
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
  hardcodedNodeSize,
  transitionDuration,
  viewFittingPadding,
} from '../constants'
import { FlowContext } from './Contexts'
import { MagicNodeData } from './MagicNode'
import randomPhrases from './randomPhrases'
import { SuperTextEditor } from './SuperTextEditor'
import { getHandleId, getNodeId } from './utils'

export interface CustomNodeData {
  label: string
  sourceHandleId: string
  targetHandleId: string
  // states
  editing: boolean
}

interface CustomNodeProps extends NodeProps {
  data: CustomNodeData
}

/* -------------------------------------------------------------------------- */

const connectionNodeIdSelector = (state: ReactFlowState) =>
  state.connectionNodeId

export const CustomNode = memo(
  ({ id, data, xPos, yPos, selected }: CustomNodeProps) => {
    const { metaPressed, selectedComponents } = useContext(FlowContext)

    // const moreThanOneComponentsSelected =
    //   selectedComponents.selectedNodes.length +
    //     selectedComponents.selectedEdges.length >
    //   1

    const { label, sourceHandleId, targetHandleId, editing } =
      data as CustomNodeData

    const connectionNodeId = useStore(connectionNodeIdSelector)

    // is the node being source of an ongoing new connection?
    const isTarget = connectionNodeId && connectionNodeId !== id

    // check if this node is explained by a magic node
    const selectedMagicNodes = selectedComponents.nodes.filter(
      (node: Node) => node.type === 'magic'
    )
    const isExplainedByMagicNode = selectedMagicNodes.some((node: Node) => {
      const {
        sourceComponents: { nodes },
      } = node.data as MagicNodeData
      for (const node of nodes) {
        if (node.id === id) return true
      }
      return false
    })

    return (
      <div
        className={`custom-node-body${
          metaPressed ? ' custom-node-meta-pressed' : ''
        }${isExplainedByMagicNode ? ' custom-node-explained' : ''}`}
      >
        <Handle
          id={targetHandleId}
          className="custom-handle target-handle"
          position={Position.Right}
          type="target"
          style={{
            zIndex: isTarget ? 3 : 1,
          }}
        />
        <Handle
          id={sourceHandleId}
          className="custom-handle source-handle"
          position={Position.Left}
          type="source"
          style={{
            zIndex: 2,
          }}
        />
        <div
          className={`custom-node-content${
            isTarget ? ' custom-node-content-target' : ''
          }`}
          style={{
            zIndex: metaPressed ? 0 : 4,
          }}
        >
          <SuperTextEditor
            target="node"
            targetId={id}
            content={label}
            editing={editing}
            selected={selected}
          >
            {/* {label.length > 0 ? (
              <>
                <MagicToolbox
                  className={`edge-label-toolbox${
                    selected && !moreThanOneComponentsSelected
                      ? ' magic-toolbox-show'
                      : ''
                  }`}
                  zoom={roughZoomLevel}
                >
                  <MagicAskItem
                    prompt={{
                      edges: [],
                      nodes: [getNode(id)!] || [],
                    }}
                  />
                </MagicToolbox>
              </>
            ) : (
              <></>
            )} */}
            <></>
          </SuperTextEditor>
        </div>
      </div>
    )
  }
)

/* -------------------------------------------------------------------------- */
// ! add node

type CustomAddNodesOptions = {
  label?: string
  editing: boolean
  fitView: FitView | undefined
  toFitView: boolean
}
export const customAddNodes = (
  addNodes: Instance.AddNodes<Node>,
  x: number,
  y: number,
  { label, editing, fitView, toFitView }: CustomAddNodesOptions
): {
  nodeId: string
  sourceHandleId: string
  targetHandleId: string
} => {
  const nodeId = getNodeId()
  const sourceHandleId = getHandleId()
  const targetHandleId = getHandleId()

  label = label ?? randomPhrases()
  const { width: nodeWidth, height: nodeHeight } = hardcodedNodeSize

  const newNode = {
    id: nodeId,
    type: 'custom', // ! use custom node
    data: {
      label: label,
      sourceHandleId: sourceHandleId,
      targetHandleId: targetHandleId,
      editing: editing,
    } as CustomNodeData,
    position: { x, y },
    selected: true,
    width: nodeWidth, // ! are you sure?
    height: nodeHeight, // ! are you sure?
  } as Node

  addNodes(newNode)

  setTimeout(() => {
    if (toFitView && fitView)
      fitView({
        padding: viewFittingPadding,
        duration: transitionDuration,
      })
  }, 0)

  return {
    nodeId,
    sourceHandleId,
    targetHandleId,
  }
}
