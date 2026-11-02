import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Empty, ErrorState, Loading, PageHero, Portrait, Reveal } from '../components/ui'
import { api, type Leader } from '../lib/api'
import { formatMonthYear } from '../lib/format'
import { useAsync, useDebounced, useDocumentTitle } from '../lib/hooks'

export function LeadersList() {
  useDocumentTitle('Leaders')
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Leader[]>([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [cats, setCats] = useState<Map<string, string>>(new Map())
  const [state, setState] = useState<{ loading: boolean; error: Error | null }>({ loading: true, error: null })
  const term = useDebounced(q.trim(), 300)

  useEffect(() => setPage(1), [term, category])
  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .leaders({ page, limit: 12, q: term || undefined, category: category || undefined }, ctrl.signal)
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
        setMeta({ total: res.total, totalPages: res.totalPages })
        setCats((prev) => {
          const next = new Map(prev)
          res.items.forEach((l) => l.category && next.set(l.category.slug, l.category.name))
          return next
        })
        setState({ loading: false, error: null })
      })
      .catch((e: Error) => e.name !== 'AbortError' && setState({ loading: false, error: e }))
    return () => ctrl.abort()
  }, [page, term, category])

  return (
    <div className="mood-navy min-h-screen">
      <PageHero eyebrow="Leaders" title="Visionaries, founders, changemakers." lead="The people profiled in THE GLOBAL ICON — and the ideas that carry their work forward." />
      <section className="pb-24">
        <div className="container-x">
          <div className="mb-12 flex flex-wrap items-center gap-4 border-y border-gold/20 py-5">
            <div className="flex flex-1 flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button type="button" className="chip" aria-pressed={category === ''} onClick={() => setCategory('')}>
                All
              </button>
              {[...cats].map(([slug, name]) => (
                <button key={slug} type="button" className="chip" aria-pressed={category === slug} onClick={() => setCategory(slug)}>
                  {name}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50" aria-hidden />
              <label htmlFor="ld-q" className="sr-only">
                Search leaders
              </label>
              <input id="ld-q" className="field field-dark !pl-9" placeholder="Search leaders" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {state.error && items.length === 0 ? (
            <ErrorState error={state.error} onRetry={() => setPage(1)} />
          ) : items.length === 0 && !state.loading ? (
            <Empty title="No leaders found">Try a different name, organisation or category.</Empty>
          ) : (
            <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l, i) => (
                <Reveal key={l.id} delay={(i % 3) * 0.06}>
                  <Link to={`/leaders/${l.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden border border-gold/25">
                      <Portrait src={l.portraitUrl} name={l.name} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-midnight to-transparent" />
                    </div>
                    <p className="eyebrow mt-5">{l.category?.name ?? 'Leader'}</p>
                    <h3 className="display mt-1 text-3xl group-hover:text-gold-bright">{l.name}</h3>
                    <p className="mt-1 opacity-70">{[l.designation, l.organization].filter(Boolean).join(' · ')}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          {page < meta.totalPages && (
            <div className="mt-14 text-center">
              <button type="button" className="btn btn-ghost" disabled={state.loading} onClick={() => setPage((p) => p + 1)}>
                {state.loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function LeaderDetail() {
  const { slug = '' } = useParams()
  const { data: l, error, loading } = useAsync((s) => api.leader(slug, s), [slug])
  useDocumentTitle(l?.name)

  if (loading && !l) return <Loading />
  if (error?.status === 404)
    return (
      <div className="container-x py-28 text-center">
        <h1 className="display text-5xl">Leader not found</h1>
        <Link to="/leaders" className="btn btn-gold mt-8">
          All leaders
        </Link>
      </div>
    )
  if (error || !l) return <ErrorState error={error} />

  return (
    <div className="mood-navy min-h-[80vh]">
      <div className="container-x grid items-start gap-12 py-16 md:grid-cols-[minmax(0,420px)_1fr] md:py-24">
        <Reveal>
          <div className="relative aspect-[4/5] overflow-hidden border border-gold/40 p-2">
            <Portrait src={l.portraitUrl} name={l.name} className="h-full w-full" />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <Link to="/leaders" className="eyebrow hover:text-gold-bright">
            ← Leaders{l.category ? ` / ${l.category.name}` : ''}
          </Link>
          <h1 className="display mt-5 text-5xl md:text-7xl">{l.name}</h1>
          <p className="display mt-3 text-2xl text-gold italic md:text-3xl">
            {[l.designation, l.organization].filter(Boolean).join(' · ')}
          </p>
          <span className="rule-gold my-8" />
          {l.introduction && <p className="max-w-2xl text-lg leading-relaxed opacity-85">{l.introduction}</p>}
          <p className="eyebrow mt-8">Featured {formatMonthYear(l.publicationDate)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {l.magazine && (
              <Link to={`/magazines/${l.magazine.slug}`} className="btn btn-gold">
                In {l.magazine.title}
              </Link>
            )}
            {l.article && (
              <Link to={`/stories/${l.article.slug}`} className="btn btn-ghost">
                Read the story
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  )
}
