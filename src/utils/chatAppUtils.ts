import { v4 as uuidv4 } from 'uuid'

import { PartialQuestionAndAnswer, QuestionAndAnswer } from '../App'

export const getAnswerObjectId = () => {
  return `answer-object-${uuidv4()}`
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
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    id: qA.id,
    question: qA.question,
    answer: qA.answer,
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
  return prevQsAndAs.map((prevQAndA: QuestionAndAnswer) => {
    return prevQAndA.id === id
      ? {
          ...prevQAndA,
          ...newQAndA,
          modelStatus: {
            ...prevQAndA.modelStatus,
            ...(newQAndA.modelStatus ?? {}),
          },
        }
      : prevQAndA
  })
}
