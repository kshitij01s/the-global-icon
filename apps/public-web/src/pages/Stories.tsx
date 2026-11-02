import { Lock, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ArticleBody from '../components/ArticleBody'
import { Empty, ErrorState, Loading, PageHero, Reveal, StoryImage } from '../components/ui'
import { api, type ArticleSummary } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import { useAsync, useDebounced, useDocumentTitle } from '../lib/hooks'

function readingMinutes(text: string | null | undefined): number {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 220))
}

function StoryCard({ a }: { a: ArticleSummary }) {
  const mins = readingMinutes(a.excerpt)
  return (
    <Link to={`/stories/${a.slug}`} className="group flex h-full flex-col">
      <div className="overflow-hidden">
        <StoryImage src={a.featuredImageUrl} alt={a.title} className="aspect-[3/2] w-full transition-transform duration-700 group-hover:scale-105" />
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="eyebrow mb-1.5 flex items-center gap-2">
          {a.category?.name ?? 'Story'}
          {a.memberOnly && <Lock size={11} aria-label="Members only" />}
          {a.isSponsored && <span className="text-crimson">Sponsored</span>}
        </p>
        <h3 className="display text-2xl leading-tight group-hover:text-crimson md:text-3xl">{a.title}</h3>
        {a.excerpt && <p className="mt-2 line-clamp-3 opacity-70">{a.excerpt}</p>}
        <p className="mt-auto pt-4 text-sm opacity-55">
          {[a.author?.name, formatDate(a.publishedAt), `${mins} min read`].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}

const EDITORIAL_CHIPS = [
  { slug: 'business', name: 'Business' },
  { slug: 'leadership', name: 'Leadership' },
  { slug: 'entrepreneurship', name: 'Entrepreneurship' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'innovation', name: 'Innovation' },
  { slug: 'finance', name: 'Finance' },
  { slug: 'healthcare', name: 'Healthcare' },
  { slug: 'global-impact', name: 'Global Impact' },
]

export function StoriesList() {
  useDocumentTitle('Stories')
  const [q, setQ] = useState('')
  const [params] = useSearchParams()
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ArticleSummary[]>([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [state, setState] = useState<{ loading: boolean; error: Error | null }>({ loading: true, error: null })
  const [cats, setCats] = useState<Map<string, string>>(new Map(EDITORIAL_CHIPS.map((c) => [c.slug, c.name])))
  const term = useDebounced(q.trim(), 300)

  useEffect(() => setCategory(params.get('category') ?? ''), [params])
  useEffect(() => setPage(1), [term, category])
  useEffect(() => {
    const ctrl = new AbortController()
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .articles({ page, limit: 12, q: term || undefined, category: category || undefined }, ctrl.signal)
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
        setMeta({ total: res.total, totalPages: res.totalPages })
        setCats((prev) => {
          const next = new Map(prev)
          res.items.forEach((a) => a.category && next.set(a.category.slug, a.category.name))
          return next
        })
        setState({ loading: false, error: null })
      })
      .catch((e: Error) => e.name !== 'AbortError' && setState({ loading: false, error: e }))
    return () => ctrl.abort()
  }, [page, term, category])

  const lead = !term && !category && page >= 1 ? items.find((a) => a.isFeatured) ?? items[0] : undefined
  const grid = useMemo(() => (lead ? items.filter((a) => a.id !== lead.id) : items), [items, lead])

  return (
    <div className="mood-paper">
      <PageHero
        eyebrow="Stories"
        title="An international editorial desk."
        lead="Long-form reporting, interviews, and perspectives — with category discovery, search, and readable story pages."
      />
      <section className="pb-24">
        <div className="container-x">
          <div className="mb-10 flex flex-wrap items-center gap-4 border-y border-ink/15 py-5">
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
              <label htmlFor="st-q" className="sr-only">
                Search stories
              </label>
              <input id="st-q" className="field !pl-9" placeholder="Search stories" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {state.error && items.length === 0 ? (
            <ErrorState error={state.error} onRetry={() => setPage(1)} />
          ) : items.length === 0 && !state.loading ? (
            <Empty title="No stories found">Try a different search or category.</Empty>
          ) : (
            <>
              {lead && (
                <Reveal className="mb-14">
                  <Link to={`/stories/${lead.slug}`} className="group grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
                    <div className="overflow-hidden">
                      <StoryImage src={lead.featuredImageUrl} alt={lead.title} className="aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div>
                      <p className="eyebrow mb-3">{lead.category?.name ?? 'Featured story'}</p>
                      <h2 className="display text-4xl group-hover:text-crimson md:text-6xl">{lead.title}</h2>
                      {lead.excerpt && <p className="mt-4 text-lg opacity-75">{lead.excerpt}</p>}
                      <p className="mt-5 text-sm opacity-55">{[lead.author?.name, formatDate(lead.publishedAt)].filter(Boolean).join(' · ')}</p>
                    </div>
                  </Link>
                </Reveal>
              )}
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((a, i) => (
                  <Reveal key={a.id} delay={(i % 3) * 0.06}>
                    <StoryCard a={a} />
                  </Reveal>
                ))}
              </div>
            </>
          )}

          {page < meta.totalPages && (
            <div className="mt-14 text-center">
              <button type="button" className="btn btn-ink" onClick={() => setPage((p) => p + 1)} disabled={state.loading}>
                {state.loading ? 'Loading…' : 'Load more stories'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export function StoryDetail() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const { data: a, error, loading } = useAsync((s) => api.article(slug, s), [slug, user?.id])
  useDocumentTitle(a?.title)

  if ((loading && !a) || authLoading) return <Loading />
  if (error?.status === 404)
    return (
      <div className="container-x py-28 text-center">
        <h1 className="display text-5xl">Story not found</h1>
        <Link to="/stories" className="btn btn-gold mt-8">
          All stories
        </Link>
      </div>
    )
  if (error || !a) return <ErrorState error={error} />

  return (
    <article className="mood-paper">
      <header className="mood-midnight">
        <div className="container-x max-w-4xl py-16 text-center md:py-24">
          <Link to="/stories" className="eyebrow hover:text-gold-bright">
            ← Stories{a.category ? ` / ${a.category.name}` : ''}
          </Link>
          <h1 className="display mt-6 text-5xl md:text-7xl">{a.title}</h1>
          {a.excerpt && <p className="display mx-auto mt-6 max-w-2xl text-2xl text-ivory/80 italic">{a.excerpt}</p>}
          <p className="eyebrow mt-8">
            {[a.author?.name, formatDate(a.publishedAt), `${readingMinutes(a.body ?? a.excerpt)} min read`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            <a
              className="nav-link"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noreferrer"
            >
              Share
            </a>
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href)
              }}
            >
              Copy link
            </button>
          </div>
        </div>
      </header>

      {a.featuredImageUrl && (
        <div className="container-x -mt-2 max-w-5xl">
          <StoryImage src={a.featuredImageUrl} alt={a.title} className="aspect-[16/9] w-full shadow-2xl" />
        </div>
      )}

      <div className="container-x max-w-[44rem] py-16">
        {a.locked || !a.body ? (
          <div className="border border-gold/50 bg-ivory p-10 text-center">
            <Lock className="mx-auto mb-4 text-gold-deep" />
            <h2 className="display text-3xl">This story is for members</h2>
            <p className="mx-auto mt-3 max-w-md opacity-70">Sign in or create a free account to keep reading.</p>
            <Link to={`/signin?next=${encodeURIComponent(`/stories/${a.slug}`)}`} className="btn btn-ink mt-6">
              Sign in to continue
            </Link>
          </div>
        ) : (
          <ArticleBody body={a.body} />
        )}
        <div className="mt-14 border-t border-ink/15 pt-8">
          <Link to="/stories" className="link-arrow">
            More stories
          </Link>
        </div>
      </div>
    </article>
  )
}
