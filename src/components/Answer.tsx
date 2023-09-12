import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Node, ReactFlowProvider, useReactFlow } from 'reactflow'
import dagre from 'dagre'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import CropLandscapeRoundedIcon from '@mui/icons-material/CropLandscapeRounded'
import HorizontalSplitRoundedIcon from '@mui/icons-material/HorizontalSplitRounded'
import RectangleRoundedIcon from '@mui/icons-material/RectangleRounded'
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded'
import MoneyOffRoundedIcon from '@mui/icons-material/MoneyOffRounded'
import SubjectRoundedIcon from '@mui/icons-material/SubjectRounded'
////
import SignalWifi1BarRoundedIcon from '@mui/icons-material/SignalWifi1BarRounded'
import SignalWifi4BarRoundedIcon from '@mui/icons-material/SignalWifi4BarRounded'

import {
  QuestionAndAnswer,
  OriginRange,
  AnswerObject,
  EdgeEntity,
  AnswerObjectEntitiesTarget,
  DebugModeContext,
} from '../App'
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
  getRangeFromStart,
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
import { makeFlowTransition } from '../utils/flowChangingTransition'

export interface ReactFlowObjectContextProps {
  // nodeEntities: NodeEntity[]
  // edgeEntities: EdgeEntity[]
  answerObjectId: string
  generatingFlow: boolean
}

export const ReactFlowObjectContext =
  createContext<ReactFlowObjectContextProps>({
    // nodeEntities: [],
    // edgeEntities: [],
    answerObjectId: '',
    generatingFlow: false,
  })

////
export interface AnswerBlockContextProps {
  handleOrganizeNodes: () => void
}

