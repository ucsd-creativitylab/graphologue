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
  helpSetQuestionAndAnswer,
  newQuestionAndAnswer,
  trimLineBreaks,
} from '../utils/chatAppUtils'
import { Answer, ListDisplayFormat } from './Answer'
import { ChatContext } from './Contexts'
import { FinishedAnswerObjectParsingTypes, Question } from './Question'
import { ReactFlowProvider } from 'reactflow'
import {
  predefinedPrompts,
  predefinedPromptsForParsing,
} from '../utils/promptsAndResponses'
import {
  cleanSlideResponse,
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
import { makeFlowTransition } from '../utils/flowChangingTransition'

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
  handleAnswerObjectSwitchListDisplayFormat: (
    id: string,
    listDisplay: ListDisplayFormat
  ) => void
  handleAnswerObjectTellLessOrMore: (
    id: string,
    request: 'less' | 'more'
  ) => void
  handleAnswerObjectNodeExpand: (
    sourceAnswerObjectId: string,
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
  handleAnswerObjectSwitchListDisplayFormat: () => {},
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
          const {
            originText: {
              content: originTextContent,
              nodeEntities,
              edgeEntities,
            },
          } = answerObject

          const sentences = splitAnnotatedSentences(originTextContent)

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
            const start = originTextContent.indexOf(sentence)
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

      makeFlowTransition()
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

  const handleAnswerObjectSwitchListDisplayFormat = useCallback(
    (answerObjectId: string, listDisplay: ListDisplayFormat) => {
      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  answerObjects: questionAndAnswer.answerObjects.map(
                    (answerObject: AnswerObject): AnswerObject => {
                      if (answerObject.id === answerObjectId) {
                        return {
                          ...answerObject,
                          answerObjectSynced: {
                            ...answerObject.answerObjectSynced,
                            listDisplay,
                          },
                        }
                      }
                      return answerObject
                    }
                  ),
                }
              }
              return questionAndAnswer
            }
          )
      )

      // set flow canvases to .changing-flow
      // and remove it after 700ms
      makeFlowTransition()
    },
    [id, setQuestionsAndAnswers]
  )

  /* -------------------------------------------------------------------------- */

  const nodeWorkStorage = useRef<{
    answerObject: AnswerObject | null
    answerBefore: string
    answerObjectsBefore: AnswerObject[]
  }>({
    answerObject: null,
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
              parsingType === 'summary'
                ? nodeWorkStorage.current.answerObject?.originText.content || ''
                : removeAnnotations(
                    nodeWorkStorage.current.answerObject?.originText.content ||
                      ''
                  )
            ),
            parsingType === 'slide' ? models.faster : models.smarter
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

    if (!parsingError && nodeWorkStorage.current.answerObject) {
      // ! complete answer object
      nodeWorkStorage.current.answerObject = {
        ...nodeWorkStorage.current.answerObject,
        summary: {
          content: parsingResults.summary,
          nodeEntities: nodeIndividualsToNodeEntities(
            parseNodes(
              parsingResults.summary,
              nodeWorkStorage.current.answerObject.id
            )
          ),
          edgeEntities: parseEdges(
            parsingResults.summary,
            nodeWorkStorage.current.answerObject.id
          ),
        },
        slide: {
          content: cleanSlideResponse(parsingResults.slide),
        },
        complete: true,
      }

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: nodeWorkStorage.current.answerObjectsBefore.map(a =>
            a.id === nodeWorkStorage.current.answerObject?.id
              ? nodeWorkStorage.current.answerObject
              : a
          ),
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
    if (!nodeWorkStorage.current.answerObject) return

    const cleanedContent = removeLastBracket(content, true)
    const nodes = parseNodes(
      cleanedContent,
      nodeWorkStorage.current.answerObject.id
    )
    const edges = parseEdges(
      cleanedContent,
      nodeWorkStorage.current.answerObject.id
    )

    nodeWorkStorage.current.answerObject = {
      ...nodeWorkStorage.current.answerObject,
      originText: {
        ...nodeWorkStorage.current.answerObject.originText,
        nodeEntities: nodeIndividualsToNodeEntities(nodes),
        edgeEntities: edges,
      },
    }
  }, [])

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream) => {
      const deltaContent = trimLineBreaks(getTextFromStreamResponse(data))
      if (!deltaContent) return

      if (!nodeWorkStorage.current.answerObject) return

      // add a space before the stream starts
      const answerObjectOriginTextBefore =
        nodeWorkStorage.current.answerObjectsBefore.find(
          (answerObject: AnswerObject) =>
            answerObject.id === nodeWorkStorage.current.answerObject?.id
        )?.originText?.content
      if (!answerObjectOriginTextBefore) return

      if (
        answerObjectOriginTextBefore ===
        nodeWorkStorage.current.answerObject.originText.content
      )
        nodeWorkStorage.current.answerObject.originText.content += ' '
      // ! ground truth of the response
      nodeWorkStorage.current.answerObject.originText.content += deltaContent

      // ! parse relationships
      _handleUpdateRelationshipEntities(
        nodeWorkStorage.current.answerObject.originText.content
      )

      // ! update the answer
      setQuestionsAndAnswers(prevQsAndAs => {
        return helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer: nodeWorkStorage.current.answerBefore.replace(
            answerObjectOriginTextBefore,
            nodeWorkStorage.current.answerObject?.originText.content ??
              answerObjectOriginTextBefore
          ),
          answerObjects: nodeWorkStorage.current.answerObject
            ? nodeWorkStorage.current.answerObjectsBefore.map(
                (answerObject: AnswerObject) =>
                  answerObject.id === nodeWorkStorage.current.answerObject?.id
                    ? nodeWorkStorage.current.answerObject
                    : answerObject
              )
            : nodeWorkStorage.current.answerObjectsBefore,
          // synced: {
          //   answerObjectIdsHighlighted: nodeWorkStorage.current.answerObject
          //     ? [nodeWorkStorage.current.answerObject.id]
          //     : [],
          // },
        })
      })

      // smoothly scroll .answer-text with data-id === answerObjectId into view
      /*
      const answerObjectElement = document.querySelector(
        `.answer-text[data-id="${nodeWorkStorage.current.answerObjectNew?.id}"]`
      )
      if (answerObjectElement) {
        answerObjectElement.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
        })
      }
      */
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
      sourceAnswerObjectId: string,
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

      const answerObject = answerObjects.find(
        a => a.id === sourceAnswerObjectId
      )
      if (!answerObject) return

      // ! reset
      nodeWorkStorage.current = {
        answerObject: deepCopyAnswerObject(answerObject),
        answerBefore: answer,
        answerObjectsBefore: answerObjects.map(a => deepCopyAnswerObject(a)),
      }
      if (nodeWorkStorage.current.answerObject) {
        nodeWorkStorage.current.answerObject.summary = {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        }
        nodeWorkStorage.current.answerObject.slide = {
          content: '',
        }
        nodeWorkStorage.current.answerObject.answerObjectSynced.listDisplay =
          'original'
        nodeWorkStorage.current.answerObject.complete = false // !
      }

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: nodeWorkStorage.current.answerObject
            ? nodeWorkStorage.current.answerObjectsBefore.map(a => {
                if (a.id === nodeWorkStorage.current.answerObject?.id) {
                  return nodeWorkStorage.current.answerObject
                }
                return a
              })
            : nodeWorkStorage.current.answerObjectsBefore,
          modelStatus: {
            modelParsing: true,
            modelParsingComplete: false,
          },
          synced: {
            highlightedNodeIdsProcessing: [nodeEntityId],
            highlightedCoReferenceOriginRanges: [],
            // saliencyFilter: 'low', // ?
          },
        })
      )

      const originSentence = findEntitySentence(
        nodeEntityOriginRanges[0],
        answerObject.originText.content
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
        handleAnswerObjectSwitchListDisplayFormat,
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
