import { v4 as uuidv4 } from 'uuid'

import {
  AnswerObject,
  PartialQuestionAndAnswer,
  QuestionAndAnswer,
  RawAnswerRange,
} from '../App'
import { deepCopyEdges, deepCopyNodes } from './storage'

export const getAnswerObjectId = () => {
  return `answer-object-${uuidv4()}`
}

export const rangeToId = (range: RawAnswerRange): string => {
  return `range-${range.start}-${range.end}`
}

export const originTextToRange = (
  response: string,
  origin: string,
  offset = 0
): RawAnswerRange => {
  if (!origin.length)
    return {
      start: offset,
      end: offset,
    }

  const start = response.indexOf(origin)

  if (start === -1) {
    // try removing the last word of origin one by one
    // until we find a match
    const words = origin.split(' ')
    let i = words.length - 1
    while (i > 0) {
      const newOrigin = words.slice(0, i).join(' ')
      const newStart = response.indexOf(newOrigin)
      if (newStart !== -1) {
        return {
          start: newStart,
          end: newStart + newOrigin.length,
        }
      }
      i--
    }
  }

  return {
    start: start,
    end: start + origin.length,
  }
}

export const rangesToOriginText = (response: string, range: RawAnswerRange) => {
  return response.substring(range.start, range.end)
}

export const findHighlightedRangeByAnswerObjectId = (
  answerInformation: AnswerObject[],
  answerObjectId: string
): RawAnswerRange | undefined => {
  return answerInformation.find(
    answerObject => answerObject.id === answerObjectId
  )?.origin
}

export const addOrMergeRanges = (
  existingRanges: RawAnswerRange[],
  newRange: RawAnswerRange
) => {
  let merged = false

  const newRanges = existingRanges.map(existingRange => {
    // check if newRange and existingRange overlap
    if (
      newRange.start <= existingRange.end &&
      newRange.end >= existingRange.start
    ) {
      merged = true
      return {
        start: Math.min(existingRange.start, newRange.start),
        end: Math.max(existingRange.end, newRange.end),
      }
    }

    return existingRange
  })

  // sort new ranges
  newRanges.sort((a, b) => a.start - b.start)

  if (!merged) newRanges.push(newRange)
  else {
    // merge happened
    // go through new ranges again and see if there's any overlap and merge
    let i = 0
    while (i < newRanges.length) {
      let j = i + 1
      while (j < newRanges.length) {
        if (
          newRanges[i].start <= newRanges[j].end &&
          newRanges[i].end >= newRanges[j].start
        ) {
          newRanges[i] = {
            start: Math.min(newRanges[i].start, newRanges[j].start),
            end: Math.max(newRanges[i].end, newRanges[j].end),
          }
          newRanges.splice(j, 1)
        } else {
          j++
        }
      }
      i++
    }
  }

  return newRanges
}

export const trimLineBreaks = (text: string) => {
  // replace '\n\n' or '\n\n\n' (or more) with '\n'
  return text.replace(/(\n)*\n/g, '\n')
}

/* -------------------------------------------------------------------------- */

export const newQuestionAndAnswer = (
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
    reactFlow: {
      nodes: prefill?.reactFlow?.nodes ?? [],
      edges: prefill?.reactFlow?.edges ?? [],
    },
    highlighted: prefill?.highlighted ?? {
      origins: [],
      answerObjectIds: new Set(),
    },
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    ...qA,
    answerInformation: qA.answerInformation.map(a => {
      return {
        ...a,
        origin: { ...a.origin },
        slide: { ...a.slide },
        relationships: a.relationships.map(r => ({ ...r })),
      } as AnswerObject
    }),
    modelStatus: {
      ...qA.modelStatus,
    },
    reactFlow: {
      nodes: deepCopyNodes(qA.reactFlow.nodes),
      edges: deepCopyEdges(qA.reactFlow.edges),
    },
    highlighted: {
      ...qA.highlighted,
    },
  }
}

export const helpSetQuestionAndAnswer = (
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
          ...deepCopyQuestionAndAnswer(prevQAndA),
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
