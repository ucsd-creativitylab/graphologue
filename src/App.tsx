import React, { useEffect, useState } from 'react'
import { ChatContext } from './components/Contexts'
import { Interchange } from './components/Interchange'
import { newQuestion } from './utils/chatAppUtils'

export interface AnswerObject {}

export interface QuestionAndAnswer {
  id: string
  question: string
  answer: string
  answerInformationArray: AnswerObject[]
  modelAnswering: boolean
  modelAnsweringRawResponseComplete: boolean
  modelAnsweringComplete: boolean
}

export const ChatApp = () => {
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState<
    QuestionAndAnswer[]
  >([])

  // componentDidMount
  useEffect(() => {
    if (questionsAndAnswers.length === 0)
      setQuestionsAndAnswers([newQuestion()])
    else if (
      questionsAndAnswers[questionsAndAnswers.length - 1].answer.length > 0
    )
      setQuestionsAndAnswers(prevQuestionsAndAnswers => [
        ...prevQuestionsAndAnswers,
        newQuestion(),
      ])
  }, [questionsAndAnswers])

  return (
    <ChatContext.Provider
      value={{
        setQuestionsAndAnswers,
      }}
    >
      <div className="chat-app">
        {questionsAndAnswers.map((questionAndAnswer, index) => (
          <Interchange key={index} data={questionAndAnswer} />
        ))}
      </div>
    </ChatContext.Provider>
  )
}
