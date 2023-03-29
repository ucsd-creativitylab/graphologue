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

import { AnswerObject, AnswerRelationshipObject } from '../App'
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
import {
  answerInformationToReactFlowObject,
  rawRelationsToGraphRelationsChat,
} from '../utils/chatGraphConstruct'
import { InterchangeContext } from './Interchange'
import { SentenceParser, SentenceParsingJob } from '../utils/sentenceParser'

export type FinishedAnswerObjectParsingTypes =
  | 'summary'
  | 'slide'
  | 'relationships'

export const Question = () => {
  const { questionsAndAnswersCount, setQuestionsAndAnswers } =
    useContext(ChatContext)
  const {
    data: {
      id,
      question,
      answer,
      modelStatus: { modelAnswering, modelError },
    },
  } = useContext(InterchangeContext)

  const [activated, setActivated] = useState(false) // show text box or not
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
    answerInformation: AnswerObject[]
  }>({
    answer: '',
    answerInformation: [],
  })

  const handleResponseError = useCallback(
    (response: any) => {
      console.error(response.error)

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerInformation: [],
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
      const { sourceAnswerObjectId, relationships } = result

      const sourceAnswerObject = answerStorage.current.answerInformation.find(
        answerObject => answerObject.id === sourceAnswerObjectId
      )
      if (!sourceAnswerObject || sourceAnswerObject.complete)
        // do not touch complete answer objects
        return

      answerStorage.current.answerInformation =
        answerStorage.current.answerInformation.map((a: AnswerObject) => {
          if (a.id === sourceAnswerObjectId) {
            return {
              ...a,
              relationships: [
                ...a.relationships,
                ...relationships.filter(r => r.source !== r.target), // * remove self-relationships
              ] as AnswerRelationshipObject[],
              complete: true,
            }
          } else return a
        })

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerInformation: answerStorage.current.answerInformation,
          reactFlow: answerInformationToReactFlowObject(
            answerStorage.current.answerInformation
          ),
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const sentenceParser = useRef<SentenceParser>(
    new SentenceParser(handleSentenceParsingResult, handleResponseError)
  )

  /*
  const handleAsk = useCallback(async () => {
    // * ground reset
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(
        prevQsAndAs,
        id,
        newQuestionAndAnswer({
          id,
          question,
          modelStatus: {
            modelAnswering: true,
          },
        })
      )
    )
    answerStorage.current.answer = ''
    answerStorage.current.answerInformation = []
    textareaRef.current?.blur()

    // * actual ask model
    const initialPrompts = predefinedPrompts._chat_initialAsk(question)
    // ! request
    await streamOpenAICompletion(
      initialPrompts,
      models.smarter,
      handleStreamRawAnswer
    )
    // * model done raw answering
    console.log('model done raw answering')

    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        modelStatus: {
          modelAnswering: false,
          modelAnsweringComplete: true,
          modelParsing: true,
        },
      })
    )

    // * break answer
    answerStorage.current.answerInformation = answerStorage.current.answer
      .split('\n')
      .map((paragraph: string) => paragraph.trim())
      .filter((paragraph: string) => paragraph.length > 0)
      .map((paragraph: string) => {
        // ! from fetched data to AnswerObject
        // ! first time construct AnswerObject
        return {
          id: getAnswerObjectId(), // add id
          origin: originTextToRange(answerStorage.current.answer, paragraph), // from text to ranges
          originRawText: paragraph, // add raw text
          summary: '', // add summary
          slide: {
            content: '',
          }, // pop empty slide
          relationships: [], // pop empty relationships
          complete: false,
        } as AnswerObject
      })

    // * break answer with model (deprecated)
    // const brokenResponseData = await parseOpenAIResponseToObjects(
    //   predefinedPrompts._chat_breakResponse(
    //     initialPrompts,
    //     answerStorage.current.answer
    //   ),
    //   models.smarter
    // )
    // if (brokenResponseData.error) return handleResponseError(brokenResponseData)

    // answerStorage.current.answerInformation = getTextFromModelResponse(
    //   brokenResponseData
    // )
    //   .split('\n')
    //   .map((b: string) => b.trim())
    //   .filter((b: string) => b.length > 0)
    //   .map((a: string) => {
    //     // ! from fetched data to AnswerObject
    //     return {
    //       id: getAnswerObjectId(), // add id
    //       origin: originTextToRanges(answerStorage.current.answer, [a]), // from text to ranges
    //       summary: '', // add summary
    //       slide: {
    //         content: '',
    //       }, // pop empty slide
    //       relationships: [], // pop empty relationships
    //       complete: false,
    //     } as AnswerObject
    //   }) as AnswerObject[]

    // console.log(
    //   'model done breaking answer',
    //   answerStorage.current.answerInformation
    // )
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        answerInformation: answerStorage.current.answerInformation,
      })
    )

    // * get summary
    let summaryError = false
    answerStorage.current.answerInformation = await Promise.all(
      answerStorage.current.answerInformation.map(async (a: AnswerObject) => {
        if (summaryError) return a

        // ! request
        const textSummaryData = await parseOpenAIResponseToObjects(
          predefinedPrompts._chat_summarizeParagraph(
            rangesToOriginText(answerStorage.current.answer, a.origin)
          ),
          models.faster
        )
        if (textSummaryData.error) {
          handleResponseError(textSummaryData)
          summaryError = true
          return a
        }

        const textSummary = getTextFromModelResponse(textSummaryData)

        return {
          ...a,
          summary: textSummary,
        }
      })
    )

    if (summaryError) {
      return setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          modelStatus: {
            modelError: true,
          },
        })
      )
    }
    console.log('model done summarizing answer')
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionAndAnswer(prevQsAndAs, id, {
        answerInformation: answerStorage.current.answerInformation,
      })
    )

    // * parse parts of answer
    let parsingError = false
    answerStorage.current.answerInformation = await Promise.all(
      answerStorage.current.answerInformation.map(
        async (answerPart: AnswerObject, i) => {
          const { origin } = answerPart
          const partOfOriginalResponse = rangesToOriginText(
            answerStorage.current.answer,
            origin
          )

          if (!parsingError) {
            // slide
            // ! request
            const parsedSlideData = await parseOpenAIResponseToObjects(
              predefinedPrompts._chat_parseSlide(
                // answerStorage.current.answer,
                partOfOriginalResponse
              ),
              models.faster
            )

            // relationships
            // ! request
            const parsedRelationshipData = await parseOpenAIResponseToObjects(
              predefinedPrompts._chat_parseRelationships(
                // answerStorage.current.answer,
                partOfOriginalResponse
              ),
              models.faster
            )

            if (parsedSlideData.error || parsedRelationshipData.error) {
              if (parsedSlideData.error) handleResponseError(parsedSlideData)
              if (parsedRelationshipData.error)
                handleResponseError(parsedRelationshipData)

              parsingError = true
              return answerPart
            }

            try {
              const parsedSlidePart = getTextFromModelResponse(parsedSlideData)
              const parsedRelationshipPart = getTextFromModelResponse(
                parsedRelationshipData
              )

              // ! from fetched data to part of AnswerObject
              return {
                ...answerPart,
                slide: {
                  content: parsedSlidePart,
                },
                relationships: rawRelationsToGraphRelationsChat(
                  answerStorage.current.answer,
                  parsedRelationshipPart
                ),
                complete: true,
              } as AnswerObject
            } catch (error) {
              parsingError = true
              return answerPart
            }
          } else return answerPart
        }
      )
    )

    if (!parsingError) {
      // ! all complete
      console.log('all complete', answerStorage.current.answerInformation)
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answerInformation: answerStorage.current.answerInformation,
          modelStatus: {
            modelAnswering: false,
            modelAnsweringComplete: true,
            modelParsing: false,
            modelParsingComplete: true,
          },
        })
      )
    } else {
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          modelStatus: {
            modelError: true,
          },
        })
      )
    }
  }, [
    handleResponseError,
    handleStreamRawAnswer,
    id,
    question,
    setQuestionsAndAnswers,
  ])
  */

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
          },
        })
      )
    )
    answerStorage.current.answer = ''
    answerStorage.current.answerInformation = []

    sentenceParser.current.reset()

    textareaRef.current?.blur()
  }, [id, question, setQuestionsAndAnswers])

  const handleParsingCompleteAnswerObject = useCallback(
    async (answerObjectId: string) => {
      const answerObject = answerStorage.current.answerInformation.find(
        a => a.id === answerObjectId
      )
      if (!answerObject) return

      const parsingResults: {
        [key in FinishedAnswerObjectParsingTypes]: string
      } = {
        summary: '',
        slide: '',
        relationships: '',
      }

      let parsingError = false
      await Promise.all(
        (
          [
            'summary',
            'slide',
            'relationships',
          ] as FinishedAnswerObjectParsingTypes[]
        ).map(async (parsingType: FinishedAnswerObjectParsingTypes) => {
          if (parsingError) return

          // ! request
          const parsingResult = await parseOpenAIResponseToObjects(
            predefinedPromptsForParsing[parsingType](
              answerObject.originRawText
            ),
            models.faster
          )

          if (parsingResult.error) {
            handleResponseError(parsingResult)
            parsingError = true
            return
          }

          parsingResults[parsingType] = getTextFromModelResponse(parsingResult)
        })
      )

      if (!parsingError) {
        // ! complete answer object
        answerStorage.current.answerInformation =
          answerStorage.current.answerInformation.map((a: AnswerObject) => {
            if (a.id === answerObjectId) {
              return {
                ...a,
                summary: parsingResults.summary,
                slide: {
                  content: parsingResults.slide,
                },
                relationships: rawRelationsToGraphRelationsChat(
                  answerStorage.current.answer,
                  parsingResults.relationships
                ),
                complete: true,
              }
            } else return a
          })

        setQuestionsAndAnswers(prevQsAndAs =>
          helpSetQuestionAndAnswer(prevQsAndAs, id, {
            answerInformation: answerStorage.current.answerInformation,
            reactFlow: answerInformationToReactFlowObject(
              answerStorage.current.answerInformation
            ),
            modelStatus: {
              modelAnswering: false,
              modelAnsweringComplete: true,
              modelParsing: false,
              modelParsingComplete: true,
            },
          })
        )
      }
    },
    [handleResponseError, id, setQuestionsAndAnswers]
  )

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream) => {
      const deltaContent = trimLineBreaks(getTextFromStreamResponse(data))
      if (!deltaContent) return

      const aC = answerStorage.current

      // this is the first response streamed
      const isFirstAnswerObject = aC.answerInformation.length === 0
      const hasLineBreaker = deltaContent.includes('\n')

      // ! ground truth of the response
      const prevAnswerStorage = aC.answer
      let prevLastAnswerObjectId = aC.answerInformation.length
        ? aC.answerInformation[aC.answerInformation.length - 1].id
        : null

      aC.answer += isFirstAnswerObject
        ? deltaContent.trimStart() // a clean start
        : deltaContent
      sentenceParser.current.updateResponse(aC.answer)

      const _appendContentToLastAnswerObject = (content: string) => {
        const lastObject = aC.answerInformation[aC.answerInformation.length - 1]
        lastObject.originRawText += content
        lastObject.origin.end += content.length
      }

      const preparedNewObject = {
        id: getAnswerObjectId(), // add id
        summary: '', // add summary
        slide: {
          content: '',
        }, // pop empty slide
        relationships: [], // pop empty relationships
        complete: false,
      }

      // break answer into parts
      if (isFirstAnswerObject) {
        // * new answer object
        aC.answerInformation.push({
          ...preparedNewObject,
          origin: {
            start: 0,
            end: deltaContent.length,
          }, // from text to ranges
          originRawText: deltaContent, // add raw text
        } as AnswerObject)

        prevLastAnswerObjectId = preparedNewObject.id
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
        aC.answerInformation.push({
          ...preparedNewObject,
          origin: {
            start: aC.answer.length - paragraphForNewAnswerObject.length,
            end: aC.answer.length,
          }, // from text to ranges
          originRawText: paragraphForNewAnswerObject, // add raw text
        } as AnswerObject)

        // ! finish a previous answer object
        // as the object is finished, we can start parsing it
        // adding summary, slide, relationships
        handleParsingCompleteAnswerObject(
          aC.answerInformation[aC.answerInformation.length - 2].id
        )
        ////
      } else {
        // append to last answer object
        _appendContentToLastAnswerObject(deltaContent)
      }

      // parse sentence into graph RIGHT NOW
      if (deltaContent.includes('.')) {
        // get the last sentence from answerStorage.current.answer
        const dotAndBefore = deltaContent.split('.').slice(-2)[0] + '.'
        const lastSentencePartInPrevAnswerStorage = prevAnswerStorage
          .split('.')
          .slice(-2)[0]
        const lastSentence = lastSentencePartInPrevAnswerStorage + dotAndBefore

        // parse it
        if (prevLastAnswerObjectId) {
          sentenceParser.current.addJob(lastSentence, prevLastAnswerObjectId)
        }
      }

      // finally, update the state
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionAndAnswer(prevQsAndAs, id, {
          answer: aC.answer,
          answerInformation: aC.answerInformation,
        })
      )
    },
    [handleParsingCompleteAnswerObject, id, setQuestionsAndAnswers]
  )

  // ! ASK
  const handleAskStream = useCallback(async () => {
    // * ground reset
    _groundRest()

    // * actual ask model
    const initialPrompts = predefinedPrompts._chat_initialAsk(question)
    // ! request
    await streamOpenAICompletion(
      initialPrompts,
      models.smarter,
      handleStreamRawAnswer
    )
    // * model done raw answering
    console.log('model done raw answering')
    // try to finish the last answer object
    const lastAnswerObject =
      answerStorage.current.answerInformation[
        answerStorage.current.answerInformation.length - 1
      ]
    if (lastAnswerObject) handleParsingCompleteAnswerObject(lastAnswerObject.id)

    // * model done parsing
    console.log('model done parsing')
  }, [
    _groundRest,
    handleParsingCompleteAnswerObject,
    handleStreamRawAnswer,
    question,
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
    <div className="question-item interchange-component drop-up">
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
