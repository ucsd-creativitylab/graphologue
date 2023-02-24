import { tagsToString } from './utils'

export const promptTerms = {
  answer: 'Answer',
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
    ` Use simple sentences. Answer concisely and for no more than 100 words. Start with ${promptTerms.answer} and put the answer in quotation marks. For example, ${promptTerms.answer}: "The answer is 42."`,
  addGooglePrompts: () =>
    `\n\nAfter the answer, list 3 Google search queries for people the verify the response. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.searchQueries}. For example, ${promptTerms.searchQueries}: "a", "b", "c".`,
  addScholar: () =>
    `\n\nFinally, query Google Scholar and provide titles of peer-reviewed articles that support the response. Only provide papers that are either available in Google Scholar or Semantic Scholar. Do not include links. Separate them with commas, use quotation marks for every item. Start with ${promptTerms.researchPapers}. For example, ${promptTerms.researchPapers}: "a", "b", "c".`,
}

export const predefinedResponses = {
  modelDown: () =>
    'The model is down. Again, the model is D-O-W-N. Please try again later.',
  noValidModelText: () => 'We cannot find an answer. Please try again.',
  noValidTags: () => 'no available tags',
  noValidResponse: () => 'response unavailable',
}
