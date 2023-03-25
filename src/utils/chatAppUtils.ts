import { v4 as uuidv4 } from 'uuid'

import { QuestionAndAnswer } from '../App'

export const newQuestion = (): QuestionAndAnswer => {
  return {
    id: `question-and-answer-${uuidv4()}`,
    question: '',
    answer: '',
    answerInformationArray: [],
    modelAnswering: false,
    modelAnsweringRawResponseComplete: false,
    modelAnsweringComplete: false,
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    id: qA.id,
    question: qA.question,
    answer: qA.answer,
    answerInformationArray: qA.answerInformationArray.map(a => {
      return a
    }), // TODO
    modelAnswering: qA.modelAnswering,
    modelAnsweringRawResponseComplete: qA.modelAnsweringRawResponseComplete,
    modelAnsweringComplete: qA.modelAnsweringComplete,
  }
}

export const helpSetQuestionsAndAnswers = (
  prevQsAndAs: QuestionAndAnswer[],
  id: string,
  newQAndA: Partial<QuestionAndAnswer>
) => {
  return prevQsAndAs.map(prevQAndA => {
    return prevQAndA.id === id
      ? {
          ...prevQAndA,
          ...newQAndA,
        }
      : prevQAndA
  })
}
