import { memo, useCallback, useContext, useEffect, useState } from 'react'
import isEqual from 'react-fast-compare'
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
  contentEditingTimeout,
  hardcodedNodeSize,
  transitionDuration,
  viewFittingPadding,
} from '../constants'
import { EdgeContext, FlowContext } from './Contexts'
import { usePrevious } from './hooks'
import { MagicNodeData } from './MagicNode'
import {
  MagicNodeTaggingItem,
  MagicSuggestItem,
  MagicToolbox,
} from './MagicToolbox'
import randomPhrases from './randomPhrases'
import { SuperTextEditor } from './SuperTextEditor'
import { getHandleId, getNodeId, getNodeLabelAndTags } from './utils'
import { getWikiData } from './wikiBase'

export interface CustomNodeData {
  label: string
  tags: string[]
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
    const { getNodes, setNodes, metaPressed, selectedComponents } =
      useContext(FlowContext)
    const { roughZoomLevel } = useContext(EdgeContext)

    const moreThanOneComponentsSelected =
      selectedComponents.nodes.length + selectedComponents.edges.length > 1

    const { label, tags, sourceHandleId, targetHandleId, editing } =
      data as CustomNodeData

    // ! tags to clarify the node label
    const [availableTags, setAvailableTags] = useState<string[]>([])
    // wait for 1000 seconds and if the label is not changing
    // it means that the user is not editing the node
    // and make a request using the label as a query
    const prevEditing = usePrevious(editing)
    const prevLabel = usePrevious(label)
    useEffect(() => {
      if (tags.length > 0) {
        if (availableTags.length > 0) return setAvailableTags([])
        else return
      }

      const timeout = setTimeout(() => {
        if (
          label.length !== 0 &&
          ((editing && !prevEditing) || prevLabel !== label)
        )
          getWikiData(label).then(res => {
            setAvailableTags(res)
          })
        else return
      }, contentEditingTimeout)

      return () => timeout && clearTimeout(timeout)
    }, [
      availableTags.length,
      editing,
      label,
      prevEditing,
      prevLabel,
      tags.length,
    ])
    useEffect(() => {
      if (selected && tags.length === 0 && label.length !== 0 && !editing) {
        getWikiData(label).then(res => {
          setAvailableTags(res)
        })
      }
    }, [editing, label, selected, tags.length])
    ////
    const handleRemoveTags = useCallback(() => {
      setNodes((nodes: Node[]) => {
        return nodes.map(node => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                tags: [],
              },
            }
          }
          return node
        })
      })
    }, [id, setNodes])

    ////
    // for connections
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

        {/* {tags.length > 0 && (
          <div className="custom-node-tags">
            {tags.map((tag, index) => (
              <span key={index} className="custom-node-tag">
                {tag}
              </span>
            ))}
          </div>
        )} */}
        <CustomNodeTag tags={tags} removeTags={handleRemoveTags} />

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
            {(label.length === 0 || tags.length === 0) && selected ? (
              <MagicToolbox
                className={`edge-label-toolbox${
                  selected && !moreThanOneComponentsSelected
                    ? ' magic-toolbox-show'
                    : ''
                }`}
                zoom={roughZoomLevel}
              >
                {label.length !== 0 && tags.length === 0 ? (
                  <MagicNodeTaggingItem
                    targetId={id}
                    availableTags={availableTags}
                  />
                ) : (
                  <></>
                )}
                {label.length === 0 ? (
                  <MagicSuggestItem
                    target="node"
                    targetId={id}
                    nodeLabelAndTags={getNodeLabelAndTags(getNodes())}
                    edgeLabels={[]} // TODO
                  />
                ) : (
                  <></>
                )}
              </MagicToolbox>
            ) : (
              <></>
            )}
          </SuperTextEditor>
        </div>
      </div>
    )
  },
  isEqual
)

/* -------------------------------------------------------------------------- */

interface CustomNodeTagProps {
  tags: string[]
  removeTags: () => void
}
export const CustomNodeTag = memo(
  ({ tags, removeTags }: CustomNodeTagProps) => {
    return tags.length > 0 ? (
      <div className="custom-node-tag" onClick={removeTags}>
        <span>{tags[0]}</span>
      </div>
    ) : (
      <></>
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
      tags: [],
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
