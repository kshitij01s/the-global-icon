import { Link } from 'react-router-dom'
import { api, type SearchResults } from '../lib/api'
import { useAsync, useDebounced } from '../lib/hooks'
import { CoverImage, Portrait } from './ui'

/** Shared result renderer for the search dialog and the /search page. */
export function SearchResultsView({
  query,
  limit = 6,
  onNavigate,
  dark = true,
}: {
  query: string
  limit?: number
  onNavigate?: () => void
  dark?: boolean
}) {
  const term = useDebounced(query.trim(), 300)
  const enabled = term.length >= 2
  const { data, error, loading } = useAsync<SearchResults | null>(
    (signal) => (enabled ? api.search(term, limit, signal) : Promise.resolve(null)),
    [term, limit, enabled],
  )

  if (!enabled) {
    return <p className="py-8 text-center opacity-60">Type at least two characters to search editions, stories and leaders.</p>
  }
  if (loading && !data) return <p className="py-8 text-center opacity-60">Searching…</p>
  if (error) return <p className="py-8 text-center text-crimson-bright">{error.message}</p>
  if (!data) return null

  const total = data.magazines.length + data.articles.length + data.leaders.length
  if (total === 0) {
    return <p className="py-8 text-center opacity-60">No results for “{data.query}”. Try a different word.</p>
  }

  const heading = `eyebrow mb-3 ${dark ? '' : ''}`
  const row = `flex items-center gap-4 border-b py-3 no-underline transition-colors ${
    dark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
  }`

  return (
    <div className="space-y-8" aria-live="polite">
      {data.magazines.length > 0 && (
        <section>
          <h3 className={heading}>Editions</h3>
          {data.magazines.map((m) => (
            <Link key={m.slug} to={`/magazines/${m.slug}`} onClick={onNavigate} className={row}>
              <CoverImage src={m.coverUrl} alt="" title={m.title} className="w-10 shrink-0" />
              <span>
                <span className="display block text-xl leading-tight">{m.title}</span>
                <span className="text-sm opacity-60">{m.issueNumber ? `Issue ${m.issueNumber}` : ''}</span>
              </span>
            </Link>
          ))}
        </section>
      )}
      {data.articles.length > 0 && (
        <section>
          <h3 className={heading}>Stories</h3>
          {data.articles.map((a) => (
            <Link key={a.slug} to={`/stories/${a.slug}`} onClick={onNavigate} className={row}>
              <span>
                <span className="display block text-xl leading-tight">{a.title}</span>
                {a.excerpt && <span className="line-clamp-1 text-sm opacity-60">{a.excerpt}</span>}
              </span>
            </Link>
          ))}
        </section>
      )}
      {data.leaders.length > 0 && (
        <section>
          <h3 className={heading}>Leaders</h3>
          {data.leaders.map((l) => (
            <Link key={l.slug} to={`/leaders/${l.slug}`} onClick={onNavigate} className={row}>
              <Portrait src={l.portraitUrl} name={l.name} className="h-10 w-10 shrink-0 rounded-full" />
              <span>
                <span className="display block text-xl leading-tight">{l.name}</span>
                <span className="text-sm opacity-60">
                  {[l.designation, l.organization].filter(Boolean).join(' · ')}
                </span>
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
