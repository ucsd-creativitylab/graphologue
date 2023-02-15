export const predefinedPrompts = {
  giveNodeLabelSuggestionsFromNodes: (existingNodeLabels: string[]): string => {
    if (!existingNodeLabels.length)
      return 'List 3 random words or short phrases. Separate them with commas.'
    return `List 3 relevant words or short phrases given: ${existingNodeLabels
      .filter((s: string) => s && s.length > 0)
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
  noValidResponse: () => 'n/a',
}
