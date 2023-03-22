import {
  ChangeEvent,
  DragEvent,
  memo,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Edge,
  FitView,
  Instance,
  Node,
  NodeProps,
  useReactFlow,
} from 'reactflow'
import isEqual from 'react-fast-compare'
import { PuffLoader } from 'react-spinners'

import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded'
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded'
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded'
import BackspaceRoundedIcon from '@mui/icons-material/BackspaceRounded'
import FitScreenRoundedIcon from '@mui/icons-material/FitScreenRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DocumentScannerRoundedIcon from '@mui/icons-material/DocumentScannerRounded'
import GrainIcon from '@mui/icons-material/Grain'

import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded'
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded'
// import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
// import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'

import {
  hardcodedNodeSize,
  magicNodeVerifyPaperCountDefault,
  nodeGap,
  styles,
  useTokenDataTransferHandle,
  viewFittingOptions,
} from '../constants'
import { FlowContext, NotebookContext } from '../components/Contexts'
import {
  parseModelResponseText,
  PromptSourceComponentsType,
} from '../utils/magicExplain'
import {
  getCurrentTextSelection,
  getGraphBounds,
  getHandleId,
  getMagicNodeId,
  getNodeId,
  getNoteId,
  getPositionOffsetForGeneratedNodes,
  isEmptyTokenization,
  isStringRoughEqual,
  slowDeepCopy,
} from '../utils/utils'
import { MagicToolboxButton } from './MagicToolbox'
import { getOpenAICompletion, getTextFromModelResponse } from '../utils/openAI'
import {
  emptyTokenization,
  EntityType,
  socketPath,
  Tokenization,
  // WebSocketMessageType,
  WebSocketResponseType,
} from '../utils/socket'
import { deepCopyNodes, deepCopyEdges } from '../utils/storage'
import {
  isValidResponse,
  predefinedPrompts,
  predefinedResponses,
} from '../utils/promptsAndResponses'
import { Scholar, SemanticScholarPaperEntity } from '../components/Scholar'
import { MagicNote, MagicNoteData } from '../components/Notebook'
import {
  constructGraph,
  constructGraphRelationsFromResponse,
  hasHiddenExpandId,
  PostConstructionPseudoNodeObject,
  removeHiddenExpandId,
} from '../utils/magicGraphConstruct'
import {
  CustomNodeData,
  getNewCustomNode,
  hardcodedNodeWidthEstimation,
} from './Node'
import { getNewEdge } from './Edge'
import { MagicTokenizedText } from './MagicToken'
import { VerifyLink } from '../utils/verification'

export interface MagicNodeData {
  sourceComponents: PromptSourceComponentsType
  suggestedPrompts: string[]
  prompt: string
  rawResponse: string
  rawLinks: VerifyLink[]
  rawGraphRelationships: string[][]
}

export interface VerifyEntities {
  searchQueries: string[]
  researchPapers: SemanticScholarPaperEntity[]
}

interface MagicNodeProps extends NodeProps {
  data: MagicNodeData
  magicNoteInNotebook?: boolean
  magicNoteData?: MagicNoteData
}

