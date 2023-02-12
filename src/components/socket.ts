export const socketPath = `ws://graphologue.herokuapp.com/`

// export const webSocketServer = new WebSocket(socketPath)

export interface WebSocketMessageType {
  message: string
  id: string
}

export interface EntityType {
  length: number
  offset: number
  type: string
  value: string
}

export interface WebSocketResponseType {
  entities: {
    [key in
      | 'misc'
      | 'noun'
      | 'number'
      | 'proper_noun'
      | 'symbol'
      | 'verb']: EntityType[]
  }
  id: string
}

// webSocketServer.onopen = () => {
//   console.log('[connected to graphologue heroku server]')
// }
