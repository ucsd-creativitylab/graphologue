import { MouseEvent, useCallback } from 'react'
import { PuffLoader } from 'react-spinners'

// import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'

import { magicNodeVerifyPaperCountDefault } from '../constants'

export interface SemanticScholarAuthor {
  authorId: string
  name: string
}

interface SemanticScholarPaper {
  paperId: string
  title: string
  authors: SemanticScholarAuthor[]
  abstract: string | null
  year: number
  venue: string | null
  url: string
}

export interface SemanticScholarPaperEntity extends SemanticScholarPaper {
  keyword: string
  explanation?: string
}

export interface SemanticScholarResponse {
  total: number
  data: SemanticScholarPaper[]
  offset: 0
  next: 1
}

export interface SemanticScholarResponseError {
  error: string
}

/* -------------------------------------------------------------------------- */

export interface ScholarProps {
  papers: SemanticScholarPaperEntity[]
  removePaper: (paperId: string) => void
  inNotebook: boolean
}

export const Scholar = ({ papers, removePaper, inNotebook }: ScholarProps) => {
  const handleRemovePaper = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const paperId = target.dataset.id

      if (!paperId) return
      removePaper(paperId)
    },
    [removePaper]
  )

  const anyDisplayedPaperStillWaitingForExplanation = papers
    .slice(0, magicNodeVerifyPaperCountDefault)
    .some(paper => !paper.explanation)

  return (
    <div className="verify-section">
      <p className="section-title">read relevant papers</p>
      <div className="verify-options">
        {papers.slice(0, magicNodeVerifyPaperCountDefault).map((query, i) => (
          <div key={i} className="verify-option verify-scholar">
            <div className="scholar-option-info">
              <div className="scholar-option-info-set">
                {/* <BookmarkBorderRoundedIcon /> */}
                <span>
                  {query.year}
                  {query.venue ? (
                    <>&nbsp;&nbsp;&nbsp;&nbsp;{query.venue}</>
                  ) : null}
                </span>
              </div>
              <div className="option-operations">
                {!inNotebook && (
                  <span
                    className={`option-operation option-replace${
                      anyDisplayedPaperStillWaitingForExplanation
                        ? ' disabled'
                        : ''
                    }`}
                    data-id={query.paperId}
                    onClick={handleRemovePaper}
                  >
                    remove
                  </span>
                )}

                <a
                  className="option-operation option-details"
                  href={query.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  details <ArrowOutwardRoundedIcon />
                </a>
              </div>
            </div>
            <div className="scholar-option-title">{query.title}</div>
            <div className="scholar-option-authors">
              {query.authors
                .map((author, i) => author.name)
                .join(', ')
                .trim()}
            </div>
            {/* <div className="scholar-option-abstract">{query.abstract}</div> */}
            <div className="scholar-option-keyword">{`keyword [ ${query.keyword} ]`}</div>
            {query.explanation ? (
              <div className="scholar-option-explanation">
                {query.explanation}
              </div>
            ) : (
              <div className="waiting-for-model-placeholder">
                <PuffLoader size={24} color="#ffaa00" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export const searchSemanticScholarWithKeywords = async (
  keywords: string
): Promise<SemanticScholarResponse | SemanticScholarResponseError> => {
  // use Semantic Scholar API to search for papers with the given title

  // create header
  const headers = new Headers()
  headers.append('Accept', 'application/json')
  headers.append('Content-Type', 'application/json')
  headers.append(
    'x-api-key',
    String(process.env.REACT_APP_SEMANTIC_SCHOLAR_API_KEY)
  )

  const url = `/.netlify/functions/semantic-scholar/paper/${keywords}`
  const res = await fetch(url, {
    method: 'GET',
    headers,
  })
  const data = await res.json()

  return data as SemanticScholarResponse | SemanticScholarResponseError
}

export const getScholarPapersFromKeywords = async (
  keywords: string[]
): Promise<SemanticScholarPaperEntity[]> => {
  if (keywords.length === 0) return []

  const papers: SemanticScholarPaperEntity[] = []
  const allPapers: SemanticScholarPaperEntity[] = []

  for (const keyword of keywords) {
    if (keyword === '') continue

    const data = await searchSemanticScholarWithKeywords(keyword)
    if ('error' in data || !('data' in data)) {
      console.error(data.error)
      continue
    }

    if (data.data.length === 0) continue

    // add paper to papers
    let paperAdded = false
    for (const paper of data.data) {
      if (!paperAdded && !paperAlreadyExists(papers, paper)) {
        paperAdded = true
        papers.push({
          ...paper,
          keyword: keyword,
        })
      }

      allPapers.push({
        ...paper,
        keyword: keyword,
      })
    }
  }

  for (const paper of allPapers) {
    if (!paperAlreadyExists(papers, paper)) {
      papers.push(paper)
    }
  }

  return papers
}

/* -------------------------------------------------------------------------- */
// utils

export const paperAlreadyExists = (
  papers: SemanticScholarPaper[],
  paper: SemanticScholarPaper
) => {
  for (const p of papers) {
    if (p.paperId === paper.paperId) return true
  }
  return false
}
