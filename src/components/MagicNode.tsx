import {
  ChangeEvent,
  memo,
  MouseEvent,
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
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'

import {
  hardcodedNodeSize,
  transitionDuration,
  viewFittingPadding,
} from '../constants'
import { FlowContext } from './Contexts'
import { PromptSourceComponentsType } from './magicExplain'
import { getMagicNodeId } from './utils'
import { MagicToolboxButton } from './MagicToolbox'
import { getOpenAICompletion } from './openAI'
import {
  socketPath,
  WebSocketMessageType,
  WebSocketResponseType,
} from './socket'

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
    const { getNode, setNodes, deleteElements, metaPressed } =
      useContext(FlowContext)

    const [waitingForModel, setWaitingForModel] = useState(false)
    const [modelResponse, setModelResponse] = useState<string>('')

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
          window.console.log(entities)
        }
      }

      return () => {
        wsCurrent.close()
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

    // ! add to node
    const handleAddToNode = useCallback(() => {}, [])

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

      // ! ask model
      const response = await getOpenAICompletion(data.prompt)

      // TODO handle error
      if (response.error) {
        setWaitingForModel(false)

        setModelResponse(
          'The model is down. Again, the model is D-O-W-N. Please try again later.'
        )
        setTimeout(() => {
          setModelResponse('')
        }, 3000)

        return
      }

      const modelText = response.choices[0].text

      setModelResponse(modelText)
      setWaitingForModel(false)

      // send to server
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

    return (
      <div
        className={`custom-node-body magic-node-body${
          metaPressed ? ' magic-node-meta-pressed' : ''
        }`}
      >
        <div className="magic-node-bar">
          <button className="magic-node-bar-button" onClick={handleDeleteNode}>
            <ClearRoundedIcon />
          </button>
          <button className="magic-node-bar-button" onClick={handleAddToNode}>
            <DriveFileRenameOutlineRoundedIcon />
          </button>
        </div>

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
            <p className="magic-node-content-text">{modelResponse}</p>
          </div>
        )}
      </div>
    )
  }
)

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
      prompt: suggestedPrompts[0],
    } as MagicNodeData,
    position: {
      x,
      y,
    },
    selected: false,
    width: hardcodedNodeSize.magicWidth,
    height: hardcodedNodeSize.magicHeight,
    dragHandle: '.magic-node-bar',
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
