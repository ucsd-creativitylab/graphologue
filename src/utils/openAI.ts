// import { Configuration, OpenAIApi } from 'openai'

import { debug } from '../constants'

// const configuration = new Configuration({
//   apiKey: process.env.REACT_APP_OPENAI_API_KEY,
// })

// export const OpenAI = new OpenAIApi(configuration)

export type ModelForMagic = 'gpt-4' | 'gpt-3.5-turbo'

export interface OpenAIChatCompletionResponseStream {
  id: string
  object: string
  created: number
  model: string
  choices: {
    delta: {
      content?: string
      role?: string
    }
  }[]
  index: number
  finish_reason: string
}

export interface Prompt {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const getCompletionOptions = (
  prompts: Prompt[],
  model: ModelForMagic,
  temperature: number | undefined,
  token: number | undefined,
  stream = false
) => {
  return {
    messages: prompts,
    ////
    model: model,
    temperature: temperature,
    max_tokens: token,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: stream,
  }
}

const getRequestOptions = (options: any) => {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + String(process.env.REACT_APP_OPENAI_API_KEY),
    },
    body: JSON.stringify(options),
  }
}

export const getOpenAICompletion = async (
  prompts: Prompt[],
  model: ModelForMagic,
  temperature = 0.7,
  token = 512
) => {
  console.log(`asking ${model}`, prompts)

  const options = getCompletionOptions(prompts, model, temperature, token)
  const requestOptions = getRequestOptions(options)

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  )

  const data = await response.json()

  return data
}

export const streamOpenAICompletion = async (
  prompts: Prompt[],
  model: ModelForMagic,
  streamFunction: (data: any) => void,
  temperature = 0.7,
  token = 512
) => {
  console.log(`streaming ${model}`, prompts)

  const options = getCompletionOptions(prompts, model, temperature, token, true)
  const requestOptions = getRequestOptions(options)

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  )

  const reader = response.body?.getReader()
  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    const data = new TextDecoder('utf-8').decode(value)
    // response format
    // data: { ... }
    const dataObjects = data.split('data: ').filter(d => d.trim().length > 0)
    dataObjects.forEach(d => {
      d = d.trim()
      if (d === '[DONE]') return

      const dataObject = JSON.parse(d) as OpenAIChatCompletionResponseStream
      if (dataObject.choices.length > 0 && dataObject.choices[0].delta.content)
        streamFunction(dataObject)
    })
  }

  return
}

/* -------------------------------------------------------------------------- */

export const parseOpenAIResponseToObjects = async (
  prompts: Prompt[],
  model: ModelForMagic
) => {
  console.log(`parsing ${model}`, prompts)

  const options = getCompletionOptions(prompts, model, 0.7, 512, false)
  const requestOptions = getRequestOptions(options)

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  )

  const data = await response.json()

  return data
}

/* -------------------------------------------------------------------------- */

export const getTextFromModelResponse = (response: any) => {
  return response.choices[0].message.content
}

export const getTextFromStreamResponse = (
  response: OpenAIChatCompletionResponseStream
) => {
  return response.choices[0].delta.content
}

export const quickPickModel = (): ModelForMagic => {
  return !debug ? 'gpt-4' : 'gpt-3.5-turbo'
}
