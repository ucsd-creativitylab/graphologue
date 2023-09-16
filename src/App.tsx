import React, { createContext, useEffect, useState } from 'react'

import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded'

import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestionAndAnswer } from './utils/chatUtils'
import {
  EdgeInformation,
  NodeInformation,
  RelationshipSaliency,
} from './utils/responseProcessing'

// import the package.json file
import { Prompt } from './utils/openAI'
import { ListDisplayFormat } from './components/Answer'

import GraphologueLogo from './media/graphologue.png'
import { userProvidedAPIKey } from './constants'

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

  const [keyHidden, setKeyHidden] = useState<boolean>(false)
  const [openAIKeyInput, setOpenAIKeyInput] = useState<string>('')
  const [openAIKey, setOpenAIKey] = useState<string>('')

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
          <div className="interchange-item graphologue-logo">
            <img src={GraphologueLogo} alt="Graphologue" />
            <div className="public-information">
              <a href="https://doi.org/10.1145/3586183.3606737">paper</a>
              <a href="https://arxiv.org/abs/2305.11473">arXiv</a>
              <a href="https://github.com/ucsd-creativitylab/graphologue">
                github
              </a>
              <a href="https://github.com/ucsd-creativitylab/graphologue/blob/public/src/utils/prompts.ts">
                show me your prompt
              </a>
              <a href="https://creativity.ucsd.edu">creativity lab</a>
            </div>
          </div>
          {openAIKey.length === 0 ? (
            <div className="interchange-item">
              <div className="openai-api-key-question-box question-item interchange-component">
                <textarea
                  className="question-textarea openai-api-key-textarea"
                  placeholder={`Welcome to Graphologue! To play with it, please paste you OpenAI API key here. If you'd like to change it, please refresh the page. We do not store your keys.`}
                  rows={3}
                  value={openAIKeyInput}
                  onChange={e => {
                    setOpenAIKeyInput(e.target.value)
                  }}
                  style={
                    openAIKeyInput.length > 0 && keyHidden
                      ? {
                          color: 'transparent',
                          textShadow: '0 0 0.3rem rgba(0,0,0,0.5)',
                        }
                      : {}
                  }
                />

                <button
                  className="bar-button"
                  onClick={() => {
                    setKeyHidden(!keyHidden)
                  }}
                >
                  {keyHidden ? (
                    <VisibilityOffRoundedIcon />
                  ) : (
                    <VisibilityRoundedIcon />
                  )}
                </button>
                <button
                  className="bar-button"
                  onClick={() => {
                    setOpenAIKey(openAIKeyInput)
                    userProvidedAPIKey.current = openAIKeyInput
                  }}
                >
                  <FileUploadRoundedIcon />
                </button>
              </div>
            </div>
          ) : (
            questionsAndAnswers.map((questionAndAnswer, index) => (
              <Interchange
                key={`interchange-${questionAndAnswer.id}`}
                data={questionAndAnswer}
              />
            ))
          )}
        </div>
      </DebugModeContext.Provider>
    </ChatContext.Provider>
  )
}
