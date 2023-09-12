import React, { useCallback, useRef, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { v5 as uuidv5 } from 'uuid'

import { AnswerBlockItem } from './components/Answer'
import {
  findSentencesToCorrect,
  newAnswerObject,
  newQuestionAndAnswer,
} from './utils/chatUtils'
import {
  nodeIndividualsToNodeEntities,
  parseEdges,
  parseNodes,
  removeAnnotations,
} from './utils/responseProcessing'
import { InterchangeContext } from './components/Interchange'
import {
  Prompt,
  getOpenAICompletion,
  getTextFromModelResponse,
  models,
} from './utils/openAI'
import { predefinedPrompts } from './utils/promptsAndResponses'

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
      }),
    )
  const [modelCorrecting, setModelCorrecting] = useState(false)
  const [correctedText, setCorrectedText] = useState('')
  const [showAnnotations, setShowAnnotations] = useState(true)

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
                parseNodes(text, objectId),
              ),
              edgeEntities: parseEdges(text, objectId),
            },
            complete: true,
          },
        ],
      }))
    }
  }, [playgroundQuestionAndAnswer.answerObjects])

  const handleCorrectAnswer = useCallback(async () => {
    let textContentAfterCorrection =
      playgroundQuestionAndAnswer.answerObjects[0].originText.content
    const correctionJobs = findSentencesToCorrect(
      playgroundQuestionAndAnswer.answerObjects[0],
    )

    setModelCorrecting(true)
    setCorrectedText('')

    await Promise.all(
      correctionJobs.map(async ({ sentence, n, e }) => {
        const correctionResponse = await getOpenAICompletion(
          predefinedPrompts._graph_sentenceCorrection(
            [
              ...predefinedPrompts._graph_initialAsk(''), // TODO
              {
                role: 'assistant',
                content:
                  playgroundQuestionAndAnswer.answerObjects[0].originText
                    .content,
              },
            ] as Prompt[],
            sentence,
            n,
            e,
          ),
          models.smarter,
        )

        const correctionText = getTextFromModelResponse(correctionResponse)
        console.log({
          before: sentence,
          corrected: ' ' + correctionText,
        })
        textContentAfterCorrection = textContentAfterCorrection.replace(
          sentence,
          ' ' + correctionText,
        )
      }),
    )

    const objectId = playgroundQuestionAndAnswer.answerObjects[0].id
    setPlaygroundQuestionAndAnswer(prevQAndA => ({
      ...prevQAndA,
      answerObjects: [
        {
          ...prevQAndA.answerObjects[0],
          originText: {
            content: textContentAfterCorrection,
            nodeEntities: nodeIndividualsToNodeEntities(
              parseNodes(textContentAfterCorrection, objectId),
            ),
            edgeEntities: parseEdges(textContentAfterCorrection, objectId),
          },
        },
      ],
    }))
    setCorrectedText(textContentAfterCorrection)
    setModelCorrecting(false)
  }, [playgroundQuestionAndAnswer.answerObjects])

  return (
    <div className="playground">
      <div className="content-wrapper">
        <textarea
          ref={textRef}
          className="playground-textarea"
          placeholder="Place the annotated text here..."
        />
        <div className="playground-buttons">
          <button className="bar-button" onClick={() => handleSetAnswer()}>
            Render
          </button>
          <button
            className={'bar-button' + (modelCorrecting ? ' disabled' : '')}
            onClick={() => handleCorrectAnswer()}
          >
            Correct
          </button>
          <button
            className={'bar-button' + (modelCorrecting ? ' disabled' : '')}
            onClick={() => {
              setShowAnnotations(!showAnnotations)
            }}
          >
            Show Annotations
          </button>
        </div>
        {correctedText.length > 0 && (
          <div className="playground-corrected-text">
            {showAnnotations ? correctedText : removeAnnotations(correctedText)}
          </div>
        )}
      </div>

      <InterchangeContext.Provider
        value={{
          questionAndAnswer: playgroundQuestionAndAnswer,
          handleSelfCorrection: async () => {
            return ''
          },
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
            uuidv5.URL,
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
