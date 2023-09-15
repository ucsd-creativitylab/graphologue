// import { AnswerRelationshipObject } from '../App'
// import { rawRelationsToGraphRelationsChat } from './graphToFlowObject'
import {
  // getTextFromModelResponse,
  models,
  parseOpenAIResponseToObjects,
} from './openAI'
import { predefinedPrompts } from './prompts'

export interface SentenceParsingJob {
  sourceAnswerObjectId: string
  relationships: any[] // * the whole SentenceParser thing is to be removed
  started: boolean
  finished: boolean
}

export class SentenceParser {
  response: string = ''
  sentences: {
    [key: string]: SentenceParsingJob
  } = {}
  errorHandler: (errorResult: any) => void
  resultHandler: (result: SentenceParsingJob) => void

  private hasError: boolean = false

  constructor(
    resultHandler: (result: SentenceParsingJob) => void,
    errorHandler: (errorResult: any) => void,
  ) {
    this.resultHandler = resultHandler
    this.errorHandler = errorHandler
  }

  updateResponse(newResponse: string) {
    this.response = newResponse
  }

  addJob(sentence: string, answerObjectId: string) {
    if (this.sentences[sentence]) return

    this.sentences[sentence] = {
      sourceAnswerObjectId: answerObjectId,
      relationships: [],
      started: false,
      finished: false,
    }

    this.processJobs()
  }

  private async processJobs() {
    await Promise.all(
      Object.keys(this.sentences).map(async sentence => {
        const job = this.sentences[sentence]
        if (job.started || this.hasError) return false

        job.started = true

        const parsingResult = await parseOpenAIResponseToObjects(
          predefinedPrompts._chat_parseRelationships(sentence, 'sentence'),
          models.faster,
        )

        if (parsingResult.error) {
          this.errorHandler(parsingResult)
          this.hasError = true
          return false
        } else {
          // job.relationships = rawRelationsToGraphRelationsChat(
          //   this.response,
          //   getTextFromModelResponse(parsingResult)
          // )
          job.finished = true

          this.resultHandler(job)
        }
      }),
    )
  }

  reset() {
    this.response = ''
    this.sentences = {}
    this.hasError = false
  }
}
