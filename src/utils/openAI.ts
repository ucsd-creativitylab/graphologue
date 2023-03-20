// import { Configuration, OpenAIApi } from 'openai'

// const configuration = new Configuration({
//   apiKey: process.env.REACT_APP_OPENAI_API_KEY,
// })

// export const OpenAI = new OpenAIApi(configuration)

export interface Prompt {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const getCompletionOptions = (
  prompts: Prompt[],
  temperature: number,
  token: number
) => {
  return {
    messages: prompts,
    ////
    model: 'gpt-4',
    temperature: temperature,
    max_tokens: token,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  }
}

export const getOpenAICompletion = async (
  prompts: Prompt[],
  temperature = 0.7,
  token = 512
) => {
  const options = getCompletionOptions(prompts, temperature, token)

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
