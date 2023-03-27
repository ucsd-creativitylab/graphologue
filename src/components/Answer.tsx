import React from 'react'
import { PuffLoader } from 'react-spinners'

import { QuestionAndAnswer } from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'

export const Answer = ({
  questionAndAnswer: {
    answer,
    answerInformation,
    modelStatus: { modelAnsweringComplete, modelParsingComplete },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  return (
    <div className="answer-wrapper">
      <div
        className={`answer-item-display answer-item interchange-component${
          modelAnsweringComplete ? ' answer-side' : ' answer-centered'
        }`}
      >
        {answer}
      </div>

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
