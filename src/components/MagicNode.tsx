import {
  ChangeEvent,
  DragEvent,
  memo,
  MouseEvent,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FitView, Instance, Node, NodeProps, useReactFlow } from 'reactflow'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded'
import BackspaceRoundedIcon from '@mui/icons-material/BackspaceRounded'
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DocumentScannerRoundedIcon from '@mui/icons-material/DocumentScannerRounded'

import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
// import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
// import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'

import {
  hardcodedNodeSize,
  magicNodeVerifyPaperCountDefault,
  nodeGap,
  terms,
  transitionDuration,
  useTokenDataTransferHandle,
  viewFittingPadding,
} from '../constants'
import { NotebookContext } from './Contexts'
import {
  parseModelResponseText,
  PromptSourceComponentsType,
} from '../utils/magicExplain'
import {
  getGraphBounds,
  getMagicNodeId,
  getNoteId,
  isEmptyTokenization,
  slowDeepCopy,
} from '../utils/utils'
import { MagicToolboxButton } from './MagicToolbox'
import { getOpenAICompletion } from '../utils/openAI'
import {
  emptyTokenization,
  EntityType,
  socketPath,
  Tokenization,
  // WebSocketMessageType,
  WebSocketResponseType,
} from '../utils/socket'
import { deepCopyNodes } from '../utils/storage'
import {
  predefinedPrompts,
  predefinedResponses,
} from '../utils/promptsAndResponses'
import {
  getScholarPapersFromKeywords,
  Scholar,
  SemanticScholarPaperEntity,
} from './Scholar'
import { MagicNote, MagicNoteData } from './Notebook'

export interface MagicNodeData {
  sourceComponents: PromptSourceComponentsType
  suggestedPrompts: string[]
  prompt: string
}

export interface VerifyEntities {
  searchQueries: string[]
  researchPapers: SemanticScholarPaperEntity[]
}

interface MagicNodeProps extends NodeProps {
  data: MagicNodeData
  magicNoteInNotebook?: boolean
  magicNoteData?: MagicNoteData
}

