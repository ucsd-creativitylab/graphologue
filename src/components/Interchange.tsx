import React, { createContext, useCallback, useContext, useRef } from 'react'

import { AnswerObject, OriginAnswerRange, QuestionAndAnswer } from '../App'
import {
  deepCopyAnswerObject,
  deepCopyQuestionAndAnswer,
  getAnswerObjectId,
  helpSetQuestionAndAnswer,
  newQuestionAndAnswer,
  trimLineBreaks,
} from '../utils/chatAppUtils'
import { Answer } from './Answer'
import { ChatContext } from './Contexts'
import { FinishedAnswerObjectParsingTypes, Question } from './Question'
import { ReactFlowProvider } from 'reactflow'
import {
  predefinedPrompts,
  predefinedPromptsForParsing,
} from '../utils/promptsAndResponses'
import {
  findEntityFromAnswerObjects,
  findEntitySentence,
  nodeIndividualsToNodeEntities,
  parseEdges,
  parseNodes,
  removeAnnotations,
  removeLastBracket,
} from '../utils/responseProcessing'
import {
  OpenAIChatCompletionResponseStream,
  getTextFromModelResponse,
  getTextFromStreamResponse,
  models,
  parseOpenAIResponseToObjects,
  streamOpenAICompletion,
} from '../utils/openAI'

export type NodeConceptExpansionType = 'explain' | 'examples'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSetSyncedOriginRanges: (
    highlightedOriginRanges: OriginAnswerRange[]
  ) => void
  handleSetSyncedHighlightedAnswerObjectIds: (ids: string[]) => void
  handleAnswerObjectRemove: (id: string) => void
  handleAnswerObjectTellMore: (id: string) => void
  handleAnswerObjectNodeExpand: (
    nodeEntityId: string,
    nodeEntityOriginRanges: OriginAnswerRange[],
    type: NodeConceptExpansionType
  ) => void
  handleAnswerObjectNodeRemove: (nodeEntityId: string) => void
  handleAnswerObjectNodeCollapse: (nodeEntityId: string) => void
}
////
export const InterchangeContext = createContext<InterchangeContextProps>({
  questionAndAnswer: newQuestionAndAnswer(),
  handleSetSyncedOriginRanges: () => {},
  handleSetSyncedHighlightedAnswerObjectIds: () => {},
  handleAnswerObjectRemove: () => {},
  handleAnswerObjectTellMore: () => {},
  handleAnswerObjectNodeExpand: () => {},
  handleAnswerObjectNodeRemove: () => {},
  handleAnswerObjectNodeCollapse: () => {},
})

/* -------------------------------------------------------------------------- */

