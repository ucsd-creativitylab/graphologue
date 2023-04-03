import { v4 as uuidv4 } from 'uuid'

import {
  AnswerObject,
  PartialQuestionAndAnswer,
  QuestionAndAnswer,
  OriginRange,
  NodeEntity,
  NodeEntityIndividual,
  EdgeEntity,
} from '../App'
import { EdgePair } from './responseProcessing'

export const getAnswerObjectId = () => {
  return `answer-object-${uuidv4()}`
}

export const rangeToId = (range: OriginRange): string => {
  return `range-${range.start}-${range.end}`
}

export const rangesToOriginText = (response: string, range: OriginRange) => {
  return response.substring(range.start, range.end)
}

export const addOrMergeRanges = (
  existingRanges: OriginRange[],
  newRange: OriginRange
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
    answerObjects: prefill?.answerObjects ?? [],
    modelStatus: {
      modelAnswering: prefill?.modelStatus?.modelAnswering ?? false,
      modelParsing: prefill?.modelStatus?.modelParsing ?? false,
      modelAnsweringComplete:
        prefill?.modelStatus?.modelAnsweringComplete ?? false,
      modelParsingComplete: prefill?.modelStatus?.modelParsingComplete ?? false,
      modelError: prefill?.modelStatus?.modelError ?? false,
      modelInitialPrompts: prefill?.modelStatus?.modelInitialPrompts ?? [],
    },
    synced: {
      answerObjectIdsHighlighted:
        prefill?.synced?.answerObjectIdsHighlighted ?? [],
      answerObjectIdsHidden: prefill?.synced?.answerObjectIdsHidden ?? [],
      highlightedCoReferenceOriginRanges:
        prefill?.synced?.highlightedCoReferenceOriginRanges ?? [],
      highlightedNodeIdsProcessing:
        prefill?.synced?.highlightedNodeIdsProcessing ?? [],
      saliencyFilter: prefill?.synced?.saliencyFilter ?? 'high', // ! default saliency
    },
  }
}

export const deepCopyAnswerObject = (a: AnswerObject): AnswerObject => {
  return {
    ...a,
    slide: { ...a.slide },
    nodeEntities: a.nodeEntities.map((e: NodeEntity) => ({
      ...e,
      individuals: e.individuals.map((i: NodeEntityIndividual) => ({
        ...i,
        originRange: {
          ...i.originRange,
          nodeIds: [...i.originRange.nodeIds],
        },
      })),
    })),
    edgeEntities: a.edgeEntities.map((e: EdgeEntity) => ({
      ...e,
      edgePairs: e.edgePairs.map(
        (p: EdgePair): EdgePair => ({
          ...p,
        })
      ),
      originRange: {
        ...e.originRange,
        nodeIds: [...e.originRange.nodeIds],
      },
    })),
  }
}

export const deepCopyQuestionAndAnswer = (
  qA: QuestionAndAnswer
): QuestionAndAnswer => {
  return {
    ...qA,
    answerObjects: qA.answerObjects.map(a => deepCopyAnswerObject(a)),
    modelStatus: {
      ...qA.modelStatus,
    },
    synced: {
      ...qA.synced,
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
          synced: {
            ...prevQAndA.synced,
            ...(newQAndA.synced ?? {}),
          },
        }
      : prevQAndA
  })
}
