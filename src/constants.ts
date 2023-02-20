export const useMagic = true // enable OpenAI?
export const useSessionStorage = true

export const useSessionStorageHandle = '__reactFlowGraphologue__'
export const useTokenDataTransferHandle = '__reactFlowGraphologueToken__'

export const viewFittingPadding = 0.1
export const transitionDuration = 500
export const hideEdgeTextZoomLevel = 0.6

export const timeMachineMaxSize = 50
export const contentEditingTimeout = 500
export const wikiRequestTimeout = 2000

export const hardcodedNodeSize = {
  width: 160,
  height: 43,
  magicWidth: 320,
  magicHeight: 160,
}
export const nodeGap = 30 // ?

export const styles = {
  edgeColorStrokeDefault: '#aaaaaa',
  edgeColorStrokeSelected: '#ff4d00',
  edgeColorStrokeExplained: '#57068c',
  edgeColorLabelDefault: '#666666',
  edgeWidth: 2,
  edgeMarkerSize: 12,
  edgeDashLineArray: '5, 7',
}

export const terms = {
  gpt: 'GPT-3',
  wiki: 'Wikidata',
}
