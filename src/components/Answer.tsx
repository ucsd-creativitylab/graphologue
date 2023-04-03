import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { Node, ReactFlowProvider, useReactFlow } from 'reactflow'
import dagre from 'dagre'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

// import VerticalSplitRoundedIcon from '@mui/icons-material/VerticalSplitRounded'
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import CropLandscapeRoundedIcon from '@mui/icons-material/CropLandscapeRounded'
import HorizontalSplitRoundedIcon from '@mui/icons-material/HorizontalSplitRounded'
import RectangleRoundedIcon from '@mui/icons-material/RectangleRounded'

import { QuestionAndAnswer, OriginRange, AnswerObject } from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'
import { InterchangeContext } from './Interchange'
import { SlideAnswerText } from './SlideAnswer'
import { useEffectEqual } from '../utils/useEffectEqual'
import { answerObjectsToReactFlowObject } from '../utils/graphToFlowObject'
import {
  CustomNodeData,
  NodeSnippet,
  copyNodeSnippets,
  hardcodedNodeWidthEstimation,
} from '../componentsFlow/Node'
import { hardcodedNodeSize, viewFittingOptions } from '../constants'
import { ViewFittingJob } from '../componentsFlow/ViewFitter'
import {
  mergeEdgeEntities,
  mergeNodeEntities,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeAnnotations,
  splitAnnotatedSentences,
} from '../utils/responseProcessing'
import { getGraphBounds } from '../utils/utils'
import {
  BoundingAInBoundingB,
  minMoveBringBoundingAIntoB,
} from '../utils/viewGeometry'

export interface ReactFlowObjectContextProps {
  // nodeEntities: NodeEntity[]
  // edgeEntities: EdgeEntity[]
  generatingFlow: boolean
}

export const ReactFlowObjectContext =
  createContext<ReactFlowObjectContextProps>({
    // nodeEntities: [],
    // edgeEntities: [],
    generatingFlow: false,
  })

////
export interface AnswerBlockContextProps {
  handleOrganizeNodes: () => void
}

export const AnswerBlockContext = createContext<AnswerBlockContextProps>(
  {} as AnswerBlockContextProps
)

export const Answer = () => {
  const { questionAndAnswer } = useContext(InterchangeContext)
  const { id } = questionAndAnswer as QuestionAndAnswer

  return (
    <div className="answer-wrapper" data-id={id}>
      <AnswerListView
        key={`raw-answer-${id}`}
        questionAndAnswer={questionAndAnswer}
      />
    </div>
  )
}

export type ListDisplayFormat = 'original' | 'summary' | 'slide'
export type DiagramDisplayFormat = 'split' | 'merged'

/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */

