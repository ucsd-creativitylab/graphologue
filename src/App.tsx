import React, { createContext, useEffect, useState } from 'react'

import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestionAndAnswer } from './utils/chatUtils'
import {
  EdgeInformation,
  NodeInformation,
  RelationshipSaliency,
} from './utils/responseProcessing'

// import the package.json file
import packageJson from '../package.json'
import { Prompt } from './utils/openAI'
import { ListDisplayFormat } from './components/Answer'

export interface OriginRange {
  start: number
  end: number
  answerObjectId: string
  nodeIds: string[]
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

export type AnswerObjectEntitiesTarget = 'originText' | 'summary'

export interface SentenceInAnswer {
  originalText: string
  offset: number
  length: number
}

// ! AnswerObject
export interface AnswerObject {
  id: string
  originText: {
    content: string
    nodeEntities: NodeEntity[]
    edgeEntities: EdgeEntity[]
  }
  summary: {
    content: string
    nodeEntities: NodeEntity[]
    edgeEntities: EdgeEntity[]
  }
  slide: AnswerSlideObject
  answerObjectSynced: {
    listDisplay: ListDisplayFormat
    saliencyFilter: RelationshipSaliency
    collapsedNodes: string[]
    sentencesBeingCorrected: SentenceInAnswer[]
  }
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
  answerObjectIdsHighlighted: string[] // for highlight from text block to show partial graph
  answerObjectIdsHighlightedTemp: string[] // for highlight from text block ON HOVER to show partial graph
  answerObjectIdsHidden: string[]
  highlightedCoReferenceOriginRanges: OriginRange[] // for highlight text
  highlightedNodeIdsProcessing: string[] // for highlight nodes when it is expanding
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

export interface DebugModeContextType {
  debugMode: boolean
  setDebugMode: (debugMode: boolean) => void
}
export const DebugModeContext = createContext<DebugModeContextType>(
  {} as DebugModeContextType,
)

export const ChatApp = () => {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState<
    QuestionAndAnswer[]
  >([])

  const [debugMode, setDebugMode] = useState<boolean>(false)

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
      <DebugModeContext.Provider value={{ debugMode, setDebugMode }}>
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
      </DebugModeContext.Provider>
    </ChatContext.Provider>
  )
}
