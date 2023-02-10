import {
  BaseSyntheticEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { Edge, Node } from 'reactflow'
import { FlowContext, FlowContextType } from './Contexts'

type SuperTextEditorProps = {
  target: 'node' | 'edge'
  targetId: string
  content: string
  editing: boolean
  selected: boolean
}
export const SuperTextEditor = memo(
  ({ target, targetId, content, editing, selected }: SuperTextEditorProps) => {
    const flow = useContext(FlowContext) as FlowContextType
    const { setNodes, setEdges } = flow

    const isNode = target === 'node'
    const isEdge = target === 'edge'

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
      if (editing) {
        const ele = isNode ? textareaRef?.current : inputRef?.current
        if (ele) {
          ele.focus()
          ele.setSelectionRange(ele.value.length, ele.value.length)
        }
      }
    }, [editing, isNode])

    // dynamic size setting
    const getEdgeInputSize = useCallback(
      (content: string) => Math.min(Math.max(content.length + 1, 1), 30),
      []
    )
    useEffect(() => {
      if (isEdge) {
        const ele = inputRef.current
        if (ele) {
          ele.size = getEdgeInputSize(content)
        }
      }
    }, [isEdge, content, getEdgeInputSize])

    // ! on finish editing
    const onFinishEditing = useCallback(
      (continueEditing: boolean) => {
        // blur everything
        // ;(document.activeElement as HTMLElement).blur()

        // update label data
        if (isEdge) {
          // an input element
          setEdges((eds: Edge[]) => {
            return eds.map((ed: Edge) => {
              if (targetId !== ed.id) return ed
              else {
                return {
                  ...ed,
                  data: {
                    ...ed.data,
                    editing: continueEditing,
                    label: inputRef.current?.value,
                  },
                }
              }
            })
          })
        } else if (isNode) {
          // a textarea element
          setNodes((nds: Node[]) => {
            return nds.map((nd: Node) => {
              if (targetId !== nd.id) return nd
              else {
                return {
                  ...nd,
                  data: {
                    ...nd.data,
                    editing: continueEditing,
                    label: textareaRef.current?.value,
                  },
                }
              }
            })
          })
        }
      },
      [isEdge, isNode, setEdges, targetId, setNodes]
    )

    // cursor control
    const cursorPosition = useRef(content.length)

    const handleTextEditorChange = useCallback(
      (e: BaseSyntheticEvent) => {
        const newContent = e.target.value
        onFinishEditing(true)

        // update cursor position
        cursorPosition.current = e.target.selectionStart

        if (isNode) {
          e.target.parentNode.dataset.value = newContent
        }

        // avoid cursor jumping
        setTimeout(() => {
          e.target.setSelectionRange(
            cursorPosition.current,
            cursorPosition.current
          )
        }, 0)
      },
      [isNode, onFinishEditing]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        switch (e.key) {
          case 'Meta':
            e.preventDefault()
            e.stopPropagation()
            break

          case 'Enter':
            // break line
            if (e.metaKey) {
              // save
              e.preventDefault()
              e.stopPropagation()
              onFinishEditing(false)
            }
            break

          case 'Escape':
            e.preventDefault()
            e.stopPropagation()
            onFinishEditing(false)
            break

          default:
            break
        }
      },
      [onFinishEditing]
    )

    const handleBlur = useCallback(
      (e: BaseSyntheticEvent) => {
        onFinishEditing(false)
      },
      [onFinishEditing]
    )

    return (
      <div
        key={`${target}-${targetId}-super-wrapper`}
        className={`super-wrapper super-wrapper-${target}`}
        data-value={content}
      >
        {isNode ? (
          /* -------------------------------- for node -------------------------------- */
          <textarea
            key={`${target}-${targetId}-textarea`}
            ref={textareaRef}
            className={`super-text-editor${
              editing ? '' : ' disabled-text-editor'
            }${selected ? ' selected-text-editor' : ''}${
              content.length === 0 ? ' empty-text-editor' : ''
            }`}
            rows={1}
            value={content}
            placeholder={'node'}
            onChange={handleTextEditorChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={!editing}
            style={{
              width: content.length <= 10 ? '6rem' : 'auto',
            }}
          ></textarea>
        ) : (
          /* -------------------------------- for edge -------------------------------- */
          <input
            key={`${target}-${targetId}-input`}
            ref={inputRef}
            className={`super-text-editor${
              editing ? '' : ' disabled-text-editor'
            }${selected ? ' selected-text-editor' : ''}${
              content.length === 0 ? ' empty-text-editor' : ''
            }`}
            value={content}
            placeholder={''}
            onChange={handleTextEditorChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={!editing}
          ></input>
        )}
      </div>
    )
  }
)
