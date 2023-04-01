import React, { createContext, useCallback, useContext } from 'react'

import { AnswerObject, OriginAnswerRange, QuestionAndAnswer } from '../App'
import {
  deepCopyQuestionAndAnswer,
  newQuestionAndAnswer,
} from '../utils/chatAppUtils'
import { Answer } from './Answer'
import { ChatContext } from './Contexts'
import { Question } from './Question'
import { ReactFlowProvider } from 'reactflow'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSetSyncedOriginRanges: (originRanges: OriginAnswerRange[]) => void
  handleSetSyncedHighlightedAnswerObjectIds: (ids: string[]) => void
  handleRemoveAnswerObject: (id: string) => void
}
////
export const InterchangeContext = createContext<InterchangeContextProps>({
  questionAndAnswer: newQuestionAndAnswer(),
  handleSetSyncedOriginRanges: () => {},
  handleSetSyncedHighlightedAnswerObjectIds: () => {},
  handleRemoveAnswerObject: () => {},
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

  // const answerItemRef = createRef<HTMLDivElement>()

  const handleSetSyncedOriginRanges = useCallback(
    (originRanges: OriginAnswerRange[]) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  synced: {
                    ...questionAndAnswer.synced,
                    originRanges,
                  },
                }
              }
              return questionAndAnswer
            }
          )
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleSetSyncedHighlightedAnswerObjectIds = useCallback(
    (ids: string[]) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  synced: {
                    ...questionAndAnswer.synced,
                    highlightedAnswerObjectIds: ids,
                  },
                }
              }
              return questionAndAnswer
            }
          )
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleRemoveAnswerObject = useCallback(
    (answerObjectId: string) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  answerObjects: questionAndAnswer.answerObjects.filter(
                    (answerObject: AnswerObject) =>
                      answerObject.id !== answerObjectId
                  ),
                }
              }
              return questionAndAnswer
            }
          )
      )
    },
    [id, setQuestionsAndAnswers]
  )

  return (
    <InterchangeContext.Provider
      value={{
        questionAndAnswer: data,
        handleSetSyncedOriginRanges,
        handleSetSyncedHighlightedAnswerObjectIds,
        handleRemoveAnswerObject,
      }}
    >
      <div className="interchange-item">
        <ReactFlowProvider>
          <Question key={`question-${data.id}`} />
          {answer.length > 0 && <Answer key={`answer-${data.id}`} />}
        </ReactFlowProvider>
      </div>
    </InterchangeContext.Provider>
  )
}
