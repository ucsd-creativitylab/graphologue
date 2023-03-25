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

import { QuestionAndAnswer } from '../App'
import { ChatContext } from './Contexts'
import {
  getTextFromModelResponse,
  getTextFromStreamResponse,
  OpenAIChatCompletionResponseStream,
  parseOpenAIResponseToObjects,
  quickPickModel,
  streamOpenAICompletion,
} from '../utils/openAI'
import { predefinedPrompts } from '../utils/promptsAndResponses'
import { helpSetQuestionsAndAnswers } from '../utils/chatAppUtils'

export const Question = ({
  questionAndAnswer: { id, question, modelAnswering },
}: {
  questionAndAnswer: QuestionAndAnswer
}) => {
  const { setQuestionsAndAnswers } = useContext(ChatContext)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
  const answerStorage = useRef('')

  const handleStreamRawAnswer = useCallback(
    (data: OpenAIChatCompletionResponseStream) => {
      const deltaContent = getTextFromStreamResponse(data)
      if (!deltaContent) return

      answerStorage.current += deltaContent

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
          answer: answerStorage.current,
        })
      )
    },
    [id, setQuestionsAndAnswers]
  )

  const handleAsk = useCallback(async () => {
    // * ground reset
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        answer: '',
        answerInformationArray: [],
        modelAnswering: true,
        modelAnsweringRawResponseComplete: false,
        modelAnsweringComplete: false,
      })
    )
    answerStorage.current = ''
    textareaRef.current?.blur()

    // * actual ask model
    const initialPrompts = predefinedPrompts._chat_initialAsk(question)
    await streamOpenAICompletion(
      initialPrompts,
      quickPickModel(),
      handleStreamRawAnswer
    )
    // * model done raw answering
    console.log('model done raw answering')

    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        modelAnsweringRawResponseComplete: true,
      })
    )

    // * parse answer
    const parsedResponseData = await parseOpenAIResponseToObjects(
      predefinedPrompts._chat_parseResponse(
        initialPrompts,
        answerStorage.current
      ),
      quickPickModel()
    )
    if (parsedResponseData.error) {
      console.error(parsedResponseData.error)

      setQuestionsAndAnswers(prevQsAndAs =>
        helpSetQuestionsAndAnswers(prevQsAndAs, id, {
          answerInformationArray: [],
          modelAnswering: false,
          modelAnsweringComplete: true,
        })
      )

      return
    }

    const parsedResponse = JSON.parse(
      getTextFromModelResponse(parsedResponseData)
    )
    // * all complete
    setQuestionsAndAnswers(prevQsAndAs =>
      helpSetQuestionsAndAnswers(prevQsAndAs, id, {
        answerInformationArray: parsedResponse,
        modelAnswering: false,
        modelAnsweringComplete: true,
      })
    )
  }, [handleStreamRawAnswer, id, question, setQuestionsAndAnswers])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // if cmd + enter
      if (e.key === 'Enter' && e.metaKey) {
        handleAsk()
      }
    },
    [handleAsk]
  )

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
      <button
        disabled={modelAnswering || question === ''}
        className="bar-button"
        onClick={handleAsk}
      >
        {modelAnswering ? (
          <HourglassTopRoundedIcon className="loading-icon" />
        ) : (
          <AutoFixHighRoundedIcon />
        )}
      </button>
    </div>
  )
}
