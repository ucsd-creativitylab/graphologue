import { FitViewOptions } from 'reactflow'

import { getGraphBounds } from '../utils/utils'
import { NodeSnippet } from './Node'
import { viewFittingOptions } from '../constants'

export interface ViewFittingJob {
  nodes: NodeSnippet[]
  changedNodes: NodeSnippet[]
}

const maxFutureJobs = 3

export class ViewFitter {
  jobs: ViewFittingJob[]
  fitView: (options: FitViewOptions) => void

  private running = false

  constructor(fitView: (options: FitViewOptions) => void) {
    this.jobs = []
    this.fitView = fitView
  }

  addJob(job: ViewFittingJob) {
    this.jobs.push(job)

    if (this.jobs.length > maxFutureJobs) {
      this.jobs.shift()
    }

    this.run()
  }

  run() {
    if (this.running || this.jobs.length === 0) {
      return
    }

    const job = this.jobs.shift()

    if (!job) return

    this.running = true

    const nodesBounding = getGraphBounds(job.nodes)

    const reactFlowWrapperElement = document.querySelector(
      '.react-flow-wrapper',
    ) as HTMLElement // they are all the same size
    const viewBounding = reactFlowWrapperElement.getBoundingClientRect()

    if (
      nodesBounding.width < viewBounding.width &&
      nodesBounding.height < viewBounding.height
    ) {
      this.fitView(viewFittingOptions)
    } else {
      // find changed nodes and edges

      // get bounding of changed nodes
      if (job.changedNodes.length === 0) return

      this.fitView({
        ...viewFittingOptions,
        duration: viewFittingOptions.duration, // TODO best?
        minZoom: 1,
        maxZoom: 1,
        nodes: job.changedNodes.map(n => ({ id: n.id })),
      })

      // setViewport(
      //   { x, y, zoom: 1 },
      //   {
      //     duration: viewFittingOptions.duration,
      //   }
      // )
    }

    setTimeout(() => {
      this.running = false
      this.run()
    }, viewFittingOptions.duration)
  }
}
