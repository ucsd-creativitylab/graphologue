import { v4 as uuidv4 } from 'uuid'

import {
  PartialQuestionAndAnswer,
  QuestionAndAnswer,
  RawAnswerRange,
} from '../App'

export const getAnswerObjectId = () => {
  return `answer-object-${uuidv4()}`
}

export const rangesToId = (ranges: RawAnswerRange[]): string => {
  return ranges.map(range => `${range.start}-${range.end}`).join(':')
}

export const originTextToRanges = (
  response: string,
  origin: string[]
): RawAnswerRange[] => {
  const ranges: RawAnswerRange[] = []

  origin.forEach(originText => {
    const start = response.indexOf(originText)
    const end = start + originText.length
    ranges.push({ start, end })
  })

  return ranges
}

export const rangesToOriginText = (
  response: string,
  ranges: RawAnswerRange[]
) => {
  return ranges
    .map(range => response.substring(range.start, range.end))
    .join(' ')
}

export const newQuestion = (
  prefill?: PartialQuestionAndAnswer
): QuestionAndAnswer => {
  return {
    id: prefill?.id ?? `question-and-answer-${uuidv4()}`,
    question: prefill?.question ?? '',
    answer: prefill?.answer ?? '',
    answerInformation: prefill?.answerInformation ?? [],
    modelStatus: {
      modelAnswering: prefill?.modelStatus?.modelAnswering ?? false,
      modelParsing: prefill?.modelStatus?.modelParsing ?? false,
      modelAnsweringComplete:
        prefill?.modelStatus?.modelAnsweringComplete ?? false,
      modelParsingComplete: prefill?.modelStatus?.modelParsingComplete ?? false,
      modelError: prefill?.modelStatus?.modelError ?? false,
    },
    highlighted: prefill?.highlighted ?? [],
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    ...qA,
    answerInformation: qA.answerInformation.map(a => {
      return { ...a }
    }),
    modelStatus: {
      ...qA.modelStatus,
    },
  }
}

export const helpSetQuestionsAndAnswers = (
  prevQsAndAs: QuestionAndAnswer[],
  id: string,
  newQAndA: PartialQuestionAndAnswer
): QuestionAndAnswer[] => {
  const templateModelStatus = newQAndA.modelStatus?.modelError
    ? {
        modelAnswering: false,
        modelParsing: false,
        modelAnsweringComplete: false,
        modelParsingComplete: false,
        modelError: true,
      }
    : {}

  return prevQsAndAs.map((prevQAndA: QuestionAndAnswer) => {
    return prevQAndA.id === id
      ? {
          ...prevQAndA,
          ...newQAndA,
          modelStatus: {
            ...prevQAndA.modelStatus,
            ...(newQAndA.modelStatus ?? {}),
            ...templateModelStatus,
          },
        }
      : prevQAndA
  })
}
