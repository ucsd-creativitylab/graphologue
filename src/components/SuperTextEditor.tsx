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

    // set size for input element
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
    const onFinishEditing = useCallback(() => {
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
                  editing: false,
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
                  editing: false,
                  label: textareaRef.current?.value,
                },
              }
            }
          })
        })
      }
    }, [isEdge, targetId, isNode, setEdges, setNodes])

    const handleTextEditorChange = useCallback(
      (e: BaseSyntheticEvent) => {
        // e.target.size = Math.min(Math.max(e.target.value.length + 1, 1), 10) // for <input />
        // e.target.style.height = 'fit-content'
        // e.target.style.height = `calc(${e.target.scrollHeight}px - 1.8rem)` // scrollHeight is the height of the content + padding ($padding-mid * 2 here)
        const newContent = e.target.value

        if (isEdge) {
          inputRef.current!.size = getEdgeInputSize(newContent)
        } else if (isNode) {
          e.target.parentNode.dataset.value = newContent
        }
      },
      [getEdgeInputSize, isEdge, isNode]
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
              onFinishEditing()
            }
            break

          case 'Escape':
            e.preventDefault()
            e.stopPropagation()
            onFinishEditing()
            break

          default:
            break
        }
      },
      [onFinishEditing]
    )

    const handleBlur = useCallback(
      (e: BaseSyntheticEvent) => {
        onFinishEditing()
      },
      [onFinishEditing]
    )

    return (
      <div
        className={`super-wrapper super-wrapper-${target}`}
        data-value={content}
      >
        {isNode ? (
          /* -------------------------------- for node -------------------------------- */
          <textarea
            ref={textareaRef}
            className={`super-text-editor${
              editing ? '' : ' disabled-text-editor'
            }${selected ? ' selected-text-editor' : ''}${
              content.length === 0 ? ' empty-text-editor' : ''
            }`}
            rows={1}
            defaultValue={content}
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
            ref={inputRef}
            className={`super-text-editor${
              editing ? '' : ' disabled-text-editor'
            }${selected ? ' selected-text-editor' : ''}${
              content.length === 0 ? ' empty-text-editor' : ''
            }`}
            defaultValue={content}
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
