import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PuffLoader } from 'react-spinners'

import NotesRoundedIcon from '@mui/icons-material/NotesRounded'
import ViewAgendaRoundedIcon from '@mui/icons-material/ViewAgendaRounded'

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
    setBlockDisplay(prev => !prev)
  }, [])

  return (
    <div
      className={`answer-item-display${
        modelAnsweringComplete ? ' answer-side' : ' answer-centered'
      }`}
    >
      {canSwitch && (
        <div className="block-display-switch">
          <button className="bar-button" onClick={handleSwitchBlockDisplay}>
            {blockDisplay ? <ViewAgendaRoundedIcon /> : <NotesRoundedIcon />}
          </button>
        </div>
      )}
      {blockDisplay ? (
        <div className={`answer-block-list`}>
          {answerInformation.map((answerObject, index) => (
            <div
              key={rangesToId(answerObject.origin)}
              className={`answer-item interchange-component${
                index !== 0 ? ' drop-down' : ''
              }`}
            >
              {answerObject.origin
                .map((originRange: RawAnswerRange) =>
                  answer.slice(originRange.start, originRange.end + 1)
                )
                .join(' ')}
            </div>
          ))}
        </div>
      ) : (
        <div className={`answer-item interchange-component`}>{answer}</div>
      )}
    </div>
  )
}
