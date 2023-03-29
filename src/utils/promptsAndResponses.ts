import { FinishedAnswerObjectParsingTypes } from '../components/Question'
import { Prompt } from './openAI'
import { tagsToString } from './utils'

export const promptTerms = {
  answer: 'Answer',
  searchQueries: 'Google search queries',
  researchPapers: 'Research papers',
  itemRelationshipConnector: '-',
  itemOriginalTextConnector: '=',
  itemBreaker: '%+%',
  _chat_responseEnd: '%%%',
}

export const getSystemPrompt = (
  assistantStyle: 'knowledgeable' | 'helpful',
  cleanAnswer: boolean,
  specificInstructions?: string
) => {
  return (
    `You are a ${assistantStyle} assistant.` +
    (cleanAnswer
      ? ' Do not include anything else in the response other than the answer.'
      : '') +
    (specificInstructions ? ` ${specificInstructions}` : '')
  )
}

export const systemBuildJSON = `For the following tasks, do not include anything else in your response \
other than the array or object that can be directly parsed using JSON.parse() in JavaScript.`

export const userResponseBreaking = `Break your response into smaller chunks of information for better digestibility. \
Organize the chunks as an array of JSON objects, where each object has the following fields:
  - "origin" (array of strings): An array of the original sentences that the chunk of information is from. Make sure they are exactly the same as the original sentences.
  - "summary" (string): A short, one-line summary of the chunk of the information`
//  - "origin" (array of two numbers): An array of the start and end character indices of the corresponding sentence(s) in the original response. The original content should be complete sentence(s).

export const systemResponseParsing = `For the following part picked by the user, parse the information into a JSON object with the following fields:
  - "slide" (object of two fields): Structure the content so that it can be made into a slide in a presentation, with the following fields:
    * "title" (string): The title of the slide 
    * "content" (string): The content of the slide, in markdown style if necessary
  - "relationships" (array of objects): Construct a knowledge graph to reflect all the relationships in the sentences in the paragraph from the user. \
Use singular nouns and lowercase letters for node labels when possible and correct (e.g., the meaning of the label doesn't change). \
Each node can be used in multiple relationships. There should be one connected graph in total. \
Each relationship should be an object with the following fields:
    * "source" (string): Label of the source node
    * "target" (string): Label of the target node
    * "edge" (string): Short label indicating the relationship between source and target (e.g., has, part of, similar, positive)
    * "origin" (array of strings): The phrases or sentences in the original response that the relationship is summarized from. Make sure they are exactly the same as the text in the original response`

