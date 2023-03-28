import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PuffLoader } from 'react-spinners'

import VerticalSplitRoundedIcon from '@mui/icons-material/VerticalSplitRounded'
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded'
import NotesRoundedIcon from '@mui/icons-material/NotesRounded'

import { QuestionAndAnswer, RawAnswerRange } from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'
import { rangesToId } from '../utils/chatAppUtils'

export const Answer = ({
  questionAndAnswer,
  questionAndAnswer: {
    answer,
    answerInformation,
    modelStatus: { modelAnsweringComplete, modelParsingComplete },
    highlighted,
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  return (
    <div className="answer-wrapper">
      <RawAnswer questionAndAnswer={questionAndAnswer} />

      {/* <div className="answer-item-height answer-item interchange-component">
        {answer}
      </div> */}

      {modelAnsweringComplete && modelParsingComplete ? (
        <ReactFlowComponent />
      ) : modelAnsweringComplete ? (
        <div className="react-flow-loading-placeholder">
          <PuffLoader size={32} color="#57068c" />
        </div>
      ) : (
        <></>
      )}
    </div>
  )
}

const RawAnswer = ({
  questionAndAnswer: {
    answer,
    answerInformation,
    highlighted,
    modelStatus: { modelAnsweringComplete },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  const [blockDisplay, setBlockDisplay] = useState(false)
  const [summaryDisplay, setSummaryDisplay] = useState(false)

  const canSwitch = modelAnsweringComplete && answerInformation.length > 0

  const switchedToBlockDisplay = useRef(false)
  useEffect(() => {
    if (canSwitch && !switchedToBlockDisplay.current) {
      switchedToBlockDisplay.current = true
      setBlockDisplay(true)
    }
  }, [canSwitch])

  /* -------------------------------------------------------------------------- */

  const handleSwitchBlockDisplay = useCallback(() => {
    setSummaryDisplay(false)
    setBlockDisplay(prev => !prev)
  }, [])

  const handleSwitchSummaryDisplay = useCallback(() => {
    setSummaryDisplay(prev => !prev)
  }, [])

  return (
    <div
      className={`answer-item-display${
        modelAnsweringComplete ? ' answer-side' : ' answer-centered'
      }`}
    >
      {canSwitch && (
        <div className="block-display-switches">
          <button className="bar-button" onClick={handleSwitchBlockDisplay}>
            {/* {blockDisplay ? <ViewColumnRoundedIcon style={{
              transform: 'rotate(90deg)'
            }} /> : <NotesRoundedIcon />} */}
            <VerticalSplitRoundedIcon />
            {blockDisplay ? <span>list</span> : <span>paragraph</span>}
          </button>
          <button
            disabled={
              !blockDisplay ||
              !answerInformation.some(a => a.summary.length > 0)
            }
            className="bar-button"
            onClick={handleSwitchSummaryDisplay}
          >
            {summaryDisplay ? <ShortTextRoundedIcon /> : <NotesRoundedIcon />}
            {summaryDisplay ? <span>summary</span> : <span>original</span>}
          </button>
        </div>
      )}
      {blockDisplay ? (
        <div className={`answer-block-list`}>
          {answerInformation.map((answerObject, index) => {
            return (
              <div
                key={rangesToId(answerObject.origin)}
                className={`answer-item interchange-component${
                  index !== 0 ? ' drop-down' : ''
                }`}
              >
                {summaryDisplay
                  ? answerObject.summary
                  : answerObject.origin
                      .map((originRange: RawAnswerRange) =>
                        answer.slice(originRange.start, originRange.end + 1)
                      )
                      .join(' ')}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={`answer-item interchange-component`}>{answer}</div>
      )}
    </div>
  )
}