export const MagicNode = memo(
  ({ id, data, magicNoteInNotebook, magicNoteData }: MagicNodeProps) => {
    const { getNode, setNodes, deleteElements, fitView, fitBounds } =
      useReactFlow()
    const { addNote, deleteNote } = useContext(NotebookContext)

    const [waitingForModel, setWaitingForModel] = useState<boolean>(false)
    const [modelResponse, setModelResponse] = useState<string>('')
    const [modelTokenization, setModelTokenization] =
      useState<Tokenization>(emptyTokenization)
    // const [selectedTokens, setSelectedTokens] = useState<EntityType[]>([])
    const [verifyFacts, setVerifyFacts] = useState<boolean>(false)
    const [verifyEntities, setVerifyEntities] = useState<VerifyEntities>({
      searchQueries: [],
      researchPapers: [],
    })

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const promptTextCursorPosition = useRef(data.prompt.length)

    // socket
    const ws = useRef<WebSocket | null>(null)
    useEffect(() => {
      ws.current = new WebSocket(socketPath)
      // ws.current!.onopen = () => console.log('[connected to graphologue heroku server]')
      // ws.current!.onclose = () => console.log('[disconnected to graphologue heroku server]')

      const wsCurrent = ws.current

      // on message
      wsCurrent.onmessage = e => {
        const { entities, id: responseId } = JSON.parse(
          e.data
        ) as WebSocketResponseType

        if (id === responseId) {
          setModelTokenization(entities)
        }
      }

      return () => {
        if (wsCurrent.readyState === wsCurrent.OPEN) wsCurrent.close()
      }
    }, [id])

    // ! delete
    const handleDeleteNode = useCallback(
      (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        deleteElements({
          nodes: [getNode(id)] as Node[],
        })
      },
      [deleteElements, getNode, id]
    )

    // ! fold and unfold
    const [folded, setFolded] = useState<boolean>(false)
    const handleToggleFold = useCallback(() => {
      setFolded(folded => !folded)
    }, [])

    // ! duplicate
    const handleDuplicate = useCallback(() => {
      const node = getNode(id)

      if (node) {
        const newNode = {
          ...deepCopyNodes([node!])[0],
          id: getMagicNodeId(),
          position: {
            x: node.position.x + hardcodedNodeSize.magicWidth + nodeGap,
            y: node.position.y,
          },
        }

        setNodes((nodes: Node[]) => [...nodes, newNode])

        setTimeout(() => {
          fitView({
            duration: transitionDuration,
            padding: viewFittingPadding,
          })
        }, 0)
      }
    }, [fitView, getNode, id, setNodes])

    // ! linkage
    // const [linked, setLinked] = useState(true)
    // const handleToggleLinkage = useCallback(() => {
    //   setLinked(linked => !linked)
    // }, [])

    // ! add to note
    const handleAddToNote = useCallback(() => {
      const noteId = getNoteId()
      addNote({
        type: 'magic',
        id: noteId,
        data: {
          id: noteId,
          prompt: data.prompt,
          magicNodeId: id,
          response: modelResponse,
          verifyEntities: verifyEntities,
        } as MagicNoteData,
      } as MagicNote)
    }, [addNote, data, id, modelResponse, verifyEntities])

    // ! prompt text change
    const autoGrow = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'fit-content'
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + 'px'
      }
    }, [])

    const handlePromptTextChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  prompt: e.target.value,
                },
              }
            }
            return node
          })
        })

        promptTextCursorPosition.current = e.target.selectionStart
        // avoid cursor jumping
        autoGrow()
        setTimeout(() => {
          e.target.setSelectionRange(
            promptTextCursorPosition.current,
            promptTextCursorPosition.current
          )
        }, 0)
      },
      [autoGrow, id, setNodes]
    )

    /* -------------------------------------------------------------------------- */

    const askForPaperExplanation = useCallback(
      async (
        response: string,
        searchQueries: string[],
        papers: SemanticScholarPaperEntity[]
      ) => {
        papers = slowDeepCopy(papers)

        for (const paperToExplain of papers.slice(
          0,
          magicNodeVerifyPaperCountDefault
        ) as SemanticScholarPaperEntity[]) {
          if (response.length && paperToExplain.title.length) {
            const explanationResponse = await getOpenAICompletion(
              predefinedPrompts.explainScholar(
                response,
                paperToExplain.title,
                paperToExplain.abstract || ''
              )
            )

            if (explanationResponse.error) {
              // TODO
              console.error(explanationResponse.error)
            }

            const explanation = explanationResponse.error
              ? predefinedResponses.noValidResponse()
              : explanationResponse.choices[0].text

            papers = papers.map((p: SemanticScholarPaperEntity) => {
              if (p.paperId === paperToExplain.paperId) {
                return {
                  ...p,
                  explanation: explanation
                    ? explanation.trim()
                    : predefinedResponses.noValidResponse(),
                }
              }
              return p
            })
          }
        }

        setVerifyEntities({
          searchQueries,
          researchPapers: papers,
        })
      },
      []
    )

    // ! actual ask
    const handleAsk = useCallback(async () => {
      if (waitingForModel) return

      setWaitingForModel(true)
      setModelResponse('')
      setModelTokenization(emptyTokenization)
      setVerifyFacts(false)
      setVerifyEntities({
        searchQueries: [],
        researchPapers: [],
      })

      // ! ask model
      const response = await getOpenAICompletion(
        data.prompt +
          predefinedPrompts.simpleAnswer() +
          predefinedPrompts.addGooglePrompts() +
          predefinedPrompts.addScholar()
      )

      // TODO handle error
      if (response.error) {
        console.error(response.error)

        setWaitingForModel(false)

        setModelResponse(predefinedResponses.modelDown())
        setTimeout(() => {
          setModelResponse('')
        }, 3000)

        return
      }

      const modelText = response.choices[0].text

      const { parsedResponse, searchQueries, researchPaperKeywords } =
        parseModelResponseText(modelText)

      if (!parsedResponse.length) {
        setWaitingForModel(false)
        setModelResponse(predefinedResponses.noValidModelText())
        setTimeout(() => {
          setModelResponse('')
        }, 3000)
        return
      }

      const papersFromKeywords = await getScholarPapersFromKeywords(
        researchPaperKeywords
      )

      setVerifyEntities({
        searchQueries,
        researchPapers: papersFromKeywords,
      })

      setModelResponse(parsedResponse) // ! actual model text
      setWaitingForModel(false)

      // then get explanations for the papers
      askForPaperExplanation(parsedResponse, searchQueries, papersFromKeywords)

      // ! send to server
      // if (ws.current?.readyState === ws.current?.OPEN)
      //   ws.current?.send(
      //     JSON.stringify({
      //       message: modelText,
      //       id: id,
      //     } as WebSocketMessageType)
      //   )
    }, [askForPaperExplanation, data.prompt, waitingForModel])

    // ! suggest prompt
    const handleSuggestPrompt = useCallback(() => {}, [])

    /* -------------------------------------------------------------------------- */

    // component did mount
    useEffect(() => {
      autoGrow()
    }, [autoGrow])

    /* -------------------------------------------------------------------------- */

    // ! ask automatically on mount
    const autoAsk = useRef(true)
    useEffect(() => {
      if (!magicNoteInNotebook && autoAsk.current) {
        autoAsk.current = false
        handleAsk()
      }
    }, [handleAsk, magicNoteInNotebook])

    /* -------------------------------------------------------------------------- */

    const fitMagicNode = useCallback(() => {
      setTimeout(() => {
        const node = getNode(id)

        if (node) {
          fitBounds(getGraphBounds([node]), {
            padding: viewFittingPadding,
            duration: transitionDuration,
          })
        }
      }, 0)
    }, [fitBounds, getNode, id])

    // ! verify
    const handleVerifyFacts = useCallback(() => {
      setVerifyFacts(!verifyFacts)
    }, [verifyFacts])

    useEffect(() => {
      if (verifyFacts) {
        fitMagicNode()
      }
    }, [fitMagicNode, verifyFacts])

    const verifyEntitiesExplained = useCallback(() => {
      // as long as there are papers, we need to explain them
      if (verifyEntities.researchPapers.length > 0) {
        return verifyEntities.researchPapers.some(paper => paper.explanation)
      }
      // otherwise, the node is ready as long as there are model responses
      return modelResponse.length > 0
    }, [modelResponse.length, verifyEntities.researchPapers])

    // handle wheel
    // const handleWheel = useCallback(
    //   (event: WheelEvent) => {
    //     if (verifyFacts && verifyEntities.researchPapers.length > 0) {
    //       event.stopPropagation()
    //       event.preventDefault()
    //     }
    //   },
    //   [verifyEntities.researchPapers.length, verifyFacts]
    // )
    const preventWheel =
      !folded && verifyFacts && verifyEntities.researchPapers.length > 0

    const hasModelResponse =
      modelResponse.length > 0 ||
      (magicNoteInNotebook &&
        magicNoteData &&
        magicNoteData.response.length > 0)
    const renderedModelResponse = magicNoteInNotebook
      ? magicNoteData?.response || predefinedResponses.noValidResponse()
      : modelResponse
    const renderedVerifyEntities = magicNoteInNotebook
      ? magicNoteData?.verifyEntities || verifyEntities
      : verifyEntities

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */

    // ! note

    const handleDeleteNote = useCallback(() => {
      if (magicNoteInNotebook && magicNoteData) deleteNote(magicNoteData.id)
    }, [deleteNote, magicNoteData, magicNoteInNotebook])

    const handleLocateOriginalNode = useCallback(() => {
      if (magicNoteData) {
        const node = getNode(magicNoteData.magicNodeId)
        if (node) {
          fitBounds(getGraphBounds([node]), {
            padding: viewFittingPadding,
            duration: transitionDuration,
          })
        }
      }
    }, [fitBounds, getNode, magicNoteData])

    return (
      <div
        className={`custom-node-body magic-node-body${
          folded && !magicNoteInNotebook ? ' magic-node-draggable' : ''
        }${preventWheel && !magicNoteInNotebook ? ' nowheel' : ''}${
          magicNoteInNotebook ? ' magic-note-in-notebook in-notebook' : ''
        }`}
      >
        <MagicNodeBar
          magicNoteInNotebook={magicNoteInNotebook || false}
          folded={folded}
          preventWheel={preventWheel}
          modelResponse={modelResponse}
          magicNodeFunctions={{
            handleDeleteNode,
            handleToggleFold,
            handleDuplicate,
            verifyEntitiesExplained,
            handleAddToNote,
            fitMagicNode,
          }}
          magicNoteFunctions={{
            handleDeleteNote,
            handleLocateOriginalNode,
          }}
        />

        {/* folded */}
        {(folded || magicNoteInNotebook) && (
          <p
            className={`magic-folded-text magic-node-draggable${
              magicNoteInNotebook ? ' in-notebook' : ''
            }`}
          >
            {data.prompt}
          </p>
        )}

        {/* unfolded */}
        {!folded && (
          <>
            {!magicNoteInNotebook && (
              <div className="magic-prompt">
                <textarea
                  ref={textareaRef}
                  className="magic-prompt-text"
                  value={data.prompt}
                  onChange={handlePromptTextChange}
                  autoFocus={true}
                />

                <div className="magic-prompt-line">
                  <MagicToolboxButton
                    className="magic-button"
                    content={
                      <>
                        <AutoFixHighRoundedIcon />
                        <span>ask</span>
                      </>
                    }
                    onClick={handleAsk}
                    disabled={waitingForModel}
                  />

                  <MagicToolboxButton
                    className="magic-button"
                    content={
                      <>
                        <SavingsRoundedIcon />
                        <span>suggested prompts</span>
                      </>
                    }
                    onClick={handleSuggestPrompt}
                  />
                </div>
              </div>
            )}

            {waitingForModel && (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={32} color="#57068c" />
              </div>
            )}

            {hasModelResponse && (
              <div
                className={`magic-node-content${
                  magicNoteInNotebook ? ' in-notebook' : ''
                }`}
              >
                <p className="magic-node-content-text">
                  {!isEmptyTokenization(modelTokenization) ? (
                    <MagicTokenizedText
                      magicNodeId={id}
                      originalText={modelResponse}
                      tokenization={modelTokenization}
                    />
                  ) : (
                    <span className="magic-original-text">
                      {renderedModelResponse}
                    </span>
                  )}
                </p>

                <button
                  className="model-response-warning"
                  onClick={handleVerifyFacts}
                >
                  <span>
                    <TranslateRoundedIcon />
                    {magicNoteInNotebook
                      ? `Verify the facts generated by ${terms.gpt}...`
                      : `Verify the facts generated by ${terms.gpt}...`}
                  </span>
                  {verifyFacts ? (
                    <UnfoldLessRoundedIcon />
                  ) : (
                    <UnfoldMoreRoundedIcon />
                  )}
                </button>

                {verifyFacts &&
                  (renderedVerifyEntities.researchPapers.length > 0 ||
                    renderedVerifyEntities.searchQueries.length > 0) && (
                    <div className="model-response-verify">
                      {renderedVerifyEntities.searchQueries.length > 0 && (
                        <div className="verify-section">
                          <p className="section-title">
                            google with suggested prompts
                          </p>
                          <div className="verify-options">
                            {renderedVerifyEntities.searchQueries.map(
                              (query, i) => (
                                <a
                                  key={i}
                                  className="verify-option"
                                  href={`https://www.google.com/search?q=${query}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <SearchRoundedIcon />
                                  <span>{query}</span>
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      )}
                      {renderedVerifyEntities.researchPapers.length > 0 && (
                        <Scholar
                          papers={renderedVerifyEntities.researchPapers}
                        />
                      )}
                    </div>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    )
  },
  isEqual
)

/* -------------------------------------------------------------------------- */

const MagicNodeBar = memo(
  ({
    magicNoteInNotebook,
    folded,
    preventWheel,
    modelResponse,
    magicNodeFunctions: {
      handleDeleteNode,
      handleToggleFold,
      handleDuplicate,
      verifyEntitiesExplained,
      handleAddToNote,
      fitMagicNode,
    },
    magicNoteFunctions: { handleDeleteNote, handleLocateOriginalNode },
  }: {
    magicNoteInNotebook: boolean
    folded: boolean
    preventWheel: boolean
    modelResponse: string
    magicNodeFunctions: {
      handleDeleteNode: (e: MouseEvent) => void
      handleToggleFold: () => void
      handleDuplicate: () => void
      verifyEntitiesExplained: () => boolean
      handleAddToNote: () => void
      fitMagicNode: () => void
    }
    magicNoteFunctions: {
      handleDeleteNote: () => void
      handleLocateOriginalNode: () => void
    }
  }) => {
    const addToNoteEnabled = modelResponse && verifyEntitiesExplained()

    const addToNote = useCallback(() => {
      if (addToNoteEnabled) {
        handleAddToNote()
      }
    }, [addToNoteEnabled, handleAddToNote])

    return (
      <div
        className={`magic-node-bar magic-node-draggable${
          magicNoteInNotebook ? ' in-notebook' : ''
        }${!preventWheel ? ' bar-no-need-to-blur' : ''}`}
      >
        <div className="bar-buttons">
          <button className="bar-button" onClick={handleToggleFold}>
            {folded ? <UnfoldMoreRoundedIcon /> : <UnfoldLessRoundedIcon />}
          </button>

          {magicNoteInNotebook ? (
            <>
              <button className="bar-button" onClick={handleDeleteNote}>
                <BackspaceRoundedIcon
                  style={{
                    transform: 'scale(0.9)',
                  }}
                />
              </button>
              <button className="bar-button" onClick={handleLocateOriginalNode}>
                <FitScreenRoundedIcon
                  style={{
                    transform: 'scale(1.1)',
                  }}
                />
              </button>
            </>
          ) : (
            <button className="bar-button" onClick={handleDeleteNode}>
              <ClearRoundedIcon />
            </button>
          )}

          {!magicNoteInNotebook && (
            <button className="bar-button" onClick={handleDuplicate}>
              <ContentCopyRoundedIcon />
            </button>
          )}
          {!folded && !magicNoteInNotebook && (
            <>
              {/* <button className="bar-button" onClick={handleToggleLinkage}>
                    {linked ? <LinkRoundedIcon /> : <LinkOffRoundedIcon />}
                  </button> */}
              {
                <button
                  className={`bar-button${addToNoteEnabled ? '' : ' disabled'}`}
                  onClick={addToNote}
                >
                  <DriveFileRenameOutlineRoundedIcon />
                </button>
              }
            </>
          )}
        </div>
        {preventWheel && (
          <div className="bar-button bar-de-highlighted" onClick={fitMagicNode}>
            <DocumentScannerRoundedIcon />
          </div>
        )}
      </div>
    )
  }
)

/* -------------------------------------------------------------------------- */

const MagicToken = ({
  token,
  onDragStart,
}: {
  token: EntityType
  onDragStart: (e: DragEvent, token: EntityType) => void
}) => {
  return (
    <span
      draggable
      className={`magic-token magic-token-${token.type.toLowerCase()}`}
      onDragStart={e => onDragStart(e, token)}
    >
      {token.value}
    </span>
  )
}

interface MagicTokenizedTextProps {
  magicNodeId: string
  originalText: string
  tokenization: Tokenization
}
const MagicTokenizedText = ({
  magicNodeId,
  originalText,
  tokenization,
}: MagicTokenizedTextProps) => {
  const onDragStart = useCallback((event: DragEvent, token: EntityType) => {
    event.dataTransfer.setData(
      `application/${useTokenDataTransferHandle}`,
      JSON.stringify(token)
    )
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const { noun, verb } = tokenization

  // ! merge noun and verb arrays and sort by offset field
  // currently only NOUN and VERB
  const tokens = [...noun, ...verb].sort((a, b) => a.offset - b.offset)

  let tokenizedText: (string | ReactElement)[] = []
  if (tokens[0].offset > 0) {
    tokenizedText.push(originalText.slice(0, tokens[0].offset))
  }

  tokens.forEach((token, i) => {
    tokenizedText.push(
      <MagicToken
        key={magicNodeId + '-token-' + i}
        token={token}
        onDragStart={onDragStart}
      />
    )

    if (i < tokens.length - 1) {
      tokenizedText.push(
        originalText.slice(
          token.offset + token.value.length,
          tokens[i + 1].offset
        )
      )
    } else {
      tokenizedText.push(originalText.slice(token.offset + token.value.length))
    }
  })

  return <span className="magic-tokenized-text">{tokenizedText}</span>
}

/* -------------------------------------------------------------------------- */

export interface AddMagicNodeOptions {
  sourceComponents: PromptSourceComponentsType
  suggestedPrompts: string[]
  fitView: FitView
  toFitView: boolean
}
export const addMagicNode = (
  addNodes: Instance.AddNodes<Node>,
  x: number,
  y: number,
  {
    sourceComponents,
    suggestedPrompts,
    fitView,
    toFitView,
  }: AddMagicNodeOptions
) => {
  const nodeId = getMagicNodeId()

  const newMagicNode = {
    id: nodeId,
    type: 'magic',
    data: {
      sourceComponents: sourceComponents,
      suggestedPrompts: suggestedPrompts,
      prompt: (suggestedPrompts[0] ?? 'Hi.') as string,
    } as MagicNodeData,
    position: {
      x,
      y,
    },
    selected: false,
    width: hardcodedNodeSize.magicWidth,
    height: hardcodedNodeSize.magicHeight,
    dragHandle: '.magic-node-draggable',
  } as Node

  addNodes(newMagicNode)

  setTimeout(() => {
    if (toFitView && fitView)
      fitView({
        padding: viewFittingPadding,
        duration: transitionDuration,
      })
  }, 0)

  return {
    nodeId,
  }
}
