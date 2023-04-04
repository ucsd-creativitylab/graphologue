const flowTransitionTimer: {
  current: NodeJS.Timeout | null
} = {
  current: null,
}

export const makeFlowTransition = () => {
  const flowCanvases = document.querySelectorAll(
    '.react-flow-wrapper'
  ) as NodeListOf<HTMLDivElement>
  flowCanvases.forEach(canvas => {
    canvas.classList.add('changing-flow')
  })

  if (flowTransitionTimer.current) clearTimeout(flowTransitionTimer.current)

  flowTransitionTimer.current = setTimeout(() => {
    flowCanvases.forEach(canvas => {
      canvas.classList.remove('changing-flow')
    })
  }, 700)
}
