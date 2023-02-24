import { tagsToString } from './utils'

export const promptTerms = {
  searchQueries: 'Google search queries',
  researchPapers: 'Research papers',
}

export interface NodeLabelAndTags {
  label: string
  tags: string[]
}
export const predefinedPrompts = {
  giveNodeLabelSuggestionsFromNodes: (
    existingNodeLabelAndTags: NodeLabelAndTags[]
  ): string => {
    if (!existingNodeLabelAndTags.length)
      return 'List 3 random words or short phrases. Separate them with commas.'
    return `List 3 relevant words or short phrases given: ${existingNodeLabelAndTags
      .filter((s: NodeLabelAndTags) => s && s.label.length > 0)
      .map((s: NodeLabelAndTags) => s.label + tagsToString(s.tags))
      .join(
        ', '
      )}. Avoid responding the given words and phrases. Separate them with commas.`
  },
  simpleAnswer: () =>
    ` Use simple sentences. Limit the answer to 100 words max.`,
  addGooglePrompts: () =>
    `\n\nAfter the response, list 3 Google search queries for people the verify the response. Separate them with commas. Start with "${promptTerms.searchQueries}".`,
  addScholar: () =>
    `\n\nFinally, query Google Scholar and provide titles of peer-reviewed articles that support the response. Only provide papers that are either available in Google Scholar or Semantic Scholar. Do not include links. Separate them with commas. Start with "${promptTerms.researchPapers}".`,
}

export const predefinedResponses = {
  modelDown: () =>
    'The model is down. Again, the model is D-O-W-N. Please try again later.',
  noValidTags: () => 'no available tags',
  noValidResponse: () => 'response unavailable',
}
