import {
  ChangeEvent,
  ForwardedRef,
  forwardRef,
  memo,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
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
  useReactFlow,
} from 'reactflow'
import { ColorResult, TwitterPicker } from 'react-color'
import tinycolor from 'tinycolor2'

import { hardcodedNodeSize, styles, viewFittingOptions } from '../constants'
import { FlowContext } from '../components/Contexts'
import { MagicNodeData } from './MagicNode'
import {
  MagicNodeTaggingItem,
  MagicSuggestItem,
  MagicToolbox,
  MagicToolboxButton,
  MagicToolboxItem,
} from './MagicToolbox'
import randomPhrases from '../utils/randomPhrases'
import { getHandleId, getNodeId, getNodeLabelAndTags } from '../utils/utils'
import { OriginAnswerRange } from '../App'

export interface GeneratedInformation {
  originRanges: OriginAnswerRange[]
  originTexts: string[]
}

export interface NodeSnippet {
  id: string
  label: string
  position: {
    x: number
    y: number
  }
  width: number
  height: number
}

export interface CustomNodeData {
  label: string
  tags: string[]
  sourceHandleId: string
  targetHandleId: string
  // states
  editing: boolean
  // styles
  styleBackground: string
  // generated
  generated: GeneratedInformation
}

interface CustomNodeProps extends NodeProps {
  data: CustomNodeData
}

/* -------------------------------------------------------------------------- */

const connectionNodeIdSelector = (state: ReactFlowState) =>
  state.connectionNodeId

export const CustomNode = memo(
  ({ id, data, xPos, yPos, selected }: CustomNodeProps) => {
    const { getNodes, setNodes } = useReactFlow()
    const { metaPressed, selectedComponents } = useContext(FlowContext)

    const moreThanOneComponentsSelected =
      selectedComponents.nodes.length + selectedComponents.edges.length > 1

    const {
      label,
      tags,
      styleBackground,
      sourceHandleId,
      targetHandleId,
      // editing,
      // generated: { originRanges, originTexts },
    } = data as CustomNodeData

    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const tagRef = useRef<HTMLDivElement>(null)

    // ! tags to clarify the node label
    ////
    useEffect(() => {
      // use js to adjust the width of the tag div
      tagRef.current &&
        textAreaRef.current &&
        (tagRef.current!.style.width = `${Math.ceil(
          textAreaRef.current!.scrollWidth
        )}px`)
    }, [label, tags])
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
      (nodeId: string) => nodeId.includes('magic-node')
    )
    const isExplainedByMagicNode = selectedMagicNodes.some((nodeId: string) => {
      const magicNode = getNodes().find(node => node.id === nodeId)
      if (!magicNode) return false

      const {
        sourceComponents: { nodes: nodeIds },
      } = magicNode.data as MagicNodeData

      const nodes = getNodes().filter(node => nodeIds.includes(node.id))

      for (const node of nodes) {
        if (node.id === id) return true
      }
      return false
    })

    /* -------------------------------------------------------------------------- */
    // ! color
    const [showColorPicker, setShowColorPicker] = useState(false)
    const handleToggleShowColorPicker = useCallback(
      (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setShowColorPicker(!showColorPicker)
      },
      [showColorPicker]
    )

    const handleChangeColor = useCallback(
      (color: ColorResult, event: ChangeEvent<HTMLInputElement>) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  styleBackground: color.hex,
                },
              }
            }
            return node
          })
        })
      },
      [id, setNodes]
    )

    const onToolboxClose = useCallback(() => {
      setShowColorPicker(false)
    }, [])

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    // ! render

    return (
      <div
        className={`custom-node-body${
          metaPressed ? ' custom-node-meta-pressed' : ''
        }${isExplainedByMagicNode ? ' custom-node-explained' : ''}${
          styleBackground !== '#ffffff' ? ' custom-node-background-color' : ''
        }`}
        // }${temporary ? ' custom-node-temporary' : ''}`}
      >
        <Handle
          id={targetHandleId}
          className="custom-handle target-handle"
          position={Position.Left}
          type="target"
          // style={{
          //   zIndex: isTarget ? 3 : 1,
          // }}
        />
        <Handle
          id={sourceHandleId}
          className="custom-handle source-handle"
          position={Position.Right}
          type="source"
          // style={{
          //   zIndex: 2,
          // }}
        />

        <div
          className={`custom-node-content${
            isTarget ? ' custom-node-content-target' : ''
          }`}
          style={{
            zIndex: metaPressed ? 0 : 4,
            backgroundColor: styleBackground,
          }}
        >
          {/* <SuperTextEditor
            target="node"
            targetId={id}
            content={label}
            editing={editing}
            background={styleBackground}
            selected={selected}
            textareaRef={textAreaRef}
          > */}
          <div className="super-wrapper super-wrapper-static-text">
            <span
              className="node-label"
              style={{
                color:
                  styleBackground === styles.nodeColorDefaultWhite
                    ? '#333333'
                    : tinycolor(styleBackground).isDark()
                    ? 'white'
                    : tinycolor(styleBackground).darken(45).toHexString(),
              }}
            >
              {label}
            </span>
            {!moreThanOneComponentsSelected && selected ? (
              <MagicToolbox
                className={`edge-label-toolbox${
                  selected && !moreThanOneComponentsSelected
                    ? ' magic-toolbox-show'
                    : ''
                }`}
                onUnmount={onToolboxClose}
              >
                <MagicToolboxItem title="color">
                  <>
                    <MagicToolboxButton
                      content={styleBackground}
                      onClick={handleToggleShowColorPicker}
                    />
                    {showColorPicker && (
                      <TwitterPicker
                        color={styleBackground}
                        onChange={handleChangeColor}
                      />
                    )}
                  </>
                </MagicToolboxItem>

                {label.length !== 0 && tags.length === 0 ? (
                  <MagicNodeTaggingItem targetId={id} label={label} />
                ) : (
                  <></>
                )}
                {label.length === 0 ? (
                  <MagicSuggestItem
                    target="node"
                    targetId={id}
                    nodeLabelAndTags={getNodeLabelAndTags(getNodes())}
                    edgeLabels={[]} // TODO
                    disabled={moreThanOneComponentsSelected}
                  />
                ) : (
                  <></>
                )}
              </MagicToolbox>
            ) : (
              <></>
            )}
          </div>

          {/* {tags.length > 0 && (
          <div className="custom-node-tags">
            {tags.map((tag, index) => (
              <span key={index} className="custom-node-tag">
                {tag}
              </span>
            ))}
          </div>
        )} */}
          <CustomNodeTag
            ref={tagRef}
            tags={tags}
            removeTags={handleRemoveTags}
          />
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
  forwardRef<HTMLDivElement, CustomNodeTagProps>(
    (
      { tags, removeTags }: CustomNodeTagProps,
      ref: ForwardedRef<HTMLDivElement>
    ) => {
      return tags.length > 0 ? (
        <div ref={ref} className="custom-node-tag" onClick={removeTags}>
          <span>{tags[0]}</span>
        </div>
      ) : (
        <></>
      )
    }
  )
)

