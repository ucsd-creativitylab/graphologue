import { memo, useContext } from 'react'
import { NodeProps } from 'reactflow'

import { FlowContext } from './Contexts'
import { PromptType } from './magicExplain'

interface MagicNodeData {
  prompts: PromptType[]
}

interface MagicNodeProps extends NodeProps {
  data: MagicNodeData
}

export const MagicNode = memo(
  ({ id, data, xPos, yPos, selected }: MagicNodeProps) => {
    const { metaPressed } = useContext(FlowContext)

    return (
      <div
        className={`customNodeBody magicNodeBody${
          metaPressed ? ' magicNodeMetaPressed' : ''
        }`}
      >
        <div className={`customNodeContent magicNodeContent`}></div>
      </div>
    )
  }
)
