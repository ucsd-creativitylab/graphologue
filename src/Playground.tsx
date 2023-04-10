import React, { useCallback, useRef, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { v5 as uuidv5 } from 'uuid'

import { AnswerBlockItem } from './components/Answer'
import { newAnswerObject, newQuestionAndAnswer } from './utils/chatAppUtils'
import {
  nodeIndividualsToNodeEntities,
  parseEdges,
  parseNodes,
} from './utils/responseProcessing'
import { InterchangeContext } from './components/Interchange'

export const Playground = () => {
  const [playgroundQuestionAndAnswer, setPlaygroundQuestionAndAnswer] =
    useState(
      newQuestionAndAnswer({
        modelStatus: {
          modelAnswering: false,
          modelAnsweringComplete: true,
          modelParsing: false,
          modelParsingComplete: true,
        },
        answerObjects: [newAnswerObject()],
      })
    )

  const textRef = useRef<HTMLTextAreaElement>(null)

  const handleSetAnswer = useCallback(() => {
    const text = textRef.current?.value
    if (text) {
      const objectId = playgroundQuestionAndAnswer.answerObjects[0].id

      setPlaygroundQuestionAndAnswer(prevQAndA => ({
        ...prevQAndA,
        answer: text,
        answerObjects: [
          {
            ...prevQAndA.answerObjects[0],
            originText: {
              content: text,
              nodeEntities: nodeIndividualsToNodeEntities(
                parseNodes(text, objectId)
              ),
              edgeEntities: parseEdges(text, objectId),
            },
            complete: true,
          },
        ],
      }))
    }
  }, [playgroundQuestionAndAnswer.answerObjects])

  return (
    <div className="playground">
      <div className="content-wrapper">
        <textarea
          ref={textRef}
          className="playground-textarea"
          placeholder="Place the annotated text here..."
        />
        <button className="bar-button" onClick={() => handleSetAnswer()}>
          Render
        </button>
      </div>

      <InterchangeContext.Provider
        value={{
          questionAndAnswer: playgroundQuestionAndAnswer,
          handleSelfCorrection: async () => {},
          handleSetSyncedAnswerObjectIdsHighlighted: () => {},
          handleSetSyncedAnswerObjectIdsHidden: () => {},
          handleSetSyncedCoReferenceOriginRanges: () => {},
          handleAnswerObjectRemove: () => {},
          handleAnswerObjectSwitchListDisplayFormat: () => {},
          handleAnswerObjectTellLessOrMore: () => {},
          handleAnswerObjectNodeExpand: () => {},
          handleAnswerObjectNodeRemove: () => {},
          handleAnswerObjectNodeCollapse: () => {},
          handleAnswerObjectNodeMerge: () => {},
          handleAnswerObjectsAddOneMore: () => {},
          /* -------------------------------------------------------------------------- */
          handleSwitchSaliency: () => {},
        }}
      >
        <ReactFlowProvider
          key={`playground-flow-provider-${uuidv5(
            playgroundQuestionAndAnswer.answer,
            uuidv5.URL
          )}`}
        >
          <AnswerBlockItem
            // key={`answer-block-item-${id}`}
            key={`playground-answer-block-item`}
            index={0}
            questionAndAnswer={playgroundQuestionAndAnswer}
            answerObject={playgroundQuestionAndAnswer.answerObjects[0]}
            diagramDisplay={'merged'}
            lastTextBlock={false}
          />
        </ReactFlowProvider>
      </InterchangeContext.Provider>
    </div>
  )
}
