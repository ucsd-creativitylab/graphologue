import React, { createContext, useCallback, useContext, useRef } from 'react'

import { AnswerObject, OriginRange, QuestionAndAnswer } from '../App'
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
  Prompt,
  getTextFromModelResponse,
  getTextFromStreamResponse,
  models,
  parseOpenAIResponseToObjects,
  streamOpenAICompletion,
} from '../utils/openAI'

export type NodeConceptExpansionType = 'explain' | 'examples'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSetSyncedOriginRanges: (highlightedOriginRanges: OriginRange[]) => void
  handleSetSyncedHighlightedAnswerObjectIds: (ids: string[]) => void
  handleAnswerObjectRemove: (id: string) => void
  handleAnswerObjectTellMore: (id: string) => void
  handleAnswerObjectNodeExpand: (
    nodeEntityId: string,
    nodeEntityOriginRanges: OriginRange[],
    type: NodeConceptExpansionType
  ) => void
  handleAnswerObjectNodeRemove: (nodeEntityId: string) => void
  handleAnswerObjectNodeCollapse: (nodeEntityId: string) => void
  /* -------------------------------------------------------------------------- */
  handleSwitchSaliency: () => void
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
  /* -------------------------------------------------------------------------- */
  handleSwitchSaliency: () => {},
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
    synced: { saliencyFilter },
  },
}: InterchangeProps) => {
  const { setQuestionsAndAnswers } = useContext(ChatContext)

  // const answerItemRef = createRef<HTMLDivElement>()

  const handleSetSyncedOriginRanges = useCallback(
    (highlightedOriginRanges: OriginRange[]) => {
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

  const _handleResponseError = useCallback(
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

  const _handleParsingCompleteAnswerObject = useCallback(async () => {
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
            _handleResponseError(parsingResult)
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
          synced: {
            highlightedNodeIds: [],
          },
        })
      )
    }
  }, [_handleResponseError, id, setQuestionsAndAnswers])

  const _handleUpdateRelationshipEntities = useCallback((content: string) => {
    const answerObject = nodeWorkStorage.current.answerObjectNew
    if (!answerObject) return

    const cleanedContent = removeLastBracket(content, true)
    const nodes = parseNodes(cleanedContent, answerObject.id)
    const edges = parseEdges(cleanedContent, answerObject.id)

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
          originText: deltaContent,
          complete: false,
        }

        // handleSetSyncedHighlightedAnswerObjectIds([
        //   nodeWorkStorage.current.answerObjectNew.id,
        // ])
      } else {
        // nodeWorkStorage.current.answerObjectNew.originRange.end =
        //   answer.length + nodeWorkStorage.current.answer.length + 1
        nodeWorkStorage.current.answerObjectNew.originText += deltaContent
      }

      // ! parse relationships
      _handleUpdateRelationshipEntities(nodeWorkStorage.current.answer)

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
    [_handleUpdateRelationshipEntities, id, setQuestionsAndAnswers]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectTellMore = useCallback(() => {}, [])

  const handleAnswerObjectNodeExpand = useCallback(
    async (
      nodeEntityId: string,
      nodeEntityOriginRanges: OriginRange[],
      type: NodeConceptExpansionType
    ) => {
      if (!modelParsingComplete || modelError) return

      const nodeEntity = findEntityFromAnswerObjects(
        answerObjects,
        nodeEntityId
      )
      if (!nodeEntity) return

      const originRange = nodeEntityOriginRanges[0]

      const answerObject = answerObjects.find(
        a => a.id === originRange.answerObjectId
      )
      if (!answerObject) return

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
          synced: {
            highlightedNodeIds: [nodeEntityId],
          },
        })
      )

      const originSentence = findEntitySentence(
        nodeEntityOriginRanges[0],
        answerObject.originText
      ) // ? good enough
      const prevConversation: Prompt[] = [
        ...modelInitialPrompts,
        {
          role: 'assistant',
          // we want to include the expanded text
          // also as the assistant's initial response
          content: answer, // TODO is it okay?
        },
      ]

      const prompts =
        type === 'explain'
          ? predefinedPrompts._graph_nodeExpand(
              prevConversation,
              originSentence,
              nodeEntity.displayNodeLabel
            )
          : predefinedPrompts._graph_nodeExamples(
              prevConversation,
              originSentence,
              nodeEntity.displayNodeLabel
            )

      await streamOpenAICompletion(
        prompts,
        models.smarter,
        handleStreamRawAnswer
      )
      console.log(`node expand ${type} raw answering complete`)

      await _handleParsingCompleteAnswerObject()
      console.log(`node expand ${type} parsing complete`)
    },
    [
      answer,
      answerObjects,
      _handleParsingCompleteAnswerObject,
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

  /* -------------------------------------------------------------------------- */

  const handleSwitchSaliency = useCallback(() => {
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        synced: {
          saliencyFilter:
            saliencyFilter === 'high'
              ? 'medium'
              : saliencyFilter === 'medium'
              ? 'low'
              : 'high',
        },
      })
    )
  }, [id, saliencyFilter, setQuestionsAndAnswers])

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
        handleSwitchSaliency,
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
