export const socketPath = `wss://graphologue.herokuapp.com/`

// export const webSocketServer = new WebSocket(socketPath)

export interface WebSocketMessageType {
  message: string
  id: string
}

export interface EntityType {
  length: number
  offset: number
  type: 'NOUN' | 'VERB' | 'PROPN' | 'NUM' | 'SYM' | 'MISC'
  value: string
}

export type EntityKeys =
  | 'misc'
  | 'noun'
  | 'number'
  | 'proper_noun'
  | 'symbol'
  | 'verb'

export type Tokenization = {
  [key in EntityKeys as string]: EntityType[]
}

export const emptyTokenization: Tokenization = {
  misc: [],
  noun: [],
  number: [],
  proper_noun: [],
  symbol: [],
  verb: [],
}

export interface WebSocketResponseType {
  entities: Tokenization
  id: string
}

// webSocketServer.onopen = () => {
//   console.log('[connected to graphologue heroku server]')
// }