const AnswerListView = ({
  questionAndAnswer,
  questionAndAnswer: {
    id,
    answer,
    answerObjects,
    synced,
    modelStatus: { modelParsingComplete },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  const {
    handleSetSyncedAnswerObjectIdsHighlighted,
    handleSetSyncedAnswerObjectIdsHidden,
    // handleAnswerObjectTellLessOrMore,
    handleAnswerObjectRemove,
  } = useContext(InterchangeContext)

  const [blockDisplay, setBlockDisplay] = useState(true)
  const [listDisplay, setListDisplay] = useState<ListDisplayFormat>('original')
  const [diagramDisplay, setDiagramDisplay] =
    useState<DiagramDisplayFormat>('split')

  // const canSwitchBlockDisplay =
  //   modelAnsweringComplete && answerObjects.length > 0

  // const switchedToBlockDisplay = useRef(false)
  // useEffect(() => {
  //   if (!switchedToBlockDisplay.current) {
  //     switchedToBlockDisplay.current = true
  //     setBlockDisplay(true)
  //   }
  // }, [])

  /* -------------------------------------------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSwitchBlockDisplay = useCallback(() => {
    // setListDisplay('original')
    setBlockDisplay(prev => !prev)
  }, [])

  const handleSwitchSummaryDisplay = useCallback(
    (newDisplayFormat: ListDisplayFormat) => {
      setListDisplay(newDisplayFormat)
    },
    []
  )

  const handleSwitchDiagramDisplay = useCallback(
    (newDisplayFormat: DiagramDisplayFormat) => {
      setDiagramDisplay(newDisplayFormat)
    },
    []
  )

  const handleHighlightAnswerObject = useCallback(
    (answerObjectId: string) => {
      const currentIds = synced.answerObjectIdsHighlighted

      if (currentIds.includes(answerObjectId)) {
        handleSetSyncedAnswerObjectIdsHighlighted(
          currentIds.filter(id => id !== answerObjectId)
        )
      } else
        handleSetSyncedAnswerObjectIdsHighlighted([
          ...currentIds,
          answerObjectId,
        ])
    },
    [
      handleSetSyncedAnswerObjectIdsHighlighted,
      synced.answerObjectIdsHighlighted,
    ]
  )

  const handleHideAnswerObject = useCallback(
    (answerObjectId: string) => {
      const currentIds = synced.answerObjectIdsHidden

      if (currentIds.includes(answerObjectId)) {
        handleSetSyncedAnswerObjectIdsHidden(
          currentIds.filter(id => id !== answerObjectId)
        )
      } else
        handleSetSyncedAnswerObjectIdsHidden([...currentIds, answerObjectId])
    },
    [handleSetSyncedAnswerObjectIdsHidden, synced.answerObjectIdsHidden]
  )

  return (
    <div
      // className={`answer-item-display${
      //   modelAnsweringComplete ? ' answer-side' : ' answer-centered'
      // }`}
      className={`answer-item-display`}
    >
      <div className="block-display-switches">
        {/* <button
          // disabled={!canSwitchBlockDisplay}
          className="bar-button"
          onClick={handleSwitchBlockDisplay}
        >
          <VerticalSplitRoundedIcon />
        </button> */}
        <div className="list-display-switch">
          <button
            disabled={!blockDisplay}
            className={`bar-button${
              listDisplay === 'original' ? ' selected' : ''
            }`}
            onClick={() => handleSwitchSummaryDisplay('original')}
          >
            <NotesRoundedIcon />
            <span>original</span>
          </button>
          <button
            disabled={
              !blockDisplay || !answerObjects.some(a => a.summary.length > 0)
            }
            className={`bar-button${
              listDisplay === 'summary' ? ' selected' : ''
            }`}
            onClick={() => handleSwitchSummaryDisplay('summary')}
          >
            <ShortTextRoundedIcon />
            <span>summary</span>
          </button>
          <button
            disabled={
              !blockDisplay ||
              !answerObjects.some(a => a.slide.content.length > 0)
            }
            className={`bar-button${
              listDisplay === 'slide' ? ' selected' : ''
            }`}
            onClick={() => handleSwitchSummaryDisplay('slide')}
          >
            <CropLandscapeRoundedIcon />
            <span>slide</span>
          </button>
        </div>

        <div className="list-display-switch">
          <button
            // disabled={!blockDisplay}
            className={`bar-button${
              diagramDisplay === 'split' ? ' selected' : ''
            }`}
            onClick={() => handleSwitchDiagramDisplay('split')}
          >
            <HorizontalSplitRoundedIcon />
            <span>split diagram</span>
          </button>
          <button
            // disabled={
            //   !blockDisplay || !answerObjects.some(a => a.summary.length > 0)
            // }
            className={`bar-button${
              diagramDisplay === 'merged' ? ' selected' : ''
            }`}
            onClick={() => handleSwitchDiagramDisplay('merged')}
          >
            <RectangleRoundedIcon />
            <span>merged diagram</span>
          </button>
        </div>
      </div>

      {/* display in block */}
      {blockDisplay ? (
        <div
          className={`answer-block-list${
            diagramDisplay === 'merged' ? '-merged-diagram' : ''
          }`}
          data-id={id}
        >
          {/* ! MAP */}
          {diagramDisplay === 'merged' ? (
            <>
              <div className="answer-text-block-list fade-in-outline">
                {answerObjects.map((answerObject, index) => (
                  <AnswerTextBlock
                    key={`answer-block-item-${id}-${answerObject.id}`}
                    index={index}
                    questionAndAnswer={questionAndAnswer}
                    answerObject={answerObject}
                    listDisplay={listDisplay}
                    diagramDisplay={diagramDisplay}
                    handleHighlightAnswerObject={handleHighlightAnswerObject}
                    handleHideAnswerObject={handleHideAnswerObject}
                    handleAnswerObjectRemove={handleAnswerObjectRemove}
                  />
                ))}
              </div>
              <ReactFlowProvider
                key={`answer-block-flow-provider-merged-${id}`}
                // key={`answer-block-flow-provider-${id}-${answerObjects[0].id}`}
              >
                <AnswerBlockItem
                  key={`answer-block-item-${id}`}
                  // key={`answer-block-item-${id}-${answerObjects[0].id}`}
                  index={0}
                  questionAndAnswer={questionAndAnswer}
                  answerObject={answerObjects[0]}
                  listDisplay={listDisplay}
                  diagramDisplay={diagramDisplay}
                  handleHighlightAnswerObject={handleHighlightAnswerObject}
                  handleHideAnswerObject={handleHideAnswerObject}
                  handleAnswerObjectRemove={handleAnswerObjectRemove}
                />
              </ReactFlowProvider>
            </>
          ) : (
            answerObjects.map((answerObject, index) => (
              <ReactFlowProvider
                key={`answer-block-flow-provider-${id}-${answerObject.id}`}
              >
                <AnswerBlockItem
                  key={`answer-block-item-${id}-${answerObject.id}`}
                  index={index}
                  questionAndAnswer={questionAndAnswer}
                  answerObject={answerObject}
                  listDisplay={listDisplay}
                  diagramDisplay={diagramDisplay}
                  handleHighlightAnswerObject={handleHighlightAnswerObject}
                  handleHideAnswerObject={handleHideAnswerObject}
                  handleAnswerObjectRemove={handleAnswerObjectRemove}
                />
              </ReactFlowProvider>
            ))
          )}
        </div>
      ) : (
        /* -------------------------------------------------------------------------- */
        /* ------------------------------- full answer ------------------------------ */
        // ! not using now!
        <div className={`answer-item answer-full-block interchange-component`}>
          <div className="answer-item-text">
            {answerObjects.map((answerObject, index) => (
              <AnswerText
                key={`answer-range-in-full-text-${answerObject.id}`}
                answerObjectId={answerObject.id}
                rawAnswer={answerObject.originText}
                highlightedRanges={synced.highlightedCoReferenceOriginRanges}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

const AnswerBlockItem = ({
  index,
  questionAndAnswer,
  questionAndAnswer: {
    id,
    answerObjects,
    modelStatus: { modelParsingComplete },
    synced,
    synced: { answerObjectIdsHidden },
  },
  answerObject,
  listDisplay,
  diagramDisplay,
  handleHighlightAnswerObject,
  handleHideAnswerObject,
  handleAnswerObjectRemove,
}: {
  index: number
  questionAndAnswer: QuestionAndAnswer
  answerObject: AnswerObject
  listDisplay: ListDisplayFormat
  diagramDisplay: DiagramDisplayFormat
  handleHighlightAnswerObject: (answerObjectId: string) => void
  handleHideAnswerObject: (answerObjectId: string) => void
  handleAnswerObjectRemove: (answerObjectId: string) => void
}) => {
  /* -------------------------------------------------------------------------- */
  const isForMergedDiagram = diagramDisplay === 'merged'

  const { setNodes, setEdges, fitView, getViewport, setViewport } =
    useReactFlow()

  const stableDagreGraph = useRef(new dagre.graphlib.Graph())
  const viewFittingJobs = useRef<ViewFittingJob[]>([])
  const viewFittingJobRunning = useRef(false)
  const firstCameraJob = useRef(true)

  const prevNodeSnippets = useRef<NodeSnippet[]>([])
  // const prevEdges = useRef<Edge[]>([])

  // ! put all node and edge entities together
  // const nodeEntities = mergeNodeEntities(answerObjects, answerObjectIdsHidden)
  // const edgeEntities = mergeEdgeEntities(answerObjects, answerObjectIdsHidden)
  const nodeEntities = isForMergedDiagram
    ? mergeNodeEntities(answerObjects, answerObjectIdsHidden)
    : answerObject.nodeEntities
  const edgeEntities = isForMergedDiagram
    ? mergeEdgeEntities(answerObjects, answerObjectIdsHidden)
    : answerObject.edgeEntities

  const runViewFittingJobs = useCallback(() => {
    if (viewFittingJobRunning.current || viewFittingJobs.current.length === 0)
      return

    const job = viewFittingJobs.current.shift()
    if (!job) return

    viewFittingJobRunning.current = true

    setTimeout(() => {
      const nodesBounding = getGraphBounds(job.nodes)
      ////
      const reactFlowWrapperElement = document.querySelector(
        '.react-flow-wrapper'
      ) as HTMLElement // they are all the same size
      if (!reactFlowWrapperElement) return // ! hard return

      const viewBounding = reactFlowWrapperElement.getBoundingClientRect()

      if (
        nodesBounding.width < viewBounding.width * 1.5 &&
        nodesBounding.height < viewBounding.height * 1.5
      ) {
        fitView({
          ...viewFittingOptions,
          duration: firstCameraJob.current ? 0 : viewFittingOptions.duration,
        })
        firstCameraJob.current = false
      } else {
        // find changed nodes

        if (job.changedNodes.length === 0) {
          viewFittingJobRunning.current = false
          runViewFittingJobs()
          return
        }

        // * old
        // fitView({
        //   ...viewFittingOptions,
        //   duration: viewFittingOptions.duration, // TODO best?
        //   minZoom: 1,
        //   maxZoom: 1,
        //   nodes: job.changedNodes.map(n => ({ id: n.id })),
        // })

        const viewport = getViewport()
        const viewportRect = {
          x: -viewport.x,
          y: -viewport.y,
          width: viewBounding.width,
          height: viewBounding.height, // assume the zoom is 1
        }

        // get bounding of changed nodes
        const changedNodesBounding = getGraphBounds(job.changedNodes)

        // check if the viewport rect includes the target nodes rect
        if (BoundingAInBoundingB(changedNodesBounding, viewportRect)) {
          viewFittingJobRunning.current = false
          runViewFittingJobs()

          return // TODO do anything? move a little?
        }

        const minMove = minMoveBringBoundingAIntoB(
          changedNodesBounding,
          viewportRect,
          40,
          40
          // viewBounding.x * 0.1,
          // viewBounding.y * 0.1
        )

        setViewport(
          {
            x: viewport.x + minMove.x,
            y: viewport.y + minMove.y,
            zoom: 1,
          },
          {
            duration: firstCameraJob.current ? 0 : viewFittingOptions.duration,
          }
        )
        firstCameraJob.current = false
      }

      setTimeout(() => {
        viewFittingJobRunning.current = false
        runViewFittingJobs()
      }, viewFittingOptions.duration)
    }, 5)
  }, [fitView, getViewport, setViewport])

  useEffectEqual(() => {
    const { nodes: newNodes, edges: newEdges } = answerObjectsToReactFlowObject(
      stableDagreGraph.current,
      nodeEntities,
      edgeEntities,
      synced
    )

    setNodes(newNodes)
    setEdges(newEdges)

    const newNodeSnippets: NodeSnippet[] = newNodes.map(
      (n: Node<CustomNodeData>) => ({
        id: n.id,
        label: (n.data as CustomNodeData).label,
        position: {
          x: n.position.x,
          y: n.position.y,
        },
        width:
          n.width ??
          hardcodedNodeWidthEstimation(n.data.label, n.data.generated.pseudo),
        height: n.height ?? hardcodedNodeSize.height,
      })
    )

    // const nodeSnippetExtraction = (n: NodeSnippet) => ({
    //   id: n.id,
    //   label: n.label,
    // })

    const changedNodeSnippets = [
      ...newNodeSnippets.filter(n => {
        const foundPrevNode = prevNodeSnippets.current.find(
          pN => pN.id === n.id
        )
        return (
          !foundPrevNode ||
          // !isEqual(
          //   nodeSnippetExtraction(foundPrevNode),
          //   nodeSnippetExtraction(n)
          // )
          !isEqual(foundPrevNode, n)
        )
      }),
      ...prevNodeSnippets.current.filter(
        pN => !newNodeSnippets.find(n => n.id === pN.id || n.label !== pN.label)
      ),
    ]

    // view tracker
    viewFittingJobs.current.push({
      nodes: copyNodeSnippets(newNodeSnippets),
      changedNodes: copyNodeSnippets(changedNodeSnippets),
    })
    if (viewFittingJobs.current.length > 1) viewFittingJobs.current.shift()
    runViewFittingJobs()

    prevNodeSnippets.current = newNodeSnippets
  }, [
    // we don't care about individuals
    nodeEntities.map(nE =>
      (({ id, displayNodeLabel, pseudo }) => ({
        id,
        displayNodeLabel,
        pseudo,
      }))(nE)
    ),
    edgeEntities,
    // ! should we  add this?
    // synced, // ???
    synced.saliencyFilter,
    setNodes,
    setEdges,
    runViewFittingJobs,
  ])

  const handleOrganizeNodes = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = answerObjectsToReactFlowObject(
      stableDagreGraph.current,
      nodeEntities,
      edgeEntities,
      synced
    )

    setNodes(newNodes)
    setEdges(newEdges)

    const newNodeSnippets: NodeSnippet[] = newNodes.map(
      (n: Node<CustomNodeData>) => ({
        id: n.id,
        label: (n.data as CustomNodeData).label,
        position: {
          x: n.position.x,
          y: n.position.y,
        },
        width:
          n.width ??
          hardcodedNodeWidthEstimation(n.data.label, n.data.generated.pseudo),
        height: n.height ?? hardcodedNodeSize.height,
      })
    )

    prevNodeSnippets.current = newNodeSnippets
  }, [edgeEntities, nodeEntities, setEdges, setNodes, synced])

  /* -------------------------------------------------------------------------- */

  return (
    <AnswerBlockContext.Provider
      value={{
        handleOrganizeNodes,
      }}
    >
      <div
        className={`answer-block-item-wrapper${
          isForMergedDiagram ? ' merged-diagram-wrapper' : ''
        }`}
      >
        {!isForMergedDiagram && (
          <AnswerTextBlock
            index={index}
            questionAndAnswer={questionAndAnswer}
            answerObject={answerObject}
            listDisplay={listDisplay}
            diagramDisplay={diagramDisplay}
            handleHighlightAnswerObject={handleHighlightAnswerObject}
            handleHideAnswerObject={handleHideAnswerObject}
            handleAnswerObjectRemove={handleAnswerObjectRemove}
          />
        )}

        <ReactFlowObjectContext.Provider
          value={{
            generatingFlow: isForMergedDiagram
              ? !modelParsingComplete
              : !answerObject.complete,
          }}
        >
          <ReactFlowComponent
            key={`react-flow-${id}-${answerObject.id}`}
            id={`${id}-${answerObject.id}`}
          />
        </ReactFlowObjectContext.Provider>
      </div>
    </AnswerBlockContext.Provider>
  )
}

const AnswerTextBlock = ({
  index,
  questionAndAnswer: {
    modelStatus: { modelParsingComplete },
    synced,
  },
  answerObject,
  listDisplay,
  diagramDisplay,
  handleHighlightAnswerObject,
  handleHideAnswerObject,
  handleAnswerObjectRemove,
}: {
  index: number
  questionAndAnswer: QuestionAndAnswer
  answerObject: AnswerObject
  listDisplay: ListDisplayFormat
  diagramDisplay: DiagramDisplayFormat
  handleHighlightAnswerObject: (answerObjectId: string) => void
  handleHideAnswerObject: (answerObjectId: string) => void
  handleAnswerObjectRemove: (answerObjectId: string) => void
}) => {
  const answerObjectComplete = answerObject.complete
  const answerObjectHighlighted = synced.answerObjectIdsHighlighted.includes(
    answerObject.id
  )
  const answerObjectHidden = synced.answerObjectIdsHidden.includes(
    answerObject.id
  )

  const loadingComponent = (
    <div className="answer-loading-placeholder">
      <PuffLoader size={32} color="#57068c" />
    </div>
  )

  const contentComponent =
    listDisplay === 'summary' ? (
      answerObject.summary.length ? (
        <>{answerObject.summary}</>
      ) : (
        loadingComponent
      )
    ) : listDisplay === 'slide' ? (
      answerObject.slide.content.length ? (
        <SlideAnswerText content={answerObject.slide.content} />
      ) : (
        loadingComponent
      )
    ) : (
      <AnswerText
        answerObjectId={answerObject.id}
        rawAnswer={answerObject.originText}
        highlightedRanges={synced.highlightedCoReferenceOriginRanges}
      />
    )

  return (
    <div
      key={`answer-range-${answerObject.id}`}
      className={`answer-item answer-item-block interchange-component${
        index !== 0 ? ' drop-down' : ''
      }${listDisplay === 'slide' ? ' slide-wrapper' : ''}${
        answerObjectHighlighted ? ' highlighted-item' : ''
      }`}
    >
      <div className="answer-item-text">{contentComponent}</div>
      {answerObjectComplete && (
        <div className="answer-block-menu">
          {/* <span
              className={`answer-block-menu-item${
                !modelParsingComplete ? ' disabled' : ''
              }`}
              onClick={() => {
                handleAnswerObjectTellLessOrMore(
                  answerObject.id,
                  'less'
                )
              }}
            >
              less
            </span> */}
          {/* <span
              className={`answer-block-menu-item${
                !modelParsingComplete ? ' disabled' : ''
              }`}
              onClick={() => {
                handleAnswerObjectTellLessOrMore(
                  answerObject.id,
                  'more'
                )
              }}
            >
              more
            </span> */}
          <span
            className={`answer-block-menu-item${
              answerObjectHighlighted ? ' highlighted' : ''
            }`}
            onClick={() => {
              handleHighlightAnswerObject(answerObject.id)
            }}
          >
            highlight
          </span>
          <span
            className={`answer-block-menu-item${
              answerObjectHidden ? ' hidden' : ''
            }`}
            onClick={() => {
              handleHideAnswerObject(answerObject.id)
            }}
          >
            hide
          </span>
          <span
            className={`answer-block-menu-item`}
            onClick={() => {
              handleAnswerObjectRemove(answerObject.id)
            }}
          >
            remove
          </span>
        </div>
      )}
    </div>
  )
}

const AnswerText = ({
  answerObjectId,
  rawAnswer,
  highlightedRanges,
}: {
  answerObjectId: string
  rawAnswer: string
  highlightedRanges: OriginRange[]
}) => {
  // const displayText = removeAnnotations(
  //   rawAnswer.slice(slicingRange.start, slicingRange.end + 1)
  // )
  // const text = rawAnswer.slice(slicingRange.start, slicingRange.end + 1)
  const text = rawAnswer

  const sentences = splitAnnotatedSentences(text)

  let globalStart = 0
  return (
    <div className="answer-text" data-id={answerObjectId}>
      {sentences.map((sentence, sentenceIndex) => (
        <span key={sentenceIndex} className="sentence-segment">
          {sentence.split(/(\[[^\]]+\])/).map((part, partIndex) => {
            const isAnnotated = part.startsWith('[') && part.endsWith(']')
            // const partNodeIds = isAnnotated ? getPartNodeIds(part) : []

            const start = globalStart
            globalStart += part.length

            // if (part === '\n') {
            //   globalStart += 1
            //   return <></>
            // }

            return (
              <span
                key={`${sentenceIndex}-${partIndex}`}
                className={
                  'text-segment' +
                  (isAnnotated ? ' annotated' : '') +
                  (highlightedRanges.some(
                    ({
                      nodeIds: highlightedNodeIds,
                      start: highlightedStart,
                      answerObjectId: highlightedAnswerObjectId,
                    }) => {
                      // if ((part.match(/\$/g) || []).length > 1) return false
                      // node
                      if (highlightedNodeIds.length === 1) {
                        return (
                          (part.match(/\$/g) || []).length === 1 &&
                          highlightedNodeIds.some(highlightedNodeId =>
                            part.includes(`(${highlightedNodeId})`)
                          )
                        )
                      }

                      // edge
                      return (
                        answerObjectId === highlightedAnswerObjectId &&
                        start === highlightedStart
                      )
                    }
                  )
                    ? ' highlighted-answer-text'
                    : '')
                }
                data-start={start}
              >
                {/* {removeAnnotations(part)} */}
                {part}
              </span>
            )
          })}
        </span>
      ))}
    </div>
  )
}