export const MagicNode = memo(
  ({
    id,
    data,
    data: { sourceComponents, rawResponse, rawLinks, rawGraphRelationships },
    magicNoteInNotebook,
    magicNoteData,
  }: MagicNodeProps) => {
    const { model } = useContext(FlowContext)
    const {
      getNode,
      setNodes,
      getNodes,
      // getEdge,
      setEdges,
      getEdges,
      deleteElements,
      fitView,
      fitBounds,
    } = useReactFlow()
    const { addNote, deleteNote } = useContext(NotebookContext)

    /* -------------------------------------------------------------------------- */
    const [waitingForModel, setWaitingForModel] = useState<boolean>(false)

    const [modelTokenization, setModelTokenization] =
      useState<Tokenization>(emptyTokenization)
    // const [selectedTokens, setSelectedTokens] = useState<EntityType[]>([])

    /* -------------------------------------------------------------------------- */
    const [verifyFacts, setVerifyFacts] = useState<boolean>(false)
    const [verifyEntities, setVerifyEntities] = useState<VerifyEntities>({
      searchQueries: [],
      researchPapers: [],
    })
    /* -------------------------------------------------------------------------- */
    const [
      resolvingTextSelectionExtractedRelationships,
      setResolvingTextSelectionExtractedRelationships,
    ] = useState<boolean>(false)
    // const textSelectionExtractedRelationshipMemories = useRef<{
    //   [key: string]: string[][]
    // }>({})
    const magicOriginalResponseTextSpanRef = useRef<HTMLSpanElement>(null)
    /* -------------------------------------------------------------------------- */

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const promptTextCursorPosition = useRef(data.prompt.length)

    /* -------------------------------------------------------------------------- */

    // text response selection
    const handleDragStart = useCallback((event: DragEvent) => {
      const selectedResponse = getCurrentTextSelection()
      if (!selectedResponse) return

      const data = {
        value: selectedResponse,
        length: selectedResponse.length,
        offset: 0,
        type: 'MISC',
      } as EntityType

      event.dataTransfer.setData(
        `application/${useTokenDataTransferHandle}`,
        JSON.stringify(data)
      )

      event.dataTransfer.effectAllowed = 'move'
    }, [])

    /* -------------------------------------------------------------------------- */

    // ! socket
    const ws = useRef<WebSocket | null>(null)
    useEffect(() => {
      ws.current = new WebSocket(socketPath)
      // ws.current!.onopen = () => console.log('[connected to graphologue heroku server]')
      // ws.current!.onclose = () => console.log('[disconnected to graphologue heroku server]')

      const wsCurrent = ws.current

      // on message
      wsCurrent.onmessage = e => {
        const { entities, id: responseId } = JSON.parse(
          e.data
        ) as WebSocketResponseType

        if (id === responseId) {
          setModelTokenization(entities)
        }
      }

      return () => {
        if (wsCurrent.readyState === wsCurrent.OPEN) wsCurrent.close()
      }
    }, [id])

    // ! delete
    const handleDeleteNode = useCallback(
      (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        deleteElements({
          nodes: [getNode(id)] as Node[],
        })
      },
      [deleteElements, getNode, id]
    )

    // ! fold and unfold
    const [folded, setFolded] = useState<boolean>(false)
    const handleToggleFold = useCallback(() => {
      setFolded(folded => !folded)
    }, [])

    // ! duplicate
    const handleDuplicate = useCallback(() => {
      const node = getNode(id)

      if (node) {
        const newNode = {
          ...deepCopyNodes([node!])[0],
          id: getMagicNodeId(),
          position: {
            x: node.position.x + hardcodedNodeSize.magicWidth + nodeGap,
            y: node.position.y,
          },
        }

        setNodes((nodes: Node[]) => [...nodes, newNode])

        setTimeout(() => {
          fitView(viewFittingOptions)
        }, 0)
      }
    }, [fitView, getNode, id, setNodes])

    // ! linkage
    // const [linked, setLinked] = useState(true)
    // const handleToggleLinkage = useCallback(() => {
    //   setLinked(linked => !linked)
    // }, [])

    // ! add to note
    const handleAddToNote = useCallback(() => {
      const noteId = getNoteId()
      addNote({
        type: 'magic',
        id: noteId,
        data: {
          id: noteId,
          prompt: data.prompt,
          magicNodeId: id,
          response: rawResponse,
          verifyEntities: verifyEntities,
        } as MagicNoteData,
      } as MagicNote)
    }, [addNote, data.prompt, id, rawResponse, verifyEntities])

    // ! prompt text change
    const autoGrow = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'fit-content'
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + 'px'
      }
    }, [])

    const handlePromptTextChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  prompt: e.target.value,
                },
              }
            }
            return node
          })
        })

        promptTextCursorPosition.current = e.target.selectionStart
        // avoid cursor jumping
        autoGrow()
        setTimeout(() => {
          e.target.setSelectionRange(
            promptTextCursorPosition.current,
            promptTextCursorPosition.current
          )
        }, 0)
      },
      [autoGrow, id, setNodes]
    )

    /* -------------------------------------------------------------------------- */

    const handleSetModelRawResponse = useCallback(
      (newResponse: string) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  rawResponse: newResponse,
                },
              }
            }
            return node
          })
        })
      },
      [id, setNodes]
    )

    const handleGetUserEntities = useCallback(() => {
      return sourceComponents.nodes
        .map((nodeId: string) => {
          const node: Node | undefined = getNode(nodeId)
          if (node && (node.data as CustomNodeData).label.length)
            return node.data.label
          else return ''
        })
        .filter(l => l.length > 0)
    }, [getNode, sourceComponents.nodes])

    const handleSetMagicResponseExtractedRelationships = useCallback(
      (relationships: string[][]) => {
        setNodes((nodes: Node[]) => {
          return nodes.map(node => {
            if (node.id === id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  rawGraphRelationships: relationships,
                } as MagicNodeData,
              }
            }
            return node
          })
        })
      },
      [id, setNodes]
    )

    const handleModelError = useCallback(
      (error: any) => {
        console.error(error)

        setWaitingForModel(false)

        handleSetModelRawResponse(predefinedResponses.modelDown())
        setTimeout(() => {
          handleSetModelRawResponse('')
        }, 3000)
      },
      [handleSetModelRawResponse]
    )

    const paperExplanationDict = useRef<{
      [paperId: string]: {
        asked: boolean
        explanation: string
      }
    }>({})
    const askForPaperExplanation = useCallback(
      async (
        response: string,
        searchQueries: string[],
        papers: SemanticScholarPaperEntity[]
      ) => {
        papers = slowDeepCopy(papers)

        for (const paperToExplain of papers.slice(
          0,
          magicNodeVerifyPaperCountDefault
        ) as SemanticScholarPaperEntity[]) {
          if (
            response.length &&
            paperToExplain.title.length &&
            !paperToExplain.explanation &&
            !paperExplanationDict.current[paperToExplain.paperId]
          ) {
            paperExplanationDict.current[paperToExplain.paperId] = {
              asked: true,
              explanation: '',
            }

            const explanationResponse = await getOpenAICompletion([], model) // TODO
            // const explanationResponse = await getOpenAICompletion(
            //   predefinedPrompts.explainScholar(
            //     response,
            //     paperToExplain.title,
            //     paperToExplain.abstract || ''
            //   )
            // )

            if (explanationResponse.error)
              // TODO
              console.error(explanationResponse.error)

            let explanation = explanationResponse.error
              ? predefinedResponses.noValidResponse()
              : getTextFromModelResponse(explanationResponse)

            if (explanation) explanation = explanation.trim()
            else explanation = predefinedResponses.noValidResponse()

            if (explanation.length === 0)
              explanation = predefinedResponses.noValidResponse()

            paperExplanationDict.current[paperToExplain.paperId].explanation =
              explanation

            papers = papers.map((p: SemanticScholarPaperEntity) => {
              if (p.paperId === paperToExplain.paperId) {
                return {
                  ...p,
                  explanation: explanation,
                }
              }
              return p
            })
          }
        }

        setVerifyEntities({
          searchQueries,
          researchPapers: papers,
        })
      },
      [model]
    )

    // ! actual ask
    const handleAsk = useCallback(async () => {
      console.log(waitingForModel)

      if (waitingForModel) return

      // ! 0. ground reset
      setWaitingForModel(true)
      handleSetModelRawResponse('')
      setModelTokenization(emptyTokenization)

      handleSetMagicResponseExtractedRelationships([])
      setResolvingTextSelectionExtractedRelationships(false)

      setVerifyFacts(false)
      setVerifyEntities({
        searchQueries: [],
        researchPapers: [],
      })

      // ! 1. ask model for raw response
      console.log('asking model')
      const response = await getOpenAICompletion(
        predefinedPrompts.getModelRawResponse(data.prompt),
        model
      )
      console.log(response)

      // TODO handle error
      if (response.error) return handleModelError(response.error)

      const modelText = getTextFromModelResponse(response)
      const { parsedResponse } = parseModelResponseText(modelText, 'response')

      if (!parsedResponse.length) {
        setWaitingForModel(false)
        handleSetModelRawResponse(predefinedResponses.noValidModelText())
        setTimeout(() => {
          handleSetModelRawResponse('')
        }, 3000)
        return
      }

      // get secondary queries for verification
      // ! 2. ask model for verification
      // * ask model for verification search queries and paper keywords
      // const secondaryResponse = await getOpenAICompletion(
      //   predefinedPrompts.thisIsStatement(parsedResponse) +
      //     predefinedPrompts.addGooglePrompts() +
      //     predefinedPrompts.addScholar()
      // )
      // if (secondaryResponse.error)
      //   return handleModelError(secondaryResponse.error)
      // const secondaryModelText = getTextFromModelResponse(secondaryResponse)
      // const { searchQueries, researchPaperKeywords } = parseModelResponseText(
      //   secondaryModelText,
      //   'verify'
      // )

      // * search papers from keywords
      // const papersFromKeywords = await getScholarPapersFromKeywords(
      //   researchPaperKeywords
      // )
      // * set queries and papers
      // setVerifyEntities({
      //   searchQueries,
      //   researchPapers: papersFromKeywords,
      // })
      // * then get explanations for the papers
      // askForPaperExplanation(parsedResponse, searchQueries, papersFromKeywords)

      handleSetModelRawResponse(parsedResponse) // ! actual model text
      setWaitingForModel(false)

      // ! 3. ask model to extract relationships
      handleSetMagicResponseExtractedRelationships(
        await constructGraphRelationsFromResponse(
          parsedResponse,
          handleGetUserEntities(),
          model
        )
      )

      // no longer needed
      // ! send to our server for tokenization
      // if (ws.current?.readyState === ws.current?.OPEN)
      //   ws.current?.send(
      //     JSON.stringify({
      //       message: modelText,
      //       id: id,
      //     } as WebSocketMessageType)
      //   )
    }, [
      data.prompt,
      handleGetUserEntities,
      handleModelError,
      handleSetMagicResponseExtractedRelationships,
      handleSetModelRawResponse,
      model,
      waitingForModel,
    ])

    // ! suggest prompt
    const handleSuggestPrompt = useCallback(() => {}, [])

    /* -------------------------------------------------------------------------- */

    // component did mount
    useEffect(() => {
      autoGrow()
    }, [autoGrow])

    /* -------------------------------------------------------------------------- */

    // ! ask automatically on mount
    const autoAsk = useRef(true)
    useEffect(() => {
      // if (!debug && !magicNoteInNotebook && autoAsk.current) {
      if (!magicNoteInNotebook && autoAsk.current) {
        autoAsk.current = false

        if (!data.rawResponse.length) handleAsk()
        else if (
          data.rawResponse.length &&
          !data.rawGraphRelationships.length
        ) {
          const _ = async () => {
            handleSetMagicResponseExtractedRelationships(
              await constructGraphRelationsFromResponse(
                data.rawResponse,
                handleGetUserEntities(),
                model
              )
            )
          }

          _()
        }
      }
    }, [
      data.rawGraphRelationships.length,
      data.rawResponse,
      handleAsk,
      handleGetUserEntities,
      handleSetMagicResponseExtractedRelationships,
      magicNoteInNotebook,
      model,
    ])

    /* -------------------------------------------------------------------------- */

    const fitMagicNode = useCallback(() => {
      setTimeout(() => {
        const node = getNode(id)

        if (node) {
          fitBounds(getGraphBounds([node]), viewFittingOptions)
        }
      }, 0)
    }, [fitBounds, getNode, id])

    // ! verify
    const handleVerifyFacts = useCallback(() => {
      setVerifyFacts(!verifyFacts)
    }, [verifyFacts])

    useEffect(() => {
      if (verifyFacts) {
        fitMagicNode()
      }
    }, [fitMagicNode, verifyFacts])

    const handleRemovePaper = useCallback(
      (paperId: string) => {
        const newPapers = verifyEntities.researchPapers.filter(
          p => p.paperId !== paperId
        )
        setVerifyEntities({
          searchQueries: verifyEntities.searchQueries,
          researchPapers: newPapers,
        })
        askForPaperExplanation(
          rawResponse,
          verifyEntities.searchQueries,
          newPapers
        )
      },
      [
        askForPaperExplanation,
        rawResponse,
        verifyEntities.researchPapers,
        verifyEntities.searchQueries,
      ]
    )

    useEffect(() => {}, [verifyEntities.researchPapers])

    const verifyEntitiesExplained = useCallback(() => {
      // as long as there are papers, we need to explain them
      if (verifyEntities.researchPapers.length > 0) {
        return verifyEntities.researchPapers.some(paper => paper.explanation)
      }
      // otherwise, the node is ready as long as there are model responses
      return rawResponse.length > 0
    }, [rawResponse.length, verifyEntities.researchPapers])

    // handle wheel
    // const handleWheel = useCallback(
    //   (event: WheelEvent) => {
    //     if (verifyFacts && verifyEntities.researchPapers.length > 0) {
    //       event.stopPropagation()
    //       event.preventDefault()
    //     }
    //   },
    //   [verifyEntities.researchPapers.length, verifyFacts]
    // )
    const preventWheel =
      !folded && verifyFacts && verifyEntities.researchPapers.length > 0

    const hasModelResponse =
      rawResponse.length > 0 ||
      (magicNoteInNotebook &&
        magicNoteData &&
        magicNoteData.response.length > 0)
    const renderedModelResponse = magicNoteInNotebook
      ? magicNoteData?.response || predefinedResponses.noValidResponse()
      : rawResponse
    const renderedVerifyEntities = magicNoteInNotebook
      ? magicNoteData?.verifyEntities || verifyEntities
      : verifyEntities

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */

    // ! text to graph

    const handleConstructGraph = useCallback(
      (relationships: string[][]) => {
        const computedNodes = constructGraph(relationships)

        const currentNodes = deepCopyNodes(getNodes())
        const currentEdges = deepCopyEdges(getEdges())
        const newNodes: Node[] = []
        const newEdges: Edge[] = []

        const sourceNodes: Node[] = data.sourceComponents.nodes
          .map(nodeId => {
            const node = getNode(nodeId)
            if (!node) return undefined
            return node
          })
          .filter(node => node) as Node[]
        // const sourceEdges: Edge[] = data.sourceComponents.edges
        //   .map(edgeId => {
        //     const edge = getEdge(edgeId)
        //     if (!edge) return undefined
        //     return edge
        //   })
        //   .filter(edge => edge) as Edge[]

        const pseudoNodeObjects = computedNodes.map(({ label, x, y }) => {
          return {
            id: getNodeId(),
            label,
            position: {
              x,
              y,
            },
            width: hardcodedNodeWidthEstimation(label),
            height: hardcodedNodeSize.height,
            sourceHandleId: getHandleId(),
            targetHandleId: getHandleId(),
          } as PostConstructionPseudoNodeObject
        })
        console.log(pseudoNodeObjects) // TODO remove

        // how many matching nodes are there?
        const matchingNodes: Node[] = []
        pseudoNodeObjects.forEach(({ label }) => {
          if (sourceNodes.map(node => node.data.label).includes(label)) {
            const sourceNode = sourceNodes.find(node =>
              isStringRoughEqual(node.data.label, label)
            )
            if (!sourceNode) return

            matchingNodes.push(sourceNode)
            return
          }
        })
        if (matchingNodes.length === 0) matchingNodes.push(...sourceNodes)

        const thisMagicNode = getNode(id)
        if (!thisMagicNode) return
        const positionOffsetForGeneratedNodes =
          getPositionOffsetForGeneratedNodes(
            pseudoNodeObjects,
            matchingNodes,
            thisMagicNode
          )

        pseudoNodeObjects.forEach(
          (
            { id, label, position: { x, y }, sourceHandleId, targetHandleId },
            ind: number
          ) => {
            if (sourceNodes.map(node => node.data.label).includes(label)) {
              const sourceNode = sourceNodes.find((node: Node) =>
                isStringRoughEqual(node.data.label, label)
              )
              if (!sourceNode) return

              const { data: sourceNodeData } = sourceNode

              pseudoNodeObjects[ind] = {
                ...pseudoNodeObjects[ind],
                id: sourceNode.id,
                label: sourceNodeData.label,
                sourceHandleId: sourceNodeData.sourceHandleId,
                targetHandleId: sourceNodeData.targetHandleId,
              }

              return
            }

            newNodes.push(
              getNewCustomNode(
                id,
                removeHiddenExpandId(label),
                x + positionOffsetForGeneratedNodes.offsetX,
                y + positionOffsetForGeneratedNodes.offsetY,
                sourceHandleId,
                targetHandleId,
                true,
                false,
                hasHiddenExpandId(label)
                  ? styles.nodeColorDefaultGrey
                  : styles.nodeColorDefaultWhite, // expanded edge label will be grey
                {
                  temporary: true,
                }
              )
            )
          }
        )

        relationships.forEach(([source, edge, target]) => {
          const sourceNode = pseudoNodeObjects.find(n => n.label === source)
          const targetNode = pseudoNodeObjects.find(n => n.label === target)

          if (!sourceNode || !targetNode) return

          newEdges.push(
            getNewEdge(
              {
                source: sourceNode.id,
                target: targetNode.id,
                sourceHandle: sourceNode.sourceHandleId,
                targetHandle: targetNode.targetHandleId,
              },
              {
                label: edge,
                customType: 'arrow',
                editing: false,
                generated: {
                  temporary: true,
                },
              }
            )
          )
        })

        // get bounds of new nodes
        // const thisMagicNode = getNode(id)
        // if (!thisMagicNode) return

        // const { x, y, width, height } = getGraphBounds(newNodes)
        // const groupingNode = getNewGroupNode(
        //   nodeGap +
        //     (thisMagicNode.position.x +
        //       (thisMagicNode.width || hardcodedNodeSize.magicWidth) || 0),
        //   thisMagicNode.position.y,
        //   width + nodePosAdjustStep * 2,
        //   height + nodePosAdjustStep * 2
        // )

        // const originalNodesOffsetX = x - nodePosAdjustStep
        // const originalNodesOffsetY = y - nodePosAdjustStep

        // newNodes.forEach((node: Node) => {
        //   node.position.x -= originalNodesOffsetX
        //   node.position.y -= originalNodesOffsetY

        //   node.extent = 'parent'
        //   node.parentNode = groupingNode.id
        // })

        // currentNodes.push(groupingNode, ...newNodes)
        currentNodes.push(...newNodes)
        currentEdges.push(...newEdges)

        setNodes(currentNodes)
        setEdges(currentEdges)
      },
      [
        data.sourceComponents.nodes,
        getEdges,
        getNode,
        getNodes,
        id,
        setEdges,
        setNodes,
      ]
    )

    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */
    /* -------------------------------------------------------------------------- */

    // ! note

    const handleDeleteNote = useCallback(() => {
      if (magicNoteInNotebook && magicNoteData) deleteNote(magicNoteData.id)
    }, [deleteNote, magicNoteData, magicNoteInNotebook])

    const handleLocateOriginalNode = useCallback(() => {
      if (magicNoteData) {
        const node = getNode(magicNoteData.magicNodeId)
        if (node) {
          fitBounds(getGraphBounds([node]), viewFittingOptions)
        }
      }
    }, [fitBounds, getNode, magicNoteData])

    return (
      <div
        className={`custom-node-body magic-node-body${
          folded && !magicNoteInNotebook ? ' magic-node-draggable' : ''
        }${preventWheel && !magicNoteInNotebook ? ' nowheel' : ''}${
          magicNoteInNotebook ? ' magic-note-in-notebook in-notebook' : ''
        }`}
      >
        <MagicNodeBar
          magicNoteInNotebook={magicNoteInNotebook || false}
          folded={folded}
          preventWheel={preventWheel}
          modelResponse={rawResponse}
          magicNodeFunctions={{
            handleDeleteNode,
            handleToggleFold,
            handleDuplicate,
            verifyEntitiesExplained,
            handleAddToNote,
            fitMagicNode,
          }}
          magicNoteFunctions={{
            handleDeleteNote,
            handleLocateOriginalNode,
          }}
        />

        {/* folded */}
        {(folded || magicNoteInNotebook) && (
          <p
            className={`magic-folded-text magic-node-draggable${
              magicNoteInNotebook ? ' in-notebook' : ''
            }`}
          >
            {data.prompt}
          </p>
        )}

        {/* unfolded */}
        {!folded && (
          <>
            {!magicNoteInNotebook && (
              <div className="magic-prompt">
                <textarea
                  ref={textareaRef}
                  className="magic-prompt-text"
                  value={data.prompt}
                  onChange={handlePromptTextChange}
                  autoFocus={true}
                />

                <div className="magic-prompt-line">
                  <MagicToolboxButton
                    className="magic-button"
                    content={
                      <>
                        <AutoFixHighRoundedIcon />
                        <span>ask</span>
                      </>
                    }
                    onClick={handleAsk}
                    disabled={waitingForModel}
                  />

                  <MagicToolboxButton
                    className="magic-button"
                    content={
                      <>
                        <SavingsRoundedIcon />
                        <span>suggested prompts</span>
                      </>
                    }
                    onClick={handleSuggestPrompt}
                  />
                </div>
              </div>
            )}

            {waitingForModel && (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={32} color="#57068c" />
              </div>
            )}

            {hasModelResponse && (
              <div
                className={`magic-node-content${
                  magicNoteInNotebook ? ' in-notebook' : ''
                }`}
              >
                <p className="magic-node-content-text">
                  {!isEmptyTokenization(modelTokenization) ? (
                    <MagicTokenizedText
                      magicNodeId={id}
                      originalText={rawResponse}
                      tokenization={modelTokenization}
                    />
                  ) : (
                    <span
                      ref={magicOriginalResponseTextSpanRef}
                      className="magic-original-text"
                      // draggable={true}
                      onDragStart={handleDragStart}
                    >
                      {renderedModelResponse}
                    </span>
                  )}
                </p>

                {isValidResponse(renderedModelResponse) && (
                  <>
                    {/* TODO should we allow in notebook? */}
                    {!magicNoteInNotebook && (
                      <div className="magic-prompt-line">
                        <MagicToolboxButton
                          className="magic-button"
                          content={
                            <>
                              <GrainIcon
                                style={{
                                  transform: 'scale(1.1)',
                                }}
                              />
                              <span>
                                <b>tl;</b>graphologue
                              </span>
                            </>
                          }
                          onClick={async () => {
                            const textSelection = getCurrentTextSelection()
                            if (textSelection) {
                              setResolvingTextSelectionExtractedRelationships(
                                true
                              )
                              handleConstructGraph(
                                await constructGraphRelationsFromResponse(
                                  textSelection,
                                  handleGetUserEntities(),
                                  model
                                )
                              )
                              setResolvingTextSelectionExtractedRelationships(
                                false
                              )
                            } else {
                              handleConstructGraph(rawGraphRelationships)
                            }
                          }}
                          disabled={
                            resolvingTextSelectionExtractedRelationships ||
                            rawGraphRelationships.length === 0
                          }
                        />
                      </div>
                    )}

                    {false && (
                      <button
                        className="model-response-warning"
                        onClick={handleVerifyFacts}
                      >
                        <span>
                          <TranslateRoundedIcon />
                          {magicNoteInNotebook
                            ? `Verify the model generated responses...`
                            : `Verify the model generated responses...`}
                        </span>
                        {verifyFacts ? (
                          <UnfoldLessRoundedIcon
                            style={{
                              transform: 'scale(1.2)',
                            }}
                          />
                        ) : (
                          <UnfoldMoreRoundedIcon
                            style={{
                              transform: 'scale(1.2)',
                            }}
                          />
                        )}
                      </button>
                    )}

                    {verifyFacts &&
                      (renderedVerifyEntities.researchPapers.length > 0 ||
                        renderedVerifyEntities.searchQueries.length > 0) && (
                        <div className="model-response-verify">
                          {renderedVerifyEntities.searchQueries.length > 0 && (
                            <div className="verify-section">
                              <p className="section-title">
                                google with suggested prompts
                              </p>
                              <div className="verify-options">
                                {renderedVerifyEntities.searchQueries.map(
                                  (query: string, i: number) => (
                                    <a
                                      key={i}
                                      className="verify-option"
                                      href={`https://www.google.com/search?q=${query}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <SearchRoundedIcon />
                                      <span>{query}</span>
                                    </a>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {renderedVerifyEntities.researchPapers.length > 0 && (
                            <Scholar
                              papers={renderedVerifyEntities.researchPapers}
                              removePaper={handleRemovePaper}
                              inNotebook={magicNoteInNotebook ?? false}
                            />
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  },
  isEqual
)

/* -------------------------------------------------------------------------- */

const MagicNodeBar = memo(
  ({
    magicNoteInNotebook,
    folded,
    preventWheel,
    modelResponse,
    magicNodeFunctions: {
      handleDeleteNode,
      handleToggleFold,
      handleDuplicate,
      verifyEntitiesExplained,
      handleAddToNote,
      fitMagicNode,
    },
    magicNoteFunctions: { handleDeleteNote, handleLocateOriginalNode },
  }: {
    magicNoteInNotebook: boolean
    folded: boolean
    preventWheel: boolean
    modelResponse: string
    magicNodeFunctions: {
      handleDeleteNode: (e: MouseEvent) => void
      handleToggleFold: () => void
      handleDuplicate: () => void
      verifyEntitiesExplained: () => boolean
      handleAddToNote: () => void
      fitMagicNode: () => void
    }
    magicNoteFunctions: {
      handleDeleteNote: () => void
      handleLocateOriginalNode: () => void
    }
  }) => {
    const addToNoteEnabled = modelResponse && verifyEntitiesExplained()

    const addToNote = useCallback(() => {
      if (addToNoteEnabled) {
        handleAddToNote()
      }
    }, [addToNoteEnabled, handleAddToNote])

    return (
      <div
        className={`magic-node-bar magic-node-draggable${
          magicNoteInNotebook ? ' in-notebook' : ''
        }${!preventWheel ? ' bar-no-need-to-blur' : ''}`}
      >
        <div className="bar-buttons">
          <button className="bar-button" onClick={handleToggleFold}>
            {folded ? <UnfoldMoreRoundedIcon /> : <UnfoldLessRoundedIcon />}
          </button>

          {magicNoteInNotebook ? (
            <>
              <button className="bar-button" onClick={handleDeleteNote}>
                <BackspaceRoundedIcon
                  style={{
                    transform: 'scale(0.9)',
                  }}
                />
              </button>
              <button className="bar-button" onClick={handleLocateOriginalNode}>
                <FitScreenRoundedIcon
                  style={{
                    transform: 'scale(1.1)',
                  }}
                />
              </button>
            </>
          ) : (
            <button className="bar-button" onClick={handleDeleteNode}>
              <ClearRoundedIcon />
            </button>
          )}

          {!magicNoteInNotebook && (
            <button className="bar-button" onClick={handleDuplicate}>
              <ContentCopyRoundedIcon />
            </button>
          )}
          {!folded && !magicNoteInNotebook && (
            <>
              {/* <button className="bar-button" onClick={handleToggleLinkage}>
                    {linked ? <LinkRoundedIcon /> : <LinkOffRoundedIcon />}
                  </button> */}
              {
                <button
                  className={`bar-button${addToNoteEnabled ? '' : ' disabled'}`}
                  onClick={addToNote}
                >
                  <DriveFileRenameOutlineRoundedIcon />
                </button>
              }
            </>
          )}
        </div>
        {preventWheel && (
          <div className="bar-button bar-de-highlighted" onClick={fitMagicNode}>
            <DocumentScannerRoundedIcon />
          </div>
        )}
      </div>
    )
  }
)

/* -------------------------------------------------------------------------- */

export interface AddMagicNodeOptions {
  select: boolean
  sourceComponents: PromptSourceComponentsType
  suggestedPrompts: string[]
  fitView: FitView
  toFitView: boolean
}
export const addMagicNode = (
  addNodes: Instance.AddNodes<Node>,
  selectNodes: (nodeIds: string[]) => void,
  x: number,
  y: number,
  {
    select,
    sourceComponents,
    suggestedPrompts,
    fitView,
    toFitView,
  }: AddMagicNodeOptions
) => {
  const nodeId = getMagicNodeId()

  const newMagicNode = {
    id: nodeId,
    type: 'magic',
    data: {
      sourceComponents: sourceComponents,
      suggestedPrompts: suggestedPrompts,
      prompt: (suggestedPrompts[0] ?? 'Hi.') as string,
      rawResponse: '',
      rawLinks: [],
      rawGraphRelationships: [],
    } as MagicNodeData,
    position: {
      x,
      y,
    },
    selected: false,
    width: hardcodedNodeSize.magicWidth,
    height: hardcodedNodeSize.magicHeight,
    dragHandle: '.magic-node-draggable',
  } as Node

  addNodes(newMagicNode)

  setTimeout(() => {
    if (toFitView && fitView) fitView(viewFittingOptions)
    if (select) selectNodes([nodeId])
  }, 0)

  return {
    nodeId,
  }
}
