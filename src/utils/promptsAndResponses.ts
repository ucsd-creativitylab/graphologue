import { tagsToString } from './utils'

export const promptTerms = {
  answer: 'Answer',
  searchQueries: 'Google search queries',
  researchPapers: 'Research papers',
  itemRelationshipConnector: '-',
  itemBreaker: '+%',
}

export interface NodeLabelAndTags {
  label: string
  tags: string[]
}
export const predefinedPrompts = {
  giveNodeLabelSuggestionsFromNodes: (
    target: 'node' | 'edge',
    existingNodeLabelAndTags: NodeLabelAndTags[]
  ): string => {
    if (!existingNodeLabelAndTags.length)
      return 'List 3 random words or short phrases. Separate them with commas.'
    return `List 3 ${
      target === 'node'
        ? 'relevant words or short phrases given'
        : 'possible relationship labels (e.g., has, part of, similar, positive) for'
    }: ${existingNodeLabelAndTags
      .filter((s: NodeLabelAndTags) => s && s.label.length > 0)
      .map((s: NodeLabelAndTags) => s.label + tagsToString(s.tags))
      .join(
        ', '
      )}. Avoid responding the given words and phrases. Separate them with commas.`
  },
  /* -------------------------------------------------------------------------- */
  simpleAnswer: () =>
    ` Use simple and concise sentences. Be as detailed as possible.`,
  thisIsStatement: (statement: string) => `Statement: "${statement}".`,
  addGooglePrompts: () =>
    `\n\nAfter the statement, list 3 Google search queries for people the verify it. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.searchQueries}. For example, ${promptTerms.searchQueries}: "a", "b", "c".`,
  addScholar: () =>
    // `\n\nFinally, query Google Scholar and provide titles of peer-reviewed articles that support the response. Only provide papers that are either available in Google Scholar or Semantic Scholar. Do not include links. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.researchPapers}. For example, ${promptTerms.researchPapers}: "a", "b", "c".`,
    `\n\nFinally, list 3 keywords of relevant and supporting research articles. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.researchPapers}. For example, ${promptTerms.researchPapers}: "a", "b", "c".`,
  explainScholar: (
    response: string,
    paperTitle: string,
    paperAbstract: string
  ) =>
    `Use one or two simple and concise sentences to explain how does the paper "${paperTitle}" help understand this statement:\n\n${response}\n\nDon't repeat the title.` +
    (paperAbstract.length > 0 ? `\n\n(Paper abstract: ${paperAbstract})` : ''),
  /* -------------------------------------------------------------------------- */
  textToGraph: (response: string) => {
    const paragraphAndTask = `Paragraph: "${response}"\nTask: Construct a knowledge graph to reflect all the \
relationships by the sentences in this paragraph, such that nodes can be used for multiple relationships.`
    const format = `\nFormat: '{subject} ${promptTerms.itemRelationshipConnector} {short label indicating the relationship between subject and object} ${promptTerms.itemRelationshipConnector} {object}${promptTerms.itemBreaker}'. \
Use lowercase letters when possible. \
Your response should contain nothing but the output in the specified format.`

    return paragraphAndTask + format
  },
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
