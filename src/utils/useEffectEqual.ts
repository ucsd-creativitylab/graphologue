import { useEffect, useRef } from 'react'
import isEqual from 'react-fast-compare'

export const useEffectEqual = (effect: Function, deps: any[]) => {
  const prevDepsRef = useRef(deps)

  useEffect(() => {
    if (isEqual(prevDepsRef.current, deps)) {
      return
    }

    effect()
    prevDepsRef.current = deps
  }, [deps, effect])
}
