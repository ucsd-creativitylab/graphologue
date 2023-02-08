import {
  BaseSyntheticEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { Node, ReactFlowInstance } from 'reactflow'
import { FlowContext } from './Contexts'

type SuperTextEditorProps = {
  target: 'node' | 'edge'
  targetId: string
  content: string
  editable: boolean
}
export const SuperTextEditor = memo(
  ({ target, targetId, content, editable }: SuperTextEditorProps) => {
    const flow = useContext(FlowContext) as ReactFlowInstance
    const { setNodes } = flow

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    useEffect(() => {
      if (editable) {
        const ele = textareaRef.current
        if (ele) {
          ele.focus()
          ele.setSelectionRange(ele.value.length, ele.value.length)
        }
      }
    }, [editable])

    const _finishEditing = useCallback(() => {
      // TODO
      if (target === 'edge') return
      else if (target === 'node') {
        setNodes((nds: Node[]) => {
          return nds.map((nd: Node) => {
            if (targetId !== nd.id) return nd
            else {
              return {
                ...nd,
                data: {
                  ...nd.data,
                  editing: false,
                },
              }
            }
          })
        })
      }
    }, [setNodes, target, targetId])

    const handleTextEditorChange = useCallback(
      (e: BaseSyntheticEvent) => {
        // e.target.size = Math.min(Math.max(e.target.value.length + 1, 1), 10) // for <input />
        // e.target.style.height = 'fit-content'
        // e.target.style.height = `calc(${e.target.scrollHeight}px - 1.8rem)` // scrollHeight is the height of the content + padding ($padding-mid * 2 here)
        const newContent = e.target.value
        e.target.parentNode.dataset.value = newContent

        // TODO
        if (target === 'edge') return
        else if (target === 'node') {
          setNodes((nds: Node[]) => {
            return nds.map((nd: Node) => {
              if (targetId !== nd.id) return nd
              else {
                return {
                  ...nd,
                  data: {
                    ...nd.data,
                    label: newContent,
                  },
                }
              }
            })
          })
        }
      },
      [setNodes, target, targetId]
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
              _finishEditing()
            }
            break

          default:
            break
        }
      },
      [_finishEditing]
    )

    const handleBlur = useCallback(
      (e: BaseSyntheticEvent) => {
        _finishEditing()
      },
      [_finishEditing]
    )

    return (
      <div className="super-wrapper" data-value={content}>
        <textarea
          ref={textareaRef}
          className={`super-text-editor ${target}-text-editor${
            editable ? '' : ' disabled-text-editor'
          }`}
          rows={1}
          value={content}
          placeholder={target}
          onChange={handleTextEditorChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={!editable}
          style={{
            width: content.length <= 10 ? '6rem' : 'auto',
          }}
        ></textarea>
      </div>
    )
  }
)
