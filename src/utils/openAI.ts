// import { Configuration, OpenAIApi } from 'openai'

// const configuration = new Configuration({
//   apiKey: process.env.REACT_APP_OPENAI_API_KEY,
// })

// export const OpenAI = new OpenAIApi(configuration)

export type ModelForMagic = 'gpt-4' | 'gpt-3.5-turbo'

export interface Prompt {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const getCompletionOptions = (
  prompts: Prompt[],
  model: ModelForMagic,
  temperature: number,
  token: number
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

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + String(process.env.REACT_APP_OPENAI_API_KEY),
    },
    body: JSON.stringify(options),
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    requestOptions
  )
  const data = await response.json()

  return data
}

export const getTextFromModelResponse = (response: any) => {
  return response.choices[0].message.content
}
