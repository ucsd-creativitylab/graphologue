import React, { useEffect, useState } from 'react'
import { Edge, Node } from 'reactflow'
import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestionAndAnswer } from './utils/chatAppUtils'

export interface AnswerSlideObject {
  content: string
}

export interface RawAnswerRange {
  start: number
  end: number
}

export interface AnswerRelationshipObject {
  origin: RawAnswerRange
  source: string
  target: string
  edge: string
}

export interface AnswerReactFlowObject {
  nodes: Node[]
  edges: Edge[]
}

export interface AnswerObject {
  id: string
  origin: RawAnswerRange
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

export interface QuestionAndAnswerHighlighted {
  origins: RawAnswerRange[]
  answerObjectIds: Set<string>
}
export interface QuestionAndAnswer {
  id: string
  question: string
  answer: string
  answerInformation: AnswerObject[]
  modelStatus: ModelStatus
  reactFlow: AnswerReactFlowObject
  highlighted: QuestionAndAnswerHighlighted
}

export interface PartialQuestionAndAnswer {
  id?: string
  question?: string
  answer?: string
  answerInformation?: AnswerObject[]
  modelStatus?: Partial<ModelStatus>
  reactFlow?: AnswerReactFlowObject
  highlighted?: QuestionAndAnswerHighlighted
}

export const ChatApp = () => {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState<
    QuestionAndAnswer[]
  >([])

  // componentDidMount
  useEffect(() => {
    if (questionsAndAnswers.length === 0)
      setQuestionsAndAnswers([newQuestionAndAnswer()])
    else if (
      questionsAndAnswers[questionsAndAnswers.length - 1].answer.length > 0
    )
      setQuestionsAndAnswers(prevQuestionsAndAnswers => [
        ...prevQuestionsAndAnswers,
        newQuestionAndAnswer(),
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
          <Interchange
            key={`interchange-${questionAndAnswer.id}`}
            data={questionAndAnswer}
          />
        ))}
      </div>
    </ChatContext.Provider>
  )
}
