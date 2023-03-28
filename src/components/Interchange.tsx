import React, { createContext } from 'react'

import { QuestionAndAnswer } from '../App'
import { newQuestion } from '../utils/chatAppUtils'
import { Answer } from './Answer'
import { Question } from './Question'

export const InterchangeContext = createContext<QuestionAndAnswer>(
  newQuestion()
)

export interface InterchangeProps {
  data: QuestionAndAnswer
}

export const Interchange = ({
  data,
  data: { question, answer },
}: InterchangeProps) => {
  return (
    <InterchangeContext.Provider value={data}>
      <div className="interchange-item">
        <Question key={`question-${data.id}`} />
        {answer.length > 0 && <Answer key={`answer-${data.id}`} />}
      </div>
    </InterchangeContext.Provider>
  )
}
