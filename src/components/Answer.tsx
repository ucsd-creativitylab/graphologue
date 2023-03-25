import React from 'react'
import { PuffLoader } from 'react-spinners'

import { QuestionAndAnswer } from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'

export const Answer = ({
  questionAndAnswer: {
    answer,
    answerInformationArray,
    modelAnsweringRawResponseComplete,
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  return (
    <div className="answer-wrapper">
      <div
        className={`answer-item-display answer-item interchange-component${
          modelAnsweringRawResponseComplete
            ? ' answer-side'
            : ' answer-centered'
        }`}
      >
        {answer}
      </div>
      {/* <div className="answer-item-height answer-item interchange-component">
        {answer}
      </div> */}
      {answerInformationArray.length > 0 ? (
        <ReactFlowComponent />
      ) : modelAnsweringRawResponseComplete ? (
        <div className="react-flow-loading-placeholder">
          <PuffLoader size={32} color="#57068c" />
        </div>
      ) : (
        <></>
      )}
    </div>
  )
}
