import { tagsToString } from './utils'

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
  addScholar: () =>
    ' After the response, add a new section starting with <scholar>, and query Google Scholar and provide titles of peer-reviewed articles that support it. Only provide papers that are either available in Google Scholar or Semantic Scholar. Do not include links.',
}

export const predefinedResponses = {
  modelDown: () =>
    'The model is down. Again, the model is D-O-W-N. Please try again later.',
  noValidTags: () => 'no available tags',
  noValidResponse: () => 'response unavailable',
}
