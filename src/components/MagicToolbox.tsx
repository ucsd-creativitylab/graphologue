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

import { terms, wikiRequestTimeout } from '../constants'
import { magicExplain, PromptSourceComponentsType } from '../utils/magicExplain'
import { FlowContext } from './Contexts'
import { Edge, Node } from 'reactflow'
import { getOpenAICompletion } from '../utils/openAI'
import {
  NodeLabelAndTags,
  predefinedPrompts,
  predefinedResponses,
} from '../utils/promptsAndResponses'

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

interface MagicTagProps {
  tag: string
  onClick?: (tag: string) => void
  disabled?: boolean
}
export const MagicTag = memo(
  ({ tag, onClick, disabled = false }: MagicTagProps) => {
    const handleOnClick = useCallback(
      (e: BaseSyntheticEvent) => {
        e.preventDefault()
        e.stopPropagation()

        onClick && onClick(tag)
      },
      [onClick, tag]
    )

    return (
      <button
        className={'magic-toolbox-tag'}
        onClick={handleOnClick}
        disabled={disabled}
      >
        {tag}
      </button>
    )
  }
)

interface MagicNodeTaggingItemProps {
  targetId: string
  availableTags: string[]
}
export const MagicNodeTaggingItem = memo(
  ({ targetId, availableTags }: MagicNodeTaggingItemProps) => {
    const { setNodes } = useContext(FlowContext)
    const [requestTimeout, setRequestTimeout] = useState<boolean>(false)

    const handleOnClick = useCallback(
      (tag: string) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === targetId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  tags: [...node.data.tags, tag],
                },
              }
            }
            return node
          })
        })
      },
      [setNodes, targetId]
    )

    useEffect(() => {
      const timeout = setTimeout(() => {
        if (availableTags.length === 0) setRequestTimeout(true)
      }, wikiRequestTimeout)
      return () => {
        timeout && clearTimeout(timeout)
      }
    }, [availableTags.length])

    return (
      <MagicToolboxItem
        className="magic-tagging-item"
        title={`${terms.wiki} tags`}
      >
        <div className="magic-tagging-options">
          {availableTags.length === 0 ? (
            !requestTimeout ? (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={32} color="#13a600" />
              </div>
            ) : (
              <MagicTag
                key={`no available tags`}
                tag={`no available tags`}
                disabled={true}
              />
            )
          ) : (
            availableTags.map(tag => (
              <MagicTag
                key={`${targetId}-${tag}`}
                tag={tag}
                onClick={handleOnClick}
              />
            ))
          )}
        </div>
      </MagicToolboxItem>
    )
  }
)

interface MagicSuggestItemProps {
  target: 'node' | 'edge'
  targetId: string
  nodeLabelAndTags: NodeLabelAndTags[]
  edgeLabels: string[]
}
export const MagicSuggestItem = memo(
  ({
    target,
    targetId,
    nodeLabelAndTags,
    edgeLabels,
  }: MagicSuggestItemProps) => {
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
        predefinedPrompts.giveNodeLabelSuggestionsFromNodes(nodeLabelAndTags)

      // !
      const response = await getOpenAICompletion(prompt)

      if (response.error) {
        // TODO
        setModelResponse(predefinedResponses.noValidResponse)
      }

      setModelResponse(response?.choices[0]?.text || '')
    }, [nodeLabelAndTags])

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
        title={`${terms.gpt} suggestions`}
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
