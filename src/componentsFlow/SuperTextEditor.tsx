import {
  BaseSyntheticEvent,
  KeyboardEvent,
  memo,
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { Edge, Node, useReactFlow } from 'reactflow'
import tinycolor from 'tinycolor2'
import { styles } from '../constants'

type SuperTextEditorProps = {
  target: 'node' | 'edge'
  targetId: string
  content: string
  editing: boolean
  background: string
  textareaRef: RefObject<HTMLTextAreaElement> | null
  selected: boolean
  children?: ReactElement
}
export const SuperTextEditor = memo(
  ({
    target,
    targetId,
    content,
    editing,
    background,
    selected,
    children,
    textareaRef,
  }: SuperTextEditorProps) => {
    const { setNodes, setEdges } = useReactFlow()

    const isNode = target === 'node'
    const isEdge = target === 'edge'

    // const superTextareaRef = useRef<HTMLTextAreaElement>(null)
    const superTextareaRef = textareaRef
    const inputRef = useRef<HTMLInputElement>(null)

    // ! on start editing
    useEffect(() => {
      if (editing) {
        const ele = isNode ? superTextareaRef?.current : inputRef?.current
        if (ele) {
          ele.focus()
          ele.setSelectionRange(ele.value.length, ele.value.length)
        }
      }
    }, [editing, isNode, superTextareaRef])

    // dynamic size setting for edge input
    const getEdgeInputSize = useCallback(
      (content: string) => Math.min(Math.max(content.length + 1, 1), 50),
      [],
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
                    label: superTextareaRef?.current?.value,
                  },
                }
              }
            })
          })
        }
      },
      [isEdge, isNode, setEdges, targetId, setNodes, superTextareaRef],
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
            cursorPosition.current,
          )
        }, 0)
      },
      [isNode, onFinishEditing],
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
      [onFinishEditing],
    )

    const handleBlur = useCallback(
      (e: BaseSyntheticEvent) => {
        onFinishEditing(false)
      },
      [onFinishEditing],
    )

    return (
      <div
        key={`${target}-${targetId}-super-wrapper`}
        className={`super-wrapper super-wrapper-${target}${
          editing ? '' : ' disabled-wrapper'
        }`}
        data-value={content}
      >
        {isNode ? (
          /* -------------------------------- for node -------------------------------- */
          <textarea
            key={`${target}-${targetId}-textarea`}
            ref={superTextareaRef}
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
              width: content.length <= 10 ? '160px' : 'auto',
              color:
                background === styles.nodeColorDefaultWhite
                  ? '#333333'
                  : tinycolor(background).isDark()
                  ? 'white'
                  : tinycolor(background).darken(45).toHexString(),
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

        {isEdge && content.length > 0 && (
          <div className="content-tooltip">{content}</div>
        )}

        {children}
      </div>
    )
  },
)