export const AnswerBlockContext = createContext<AnswerBlockContextProps>(
  {} as AnswerBlockContextProps,
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

interface AnswerListContextProps {
  // synced: QuestionAndAnswerSynced
  handleHighlightAnswerObject: (
    answerObjectId: string,
    addOrRemove: 'add' | 'remove',
    temp: boolean,
  ) => void
  handleHideAnswerObject: (answerObjectId: string) => void
  handleAnswerObjectSwitchListDisplayFormat: (
    answerObjectId: string,
    newDisplay: ListDisplayFormat,
  ) => void
  handleAnswerObjectRemove: (answerObjectId: string) => void
}
const AnswerListContext = createContext<AnswerListContextProps>(
  {} as AnswerListContextProps,
)

const AnswerListView = ({
  questionAndAnswer,
  questionAndAnswer: {
    id,
    answer,
    answerObjects,
    synced,
    synced: { saliencyFilter },
    modelStatus: { modelParsingComplete },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  const { debugMode, setDebugMode } = useContext(DebugModeContext)

  const {
    handleAnswerObjectSwitchListDisplayFormat,
    handleSetSyncedAnswerObjectIdsHighlighted,
    handleSetSyncedAnswerObjectIdsHidden,
    // handleAnswerObjectTellLessOrMore,
    handleAnswerObjectRemove,
    handleSwitchSaliency,
  } = useContext(InterchangeContext)

  const [diagramDisplay, setDiagramDisplay] =
    useState<DiagramDisplayFormat>('split')

  /* -------------------------------------------------------------------------- */

  const handleSwitchDiagramDisplay = useCallback(
    (newDisplayFormat: DiagramDisplayFormat) => {
      setDiagramDisplay(newDisplayFormat)

      // remove all highlighted and hidden answer objects if switching to split
      if (newDisplayFormat === 'split') {
        handleSetSyncedAnswerObjectIdsHighlighted([], false)
        handleSetSyncedAnswerObjectIdsHidden([])
      }

      // smoothly scroll .answer-text with data-id === answerObjectId into view
      const answerObjectElement = document.querySelector(
        `.answer-wrapper[data-id="${id}"]`,
      )
      if (answerObjectElement) {
        answerObjectElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    },
    [
      handleSetSyncedAnswerObjectIdsHidden,
      handleSetSyncedAnswerObjectIdsHighlighted,
      id,
    ],
  )

  const handleSwitchSaliencyFilter = useCallback(() => {
    makeFlowTransition()
    handleSwitchSaliency()
  }, [handleSwitchSaliency])

  // const handleSwitchDebug = useCallback(() => {}, [])

  const handleHighlightAnswerObject = useCallback(
    (answerObjectId: string, addOrRemove: 'add' | 'remove', temp: boolean) => {
      const currentIds = temp
        ? synced.answerObjectIdsHighlightedTemp
        : synced.answerObjectIdsHighlighted

      if (addOrRemove === 'remove') {
        if (temp) handleSetSyncedAnswerObjectIdsHighlighted([], true)
        else
          handleSetSyncedAnswerObjectIdsHighlighted(
            currentIds.filter(id => id !== answerObjectId),
            false,
          )
      } else {
        if (temp)
          handleSetSyncedAnswerObjectIdsHighlighted([answerObjectId], true)
        else
          handleSetSyncedAnswerObjectIdsHighlighted(
            [...currentIds, answerObjectId],
            temp,
          )
      }
    },
    [
      handleSetSyncedAnswerObjectIdsHighlighted,
      synced.answerObjectIdsHighlighted,
      synced.answerObjectIdsHighlightedTemp,
    ],
  )

  const handleHideAnswerObject = useCallback(
    (answerObjectId: string) => {
      const currentIds = synced.answerObjectIdsHidden

      if (currentIds.includes(answerObjectId)) {
        handleSetSyncedAnswerObjectIdsHidden(
          currentIds.filter(id => id !== answerObjectId),
        )
      } else
        handleSetSyncedAnswerObjectIdsHidden([...currentIds, answerObjectId])
    },
    [handleSetSyncedAnswerObjectIdsHidden, synced.answerObjectIdsHidden],
  )

  return (
    <AnswerListContext.Provider
      value={{
        handleHighlightAnswerObject,
        handleHideAnswerObject,
        handleAnswerObjectSwitchListDisplayFormat,
        handleAnswerObjectRemove,
      }}
    >
      <div
        // className={`answer-item-display${
        //   modelAnsweringComplete ? ' answer-side' : ' answer-centered'
        // }`}
        className={`answer-item-display`}
        data-id={id}
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
              className={`bar-button${
                diagramDisplay === 'merged' ? ' selected' : ''
              }`}
              onClick={() => handleSwitchDiagramDisplay('merged')}
            >
              <RectangleRoundedIcon />
              <span>merged diagram</span>
            </button>
          </div>

          <button
            className={`bar-button`}
            onClick={() => handleSwitchSaliencyFilter()}
          >
            {saliencyFilter === 'high' ? (
              <SignalWifi1BarRoundedIcon
                style={{
                  transform: 'rotate(180deg)',
                }}
              />
            ) : (
              <SignalWifi4BarRoundedIcon
                style={{
                  transform: 'rotate(180deg)',
                }}
              />
            )}
            <span>saliency</span>
          </button>
          <button
            className={`bar-button`}
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? <AttachMoneyRoundedIcon /> : <MoneyOffRoundedIcon />}
            {/* <span>{debugMode ? '[annotation ($N1)]' : 'annotation'}</span> */}
            <span>annotation</span>
          </button>
        </div>

        {/* display in block */}

        <div
          className={`answer-block-list${
            diagramDisplay === 'merged' ? '-merged-diagram' : ''
          }`}
          data-id={id}
        >
          {/* ! MAP */}
          {diagramDisplay === 'merged' ? (
            <>
              <div className="answer-text-block-list">
                {answerObjects.map((answerObject, index) => (
                  <AnswerTextBlock
                    key={`answer-block-item-${id}-${answerObject.id}`}
                    index={index}
                    questionAndAnswer={questionAndAnswer}
                    answerObject={answerObject}
                    diagramDisplay={diagramDisplay}
                    lastTextBlock={index === answerObjects.length - 1}
                  />
                ))}
              </div>
              <ReactFlowProvider
                key={`answer-block-flow-provider-${id}-${answerObjects[0].id}`}
              >
                <AnswerBlockItem
                  key={`answer-block-item-${id}-${answerObjects[0].id}`}
                  index={0}
                  questionAndAnswer={questionAndAnswer}
                  answerObject={answerObjects[0]}
                  diagramDisplay={diagramDisplay}
                  lastTextBlock={false}
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
                  diagramDisplay={diagramDisplay}
                  lastTextBlock={index === answerObjects.length - 1}
                />
              </ReactFlowProvider>
            ))
          )}
        </div>
      </div>
    </AnswerListContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */

export const AnswerBlockItem = ({
  index,
  questionAndAnswer,
  questionAndAnswer: {
    id,
    answerObjects,
    modelStatus: { modelParsingComplete },
    synced,
    synced: { answerObjectIdsHidden, saliencyFilter },
  },
  answerObject,
  diagramDisplay,
  lastTextBlock,
}: {
  index: number
  questionAndAnswer: QuestionAndAnswer
  answerObject: AnswerObject
  diagramDisplay: DiagramDisplayFormat
  lastTextBlock: boolean
}) => {
  /* -------------------------------------------------------------------------- */
  const isForMergedDiagram = diagramDisplay === 'merged'
  const useSummary = answerObject.answerObjectSynced.listDisplay === 'summary'

  const { setNodes, setEdges, fitView, getViewport, setViewport } =
    useReactFlow()

  const stableDagreGraph = useRef(new dagre.graphlib.Graph())
  const viewFittingJobs = useRef<ViewFittingJob[]>([])
  const viewFittingJobRunning = useRef(false)
  const firstCameraJob = useRef(true)

  const prevNodeSnippets = useRef<NodeSnippet[]>([])
  // const prevEdges = useRef<Edge[]>([])

  useEffect(() => {
    stableDagreGraph.current = new dagre.graphlib.Graph()
  }, [useSummary, saliencyFilter, answerObjectIdsHidden])

  // ! put all node and edge entities together
  // const nodeEntities = mergeNodeEntities(answerObjects, answerObjectIdsHidden)
  // const edgeEntities = mergeEdgeEntities(answerObjects, answerObjectIdsHidden)
  const nodeEntities = isForMergedDiagram
    ? mergeNodeEntities(answerObjects, answerObjectIdsHidden)
    : useSummary
    ? answerObject.summary.nodeEntities
    : answerObject.originText.nodeEntities
  const edgeEntities: EdgeEntity[] = isForMergedDiagram
    ? mergeEdgeEntities(answerObjects, answerObjectIdsHidden)
    : useSummary
    ? answerObject.summary.edgeEntities
    : answerObject.originText.edgeEntities

  const runViewFittingJobs = useCallback(() => {
    if (viewFittingJobRunning.current || viewFittingJobs.current.length === 0)
      return

    const job = viewFittingJobs.current.pop()
    if (!job) return

    viewFittingJobRunning.current = true

    setTimeout(() => {
      const nodesBounding = getGraphBounds(job.nodes)
      ////
      const reactFlowWrapperElement = document.querySelector(
        '.react-flow-wrapper',
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
          40,
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
          },
        )
        firstCameraJob.current = false
      }

      setTimeout(() => {
        viewFittingJobRunning.current = false
        runViewFittingJobs()
      }, viewFittingOptions.duration)
    }, 10)
  }, [fitView, getViewport, setViewport])

  useEffectEqual(() => {
    const { nodes: newNodes, edges: newEdges } = answerObjectsToReactFlowObject(
      stableDagreGraph.current,
      nodeEntities,
      edgeEntities,
      synced,
      answerObject.answerObjectSynced.collapsedNodes,
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
      }),
    )

    // const nodeSnippetExtraction = (n: NodeSnippet) => ({
    //   id: n.id,
    //   label: n.label,
    // })

    const changedNodeSnippets = [
      ...newNodeSnippets.filter(n => {
        const foundPrevNode = prevNodeSnippets.current.find(
          pN => pN.id === n.id,
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
        pN =>
          !newNodeSnippets.find(n => n.id === pN.id || n.label !== pN.label),
      ),
    ]

    // view tracker
    viewFittingJobs.current.push({
      nodes: copyNodeSnippets(newNodeSnippets),
      changedNodes: copyNodeSnippets(changedNodeSnippets),
    })
    if (viewFittingJobs.current.length > 1) viewFittingJobs.current.shift()
    runViewFittingJobs()

    prevNodeSnippets.current = newNodeSnippets.map(n => ({
      ...n,
      position: {
        ...n.position,
      },
    }))
  }, [
    // we don't care about individuals
    // nodeEntities.map(nE =>
    //   (({ id, displayNodeLabel, pseudo }) => ({
    //     id,
    //     displayNodeLabel,
    //     pseudo,
    //   }))(nE)
    // ),
    // nodeEntities.length,
    nodeEntities,
    edgeEntities,
    // ! should we add this?
    // synced, // ???
    synced.saliencyFilter,
    synced.answerObjectIdsHidden,
    // synced.highlightedCoReferenceOriginRanges,
    answerObject.answerObjectSynced.collapsedNodes,
    setNodes,
    setEdges,
    runViewFittingJobs,
  ])

  const handleOrganizeNodes = useCallback(() => {
    const { nodes: newNodes, edges: newEdges } = answerObjectsToReactFlowObject(
      stableDagreGraph.current,
      nodeEntities,
      edgeEntities,
      synced,
      answerObject.answerObjectSynced.collapsedNodes,
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
      }),
    )

    prevNodeSnippets.current = newNodeSnippets
  }, [
    answerObject.answerObjectSynced.collapsedNodes,
    edgeEntities,
    nodeEntities,
    setEdges,
    setNodes,
    synced,
  ])

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
            diagramDisplay={diagramDisplay}
            lastTextBlock={lastTextBlock}
          />
        )}

        <ReactFlowObjectContext.Provider
          value={{
            answerObjectId: answerObject.id,
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
  diagramDisplay,
  lastTextBlock,
}: {
  index: number
  questionAndAnswer: QuestionAndAnswer
  answerObject: AnswerObject
  diagramDisplay: DiagramDisplayFormat
  lastTextBlock: boolean
}) => {
  const { handleAnswerObjectTellLessOrMore, handleAnswerObjectsAddOneMore } =
    useContext(InterchangeContext)
  const {
    handleHighlightAnswerObject,
    handleHideAnswerObject,
    handleAnswerObjectSwitchListDisplayFormat,
    // handleAnswerObjectRemove,
  } = useContext(AnswerListContext)

  const answerObjectComplete = answerObject.complete

  const answerObjectHighlightedActually =
    synced.answerObjectIdsHighlighted.includes(answerObject.id)
  const answerObjectHighlighted =
    synced.answerObjectIdsHighlighted.includes(answerObject.id) ||
    synced.answerObjectIdsHighlightedTemp.includes(answerObject.id)

  const answerObjectHidden = synced.answerObjectIdsHidden.includes(
    answerObject.id,
  )

  const listDisplay = answerObject.answerObjectSynced.listDisplay
  const diagramMerged = diagramDisplay === 'merged'

  const loadingComponent = (
    <div className="answer-loading-placeholder">
      <PuffLoader size={32} color="#57068c" />
    </div>
  )

  const contentComponent =
    listDisplay === 'summary' ? (
      answerObject.summary.content.length ? (
        <AnswerText
          answerObject={answerObject}
          rawAnswer={answerObject.summary.content}
          entitiesTarget="summary"
          highlightedRanges={synced.highlightedCoReferenceOriginRanges}
        />
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
        answerObject={answerObject}
        rawAnswer={answerObject.originText.content}
        entitiesTarget="originText"
        highlightedRanges={synced.highlightedCoReferenceOriginRanges}
      />
    )

  return (
    <div className="answer-item-wrapper">
      <div
        key={`answer-range-${answerObject.id}`}
        className={`answer-item answer-item-block interchange-component${
          index !== 0 ? (diagramMerged ? ' drop-up-answer' : ' drop-down') : ''
        }${listDisplay === 'slide' ? ' slide-wrapper' : ''}${
          answerObjectHighlighted && diagramMerged ? ' highlighted-item' : ''
        }`}
        onMouseEnter={() => {
          if (diagramMerged && !answerObjectHidden)
            handleHighlightAnswerObject(answerObject.id, 'add', true)
        }}
        onMouseLeave={() => {
          if (diagramMerged && !answerObjectHidden)
            handleHighlightAnswerObject(answerObject.id, 'remove', true)
        }}
      >
        <div className="answer-block-menu">
          <span
            className={`answer-block-menu-item${
              listDisplay === 'original' ? ' highlighted-list-display' : ''
            }`}
            onClick={() => {
              handleAnswerObjectSwitchListDisplayFormat(
                answerObject.id,
                'original',
              )
            }}
          >
            <NotesRoundedIcon />
            original
          </span>
          <span
            className={`answer-block-menu-item${
              listDisplay === 'slide' ? ' highlighted-list-display' : ''
            }${
              answerObjectComplete && modelParsingComplete ? '' : ' disabled'
            }`}
            onClick={() => {
              handleAnswerObjectSwitchListDisplayFormat(
                answerObject.id,
                'slide',
              )
            }}
          >
            <CropLandscapeRoundedIcon />
            outline
          </span>
          <span
            className={`answer-block-menu-item${
              listDisplay === 'summary' ? ' highlighted-list-display' : ''
            }${
              answerObjectComplete && modelParsingComplete ? '' : ' disabled'
            }`}
            onClick={() => {
              handleAnswerObjectSwitchListDisplayFormat(
                answerObject.id,
                'summary',
              )
            }}
          >
            <ShortTextRoundedIcon />
            summary
          </span>

          <span className="answer-block-menu-item-divider">|</span>

          <span
            className={`answer-block-menu-item${
              answerObjectHighlightedActually ? ' highlighted' : ''
            }${!answerObjectComplete || !diagramMerged ? ' disabled' : ''}`}
            onClick={() => {
              handleHighlightAnswerObject(
                answerObject.id,
                answerObjectHighlightedActually ? 'remove' : 'add',
                false,
              )
            }}
          >
            highlight
          </span>
          <span
            className={`answer-block-menu-item${
              answerObjectHidden ? ' hidden' : ''
            }${!answerObjectComplete || !diagramMerged ? ' disabled' : ''}`}
            onClick={() => {
              handleHideAnswerObject(answerObject.id)
            }}
          >
            hide
          </span>
          {/* <span
          className={`answer-block-menu-item`}
          onClick={() => {
            handleAnswerObjectRemove(answerObject.id)
          }}
        >
          remove
        </span> */}
        </div>
        <div className="answer-item-text">{contentComponent}</div>
        {/* {answerObjectComplete && ( */}
        {/* )} */}
        <div className="tell-me-more-wrapper">
          <span
            className={`tell-me-more${
              answerObjectComplete && modelParsingComplete ? '' : ' disabled'
            }`}
            onClick={() => {
              handleAnswerObjectTellLessOrMore(answerObject.id, 'more')
            }}
          >
            tell me more...
          </span>
        </div>
      </div>
      {lastTextBlock && (
        <div
          className={`add-paragraph${
            answerObjectComplete && modelParsingComplete ? '' : ' disabled'
          }`}
          onClick={() => handleAnswerObjectsAddOneMore()}
        >
          <SubjectRoundedIcon />
          <span>add a paragraph</span>
        </div>
      )}
    </div>
  )
}

const AnswerText = ({
  answerObject,
  rawAnswer,
  entitiesTarget,
  highlightedRanges,
}: {
  answerObject: AnswerObject
  rawAnswer: string
  entitiesTarget: AnswerObjectEntitiesTarget
  highlightedRanges: OriginRange[]
}) => {
  const { debugMode } = useContext(DebugModeContext)
  const { handleSetSyncedCoReferenceOriginRanges } =
    useContext(InterchangeContext)

  // const displayText = removeAnnotations(
  //   rawAnswer.slice(slicingRange.start, slicingRange.end + 1)
  // )
  // const text = rawAnswer.slice(slicingRange.start, slicingRange.end + 1)
  const text = rawAnswer
  const sentences = splitAnnotatedSentences(text)

  const prevSyncedList = useRef<OriginRange[]>([])

  const handleHoverAnnotatedTextSegment = useCallback(
    (start: number) => {
      const range = getRangeFromStart(
        start,
        answerObject[entitiesTarget].nodeEntities,
        answerObject[entitiesTarget].edgeEntities,
      )

      if (range) {
        prevSyncedList.current = highlightedRanges.map(r => ({
          ...r,
          nodeIds: [...r.nodeIds],
        }))
        const newRanges = [...new Set([...highlightedRanges, range])]
        handleSetSyncedCoReferenceOriginRanges(newRanges)
      }
    },
    [
      answerObject,
      entitiesTarget,
      handleSetSyncedCoReferenceOriginRanges,
      highlightedRanges,
    ],
  )

  const handleLeaveAnnotatedTextSegment = useCallback(() => {
    handleSetSyncedCoReferenceOriginRanges(prevSyncedList.current)
    prevSyncedList.current = []
  }, [handleSetSyncedCoReferenceOriginRanges])

  let globalStart = 0
  return (
    <div className="answer-text" data-id={answerObject.id}>
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
                  (isAnnotated ? ' annotated text-in' : '') +
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
                            part.includes(`(${highlightedNodeId})`),
                          )
                        )
                      }

                      // edge
                      return (
                        answerObject.id === highlightedAnswerObjectId &&
                        start === highlightedStart
                      )
                    },
                  )
                    ? ' highlighted-answer-text'
                    : '')
                }
                data-start={start}
                ////
                onMouseEnter={() => {
                  handleHoverAnnotatedTextSegment(start)
                }}
                onMouseLeave={() => {
                  handleLeaveAnnotatedTextSegment()
                }}
              >
                {debugMode ? part : removeAnnotations(part)}
              </span>
            )
          })}
        </span>
      ))}
    </div>
  )
}
