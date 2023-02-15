import {
  BaseSyntheticEvent,
  memo,
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'

import { terms } from '../constants'
import { magicExplain, PromptSourceComponentsType } from './magicExplain'
import { FlowContext } from './Contexts'
import { Edge, Node } from 'reactflow'
import { getOpenAICompletion } from './openAI'
import { predefinedPrompts, predefinedResponses } from './promptsAndResponses'

interface MagicToolboxProps {
  className?: string
  children: ReactElement | ReactElement[]
  zoom: number
}
export const MagicToolbox = ({
  className,
  children,
  zoom,
}: MagicToolboxProps) => {
  return (
    <div
      className={`magic-toolbox${className ? ` ${className}` : ''}`}
      style={{
        transform: `scale(${1 / zoom})`,
      }}
      onClick={e => {
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

interface MagicToolboxItemProps {
  title?: string
  children: ReactElement
  className?: string
}
export const MagicToolboxItem = ({
  title,
  children,
  className,
}: MagicToolboxItemProps) => {
  return (
    <div className={`magic-toolbox-item${className ? ' ' + className : ''}`}>
      {title && <span className="magic-toolbox-item-title">{title}</span>}
      {/* <div className="magic-toolbox-item-content">{children}</div> */}
      {children}
    </div>
  )
}

interface MagicToolboxButtonProps {
  content: ReactElement | string
  onClick?: () => void
  preventDefault?: boolean
  className?: string
}
export const MagicToolboxButton = memo(
  ({
    content,
    onClick,
    preventDefault = true,
    className = '',
  }: MagicToolboxButtonProps) => {
    // handle click
    const handleOnClick = useCallback(
      (e: BaseSyntheticEvent) => {
        if (preventDefault) {
          e.preventDefault()
          e.stopPropagation()
        }
        onClick && onClick()
      },
      [onClick, preventDefault]
    )

    return (
      <button
        className={'magic-toolbox-button' + (className ? ` ${className}` : '')}
        onClick={handleOnClick}
      >
        {content}
      </button>
    )
  }
)

interface MagicSuggestItemProps {
  target: 'node' | 'edge'
  targetId: string
  nodeLabels: string[]
  edgeLabels: string[]
}
export const MagicSuggestItem = memo(
  ({ target, targetId, nodeLabels, edgeLabels }: MagicSuggestItemProps) => {
    const { setNodes, setEdges } = useContext(FlowContext)

    const [modelResponse, setModelResponse] = useState<string>('')

    const handleSetSuggestion = useCallback(
      (suggestion: string) => {
        if (target === 'node') {
          setNodes((nodes: Node[]) => {
            return nodes.map(node => {
              if (node.id === targetId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: suggestion,
                  },
                }
              }
              return node
            })
          })
        } else if (target === 'edge') {
          setEdges((edges: Edge[]) => {
            return edges.map(edge => {
              if (edge.id === targetId) {
                return {
                  ...edge,
                  data: {
                    ...edge.data,
                    label: suggestion,
                  },
                }
              }
              return edge
            })
          })
        }
      },
      [setEdges, setNodes, target, targetId]
    )

    const handleSuggest = useCallback(async () => {
      const prompt =
        predefinedPrompts.giveNodeLabelSuggestionsFromNodes(nodeLabels)

      // !
      const response = await getOpenAICompletion(prompt)

      if (response.error) {
        // TODO
        setModelResponse(predefinedResponses.noValidResponse)
      }

      setModelResponse(response.choices[0].text)
    }, [nodeLabels])

    const autoSuggest = useRef(true)
    useEffect(() => {
      if (autoSuggest.current) {
        autoSuggest.current = false
        handleSuggest()
      }
    }, [handleSuggest])

    const responseButtons: ReactElement[] = modelResponse
      .split(', ')
      .slice(0, 5)
      .map((label, i) => {
        // remove extra spaces and line breaks around the label string
        // and remove the last character if it's a period
        label = label.trim()
        if (label[label.length - 1] === '.') {
          label = label.slice(0, -1)
        }

        return (
          <MagicToolboxButton
            key={i}
            content={label}
            onClick={() => {
              handleSetSuggestion(label)
            }}
          />
        )
      })

    return (
      <MagicToolboxItem
        className="magic-suggest-item"
        title={`suggested by ${terms.gpt}`}
      >
        <div className="magic-suggest-options">
          {modelResponse.length > 0 ? (
            <>{responseButtons}</>
          ) : (
            <div className="waiting-for-model-placeholder">
              <PuffLoader size={32} color="#57068c" />
            </div>
          )}
        </div>
      </MagicToolboxItem>
    )
  },
  isEqual
)

interface MagicAskItemProps {
  sourceComponents: PromptSourceComponentsType
}
export const MagicAskItem = ({ sourceComponents }: MagicAskItemProps) => {
  const { getNodes, addNodes, fitView } = useContext(FlowContext)

  return (
    <MagicToolboxItem title={`ask ${terms.gpt}`}>
      <MagicToolboxButton
        content={
          <>
            <AutoFixHighRoundedIcon />
            <span>explain</span>
          </>
        }
        onClick={() => {
          magicExplain(getNodes(), sourceComponents, addNodes, fitView)
        }}
      />
    </MagicToolboxItem>
  )
}
