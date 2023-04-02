import React, { useEffect, useState } from 'react'

import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestionAndAnswer } from './utils/chatAppUtils'
import {
  EdgeInformation,
  NodeInformation,
  RelationshipSaliency,
} from './utils/responseProcessing'

// import the package.json file
import packageJson from '../package.json'
import { Prompt } from './utils/openAI'

export interface OriginRange {
  start: number
  end: number
  answerObjectId: string
}

export interface NodeEntityIndividual extends NodeInformation {
  // nodeLabel & id
  originRange: OriginRange
  originText: string
}

export interface NodeEntity {
  id: string
  displayNodeLabel: string
  pseudo: boolean
  individuals: NodeEntityIndividual[]
}

export interface EdgeEntity extends EdgeInformation {
  // edgeLabel & edgePairs
  // id: string
  originRange: OriginRange
  originText: string
}

export interface AnswerSlideObject {
  content: string
}

// ! AnswerObject
export interface AnswerObject {
  id: string
  originText: string
  summary: string
  slide: AnswerSlideObject
  nodeEntities: NodeEntity[]
  edgeEntities: EdgeEntity[]
  complete: boolean
}

interface ModelStatus {
  modelAnswering: boolean
  modelParsing: boolean
  modelAnsweringComplete: boolean
  modelParsingComplete: boolean
  modelError: boolean
  modelInitialPrompts: Prompt[]
}

export interface QuestionAndAnswerSynced {
  highlightedOriginRanges: OriginRange[] // for highlight text
  highlightedAnswerObjectIds: string[] // for highlight from text block to show partial graph
  highlightedNodeIds: string[] // for highlight nodes when it is expanding
  saliencyFilter: RelationshipSaliency // to filter edges
}

/* -------------------------------------------------------------------------- */

// ! QuestionAndAnswer
export interface QuestionAndAnswer {
  id: string
  question: string
  answer: string
  answerObjects: AnswerObject[]
  modelStatus: ModelStatus
  synced: QuestionAndAnswerSynced
}

export interface PartialQuestionAndAnswer {
  id?: string
  question?: string
  answer?: string
  answerObjects?: AnswerObject[]
  modelStatus?: Partial<ModelStatus>
  synced?: Partial<QuestionAndAnswerSynced>
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
        {/* // TODO */}
        <span
          className="version-stamp"
          style={{
            display: 'none',
          }}
        >
          version {packageJson.version}-graph
        </span>
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
