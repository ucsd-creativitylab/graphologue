import React, { createContext, useCallback, useContext } from 'react'

import { QuestionAndAnswer, QuestionAndAnswerHighlighted } from '../App'
import {
  deepCopyQuestionAndAnswer,
  newQuestionAndAnswer,
} from '../utils/chatAppUtils'
import { Answer } from './Answer'
import { ChatContext } from './Contexts'
import { Question } from './Question'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSetHighlighted: (highlighted: QuestionAndAnswerHighlighted) => void
}
////
export const InterchangeContext = createContext<InterchangeContextProps>({
  questionAndAnswer: newQuestionAndAnswer(),
  handleSetHighlighted: () => {},
})

/* -------------------------------------------------------------------------- */

export interface InterchangeProps {
  data: QuestionAndAnswer
}
////
export const Interchange = ({
  data,
  data: { id, question, answer },
}: InterchangeProps) => {
  const { setQuestionsAndAnswers } = useContext(ChatContext)

  const handleSetHighlighted = useCallback(
    (highlighted: QuestionAndAnswerHighlighted) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map((questionAndAnswer: QuestionAndAnswer) => {
            if (questionAndAnswer.id === id) {
              return {
                ...deepCopyQuestionAndAnswer(questionAndAnswer),
                highlighted,
              } as QuestionAndAnswer
            }
            return questionAndAnswer
          })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  return (
    <InterchangeContext.Provider
      value={{
        questionAndAnswer: data,
        handleSetHighlighted,
      }}
    >
      <div className="interchange-item">
        <Question key={`question-${data.id}`} />
        {answer.length > 0 && <Answer key={`answer-${data.id}`} />}
      </div>
    </InterchangeContext.Provider>
  )
}
