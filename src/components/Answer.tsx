import React from 'react'
import { QuestionAndAnswer } from '../App'
import ReactFlowComponent from '../componentsFlow/ReactFlowComponent'

export const Answer = ({
  questionAndAnswer: { answer, answerInformationArray },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  return (
    <div className="answer-wrapper">
      <div
        className={`answer-item-display answer-item interchange-component${
          answerInformationArray.length > 0
            ? ' answer-side'
            : ' answer-centered'
        }`}
      >
        {answer}
      </div>
      {/* <div className="answer-item-height answer-item interchange-component">
        {answer}
      </div> */}
      {answerInformationArray.length > 0 && <ReactFlowComponent />}
    </div>
  )
}
