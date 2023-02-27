import { DragEvent, ReactElement, useCallback } from 'react'
import { useTokenDataTransferHandle } from '../constants'
import { EntityType, Tokenization } from '../utils/socket'

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

export interface MagicTokenizedTextProps {
  magicNodeId: string
  originalText: string
  tokenization: Tokenization
}
export const MagicTokenizedText = ({
  magicNodeId,
  originalText,
  tokenization,
}: MagicTokenizedTextProps) => {
  const onDragStart = useCallback((event: DragEvent, token: EntityType) => {
    event.dataTransfer!.setData(
      `application/${useTokenDataTransferHandle}`,
      JSON.stringify(token)
    )
    event.dataTransfer!.effectAllowed = 'move'
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
