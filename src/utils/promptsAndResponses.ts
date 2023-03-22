import { Prompt } from './openAI'
import { tagsToString } from './utils'

export const promptTerms = {
  answer: 'Answer',
  searchQueries: 'Google search queries',
  researchPapers: 'Research papers',
  itemRelationshipConnector: '-',
  itemBreaker: '%+%',
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

export interface NodeLabelAndTags {
  label: string
  tags: string[]
}
export const predefinedPrompts = {
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
