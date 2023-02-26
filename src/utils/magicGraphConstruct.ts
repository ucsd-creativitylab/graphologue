import { getOpenAICompletion } from './openAI'
import {
  predefinedPrompts,
  predefinedResponses,
  promptTerms,
} from './promptsAndResponses'

export const constructGraphRelationsFromResponse = async (
  response: string
): Promise<string[][]> => {
  if (
    response.length === 0 ||
    response === predefinedResponses.modelDown() ||
    response === predefinedResponses.noValidModelText() ||
    response === predefinedResponses.noValidResponse()
  )
    return []

  const textRelationships = await getOpenAICompletion(
    predefinedPrompts.textToGraph(response)
  )

  if (textRelationships.error) {
    console.error(textRelationships.error)
    return []
  }

  const textRelationshipsText = textRelationships.choices[0].text
  if (textRelationshipsText.length === 0) return []

  // preprocess the response
  const textRelationshipsArray: string[][] = textRelationshipsText
    .split(promptTerms.itemBreaker)
    .map((item: string) => {
      item = item.trim()

      const triplet: string[] = item
        .split(promptTerms.itemRelationshipConnector)
        .map(i => i.trim())

      if (triplet.length !== 3) return []

      // ! process the edge label
      // make the edge the lower case
      // triplet[1] = triplet[1].toLowerCase()
      triplet[1] = triplet[1].replace(/_/g, ' ') // avoid underscore
      // ? [experimental] remove is, was, are, were, etc.
      // TODO optimize?
      triplet[1] = triplet[1].replace(
        /(?:^|\s)(is|was|are|were|has|have|had|does|do|did|a|an|the)(?=\s|$)/g,
        ''
      )

      // ! process everything
      // trim
      triplet.forEach((t, ind) => (triplet[ind] = t.trim()))
      // remove line breaks, and other special characters, like semi-colon
      triplet.forEach(
        (t, ind) => (triplet[ind] = t.replace(/[^a-zA-Z0-9 ,.!?&()]+/g, ''))
      )

      return triplet
    })
    .filter((item: string[]) => item.length === 3)

  const finalRelationshipsArray: string[][] = []

  textRelationshipsArray.forEach(item => {
    if (item[2].includes(','))
      item[2].split(',').forEach(i => {
        finalRelationshipsArray.push([item[0], item[1], i.trim()])
      })
    else finalRelationshipsArray.push(item)
  })

  return finalRelationshipsArray
}