/* -------------------------------------------------------------------------- */
// ! add node

export const getNewCustomNode = (
  nodeId: string,
  label: string,
  x: number,
  y: number,
  sourceHandleId: string,
  targetHandleId: string,
  selected: boolean,
  editing: boolean,
  styleBackground: string,
  generated: GeneratedInformation
) => {
  const { height: nodeHeight } = hardcodedNodeSize

  return {
    id: nodeId,
    type: 'custom', // ! use custom node
    // sourcePosition: Position.Right,
    // targetPosition: Position.Left,
    data: {
      label: label,
      tags: [],
      sourceHandleId: sourceHandleId,
      targetHandleId: targetHandleId,
      editing: editing,
      styleBackground: styleBackground,
      generated: generated,
    } as CustomNodeData,
    position: { x, y },
    selected: selected,
    width: hardcodedNodeWidthEstimation(label), // ! are you sure?
    height: nodeHeight, // ! are you sure?
  } as Node
}

type CustomAddNodesOptions = {
  label?: string
  select: boolean
  editing: boolean
  styleBackground: string
  fitView: FitView | undefined
  toFitView: boolean
}
export const customAddNodes = (
  addNodes: Instance.AddNodes<Node>,
  selectNodes: (nodeIds: string[]) => void,
  x: number,
  y: number,
  {
    label,
    select,
    editing,
    styleBackground,
    fitView,
    toFitView,
  }: CustomAddNodesOptions
): {
  nodeId: string
  sourceHandleId: string
  targetHandleId: string
} => {
  const nodeId = getNodeId()
  const sourceHandleId = getHandleId()
  const targetHandleId = getHandleId()

  label = label ?? randomPhrases()

  const newNode = getNewCustomNode(
    nodeId,
    label,
    x,
    y,
    sourceHandleId,
    targetHandleId,
    select,
    editing,
    styleBackground,
    {
      originRanges: [],
      originTexts: [],
    }
  )

  addNodes(newNode)

  setTimeout(() => {
    if (toFitView && fitView) fitView(viewFittingOptions)
    if (select) {
      selectNodes([nodeId])
    }
  }, 0)

  return {
    nodeId,
    sourceHandleId,
    targetHandleId,
  }
}

/* -------------------------------------------------------------------------- */

export const hardcodedNodeWidthEstimation = (content: string) => {
  // make a pseudo node to estimate width
  const pseudoNode = document.createElement('span')
  pseudoNode.className = 'width-measuring-span'
  pseudoNode.innerText = content
  document.body.appendChild(pseudoNode)
  const width = pseudoNode.offsetWidth
  document.body.removeChild(pseudoNode)

  return Math.max(160, width)

  // if (content.length < 16) return hardcodedNodeSize.width
  // return Math.max(210, 64 + content.length * 8) // TODO better ways?
}

export const hardcodedEdgeLabelWidthEstimation = (content: string) => {
  // make a pseudo node to estimate width
  const pseudoNode = document.createElement('span')
  pseudoNode.className = 'edge-label-width-measuring-span'
  pseudoNode.innerText = content
  document.body.appendChild(pseudoNode)
  const width = pseudoNode.offsetWidth
  document.body.removeChild(pseudoNode)

  return width

  // if (content.length < 16) return hardcodedNodeSize.width
  // return Math.max(210, 64 + content.length * 8) // TODO better ways?
}
