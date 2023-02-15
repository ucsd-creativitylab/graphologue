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
import { FitView, Instance, Node, NodeProps } from 'reactflow'
import { PuffLoader } from 'react-spinners'

import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded'

import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'

import {
  hardcodedNodeSize,
  nodeGap,
  terms,
  transitionDuration,
  useTokenDataTransferHandle,
  viewFittingPadding,
} from '../constants'
import { FlowContext } from './Contexts'
import { PromptSourceComponentsType } from './magicExplain'
import { getMagicNodeId, isEmptyTokenization } from './utils'
import { MagicToolboxButton } from './MagicToolbox'
import { getOpenAICompletion } from './openAI'
import {
  emptyTokenization,
  EntityType,
  socketPath,
  Tokenization,
  WebSocketMessageType,
  WebSocketResponseType,
} from './socket'
import isEqual from 'react-fast-compare'
import { deepCopyNodes } from './storage'
import { predefinedPrompts, predefinedResponses } from './promptsAndResponses'

export interface MagicNodeData {
  sourceComponents: PromptSourceComponentsType
  suggestedPrompts: string[]
  prompt: string
}

interface MagicNodeProps extends NodeProps {
  data: MagicNodeData
}

export const MagicNode = memo(
  ({ id, data, xPos, yPos, selected }: MagicNodeProps) => {
    const { getNode, setNodes, deleteElements, metaPressed, fitView } =
      useContext(FlowContext)

    const [waitingForModel, setWaitingForModel] = useState<boolean>(false)
    const [modelResponse, setModelResponse] = useState<string>('')
    const [modelTokenization, setModelTokenization] =
      useState<Tokenization>(emptyTokenization)
    // const [selectedTokens, setSelectedTokens] = useState<EntityType[]>([])

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
    const [linked, setLinked] = useState(true)
    const handleToggleLinkage = useCallback(() => {
      setLinked(linked => !linked)
    }, [])

    // ! add to note
    const handleAddToNote = useCallback(() => {}, [])

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

    // ! actual ask
    const handleAsk = useCallback(async () => {
      if (waitingForModel) return

      setWaitingForModel(true)
      setModelResponse('')
      setModelTokenization(emptyTokenization)

      // ! ask model
      const response = await getOpenAICompletion(
        data.prompt + predefinedPrompts.addScholar()
      )

      // TODO handle error
      if (response.error) {
        setWaitingForModel(false)

        setModelResponse(predefinedResponses.modelDown())
        setTimeout(() => {
          setModelResponse('')
        }, 3000)

        return
      }

      const modelText = response.choices[0].text

      setModelResponse(modelText)
      setWaitingForModel(false)

      // send to server
      if (ws.current?.readyState === ws.current?.OPEN)
        ws.current?.send(
          JSON.stringify({
            message: modelText,
            id: id,
          } as WebSocketMessageType)
        )
    }, [data.prompt, id, waitingForModel])

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
      if (autoAsk.current) {
        autoAsk.current = false
        handleAsk()
      }
    }, [handleAsk])

    return (
      <div
        className={`custom-node-body magic-node-body${
          metaPressed ? ' magic-node-meta-pressed' : ''
        }${folded ? ' magic-node-draggable' : ''}`}
      >
        <div className="magic-node-bar magic-node-draggable">
          <button className="magic-node-bar-button" onClick={handleDeleteNode}>
            <ClearRoundedIcon />
          </button>
          <button className="magic-node-bar-button" onClick={handleToggleFold}>
            {folded ? <UnfoldMoreRoundedIcon /> : <UnfoldLessRoundedIcon />}
          </button>
          <button className="magic-node-bar-button" onClick={handleDuplicate}>
            <ContentCopyRoundedIcon />
          </button>
          {!folded && (
            <>
              <button
                className="magic-node-bar-button"
                onClick={handleToggleLinkage}
              >
                {linked ? <LinkRoundedIcon /> : <LinkOffRoundedIcon />}
              </button>
              <button
                className="magic-node-bar-button"
                onClick={handleAddToNote}
              >
                <DriveFileRenameOutlineRoundedIcon />
              </button>
            </>
          )}
        </div>

        {folded && (
          <p className="magic-folded-text magic-node-draggable">
            {data.prompt}
          </p>
        )}

        {!folded && (
          <>
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

            {waitingForModel && (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={32} color="#57068c" />
              </div>
            )}

            {modelResponse.length > 0 && (
              <div className={`magic-node-content`}>
                <p className="magic-node-content-text">
                  {!isEmptyTokenization(modelTokenization) ? (
                    <MagicTokenizedText
                      magicNodeId={id}
                      originalText={modelResponse}
                      tokenization={modelTokenization}
                    />
                  ) : (
                    <span className="magic-original-text">{modelResponse}</span>
                  )}
                </p>
                <div className="model-response-warning">
                  <TranslateRoundedIcon />
                  Generated by {terms.gpt}. Verify the facts.
                </div>
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
