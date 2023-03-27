import React, {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'

import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'

import {
  AnswerObject,
  AnswerRelationshipObject,
  AnswerSlideObject,
  QuestionAndAnswer,
} from '../App'
import { ChatContext } from './Contexts'
import {
  getTextFromModelResponse,
  getTextFromStreamResponse,
  models,
  OpenAIChatCompletionResponseStream,
  parseOpenAIResponseToObjects,
  streamOpenAICompletion,
} from '../utils/openAI'
import { predefinedPrompts } from '../utils/promptsAndResponses'
import {
  getAnswerObjectId,
  helpSetQuestionsAndAnswers,
  newQuestion,
  originTextToRanges,
  rangesToOriginText,
} from '../utils/chatAppUtils'

export const Question = ({
  questionAndAnswer: {
    id,
    question,
    modelStatus: { modelAnswering, modelError },
  },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  const { questionsAndAnswersCount, setQuestionsAndAnswers } =
    useContext(ChatContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
          helpSetQuestionsAndAnswers(prevQsAndAs, id, {
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
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
          answerInformation: [],
          modelStatus: {
            modelError: true,
          },
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream) => {
      const deltaContent = getTextFromStreamResponse(data)
      if (!deltaContent) return

      answerStorage.current.answer += deltaContent

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
          answer: answerStorage.current.answer,
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleAsk = useCallback(async () => {
    // * ground reset
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(
        prevQsAndAs,
        id,
        newQuestion({
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
    await streamOpenAICompletion(
      initialPrompts,
      models.smarter,
      handleStreamRawAnswer
    )
    // * model done raw answering
    console.log('model done raw answering')

    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        modelStatus: {
          modelAnswering: false,
          modelAnsweringComplete: true,
          modelParsing: true,
        },
      })
    )
    /* -------------------------------------------------------------------------- */

    // * break answer
    const brokenResponseData = await parseOpenAIResponseToObjects(
      predefinedPrompts._chat_breakResponse(
        initialPrompts,
        answerStorage.current.answer
      ),
      models.smarter
    )
    if (brokenResponseData.error) return handleResponseError(brokenResponseData)

    console.log(answerStorage.current.answer)

    answerStorage.current.answerInformation = getTextFromModelResponse(
      brokenResponseData
    )
      .split('\n')
      .map((b: string) => b.trim())
      .filter((b: string) => b.length > 0)
      .map((a: string) => {
        // ! from fetched data to AnswerObject
        console.log(a)

        return {
          id: getAnswerObjectId(), // add id
          origin: originTextToRanges(answerStorage.current.answer, [a]), // from text to ranges
          summary: '', // add summary
          slide: {
            title: '',
            content: '',
          }, // pop empty slide
          relationships: [], // pop empty relationships
          complete: false,
        } as AnswerObject
      }) as AnswerObject[]

    console.log(
      'model done breaking answer',
      answerStorage.current.answerInformation
    )
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        answerInformation: answerStorage.current.answerInformation,
      })
    )

    // * get summary
    try {
      answerStorage.current.answerInformation = await Promise.all(
        answerStorage.current.answerInformation.map(async (a: AnswerObject) => {
          const textSummaryData = await parseOpenAIResponseToObjects(
            predefinedPrompts._chat_summarizeParagraph(
              rangesToOriginText(answerStorage.current.answer, a.origin)
            ),
            models.faster
          )
          if (textSummaryData.error) {
            handleResponseError(textSummaryData)
            return a
          }

          const textSummary = getTextFromModelResponse(textSummaryData)

          return {
            ...a,
            summary: textSummary,
          }
        })
      )
    } catch (error) {
      console.error(getTextFromModelResponse(brokenResponseData))

      return setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
          modelStatus: {
            modelError: true,
          },
        })
      )
    }

    console.log(
      'model done summarizing answer',
      answerStorage.current.answerInformation
    )
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        answerInformation: answerStorage.current.answerInformation,
      })
    )

    // * parse parts of answer
    let parsingError = false
    answerStorage.current.answerInformation = await Promise.all(
      answerStorage.current.answerInformation.map(
        async (answerPart: AnswerObject) => {
          const { origin } = answerPart

          if (!parsingError) {
            const parsedPartResponseData = await parseOpenAIResponseToObjects(
              predefinedPrompts._chat_parsePartResponse(
                initialPrompts,
                answerStorage.current.answer,
                origin.join(' ')
              ),
              models.smarter
            )

            if (parsedPartResponseData.error) {
              handleResponseError(parsedPartResponseData)
              parsingError = true
              return answerPart
            }

            try {
              const parsedPartRaw = JSON.parse(
                getTextFromModelResponse(parsedPartResponseData)
              )

              // ! from fetched data to part of AnswerObject
              const parsedPart = {
                slide: parsedPartRaw.slide,
                relationships: parsedPartRaw.relationships.map((r: any) => ({
                  ...r,
                  origin: originTextToRanges(
                    answerStorage.current.answer,
                    r.origin
                  ),
                })),
              } as {
                slide: AnswerSlideObject
                relationships: AnswerRelationshipObject[]
              }

              return {
                ...answerPart,
                ...(({ slide, relationships }) => ({ slide, relationships }))(
                  parsedPart
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
      console.log(answerStorage.current.answerInformation)
      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
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
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // if cmd + enter
      if (e.key === 'Enter' && e.metaKey) {
        if (canAsk) handleAsk()
      }
    },
    [canAsk, handleAsk]
  )

  const handleDeleteInterchange = useCallback(() => {
    setQuestionsAndAnswers(prevQsAndAs =>
      prevQsAndAs.filter(qAndA => qAndA.id !== id)
    )
  }, [id, setQuestionsAndAnswers])

  return (
    <div className="question-item interchange-component">
      <textarea
        ref={textareaRef}
        className="question-textarea"
        value={question}
        placeholder={'ask a question'}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button disabled={!canAsk} className="bar-button" onClick={handleAsk}>
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
      {modelError && (
        <div className="error-message">Got an error, please try again.</div>
      )}
    </div>
  )
}
