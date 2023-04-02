import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { useReactFlow } from 'reactflow'
import dagre from 'dagre'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import VerticalSplitRoundedIcon from '@mui/icons-material/VerticalSplitRounded'
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import CropLandscapeRoundedIcon from '@mui/icons-material/CropLandscapeRounded'

import { QuestionAndAnswer, OriginRange } from '../App'
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
export interface AnswerContextProps {
  handleOrganizeNodes: () => void
}

export const AnswerContext = createContext<AnswerContextProps>(
  {} as AnswerContextProps
)

export const Answer = () => {
  const { questionAndAnswer } = useContext(InterchangeContext)
  const {
    id,
    answerObjects,
    modelStatus: { modelParsing },
    synced,
    synced: { answerObjectIdsHidden },
  } = questionAndAnswer as QuestionAndAnswer

  const { setNodes, setEdges, fitView, getViewport, setViewport } =
    useReactFlow()

  const stableDagreGraph = useRef(new dagre.graphlib.Graph())
  const viewFittingJobs = useRef<ViewFittingJob[]>([])
  const viewFittingJobRunning = useRef(false)

  const prevNodeSnippets = useRef<NodeSnippet[]>([])
  // const prevEdges = useRef<Edge[]>([])

  // ! put all node and edge entities together
  const nodeEntities = mergeNodeEntities(answerObjects, answerObjectIdsHidden)
  const edgeEntities = mergeEdgeEntities(answerObjects, answerObjectIdsHidden)

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
        nodesBounding.width < viewBounding.width &&
        nodesBounding.height < viewBounding.height
      ) {
        fitView(viewFittingOptions)
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
            duration: viewFittingOptions.duration,
          }
        )
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
      synced
    )

    setNodes(newNodes)
    setEdges(newEdges)

    const newNodeSnippets: NodeSnippet[] = newNodes.map(n => ({
      id: n.id,
      label: (n.data as CustomNodeData).label,
      position: {
        x: n.position.x,
        y: n.position.y,
      },
      width: n.width ?? hardcodedNodeWidthEstimation(n.data.label),
      height: n.height ?? hardcodedNodeSize.height,
    }))

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

    const newNodeSnippets: NodeSnippet[] = newNodes.map(n => ({
      id: n.id,
      label: (n.data as CustomNodeData).label,
      position: {
        x: n.position.x,
        y: n.position.y,
      },
      width: n.width ?? hardcodedNodeWidthEstimation(n.data.label),
      height: n.height ?? hardcodedNodeSize.height,
    }))

    prevNodeSnippets.current = newNodeSnippets
  }, [edgeEntities, nodeEntities, setEdges, setNodes, synced])

  return (
    <AnswerContext.Provider
      value={{
        handleOrganizeNodes,
      }}
    >
      <div className="answer-wrapper" data-id={id}>
        {/* 0 */}
        <RawAnswer
          key={`raw-answer-${id}`}
          questionAndAnswer={questionAndAnswer}
        />

        {/* <div className="answer-item-height answer-item interchange-component">
        {answer}
      </div> */}

        {/* 1 */}
        <ReactFlowObjectContext.Provider
          value={{
            // nodeEntities: answerObjects.reduce(
            //   (acc, { nodeEntities }) => [...acc, ...nodeEntities],
            //   [] as NodeEntity[]
            // ),
            // edgeEntities: answerObjects.reduce(
            //   (acc, { edgeEntities }) => [...acc, ...edgeEntities],
            //   [] as EdgeEntity[]
            // ),
            generatingFlow: modelParsing,
          }}
        >
          <ReactFlowComponent key={`react-flow-${id}`} id={id} />
        </ReactFlowObjectContext.Provider>
        {/* {modelAnsweringComplete && modelParsingComplete ? (
        <></>
      ) : modelAnsweringComplete ? (
        <div className="react-flow-loading-placeholder">
          <PuffLoader size={32} color="#57068c" />
        </div>
      ) : (
        <></>
      )} */}
      </div>
    </AnswerContext.Provider>
  )
}

export type ListDisplayFormat = 'original' | 'summary' | 'slide'

const RawAnswer = ({
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
        <button
          // disabled={!canSwitchBlockDisplay}
          className="bar-button"
          onClick={handleSwitchBlockDisplay}
        >
          {/* {blockDisplay ? <ViewColumnRoundedIcon style={{
              transform: 'rotate(90deg)'
            }} /> : <NotesRoundedIcon />} */}
          <VerticalSplitRoundedIcon />
          {/* {blockDisplay ? <span>list</span> : <span>paragraph</span>} */}
        </button>
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
      </div>

      {/* display in block */}
      {blockDisplay ? (
        <div className={`answer-block-list`} data-id={id}>
          {answerObjects.map((answerObject, index) => {
            const answerObjectComplete = answerObject.complete

            const answerObjectHighlighted =
              synced.answerObjectIdsHighlighted.includes(answerObject.id)

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
                  highlightedRanges={synced.highlightedOriginRanges}
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
          })}
        </div>
      ) : (
        /* -------------------------------------------------------------------------- */
        /* ------------------------------- full answer ------------------------------ */
        <div className={`answer-item answer-full-block interchange-component`}>
          <div className="answer-item-text">
            {answerObjects.map((answerObject, index) => (
              <AnswerText
                key={`answer-range-in-full-text-${answerObject.id}`}
                answerObjectId={answerObject.id}
                rawAnswer={answerObject.originText}
                highlightedRanges={synced.highlightedOriginRanges}
              />
            ))}
          </div>
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
                  (highlightedRanges.some(range => {
                    return (
                      range.answerObjectId === answerObjectId &&
                      range.start === start
                    )
                  })
                    ? ' highlighted-answer-text'
                    : '')
                }
                data-start={start}
              >
                {part}
              </span>
            )
          })}
        </span>
      ))}
    </div>
  )

  /*
  highlightedRanges.sort((a, b) => a.start - b.start)

  // remove the highlighted ranges that are not in the slicing range
  const filteredHighlightedRanges = highlightedRanges.filter(
    range => !(range.end < slicingRange.start || range.start > slicingRange.end)
  )

  if (filteredHighlightedRanges.length === 0) {
    return <span className="answer-text">{displayText}</span>
  }

  const textComponents: JSX.Element[] = [] // array of <span> or <span className="highlighted">
  let browsedStartingIndex = slicingRange.start

  filteredHighlightedRanges.forEach((range, index) => {
    if (range.start > browsedStartingIndex) {
      // add the text before the highlighted range
      textComponents.push(
        <span key={`${rangeToId(range)}-before`} className="answer-text">
          {rawAnswer.slice(browsedStartingIndex, range.start)}
        </span>
      )
    }

    // add the highlighted range
    textComponents.push(
      <span
        key={`${rangeToId(range)}-highlighted`}
        className="answer-text highlighted-answer-text"
      >
        {rawAnswer.slice(
          Math.max(range.start, slicingRange.start),
          Math.min(range.end + 1, slicingRange.end + 1)
        )}
      </span>
    )

    browsedStartingIndex = range.end + 1

    if (
      index === filteredHighlightedRanges.length - 1 &&
      slicingRange.end > range.end
    ) {
      // add the text after the last highlighted range
      textComponents.push(
        <span key={`${rangeToId(range)}-after`} className="answer-text">
          {rawAnswer.slice(browsedStartingIndex, slicingRange.end + 1)}
        </span>
      )
    }
  })

  return <>{textComponents}</>
  */
}
