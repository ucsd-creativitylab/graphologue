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
import { Answer, ListDisplayFormat } from './Answer'
import { ChatContext } from './Contexts'
import { FinishedAnswerObjectParsingTypes, Question } from './Question'
import { ReactFlowProvider } from 'reactflow'
import {
  predefinedPrompts,
  predefinedPromptsForParsing,
} from '../utils/promptsAndResponses'
import {
  RelationshipSaliency,
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
import { debug } from '../constants'

export type NodeConceptExpansionType = 'explain' | 'examples'

export interface InterchangeContextProps {
  questionAndAnswer: QuestionAndAnswer
  handleSelfCorrection: (answerObjects: AnswerObject[]) => Promise<void>
  handleSetSyncedAnswerObjectIdsHighlighted: (
    ids: string[],
    temp: boolean
  ) => void
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
  handleAnswerObjectsAddOneMore: () => void
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
  handleAnswerObjectsAddOneMore: () => {},
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
                debug ? models.faster : models.smarter
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
    (ids: string[], temp: boolean) => {
      const setObject = temp
        ? {
            answerObjectIdsHighlightedTemp: ids,
          }
        : {
            answerObjectIdsHighlighted: ids,
          }

      setQuestionsAndAnswers(
        (questionsAndAnswers: QuestionAndAnswer[]): QuestionAndAnswer[] =>
          questionsAndAnswers.map(
            (questionAndAnswer: QuestionAndAnswer): QuestionAndAnswer => {
              if (questionAndAnswer.id === id) {
                return {
                  ...deepCopyQuestionAndAnswer(questionAndAnswer),
                  synced: {
                    ...questionAndAnswer.synced,
                    ...setObject,
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
                    answerObjectIdsHighlightedTemp: [],
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
                    answerObjectIdsHighlightedTemp:
                      questionAndAnswer.synced.answerObjectIdsHighlightedTemp.filter(
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

  const workingMemory = useRef<{
    answerObject: AnswerObject | null
    answerBefore: string
  }>({
    answerObject: null,
    answerBefore: '',
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
                ? workingMemory.current.answerObject?.originText.content || ''
                : removeAnnotations(
                    workingMemory.current.answerObject?.originText.content || ''
                  )
            ),
            debug || parsingType === 'slide' ? models.faster : models.smarter
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

    if (!parsingError && workingMemory.current.answerObject) {
      // ! complete answer object
      workingMemory.current.answerObject = {
        ...workingMemory.current.answerObject,
        summary: {
          content: parsingResults.summary,
          nodeEntities: nodeIndividualsToNodeEntities(
            parseNodes(
              parsingResults.summary,
              workingMemory.current.answerObject.id
            )
          ),
          edgeEntities: parseEdges(
            parsingResults.summary,
            workingMemory.current.answerObject.id
          ),
        },
        slide: {
          content: cleanSlideResponse(parsingResults.slide),
        },
        complete: true,
      }

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: answerObjects.map(a =>
            a.id === workingMemory.current.answerObject?.id
              ? workingMemory.current.answerObject
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
  }, [_handleResponseError, answerObjects, id, setQuestionsAndAnswers])

  const _handleUpdateRelationshipEntities = useCallback((content: string) => {
    if (!workingMemory.current.answerObject) return

    const cleanedContent = removeLastBracket(content, true)
    const nodes = parseNodes(
      cleanedContent,
      workingMemory.current.answerObject.id
    )
    const edges = parseEdges(
      cleanedContent,
      workingMemory.current.answerObject.id
    )

    workingMemory.current.answerObject = {
      ...workingMemory.current.answerObject,
      originText: {
        ...workingMemory.current.answerObject.originText,
        nodeEntities: nodeIndividualsToNodeEntities(nodes),
        edgeEntities: edges,
      },
    }
  }, [])

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream, newParagraph: boolean) => {
      const deltaContent = trimLineBreaks(getTextFromStreamResponse(data))
      if (!deltaContent) return

      if (!workingMemory.current.answerObject) return

      // add a space before the stream starts
      const answerObjectOriginTextBefore = newParagraph
        ? ''
        : answerObjects.find(
            (answerObject: AnswerObject) =>
              answerObject.id === workingMemory.current.answerObject?.id
          )?.originText?.content

      if (!answerObjectOriginTextBefore && answerObjectOriginTextBefore !== '')
        return

      if (
        answerObjectOriginTextBefore ===
          workingMemory.current.answerObject.originText.content &&
        !newParagraph
      )
        workingMemory.current.answerObject.originText.content += ' '
      // ! ground truth of the response
      workingMemory.current.answerObject.originText.content += deltaContent

      // ! parse relationships
      _handleUpdateRelationshipEntities(
        workingMemory.current.answerObject.originText.content
      )

      // ! update the answer
      setQuestionsAndAnswers(prevQsAndAs => {
        return helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer: newParagraph
            ? workingMemory.current.answerObject?.originText.content ?? ''
            : workingMemory.current.answerBefore.replace(
                answerObjectOriginTextBefore,
                workingMemory.current.answerObject?.originText.content ??
                  answerObjectOriginTextBefore
              ),
          answerObjects: workingMemory.current.answerObject
            ? newParagraph
              ? [
                  ...answerObjects.filter(
                    (answerObject: AnswerObject) =>
                      answerObject.id !== workingMemory.current.answerObject?.id
                  ),
                  workingMemory.current.answerObject,
                ]
              : answerObjects.map((answerObject: AnswerObject) =>
                  answerObject.id === workingMemory.current.answerObject?.id
                    ? workingMemory.current.answerObject
                    : answerObject
                )
            : answerObjects,
          // synced: {
          //   answerObjectIdsHighlighted: workingMemory.current.answerObject
          //     ? [workingMemory.current.answerObject.id]
          //     : [],
          // },
        })
      })

      // smoothly scroll .answer-text with data-id === answerObjectId into view
      /*
      const answerObjectElement = document.querySelector(
        `.answer-text[data-id="${workingMemory.current.answerObjectNew?.id}"]`
      )
      if (answerObjectElement) {
        answerObjectElement.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
        })
      }
      */
    },
    [
      _handleUpdateRelationshipEntities,
      answerObjects,
      id,
      setQuestionsAndAnswers,
    ]
  )

  /* -------------------------------------------------------------------------- */

  const handleAnswerObjectTellLessOrMore = useCallback(
    async (answerObjectId: string, request: 'less' | 'more') => {
      if (!modelParsingComplete || modelError) return

      const answerObject = answerObjects.find(a => a.id === answerObjectId)
      if (!answerObject) return

      // ! reset
      workingMemory.current = {
        answerObject: deepCopyAnswerObject(answerObject),
        answerBefore: answer,
      }
      if (workingMemory.current.answerObject) {
        workingMemory.current.answerObject.summary = {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        }
        workingMemory.current.answerObject.slide = {
          content: '',
        }
        workingMemory.current.answerObject.answerObjectSynced.listDisplay =
          'original'
        workingMemory.current.answerObject.complete = false // !
      }
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: workingMemory.current.answerObject
            ? answerObjects.map(a => {
                if (a.id === workingMemory.current.answerObject?.id) {
                  return workingMemory.current.answerObject
                }
                return a
              })
            : answerObjects,
          modelStatus: {
            modelParsing: true,
            modelParsingComplete: false,
          },
          synced: {
            // saliencyFilter: 'low', // ?
          },
        })
      )

      const prevConversation: Prompt[] = [
        ...modelInitialPrompts,
        {
          role: 'assistant',
          content: answer,
        },
      ]
      const prompts = predefinedPrompts._graph_2MoreSentences(
        prevConversation,
        answerObject.originText.content
      )

      await streamOpenAICompletion(
        prompts,
        debug ? models.faster : models.smarter,
        handleStreamRawAnswer,
        false
      )
      console.log(`text block expand raw answering complete`)
      await _handleParsingCompleteAnswerObject()
      console.log(`text block expand parsing complete`)
    },
    [
      _handleParsingCompleteAnswerObject,
      answer,
      answerObjects,
      handleStreamRawAnswer,
      id,
      modelError,
      modelInitialPrompts,
      modelParsingComplete,
      setQuestionsAndAnswers,
    ]
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
      workingMemory.current = {
        answerObject: deepCopyAnswerObject(answerObject),
        answerBefore: answer,
      }
      if (workingMemory.current.answerObject) {
        workingMemory.current.answerObject.summary = {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        }
        workingMemory.current.answerObject.slide = {
          content: '',
        }
        workingMemory.current.answerObject.answerObjectSynced.listDisplay =
          'original'
        workingMemory.current.answerObject.complete = false // !
      }

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: workingMemory.current.answerObject
            ? answerObjects.map(a => {
                if (a.id === workingMemory.current.answerObject?.id) {
                  return workingMemory.current.answerObject
                }
                return a
              })
            : answerObjects,
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
        debug ? models.faster : models.smarter,
        handleStreamRawAnswer,
        false
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

  const handleAnswerObjectsAddOneMore = useCallback(async () => {
    if (!modelParsingComplete || modelError) return

    workingMemory.current = {
      answerObject: {
        id: getAnswerObjectId(),
        originText: {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        },
        summary: {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        },
        slide: {
          content: '',
        },
        answerObjectSynced: {
          listDisplay: 'original' as ListDisplayFormat,
          saliencyFilter: 'high' as RelationshipSaliency,
        },
        complete: false,
      },
      answerBefore: '',
    }
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        answerObjects: workingMemory.current.answerObject
          ? [...answerObjects, workingMemory.current.answerObject]
          : answerObjects,
        modelStatus: {
          modelParsing: true,
          modelParsingComplete: false,
        },
        synced: {
          // saliencyFilter: 'low', // ?
        },
      })
    )

    const prevConversation: Prompt[] = [
      ...modelInitialPrompts,
      {
        role: 'assistant',
        content: answer,
      },
    ]
    const prompts = predefinedPrompts._graph_1MoreParagraph(prevConversation)

    await streamOpenAICompletion(
      prompts,
      debug ? models.faster : models.smarter,
      handleStreamRawAnswer,
      true
    )
    console.log(`new paragraph expand raw answering complete`)
    await _handleParsingCompleteAnswerObject()
    console.log(`new paragraph expand parsing complete`)
  }, [
    _handleParsingCompleteAnswerObject,
    answer,
    answerObjects,
    handleStreamRawAnswer,
    id,
    modelError,
    modelInitialPrompts,
    modelParsingComplete,
    setQuestionsAndAnswers,
  ])

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
        handleAnswerObjectsAddOneMore,
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
