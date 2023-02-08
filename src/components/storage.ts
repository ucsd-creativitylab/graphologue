import {
  useSessionStorage,
  useSessionStorageEdgesHandle,
  useSessionStorageNodesHandle,
} from '../constants'

export const storeItem = (target: 'node' | 'edge', value: string) => {
  if (useSessionStorage)
    sessionStorage.setItem(
      target === 'node'
        ? useSessionStorageNodesHandle
        : useSessionStorageEdgesHandle,
      value
    )
}

export const getItem = (target: 'node' | 'edge'): Array<unknown> => {
  if (useSessionStorage)
    return JSON.parse(
      sessionStorage.getItem(
        target === 'node'
          ? useSessionStorageNodesHandle
          : useSessionStorageEdgesHandle
      ) || '[]'
    )
  return []
}
