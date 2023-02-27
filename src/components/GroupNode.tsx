import { memo, useCallback, useContext, useEffect, useRef } from 'react'
import {
  Node,
  NodeProps,
  useReactFlow,
  useStore,
  useStoreApi,
  getRectOfNodes,
} from 'reactflow'
import isEqual from 'react-fast-compare'

import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import QueueRoundedIcon from '@mui/icons-material/QueueRounded'

import { getGroupNodeId } from '../utils/utils'
import useDetachNodes from '../utils/useDetachNodes'
import {
  MagicToolbox,
  MagicToolboxButton,
  MagicToolboxItem,
} from './MagicToolbox'
import { FlowContext } from './Contexts'
import { viewFittingOptions } from '../constants'

export interface CustomGroupNodeProps extends NodeProps {}

export const CustomGroupNode = memo(
  ({ id, selected }: CustomGroupNodeProps) => {
    // https://pro.reactflow.dev/examples/dynamic-grouping
    const store = useStoreApi()
    const detachNodes = useDetachNodes()
    const { deleteElements, fitBounds } = useReactFlow()

    const zoomLevel = useStore(useCallback(store => store.transform[2], []))
    const { selectedComponents } = useContext(FlowContext)

    const moreThanOneComponentsSelected =
      selectedComponents.nodes.length + selectedComponents.edges.length > 1

    const hasChildNodes = useStore(store => {
      const childNodes = Array.from(store.nodeInternals.values()).filter(
        n => n.parentNode === id
      )
      // const rect = getRectOfNodes(childNodes)

      return childNodes.length > 0
    }, isEqual)

    const onDelete = () => {
      deleteElements({ nodes: [{ id }] })
    }

    const onDetach = () => {
      const childNodeIds = Array.from(store.getState().nodeInternals.values())
        .filter(n => n.parentNode === id)
        .map(n => n.id)

      detachNodes(childNodeIds, id)
    }

    // highlight itself on mount
    const initialFitting = useRef(false)
    useEffect(() => {
      if (initialFitting.current) return
      initialFitting.current = true

      const thisNode: Node = Array.from(
        store.getState().nodeInternals.values()
      ).filter(n => n.id === id)[0]

      fitBounds(getRectOfNodes([thisNode]), viewFittingOptions)
    }, [fitBounds, id, store])

    return (
      <>
        <MagicToolbox
          className={`edge-label-toolbox${
            selected && !moreThanOneComponentsSelected
              ? ' magic-toolbox-show'
              : ''
          }`}
          zoom={zoomLevel}
        >
          <MagicToolboxItem title="delete">
            <MagicToolboxButton
              content={
                <>
                  <DeleteOutlineRoundedIcon />
                  <span>delete</span>
                </>
              }
              onClick={onDelete}
            />
          </MagicToolboxItem>
          {hasChildNodes ? (
            <MagicToolboxItem title="release">
              <MagicToolboxButton
                content={
                  <>
                    <QueueRoundedIcon />
                    <span>release</span>
                  </>
                }
                onClick={onDetach}
              />
            </MagicToolboxItem>
          ) : (
            <></>
          )}
        </MagicToolbox>
      </>
    )
  }
)

/* -------------------------------------------------------------------------- */

export const getNewGroupNode = (
  x: number,
  y: number,
  width: number,
  height: number
) => {
  return {
    id: getGroupNodeId(),
    type: 'group',
    position: { x, y },
    width,
    height,
    style: {
      width,
      height,
    },
  } as Node
}
