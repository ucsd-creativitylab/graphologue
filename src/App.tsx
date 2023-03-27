import React, { useEffect, useState } from 'react'
import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestion } from './utils/chatAppUtils'

export interface AnswerSlideObject {
  title: string
  content: string
}

export interface RawAnswerRange {
  start: number
  end: number
}

export interface AnswerRelationshipObject {
  origin: RawAnswerRange[]
  source: string
  target: string
  edge: string
}

export interface AnswerObject {
  origin: RawAnswerRange[]
  summary: string
  slide: AnswerSlideObject
  relationships: AnswerRelationshipObject[]
  complete: boolean
}

interface ModelStatus {
  modelAnswering: boolean
  modelParsing: boolean
  modelAnsweringComplete: boolean
  modelParsingComplete: boolean
  modelError: boolean
}
export interface QuestionAndAnswer {
  id: string
  question: string
  answer: string
  answerInformation: AnswerObject[]
  modelStatus: ModelStatus
  highlighted: RawAnswerRange[]
}

export interface PartialQuestionAndAnswer {
  id?: string
  question?: string
  answer?: string
  answerInformation?: AnswerObject[]
  modelStatus?: Partial<ModelStatus>
  highlighted?: RawAnswerRange[]
}

export const ChatApp = () => {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState<
    QuestionAndAnswer[]
  >([])

  // componentDidMount
  useEffect(() => {
    if (questionsAndAnswers.length === 0)
      setQuestionsAndAnswers([newQuestion()])
    else if (
      questionsAndAnswers[questionsAndAnswers.length - 1].answer.length > 0
    )
      setQuestionsAndAnswers(prevQuestionsAndAnswers => [
        ...prevQuestionsAndAnswers,
        newQuestion(),
      ])
  }, [questionsAndAnswers])

  return (
    <ChatContext.Provider
      value={{
        questionsAndAnswersCount: questionsAndAnswers.length,
        setQuestionsAndAnswers,
      }}
    >
      <div className="chat-app">
        {questionsAndAnswers.map((questionAndAnswer, index) => (
          <Interchange key={index} data={questionAndAnswer} />
        ))}
      </div>
    </ChatContext.Provider>
  )
}
