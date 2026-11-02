import { Search as SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchResultsView } from '../components/SearchPanel'
import { PageHero } from '../components/ui'
import { useDocumentTitle } from '../lib/hooks'

export default function SearchPage() {
  useDocumentTitle('Search')
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  useEffect(() => {
    const next = q.trim()
    const t = setTimeout(() => setParams(next ? { q: next } : {}, { replace: true }), 400)
    return () => clearTimeout(t)
  }, [q, setParams])

  return (
    <div className="mood-charcoal min-h-[80vh]">
      <PageHero eyebrow="Search" title="Find an edition, a story, a leader." />
      <div className="container-x max-w-3xl pb-24">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 opacity-50" size={20} aria-hidden />
          <label htmlFor="search-q" className="sr-only">
            Search
          </label>
          <input
            id="search-q"
            autoFocus
            className="field field-dark display !pl-12 text-2xl"
            placeholder="Start typing…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="mt-10">
          <SearchResultsView query={q} limit={10} />
        </div>
      </div>
    </div>
  )
}
