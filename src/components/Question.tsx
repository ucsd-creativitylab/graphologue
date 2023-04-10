import React, {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'

import { AnswerObject } from '../App'
import { ChatContext } from './Contexts'
import {
  getTextFromModelResponse,
  getTextFromStreamResponse,
  models,
  OpenAIChatCompletionResponseStream,
  parseOpenAIResponseToObjects,
  streamOpenAICompletion,
} from '../utils/openAI'
import {
  predefinedPrompts,
  predefinedPromptsForParsing,
} from '../utils/promptsAndResponses'
import {
  getAnswerObjectId,
  helpSetQuestionAndAnswer,
  newQuestionAndAnswer,
  trimLineBreaks,
} from '../utils/chatAppUtils'
import { InterchangeContext } from './Interchange'
import { SentenceParser, SentenceParsingJob } from '../utils/sentenceParser'
import {
  cleanSlideResponse,
  nodeIndividualsToNodeEntities,
  parseEdges,
  parseNodes,
  RelationshipSaliency,
  removeAnnotations,
  removeLastBracket,
} from '../utils/responseProcessing'
import { ListDisplayFormat } from './Answer'
import { debug } from '../constants'

export type FinishedAnswerObjectParsingTypes = 'summary' | 'slide'

export const Question = () => {
  const { questionsAndAnswersCount, setQuestionsAndAnswers } =
    useContext(ChatContext)
  const {
    questionAndAnswer: {
      id,
      question,
      answer,
      modelStatus: { modelAnswering, modelError },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleSelfCorrection,
  } = useContext(InterchangeContext)

  const [activated, setActivated] = useState(false) // show text box or not
  const questionItemRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!activated && (questionsAndAnswersCount < 2 || answer.length > 0)) {
      setActivated(true)
    }
  }, [activated, answer.length, questionsAndAnswersCount])

  /* -------------------------------------------------------------------------- */

  const canAsk = question.length > 0 && !modelAnswering

  /* -------------------------------------------------------------------------- */

  const autoGrow = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'fit-content'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [])

  const handleChange = useCallback(
    (event: ChangeEvent) => {
      if (event.target instanceof HTMLTextAreaElement) {
        const newQuestion = event.target.value

        setQuestionsAndAnswers(prevQsAndAs =>
          helpSetQuestionAndAnswer(prevQsAndAs, id, {
            question: newQuestion,
          })
        )

        autoGrow()
      }
    },
    [autoGrow, id, setQuestionsAndAnswers]
  )

  useEffect(() => {
    autoGrow()
  }, [autoGrow])

  /* -------------------------------------------------------------------------- */

  // ! smart part
  const answerStorage = useRef<{
    answer: string
    answerObjects: AnswerObject[]
  }>({
    answer: '', // raw uncleaned text
    answerObjects: [],
  })

  const handleResponseError = useCallback(
    (response: any) => {
      console.error(response.error)

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          // answerObjects: [], // ?
          modelStatus: {
            modelError: true,
          },
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleSentenceParsingResult = useCallback(
    (result: SentenceParsingJob) => {
      const { sourceAnswerObjectId } = result

      const sourceAnswerObject = answerStorage.current.answerObjects.find(
        answerObject => answerObject.id === sourceAnswerObjectId
      )
      if (!sourceAnswerObject || sourceAnswerObject.complete)
        // do not touch complete answer objects
        return

      answerStorage.current.answerObjects =
        answerStorage.current.answerObjects.map((a: AnswerObject) => {
          if (a.id === sourceAnswerObjectId) {
            return {
              ...a,
              complete: true,
            }
          } else return a
        })

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerObjects: answerStorage.current.answerObjects,
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const sentenceParser = useRef<SentenceParser>(
    new SentenceParser(handleSentenceParsingResult, handleResponseError)
  )

  /* -------------------------------------------------------------------------- */
  // ! stream graph

  const _groundRest = useCallback(() => {
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(
        prevQsAndAs,
        id,
        newQuestionAndAnswer({
          id,
          question,
          modelStatus: {
            modelAnswering: true,
            modelParsing: true, // parsing starts the same time as answering
          },
        })
      )
    )
    answerStorage.current.answer = ''
    answerStorage.current.answerObjects = []

    sentenceParser.current.reset() // ? still needed?

    textareaRef.current?.blur()

    // scroll to the question item (questionItemRef)
    setTimeout(() => {
      const answerWrapper = document.querySelector(
        `.answer-wrapper[data-id="${id}"]`
      )
      if (answerWrapper)
        answerWrapper.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        })
      // if (questionItemRef.current) {
      //   // find element with className .answer-wrapper and data-id = id
      //   questionItemRef.current.scrollIntoView({
      //     behavior: 'smooth',
      //   })
      // }
    }, 1000)
  }, [id, question, setQuestionsAndAnswers])

  /* -------------------------------------------------------------------------- */

  const handleUpdateRelationshipEntities = useCallback(
    (content: string, answerObjectId: string) => {
      const answerObject = answerStorage.current.answerObjects.find(
        a => a.id === answerObjectId
      )
      if (!answerObject) return

      const cleanedContent = removeLastBracket(content, true)
      const nodes = parseNodes(cleanedContent, answerObjectId)
      const edges = parseEdges(cleanedContent, answerObjectId)

      answerStorage.current.answerObjects =
        answerStorage.current.answerObjects.map(
          (a: AnswerObject): AnswerObject => {
            if (a.id === answerObjectId) {
              return {
                ...a,
                originText: {
                  ...a.originText,
                  nodeEntities: nodeIndividualsToNodeEntities(nodes),
                  edgeEntities: edges,
                },
              }
            } else return a
          }
        )

      // setQuestionsAndAnswers(prevQsAndAs =>
      //   helpSetQuestionAndAnswer(prevQsAndAs, id, {
      //     answerObjects: answerStorage.current.answerObjects,
      //   })
      // )
    },
    []
  )

  /* -------------------------------------------------------------------------- */

  const handleParsingCompleteAnswerObject = useCallback(
    async (answerObjectId: string) => {
      const answerObjectToCorrect = answerStorage.current.answerObjects.find(
        a => a.id === answerObjectId
      )
      if (!answerObjectToCorrect) return

      // self correction
      const correctedOriginTextContent = await handleSelfCorrection(
        answerObjectToCorrect
      )
      answerStorage.current.answer = answerStorage.current.answer.replace(
        answerObjectToCorrect.originText.content,
        correctedOriginTextContent
      )
      answerObjectToCorrect.originText.content = correctedOriginTextContent
      handleUpdateRelationshipEntities(
        correctedOriginTextContent,
        answerObjectId
      )

      // set corrected answer object
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer: answerStorage.current.answer,
          answerObjects: answerStorage.current.answerObjects, // TODO account for answerObjectSynced changes
        })
      )

      /* -------------------------------------------------------------------------- */
      // parse slides and summary
      const answerObject = answerStorage.current.answerObjects.find(
        a => a.id === answerObjectId
      )
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

            const parsingSummary = parsingType === 'summary'

            // ! request
            const parsingResult = await parseOpenAIResponseToObjects(
              predefinedPromptsForParsing[parsingType](
                parsingSummary
                  ? answerObject.originText.content
                  : removeAnnotations(answerObject.originText.content)
              ),
              debug ? models.faster : models.smarter
            )

            if (parsingResult.error) {
              handleResponseError(parsingResult)
              parsingError = true
              return
            }

            parsingResults[parsingType] =
              getTextFromModelResponse(parsingResult)
          }
        )
      )

      if (!parsingError) {
        // ! complete answer object
        answerStorage.current.answerObjects =
          answerStorage.current.answerObjects.map((a: AnswerObject) => {
            if (a.id === answerObjectId) {
              return {
                ...a,
                summary: {
                  content: parsingResults.summary,
                  nodeEntities: nodeIndividualsToNodeEntities(
                    parseNodes(parsingResults.summary, answerObjectId)
                  ),
                  edgeEntities: parseEdges(
                    parsingResults.summary,
                    answerObjectId
                  ),
                },
                slide: {
                  content: cleanSlideResponse(parsingResults.slide),
                },
                complete: true,
              }
            } else return a
          })

        setQuestionsAndAnswers(prevQsAndAs =>
          helpSetQuestionAndAnswer(prevQsAndAs, id, {
            answerObjects: answerStorage.current.answerObjects,
            // modelStatus: {
            //   modelAnswering: false,
            //   modelAnsweringComplete: true,
            //   modelParsing: false,
            //   modelParsingComplete: true,
            // },
          })
        )
      }
    },
    [
      handleResponseError,
      handleSelfCorrection,
      handleUpdateRelationshipEntities,
      id,
      setQuestionsAndAnswers,
    ]
  )

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream, freshStream = true) => {
      const deltaContent = trimLineBreaks(getTextFromStreamResponse(data))
      if (!deltaContent) return

      const aC = answerStorage.current

      // this is the first response streamed
      const isFirstAnswerObject = aC.answerObjects.length === 0
      const hasLineBreaker = deltaContent.includes('\n')

      let targetLastAnswerObjectId = aC.answerObjects.length
        ? aC.answerObjects[aC.answerObjects.length - 1].id
        : null

      // ! ground truth of the response
      aC.answer += deltaContent
      // sentenceParser.current.updateResponse(aC.answer)

      const _appendContentToLastAnswerObject = (content: string) => {
        const lastObject = aC.answerObjects[aC.answerObjects.length - 1]
        lastObject.originText.content += content
      }

      const preparedNewObject = {
        id: getAnswerObjectId(), // add id
        summary: {
          content: '',
          nodeEntities: [],
          edgeEntities: [],
        }, // add summary
        slide: {
          content: '',
        }, // pop empty slide
        answerObjectSynced: {
          listDisplay: 'original' as ListDisplayFormat,
          saliencyFilter: 'high' as RelationshipSaliency,
          collapsedNodes: [],
          sentencesBeingCorrected: [],
        },
        complete: false,
      }

      // break answer into parts
      if (isFirstAnswerObject) {
        // * new answer object
        aC.answerObjects.push({
          ...preparedNewObject,
          originText: {
            content: deltaContent,
            nodeEntities: [],
            edgeEntities: [],
          },
        })

        targetLastAnswerObjectId = preparedNewObject.id
        ////
      } else if (hasLineBreaker) {
        // add a new answer object
        const paragraphs = deltaContent
          .split('\n')
          .map(c => c.trim())
          .filter(c => c.length)

        let paragraphForNewAnswerObject = ''

        if (paragraphs.length === 2) {
          paragraphForNewAnswerObject = paragraphs[1]
          ////
          // if (!isFirstAnswerObject)
          _appendContentToLastAnswerObject(paragraphs[0])
        } else if (paragraphs.length === 1) {
          if (deltaContent.indexOf('\n') === 0)
            paragraphForNewAnswerObject = paragraphs[0]
          else {
            // if (!isFirstAnswerObject)
            _appendContentToLastAnswerObject(paragraphs[0])
          }
        } else {
          // do nothing now
        }

        // * new answer object
        aC.answerObjects.push({
          ...preparedNewObject,
          // originRange: {
          //   start: aC.answer.length - paragraphForNewAnswerObject.length,
          //   end: aC.answer.length,
          // }, // from text to ranges
          originText: {
            content: paragraphForNewAnswerObject,
            nodeEntities: [],
            edgeEntities: [],
          }, // add raw text
        })

        // ! finish a previous answer object
        // as the object is finished, we can start parsing it
        // adding summary, slide, relationships
        handleParsingCompleteAnswerObject(
          aC.answerObjects[aC.answerObjects.length - 2].id
        )

        targetLastAnswerObjectId = preparedNewObject.id
        ////
      } else {
        // append to last answer object
        _appendContentToLastAnswerObject(deltaContent)
      }

      // ! parse relationships right now
      const lastParagraph = aC.answer.split('\n').slice(-1)[0]
      if (targetLastAnswerObjectId)
        handleUpdateRelationshipEntities(
          lastParagraph,
          targetLastAnswerObjectId
        )

      // parse sentence into graph RIGHT NOW
      // if (deltaContent.includes('.')) {
      //   // get the last sentence from answerStorage.current.answer
      //   const dotAndBefore = deltaContent.split('.').slice(-2)[0] + '.'
      //   const lastSentencePartInPrevAnswerStorage = prevAnswerStorage
      //     .split('.')
      //     .slice(-2)[0]
      //   const lastSentence = lastSentencePartInPrevAnswerStorage + dotAndBefore

      //   // parse it
      //   if (prevLastAnswerObjectId) {
      //     sentenceParser.current.addJob(lastSentence, prevLastAnswerObjectId)
      //   }
      // }

      // * finally, update the state
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer: aC.answer,
          answerObjects: aC.answerObjects, // TODO account for answerObjectSynced changes
        })
      )

      // scroll
      // TODO
      /*
      const lastAnswerObject = aC.answerObjects[aC.answerObjects.length - 1]
      const answerObjectElement = document.querySelector(
        `.answer-text[data-id="${lastAnswerObject.id}"]`
      )
      if (answerObjectElement) {
        answerObjectElement.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        })
      }
      */
    },
    [
      handleParsingCompleteAnswerObject,
      handleUpdateRelationshipEntities,
      id,
      setQuestionsAndAnswers,
    ]
  )

  // ! ASK
  const handleAskStream = useCallback(async () => {
    // * ground reset
    _groundRest()

    // * actual ask model
    const initialPrompts = predefinedPrompts._graph_initialAsk(question)
    // ! request
    await streamOpenAICompletion(
      initialPrompts,
      debug ? models.faster : models.smarter,
      handleStreamRawAnswer,
      true
    )
    // * model done raw answering
    console.log('model done raw answering')
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        modelStatus: {
          modelAnswering: false,
          modelAnsweringComplete: true,
        },
      })
    )

    // try to finish the last answer object
    const lastAnswerObject =
      answerStorage.current.answerObjects[
        answerStorage.current.answerObjects.length - 1
      ]
    if (lastAnswerObject)
      await handleParsingCompleteAnswerObject(lastAnswerObject.id)

    // * model done parsing
    console.log('model done parsing')

    // * start self correction
    // console.log('model start self correction')
    // await handleSelfCorrection(
    //   answerStorage.current.answer,
    //   answerStorage.current.answerObjects
    // )

    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        modelStatus: {
          modelParsing: false,
          modelParsingComplete: true,
          modelInitialPrompts: [...initialPrompts.map(p => ({ ...p }))],
        },
      })
    )
  }, [
    _groundRest,
    handleParsingCompleteAnswerObject,
    handleStreamRawAnswer,
    id,
    question,
    setQuestionsAndAnswers,
  ])

  /* -------------------------------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // if cmd + enter
      if (e.key === 'Enter' && e.metaKey) {
        if (canAsk) handleAskStream()
      }
    },
    [canAsk, handleAskStream]
  )

  const handleDeleteInterchange = useCallback(() => {
    setQuestionsAndAnswers(prevQsAndAs =>
      prevQsAndAs.filter(qAndA => qAndA.id !== id)
    )
  }, [id, setQuestionsAndAnswers])

  return (
    <div
      ref={questionItemRef}
      className="question-item interchange-component drop-up"
    >
      {activated ? (
        <>
          <textarea
            ref={textareaRef}
            className="question-textarea"
            value={question}
            placeholder={'ask a question'}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            disabled={!canAsk}
            className="bar-button"
            onClick={handleAskStream}
          >
            {modelAnswering ? (
              <HourglassTopRoundedIcon className="loading-icon" />
            ) : (
              <AutoFixHighRoundedIcon />
            )}
          </button>
          <button
            disabled={questionsAndAnswersCount < 2}
            className="bar-button"
            onClick={handleDeleteInterchange}
          >
            <ClearRoundedIcon />
          </button>
        </>
      ) : (
        <span
          className="new-question-hint"
          onClick={() => {
            setActivated(true)
          }}
        >
          add question
        </span>
      )}
      {modelError && (
        <div className="error-message">Got an error, please try again.</div>
      )}
    </div>
  )
}
