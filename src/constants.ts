export const debug = process.env.NODE_ENV === 'development'
export const useMagic = true // enable OpenAI? // TODO
export const useSessionStorage = true // TODO ?

export const useSessionStorageHandle = '__reactFlowGraphologue__'
export const useTokenDataTransferHandle = '__reactFlowGraphologueToken__'
export const useSessionStorageNotesHandle = '__reactFlowGraphologueNotes__'

export const viewFittingPadding = 0.1
export const transitionDuration = 600
export const viewFittingOptions = {
  padding: viewFittingPadding,
  duration: transitionDuration,
}
export const hideEdgeTextZoomLevel = 0.6

export const timeMachineMaxSize = 50
export const contentEditingTimeout = 500
// export const wikiRequestTimeout = 2000
export const slowInteractionWaitTimeout = 100

export const hardcodedNodeSize = {
  width: 160,
  height: 43,
  magicWidth: 320,
  magicHeight: 160,
}
export const nodeGap = 30 // ?
export const nodePosAdjustStep = 50

export const styles = {
  edgeColorStrokeDefault: '#aaaaaa',
  edgeColorStrokeSelected: '#ff4d00',
  edgeColorStrokeExplained: '#57068c',
  edgeColorLabelDefault: '#666666',
  edgeWidth: 2,
  edgeMarkerSize: 12,
  edgeDashLineArray: '5, 7',
  nodeColorDefaultWhite: '#ffffff',
  nodeColorDefaultGrey: '#777777',
}

export const terms = {
  gpt: 'ChatGPT',
  wiki: 'Wikidata',
}

export const magicNodeVerifyPaperCountDefault = 3
