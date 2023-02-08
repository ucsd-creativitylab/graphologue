import {
  BaseSyntheticEvent,
  KeyboardEvent,
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
export const SuperTextEditor = ({
  target,
  targetId,
  content,
  editable,
}: SuperTextEditorProps) => {
  const flow = useContext(FlowContext) as ReactFlowInstance
  const { setNodes, getNodes } = flow

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

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
          }
          break

        default:
          break
      }
    },
    [setNodes, target, targetId]
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
        disabled={!editable}
        style={{
          width: content.length <= 10 ? '6rem' : 'auto',
        }}
      ></textarea>
    </div>
  )
}