export interface NodeLabelAndTags {
  label: string
  tags: string[]
}
export const predefinedPrompts = {
  _chat_initialAsk: (question: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a helpful, knowledgeable, and clever assistant. \
Please provide a well-structured response to the user's question in multiple paragraphs. \
Each paragraph should discuss a different aspect or topic of the answer. \
Try to cover the most important aspects of the answer with concise sentences. \
Your response should be at most around 200 characters long.`,
      },
      {
        role: 'user',
        content: question,
      },
    ]
  },
  _chat_breakResponse: (
    initialAskPrompts: Prompt[],
    response: string
  ): Prompt[] => {
    return [
      ...initialAskPrompts,
      {
        role: 'assistant',
        content: response,
      },
      {
        role: 'system',
        content: `Break the above text into smaller chunks of information for better digestibility. \
Make sure that each chunk of text are exactly the same as the text in the original response. Divide the chunks by line breaks. \
Do not include anything else in the response other than the chunks.`,
      },
    ]
  },
  _chat_summarizeParagraph: (paragraph: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a helpful assistant. Make a short, one-line summary of the chunk of the text provided by the user. \
Do not include anything else in the response other than the summarized text.`,
      },
      {
        role: 'user',
        content: paragraph,
      },
    ]
  },
  _chat_parseSlide: (
    // initialAskPrompts: Prompt[]
    // response: string,
    partResponse: string
  ): Prompt[] => {
    return [
      // ...initialAskPrompts,
      // {
      //   role: 'assistant',
      //   content: response,
      // },
      {
        role: 'system',
        content: `You are a helpful, creative, and clever assistant. Structure the following text provided by the user into a presentation slide, in markdown format. \
Do not include anything else in the response other than the markdown text.`,
      },
      {
        role: 'user',
        content: partResponse,
      },
    ]
  },
  _chat_parseRelationships: (
    partResponse: string,
    target: 'text' | 'sentence' = 'text'
  ): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a helpful, creative, and clever assistant. \
Break down the following ${target} into a knowledge graph. \
Each node can be used in multiple relationships. There should be one connected graph in total.

Response format: {subject} ${promptTerms.itemRelationshipConnector} \
{short label indicating the relationship between subject and object} \
${promptTerms.itemRelationshipConnector} {object} \
${promptTerms.itemOriginalTextConnector} {exact quote as a substring of the original ${target} that the relationship is derived from, can either be a sentence or phrase}.

Divide the relationships by line breaks.`,
        /**
         * we tried
         * - exact quote as a substring
         * - exact quote copied
         *
         * others:
         * Use singular nouns and lowercase letters for node labels when possible and correct (e.g., the meaning of the label doesn't change). \
         */
      },
      {
        role: 'user',
        content: partResponse,
      },
    ]
  },
  _chat_correctGrammar: (text: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: `You are a knowledgeable and helpful assistant. Correct the grammar and typos of the following text.`,
      },
      {
        role: 'user',
        content: text,
      },
    ]
  },
  /* -------------------------------------------------------------------------- */
  giveNodeLabelSuggestionsFromNodes: (
    target: 'node' | 'edge',
    existingNodeLabelAndTags: NodeLabelAndTags[]
  ): Prompt[] => {
    if (!existingNodeLabelAndTags.length)
      return [
        {
          role: 'system',
          content: getSystemPrompt(
            'knowledgeable',
            true,
            'Separate the answers with commas.'
          ),
        },
        {
          role: 'user',
          content: 'List 3 random common words or short phrases.',
        },
      ]

    return [
      {
        role: 'system',
        content: getSystemPrompt(
          'knowledgeable',
          true,
          `Separate the answers with commas. Do not respond the given words and phrases.`
        ),
      },
      {
        role: 'user',
        content: `List 3 ${
          target === 'node'
            ? 'relevant words or short phrases given'
            : 'possible relationship labels (e.g., has, part of, similar, positive) for'
        }: ${existingNodeLabelAndTags
          .filter((s: NodeLabelAndTags) => s && s.label.length > 0)
          .map((s: NodeLabelAndTags) => s.label + tagsToString(s.tags))
          .join(', ')}.`,
      },
    ]
  },
  /* -------------------------------------------------------------------------- */
  getModelRawResponse: (userPrompt: string): Prompt[] => {
    return [
      {
        role: 'system',
        content: getSystemPrompt(
          'knowledgeable',
          true,
          `Use simple and concise sentences. Be as detailed as possible.`
        ),
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]
  },
  /* -------------------------------------------------------------------------- */
  textToGraph: (userParagraph: string, userEntities: string[]): Prompt[] => {
    return [
      {
        role: 'system',
        content: getSystemPrompt(
          'helpful',
          true,
          `Construct a knowledge graph to reflect all the relationships in the sentences in the paragraph from the user.
Use user-provided entities (including the letter case) when possible. Each entity (i.e. node) can be used in multiple relationships. There should be one connected graph in total. \
Response format: {subject} ${promptTerms.itemRelationshipConnector} {short label indicating the relationship between subject and object} ${promptTerms.itemRelationshipConnector} {object}${promptTerms.itemBreaker}`
        ),
      },
      {
        role: 'user',
        content: `Paragraph: ${userParagraph}\n\nEntities: ${userEntities.join(
          ', '
        )}`,
      },
    ]
  },
  /* -------------------------------------------------------------------------- */
  _old_thisIsStatement: (statement: string) => `Statement: "${statement}".`,
  _old_addGooglePrompts: () =>
    `\n\nAfter the statement, list 3 Google search queries for people the verify it. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.searchQueries}. For example, ${promptTerms.searchQueries}: "a", "b", "c".`,
  _old_addScholar: () =>
    // `\n\nFinally, query Google Scholar and provide titles of peer-reviewed articles that support the response. Only provide papers that are either available in Google Scholar or Semantic Scholar. Do not include links. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.researchPapers}. For example, ${promptTerms.researchPapers}: "a", "b", "c".`,
    `\n\nFinally, list 3 keywords of relevant and supporting research articles. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.researchPapers}. For example, ${promptTerms.researchPapers}: "a", "b", "c".`,
  _old_explainScholar: (
    response: string,
    paperTitle: string,
    paperAbstract: string
  ) =>
    `Use one or two simple and concise sentences to explain how does the paper "${paperTitle}" help understand this statement:\n\n${response}\n\nDon't repeat the title.` +
    (paperAbstract.length > 0 ? `\n\n(Paper abstract: ${paperAbstract})` : ''),
}

export const predefinedPromptsForParsing: {
  [key in FinishedAnswerObjectParsingTypes]: (text: string) => Prompt[]
} = {
  summary: predefinedPrompts._chat_summarizeParagraph,
  slide: predefinedPrompts._chat_parseSlide,
  relationships: predefinedPrompts._chat_parseRelationships,
}

export const predefinedResponses = {
  modelDown: () =>
    'The model is down. Again, the model is D-O-W-N. Please try again later.',
  noValidModelText: () => 'We cannot find an answer. Please try again.',
  noValidResponse: () => 'response unavailable',
  noValidTags: () => 'no available tags',
  waitingPlaceholder: () => '[ loading... ]',
}

export const isValidResponse = (response: string) => {
  return (
    response !== predefinedResponses.modelDown() &&
    response !== predefinedResponses.noValidModelText() &&
    response !== predefinedResponses.noValidResponse() &&
    response !== predefinedResponses.noValidTags() &&
    response !== predefinedResponses.waitingPlaceholder()
  )
}
