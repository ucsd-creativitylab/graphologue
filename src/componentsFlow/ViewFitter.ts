export interface ViewFittingJob {}

const maxFutureJobs = 3

export class ViewFitter {
  jobs: ViewFittingJob[]

  constructor() {
    this.jobs = []
  }

  addJob(job: ViewFittingJob) {
    this.jobs.push(job)

    if (this.jobs.length > maxFutureJobs) {
      this.jobs.shift()
    }
  }
}
