import { useEffect, useState, type DependencyList } from 'react'
import { ApiError } from './api'

export interface Async<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

/** Fetch on mount / when deps change, with abort + stale protection. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: DependencyList): Async<T> {
  const [state, setState] = useState<Async<T>>({ data: null, error: null, loading: true })

  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ data: s.data, error: null, loading: true }))
    fn(ctrl.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError') return
        setState({
          data: null,
          error: err instanceof ApiError ? err : new ApiError(0, (err as Error).message),
          loading: false,
        })
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title
      ? `${title} — THE GLOBAL ICON`
      : 'THE GLOBAL ICON — Stories That Shape Tomorrow.'
  }, [title])
}
