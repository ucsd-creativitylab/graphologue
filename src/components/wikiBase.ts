import { WBK } from 'wikibase-sdk'

const wbk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})

export const getWikiData = async (title: string) => {
  // ! raw search from string title
  const url = wbk.searchEntities({
    search: title,
    language: 'en',
    limit: 5, // default - 20
    continue: 0, // default - 0
    format: 'json', // or xml
  })

  const results = await fetch(url).then(res => res.json())
  const search = results.search

  // ! get base entity ids
  const ids = search.map((item: any) => item.id)

  // const entityUrl = wbk.getEntities({
  //   ids: ids,
  //   languages: 'en',
  //   // props: ['labels', 'descriptions', 'claims'],
  //   format: 'json',
  // })
  // const entities = await fetch(entityUrl)
  //   .then(res => res.json())
  //   .then(res => res.entities)

  // ! get parent ids of each entity
  const parentIdsUrl = wbk.sparqlQuery(`
    SELECT ?item ?itemLabel ?parent ?parentLabel
    WHERE
    {
      VALUES ?item { ${ids.map((id: string) => `wd:${id}`).join(' ')} }
      ?item wdt:P279 ?parent.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `)
  const parentIds = await fetch(parentIdsUrl)
    .then(res => res.json())
    .then(res => res.results.bindings)
    .then(res =>
      // res.map((item: any) => ({
      //   id: item.item.value.split('/').pop(),
      //   parent: item.parent.value.split('/').pop(),
      // }))
      res.map((item: any) => item.parent.value.split('/').pop())
    )

  const resultsFromSearch = search
    .map((item: any) => item.description || item.label || '')
    .filter((item: string) => item.length > 0)
    .slice(0, 5)

  // ! find final results
  if (parentIds.length > 0) {
    const parentUrl = wbk.getEntities({
      ids: parentIds,
      languages: 'en',
      format: 'json',
    })
    const parents: {
      [key: string]: any
    } = await fetch(parentUrl)
      .then(res => res.json())
      .then(res => res.entities)

    const resultsFromParents = Object.keys(parents)
      .map((parentId: string) => parents[parentId].labels?.en?.value || '')
      .filter((item: string) => item.length > 0)
      .slice(0, 5)

    if (resultsFromParents.length > 1) return resultsFromParents
    else return resultsFromSearch
  } else {
    return resultsFromSearch
  }
}