export interface InterchangeProps {
  data: QuestionAndAnswer
}
////
export const Interchange = ({
  data,
  data: {
    id,
    question,
    answer,
    answerObjects,
    modelStatus: { modelParsingComplete, modelError, modelInitialPrompts },
  },
}: InterchangeProps) => {
  const { setQuestionsAndAnswers } = useContext(ChatContext)

  // const answerItemRef = createRef<HTMLDivElement>()

  const handleSetSyncedOriginRanges = useCallback(
    (highlightedOriginRanges: OriginAnswerRange[]) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  synced: {
                    ...questionAndAnswer.synced,
                    highlightedOriginRanges,
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

  const handleAnswerObjectRemove = useCallback(
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
                  synced: {
                    ...questionAndAnswer.synced,
                    highlightedAnswerObjectIds:
                      questionAndAnswer.synced.highlightedAnswerObjectIds.filter(
                        (id: string) => id !== answerObjectId
                      ),
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

  /* -------------------------------------------------------------------------- */

  const nodeWorkStorage = useRef<{
    answer: string
    answerObjectNew: AnswerObject | null
    answerBefore: string
    answerObjectsBefore: AnswerObject[]
  }>({
    answer: '',
    answerObjectNew: null,
    answerBefore: '',
    answerObjectsBefore: [],
  })

  const handleResponseError = useCallback(
    (response: any) => {
      console.error(response.error)

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          modelStatus: {
            modelError: true,
          },
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleParsingCompleteAnswerObject = useCallback(async () => {
    const answerObject = nodeWorkStorage.current.answerObjectNew
    if (!answerObject) return

    const parsingResults: {
      [key in FinishedAnswerObjectParsingTypes]: string
    } = {
      summary: '',
      slide: '',
    }

    let parsingError = false
    await Promise.all(
      (['summary', 'slide'] as FinishedAnswerObjectParsingTypes[]).map(
        async (parsingType: FinishedAnswerObjectParsingTypes) => {
          if (parsingError) return

          // ! request
          const parsingResult = await parseOpenAIResponseToObjects(
            predefinedPromptsForParsing[parsingType](
              removeAnnotations(answerObject.originText)
            ),
            models.faster
          )

          if (parsingResult.error) {
            handleResponseError(parsingResult)
            parsingError = true
            return
          }

          parsingResults[parsingType] = getTextFromModelResponse(parsingResult)
        }
      )
    )

    if (!parsingError) {
      // ! complete answer object
      nodeWorkStorage.current.answerObjectNew = {
        ...answerObject,
        summary: parsingResults.summary,
        slide: {
          content: parsingResults.slide,
        },
        complete: true,
      }

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: nodeWorkStorage.current.answerObjectNew
            ? [
                ...nodeWorkStorage.current.answerObjectsBefore,
                nodeWorkStorage.current.answerObjectNew,
              ]
            : nodeWorkStorage.current.answerObjectsBefore,
          modelStatus: {
            modelParsing: false,
            modelParsingComplete: true,
          },
        })
      )
    }
  }, [handleResponseError, id, setQuestionsAndAnswers])

  const handleUpdateRelationshipEntities = useCallback((content: string) => {
    const answerObject = nodeWorkStorage.current.answerObjectNew
    if (!answerObject) return

    const cleanedContent = removeLastBracket(content, true)
    const nodes = parseNodes(cleanedContent, answerObject.originRange.start)
    const edges = parseEdges(cleanedContent, answerObject.originRange.start)

    nodeWorkStorage.current.answerObjectNew = {
      ...answerObject,
      nodeEntities: nodeIndividualsToNodeEntities(nodes),
      edgeEntities: edges,
    }
  }, [])

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream) => {
      const deltaContent = trimLineBreaks(getTextFromStreamResponse(data))
      if (!deltaContent) return

      // ! ground truth of the response
      nodeWorkStorage.current.answer += deltaContent

      if (!nodeWorkStorage.current.answerObjectNew) {
        nodeWorkStorage.current.answerObjectNew = {
          id: getAnswerObjectId(),
          summary: '',
          slide: {
            content: '',
          },
          nodeEntities: [],
          edgeEntities: [],
          originRange: {
            start: answer.length + 1,
            end: answer.length + deltaContent.length + 1,
          },
          originText: deltaContent,
          complete: false,
        }

        // handleSetSyncedHighlightedAnswerObjectIds([
        //   nodeWorkStorage.current.answerObjectNew.id,
        // ])
      } else {
        nodeWorkStorage.current.answerObjectNew.originRange.end =
          answer.length + nodeWorkStorage.current.answer.length + 1
        nodeWorkStorage.current.answerObjectNew.originText += deltaContent
      }

      // ! parse relationships
      handleUpdateRelationshipEntities(nodeWorkStorage.current.answer)

      // ! update the answer
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer:
            nodeWorkStorage.current.answerBefore +
            ' ' +
            nodeWorkStorage.current.answer,
          answerObjects: nodeWorkStorage.current.answerObjectNew
            ? [
                ...nodeWorkStorage.current.answerObjectsBefore,
                nodeWorkStorage.current.answerObjectNew,
              ]
            : nodeWorkStorage.current.answerObjectsBefore,
        })
      )
    },
    [
      answer.length,
      handleUpdateRelationshipEntities,
      id,
      setQuestionsAndAnswers,
    ]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectTellMore = useCallback(() => {}, [])

  const handleAnswerObjectNodeExpand = useCallback(
    async (
      nodeEntityId: string,
      nodeEntityOriginRanges: OriginAnswerRange[],
      type: NodeConceptExpansionType
    ) => {
      if (!modelParsingComplete || modelError) return

      const nodeEntity = findEntityFromAnswerObjects(
        answerObjects,
        nodeEntityId
      )
      if (!nodeEntity) return

      // ! reset
      nodeWorkStorage.current = {
        answer: '',
        answerBefore: answer,
        answerObjectNew: null,
        answerObjectsBefore: answerObjects.map(a => deepCopyAnswerObject(a)),
      }
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          modelStatus: {
            // modelAnswering: true,
            modelParsing: true,
            modelParsingComplete: false,
          },
        })
      )

      const originSentence = findEntitySentence(
        nodeEntityOriginRanges[0],
        answer
      ) // ? good enough
      const prompts =
        type === 'explain'
          ? predefinedPrompts._graph_nodeExpand(
              modelInitialPrompts,
              originSentence,
              nodeEntity.displayNodeLabel
            )
          : [] // TODO

      await streamOpenAICompletion(
        prompts,
        models.smarter,
        handleStreamRawAnswer
      )
      console.log(`node expand ${type} raw answering complete`)

      await handleParsingCompleteAnswerObject()
      console.log(`node expand ${type} parsing complete`)
    },
    [
      answer,
      answerObjects,
      handleParsingCompleteAnswerObject,
      handleStreamRawAnswer,
      id,
      modelError,
      modelInitialPrompts,
      modelParsingComplete,
      setQuestionsAndAnswers,
    ]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectNodeRemove = useCallback(
    (nodeEntityId: string) => {
      if (!modelParsingComplete || modelError) return
    },
    [modelError, modelParsingComplete]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectNodeCollapse = useCallback(
    (nodeEntityId: string) => {},
    []
  )

  return (
    <InterchangeContext.Provider
      value={{
        questionAndAnswer: data,
        handleSetSyncedOriginRanges,
        handleSetSyncedHighlightedAnswerObjectIds,
        handleAnswerObjectRemove,
        handleAnswerObjectTellMore,
        handleAnswerObjectNodeExpand,
        handleAnswerObjectNodeRemove,
        handleAnswerObjectNodeCollapse,
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
