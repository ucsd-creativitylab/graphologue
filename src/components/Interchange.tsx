import React, { createContext, useCallback, useContext, useRef } from 'react'

import {
  AnswerObject,
  EdgeEntity,
  NodeEntity,
  NodeEntityIndividual,
  OriginRange,
  QuestionAndAnswer,
} from '../App'
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
  findNowhereEdgeEntities,
  findOrphanNodeEntities,
  mergeEdgeEntities,
  mergeNodeEntities,
  nodeIndividualsToNodeEntities,
  parseEdges,
  parseNodes,
  removeAnnotations,
  removeLastBracket,
  splitAnnotatedSentences,
} from '../utils/responseProcessing'
import {
  OpenAIChatCompletionResponseStream,
  Prompt,
  getOpenAICompletion,
  getTextFromModelResponse,
  getTextFromStreamResponse,
  models,
  parseOpenAIResponseToObjects,
  streamOpenAICompletion,
} from '../utils/openAI'

export type NodeConceptExpansionType = 'explain' | 'examples'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSelfCorrection: (answerObjects: AnswerObject[]) => Promise<void>
  handleSetSyncedAnswerObjectIdsHighlighted: (ids: string[]) => void
  handleSetSyncedAnswerObjectIdsHidden: (ids: string[]) => void
  handleSetSyncedCoReferenceOriginRanges: (
    highlightedCoReferenceOriginRanges: OriginRange[]
  ) => void
  handleAnswerObjectRemove: (id: string) => void
  handleAnswerObjectTellLessOrMore: (
    id: string,
    request: 'less' | 'more'
  ) => void
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
  handleSelfCorrection: async () => {},
  handleSetSyncedAnswerObjectIdsHighlighted: () => {},
  handleSetSyncedAnswerObjectIdsHidden: () => {},
  handleSetSyncedCoReferenceOriginRanges: () => {},
  handleAnswerObjectRemove: () => {},
  handleAnswerObjectTellLessOrMore: () => {},
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

  const handleSelfCorrection = useCallback(
    async (answerObjects: AnswerObject[]) => {
      const nodeEntitiesAll = mergeNodeEntities(answerObjects, [])
      const edgeEntitiesAll = mergeEdgeEntities(answerObjects, [])

      await Promise.all(
        answerObjects.map(async (answerObject: AnswerObject) => {
          const { originText, nodeEntities, edgeEntities } = answerObject

          const sentences = splitAnnotatedSentences(originText)

          const orphanEntities: NodeEntity[] = findOrphanNodeEntities(
            nodeEntities,
            edgeEntitiesAll
          )
          const edgesFromOrToNowhere: EdgeEntity[] = findNowhereEdgeEntities(
            nodeEntitiesAll,
            edgeEntities
          )

          for (let sentence of sentences) {
            // get start and end index of the sentence
            const start = originText.indexOf(sentence)
            const end = start + sentence.length
            // find all problematic entities in the sentence
            const n: string[] = [],
              e: string[] = []
            orphanEntities.forEach((entity: NodeEntity) => {
              entity.individuals.forEach((individual: NodeEntityIndividual) => {
                if (
                  individual.originRange.start >= start &&
                  individual.originRange.end <= end
                ) {
                  n.push(individual.originText)
                }
              })
            })

            edgesFromOrToNowhere.forEach((entity: EdgeEntity) => {
              if (
                entity.originRange.start >= start &&
                entity.originRange.end <= end
              ) {
                e.push(entity.originText)
              }
            })

            // if there are any problematic entities, ask the user to fix them
            if (n.length > 0 || e.length > 0) {
              // const handleRealtimeSentenceCorrection = (response: OpenAIChatCompletionResponseStream) => {}

              const correctionResponse = await getOpenAICompletion(
                predefinedPrompts._graph_sentenceCorrection(
                  [
                    ...modelInitialPrompts,
                    {
                      role: 'assistant',
                      content: answer,
                    },
                  ] as Prompt[],
                  sentence,
                  n,
                  e
                ),
                models.smarter
              )

              const correctionText =
                getTextFromModelResponse(correctionResponse)

              console.log(correctionText)
            }
          }
        })
      )
    },
    [answer, modelInitialPrompts]
  )

  const handleSetSyncedCoReferenceOriginRanges = useCallback(
    (highlightedCoReferenceOriginRanges: OriginRange[]) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  synced: {
                    ...questionAndAnswer.synced,
                    highlightedCoReferenceOriginRanges,
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

  const handleSetSyncedAnswerObjectIdsHighlighted = useCallback(
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
                    answerObjectIdsHighlighted: ids,
                    answerObjectIdsHidden:
                      questionAndAnswer.synced.answerObjectIdsHidden.filter(
                        (id: string) => !ids.includes(id)
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

  const handleSetSyncedAnswerObjectIdsHidden = useCallback(
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
                    answerObjectIdsHidden: ids,
                    answerObjectIdsHighlighted:
                      questionAndAnswer.synced.answerObjectIdsHighlighted.filter(
                        (id: string) => !ids.includes(id)
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
                    answerObjectIdsHighlighted:
                      questionAndAnswer.synced.answerObjectIdsHighlighted.filter(
                        (id: string) => id !== answerObjectId
                      ),
                    answerObjectIdsHidden:
                      questionAndAnswer.synced.answerObjectIdsHidden.filter(
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

  const answerObjectWorkStorage = useRef<{
    answerObjectUpdated: AnswerObject | null
  }>({
    answerObjectUpdated: null,
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
            highlightedNodeIdsProcessing: [],
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

        // handleSetSyncedAnswerObjectIdsHighlighted([
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
      setQuestionsAndAnswers(prevQsAndAs => {
        return helpSetQuestionAndAnswer(prevQsAndAs, id, {
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
          synced: {
            answerObjectIdsHighlighted: nodeWorkStorage.current.answerObjectNew
              ? [nodeWorkStorage.current.answerObjectNew.id]
              : [],
          },
        })
      })

      // smoothly scroll .answer-text with data-id === answerObjectId into view
      const answerObjectElement = document.querySelector(
        `.answer-text[data-id="${nodeWorkStorage.current.answerObjectNew?.id}"]`
      )
      if (answerObjectElement) {
        answerObjectElement.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
        })
      }
    },
    [_handleUpdateRelationshipEntities, id, setQuestionsAndAnswers]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectTellLessOrMore = useCallback(
    async (answerObjectId: string, request: 'less' | 'more') => {
      if (!modelParsingComplete || modelError) return

      const answerObject = answerObjects.find(a => a.id === answerObjectId)
      if (!answerObject) return

      // // ! reset
      answerObjectWorkStorage.current = {
        answerObjectUpdated: deepCopyAnswerObject(answerObject),
      }
      // TODO
      // setQuestionsAndAnswers(prevQsAndAs =>
      //   helpSetQuestionAndAnswer(prevQsAndAs, id, {
      //     modelStatus: {
      //       modelParsing: true,
      //       modelParsingComplete: false,
      //     },
      //   })
      // )
    },
    [answerObjects, modelError, modelParsingComplete]
  )

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
            modelParsing: true,
            modelParsingComplete: false,
          },
          synced: {
            highlightedNodeIdsProcessing: [nodeEntityId],
            // saliencyFilter: 'low',
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
          // TODO is it okay?
          content: answer,
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
          saliencyFilter: saliencyFilter === 'high' ? 'low' : 'high',
        },
      })
    )
  }, [id, saliencyFilter, setQuestionsAndAnswers])

  return (
    <InterchangeContext.Provider
      value={{
        questionAndAnswer: data,
        handleSelfCorrection,
        handleSetSyncedAnswerObjectIdsHighlighted,
        handleSetSyncedAnswerObjectIdsHidden,
        handleSetSyncedCoReferenceOriginRanges,
        handleAnswerObjectRemove,
        handleAnswerObjectTellLessOrMore,
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
