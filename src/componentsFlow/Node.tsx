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
  Edge,
} from 'reactflow'
import { ColorResult, TwitterPicker } from 'react-color'
import tinycolor from 'tinycolor2'

import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded'
import TextIncreaseRoundedIcon from '@mui/icons-material/TextIncreaseRounded'
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded'
import NotInterestedRoundedIcon from '@mui/icons-material/NotInterestedRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'

import { hardcodedNodeSize, styles, viewFittingOptions } from '../constants'
import { FlowContext } from '../components/Contexts'
import {
  MagicToolbox,
  MagicToolboxButton,
  MagicToolboxItem,
} from './MagicToolbox'
import randomPhrases from '../utils/randomPhrases'
import { getHandleId, getNodeId } from '../utils/utils'
import { AnswerObjectEntitiesTarget, OriginRange } from '../App'
import {
  InterchangeContext,
  NodeConceptExpansionType,
} from '../components/Interchange'
import { ReactFlowObjectContext } from '../components/Answer'
import { CustomEdgeData } from './Edge'
import { cleanNodeLabel } from '../utils/responseProcessing'

export interface GeneratedInformation {
  pseudo: boolean
  originRanges: OriginRange[]
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

export const copyNodeSnippets = (nodes: NodeSnippet[]) => {
  return nodes.map(node => {
    return {
      ...node,
      position: {
        ...node.position,
      },
    }
  })
}

export const anyNodeIndividualInHighlightedAnswerObject = (
  answerObjectIdsHighlighted: string[],
  originRanges: OriginRange[],
) => {
  return originRanges.some(originRange =>
    answerObjectIdsHighlighted.includes(originRange.answerObjectId),
  )
}

/* -------------------------------------------------------------------------- */

const connectionNodeIdSelector = (state: ReactFlowState) =>
  state.connectionNodeId

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

export const CustomNode = memo(
  ({ id, data, xPos, yPos, selected }: CustomNodeProps) => {
    const { setNodes, setEdges } = useReactFlow()
    const { metaPressed } = useContext(FlowContext)
    const {
      questionAndAnswer: {
        answerObjects,
        modelStatus: { modelParsingComplete },
        synced: {
          highlightedCoReferenceOriginRanges,
          highlightedNodeIdsProcessing,
          answerObjectIdsHighlighted,
          answerObjectIdsHighlightedTemp,
        },
      },
      handleAnswerObjectNodeExpand,
      handleAnswerObjectNodeCollapse,
      handleAnswerObjectNodeRemove,
    } = useContext(InterchangeContext)
    const { answerObjectId, generatingFlow } = useContext(
      ReactFlowObjectContext,
    )

    const answerObject = answerObjects.find(
      answerObject => answerObject.id === answerObjectId,
    )
    const collapsingParent =
      answerObject?.answerObjectSynced.collapsedNodes.includes(id)

    // const moreThanOneComponentsSelected =
    //   selectedComponents.nodes.length + selectedComponents.edges.length > 1

    const {
      label,
      tags,
      styleBackground,
      sourceHandleId,
      targetHandleId,
      // editing,
      generated: { originRanges, pseudo },
    } = data as CustomNodeData

    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const tagRef = useRef<HTMLDivElement>(null)

    const nodeHighlighted = highlightedCoReferenceOriginRanges.some(
      r => r.nodeIds.length === 1 && r.nodeIds.includes(id),
    )

    // ! tags to clarify the node label
    ////
    useEffect(() => {
      // use js to adjust the width of the tag div
      tagRef.current &&
        textAreaRef.current &&
        (tagRef.current!.style.width = `${Math.ceil(
          textAreaRef.current!.scrollWidth,
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

    /* -------------------------------------------------------------------------- */
    // ! color
    const [showColorPicker, setShowColorPicker] = useState(false)
    const handleToggleShowColorPicker = useCallback(
      (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setShowColorPicker(!showColorPicker)
      },
      [showColorPicker],
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
      [id, setNodes],
    )

    const onToolboxClose = useCallback(() => {
      setShowColorPicker(false)
    }, [])

    const handleNodeExplainOrExamples = useCallback(
      (type: NodeConceptExpansionType) => {
        // de-select all nodes and edges
        setNodes((nodes: Node<CustomNodeData>[]) => {
          return nodes.map(node => {
            return {
              ...node,
              selected: false,
            }
          })
        })
        setEdges((edges: Edge<CustomEdgeData>[]) => {
          return edges.map(edge => {
            return {
              ...edge,
              selected: false,
            }
          })
        })

        handleAnswerObjectNodeExpand(answerObjectId, id, originRanges, type)
      },
      [
        answerObjectId,
        handleAnswerObjectNodeExpand,
        id,
        originRanges,
        setEdges,
        setNodes,
      ],
    )

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    // ! render

    return (
      <div
        className={`fade-in fade-out-node-outline custom-node-body${
          metaPressed ? ' custom-node-meta-pressed' : ''
          // }${isExplainedByMagicNode ? ' custom-node-explained' : ''}${
        }${
          highlightedNodeIdsProcessing.includes(id) ||
          anyNodeIndividualInHighlightedAnswerObject(
            [...answerObjectIdsHighlighted, ...answerObjectIdsHighlightedTemp],
            originRanges,
          )
            ? ' custom-node-explained'
            : ''
        }${
          styleBackground !== '#ffffff' ? ' custom-node-background-color' : ''
        }${pseudo ? ' custom-node-body-pseudo' : ''}${
          nodeHighlighted ? ' custom-node-body-highlighted' : ''
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

        {collapsingParent && (
          <div
            className="custom-node-return-collapse"
            onClick={() => handleAnswerObjectNodeCollapse(answerObjectId, id)}
          >
            <UnfoldMoreRoundedIcon
              style={{
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        )}

        <div
          className={`custom-node-content${
            isTarget ? ' custom-node-content-target' : ''
          }`}
          style={{
            zIndex: metaPressed ? 0 : 4,
            backgroundColor: pseudo ? 'transparent' : styleBackground,
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
          <div className="super-wrapper super-wrapper-static-text super-wrapper-static-text-node">
            <span
              className="node-label"
              style={
                pseudo
                  ? {
                      color: styles.nodeColorDefaultGrey,
                    }
                  : {
                      color:
                        styleBackground === styles.nodeColorDefaultWhite
                          ? '#333333'
                          : tinycolor(styleBackground).isDark()
                          ? 'white'
                          : tinycolor(styleBackground).darken(45).toHexString(),
                    }
              }
            >
              {cleanNodeLabel(label)}
            </span>
            {/* {!moreThanOneComponentsSelected && selected ? ( */}
            {selected && !pseudo ? (
              <MagicToolbox
                className={`edge-label-toolbox${
                  selected ? ' magic-toolbox-show' : ''
                }`}
                onUnmount={onToolboxClose}
              >
                <MagicToolboxItem title="more">
                  {generatingFlow || !modelParsingComplete ? (
                    <span className="magic-hint-text">
                      waiting the model to finish other tasks ...
                    </span>
                  ) : (
                    <>
                      <MagicToolboxButton
                        content={
                          <>
                            <ManageSearchRoundedIcon />
                            <span>explain</span>
                          </>
                        }
                        onClick={() => {
                          handleNodeExplainOrExamples('explain')
                        }}
                      />
                      <MagicToolboxButton
                        content={
                          <>
                            <TextIncreaseRoundedIcon />
                            <span>examples</span>
                          </>
                        }
                        onClick={() => {
                          handleNodeExplainOrExamples('examples')
                        }}
                      />
                    </>
                  )}
                </MagicToolboxItem>

                <MagicToolboxItem title="less">
                  <>
                    <MagicToolboxButton
                      content={
                        <>
                          <UnfoldLessRoundedIcon
                            style={{
                              transform: 'rotate(45deg)',
                            }}
                          />
                          <span>
                            {collapsingParent ? 'expand' : 'collapse'}
                          </span>
                        </>
                      }
                      onClick={() => {
                        handleAnswerObjectNodeCollapse(answerObjectId, id)
                      }}
                    />
                    <MagicToolboxButton
                      content={
                        <>
                          <NotInterestedRoundedIcon />
                          <span>trim</span>
                        </>
                      }
                      onClick={() => {
                        if (answerObject) {
                          handleAnswerObjectNodeRemove(
                            answerObjectId,
                            id,
                            (answerObject.answerObjectSynced.listDisplay ===
                            'summary'
                              ? 'summary'
                              : 'originText') as AnswerObjectEntitiesTarget,
                          )
                        }
                      }}
                      className="alert-button"
                    />
                  </>
                </MagicToolboxItem>

                <MagicToolboxItem title="color">
                  <>
                    <MagicToolboxButton
                      content={'white'}
                      onClick={handleToggleShowColorPicker}
                      style={{
                        color:
                          styleBackground === '#ffffff'
                            ? '#cfcfcf'
                            : 'transparent',
                        backgroundColor: styleBackground,
                      }}
                    />
                    {showColorPicker && (
                      <TwitterPicker
                        color={styleBackground}
                        onChange={handleChangeColor}
                      />
                    )}
                  </>
                </MagicToolboxItem>

                {/* {label.length !== 0 && tags.length === 0 ? (
                  <MagicNodeTaggingItem targetId={id} label={label} />
                ) : (
                  <></>
                )} */}

                {/* {label.length === 0 ? (
                  <MagicSuggestItem
                    target="node"
                    targetId={id}
                    nodeLabelAndTags={getNodeLabelAndTags(getNodes())}
                    edgeLabels={[]} // TODO
                    disabled={moreThanOneComponentsSelected}
                  />
                ) : (
                  <></>
                )} */}
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
  isEqual,
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
      ref: ForwardedRef<HTMLDivElement>,
    ) => {
      return tags.length > 0 ? (
        <div ref={ref} className="custom-node-tag" onClick={removeTags}>
          <span>{tags[0]}</span>
        </div>
      ) : (
        <></>
      )
    },
  ),
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
  generated: GeneratedInformation,
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
    width: hardcodedNodeWidthEstimation(label, generated.pseudo), // ! are you sure?
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
  }: CustomAddNodesOptions,
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
      pseudo: false,
      originRanges: [],
      originTexts: [],
    },
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

export const hardcodedNodeWidthEstimation = (
  content: string,
  pseudo: boolean,
) => {
  // make a pseudo node to estimate width
  const pseudoNode = document.createElement('span')

  pseudoNode.className = pseudo
    ? 'width-measuring-span-pseudo'
    : 'width-measuring-span'
  pseudoNode.innerText = content

  document.body.appendChild(pseudoNode)
  const width = pseudoNode.getBoundingClientRect().width
  document.body.removeChild(pseudoNode)

  return pseudo ? Math.max(80, width) : Math.max(160, width)

  // if (content.length < 16) return hardcodedNodeSize.width
  // return Math.max(210, 64 + content.length * 8) // TODO better ways?
}

export const hardcodedEdgeLabelWidthEstimation = (content: string) => {
  // make a pseudo node to estimate width
  const pseudoNode = document.createElement('span')
  pseudoNode.className = 'edge-label-width-measuring-span'
  pseudoNode.innerText = content
  document.body.appendChild(pseudoNode)
  const width = pseudoNode.getBoundingClientRect().width
  document.body.removeChild(pseudoNode)

  return width

  // if (content.length < 16) return hardcodedNodeSize.width
  // return Math.max(210, 64 + content.length * 8) // TODO better ways?
}
