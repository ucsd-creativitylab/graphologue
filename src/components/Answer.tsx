import React, { createContext, useCallback, useContext, useState } from 'react'
import { PuffLoader } from 'react-spinners'

import VerticalSplitRoundedIcon from '@mui/icons-material/VerticalSplitRounded'
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import CropLandscapeRoundedIcon from '@mui/icons-material/CropLandscapeRounded'

import {
  QuestionAndAnswer,
  OriginAnswerRange,
  NodeEntity,
  EdgeEntity,
} from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'
import { rangeToId } from '../utils/chatAppUtils'
import { InterchangeContext } from './Interchange'
import { SlideAnswerText } from './SlideAnswer'
import { removeAnnotations } from '../utils/responseProcessing'

export interface ReactFlowObjectContextProps {
  nodeEntities: NodeEntity[]
  edgeEntities: EdgeEntity[]
  generatingFlow: boolean
}

export const ReactFlowObjectContext =
  createContext<ReactFlowObjectContextProps>({
    nodeEntities: [],
    edgeEntities: [],
    generatingFlow: false,
  })

export const Answer = () => {
  const { questionAndAnswer } = useContext(InterchangeContext)
  const {
    id,
    answerObjects,
    modelStatus: { modelParsing },
  } = questionAndAnswer as QuestionAndAnswer

  return (
    <div className="answer-wrapper">
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
          nodeEntities: answerObjects.reduce(
            (acc, { nodeEntities }) => [...acc, ...nodeEntities],
            [] as NodeEntity[]
          ),
          edgeEntities: answerObjects.reduce(
            (acc, { edgeEntities }) => [...acc, ...edgeEntities],
            [] as EdgeEntity[]
          ),
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
  )
}

export type ListDisplayFormat = 'original' | 'summary' | 'slide'

const RawAnswer = ({
  questionAndAnswer: {
    answer,
    answerObjects,
    highlighted,
    modelStatus: { modelAnsweringComplete },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
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
        <div className={`answer-block-list`}>
          {answerObjects.map((answerObject, index) => {
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
                  rawAnswer={answer}
                  highlightedRanges={highlighted.originRanges}
                  slicingRange={answerObject.originRange}
                />
              )

            return (
              <div
                key={`answer-range-${answerObject.originRange.start}`}
                className={`answer-item interchange-component${
                  index !== 0 ? ' drop-down' : ''
                }${listDisplay === 'slide' ? ' slide-wrapper' : ''}`}
              >
                {contentComponent}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`answer-item interchange-component`}>
          <AnswerText
            rawAnswer={answer}
            highlightedRanges={highlighted.originRanges}
            slicingRange={{
              start: 0,
              end: answer.length - 1,
            }}
          />
        </div>
      )}
    </div>
  )
}

const AnswerText = ({
  rawAnswer,
  highlightedRanges,
  slicingRange,
}: {
  rawAnswer: string
  highlightedRanges: OriginAnswerRange[]
  slicingRange: OriginAnswerRange
}) => {
  // const displayText = removeAnnotations(
  //   rawAnswer.slice(slicingRange.start, slicingRange.end + 1)
  // )
  const displayText = rawAnswer.slice(slicingRange.start, slicingRange.end + 1)

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
}
