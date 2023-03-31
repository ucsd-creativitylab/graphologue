import React from 'react'
import ReactMarkdown from 'react-markdown'

import { AnswerSlideObject } from '../App'

export const SlideAnswerText = ({ content }: AnswerSlideObject) => {
  return (
    <div className="slide-text-wrapper">
      <ReactMarkdown children={content} />
    </div>
  )
}
