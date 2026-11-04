import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import CoverCarousel from '../components/CoverCarousel'
import MagazineCard from '../components/MagazineCard'
import MagazineWall from '../components/MagazineWall'
import { CoverImage, Empty, ErrorState, Reveal } from '../components/ui'
import { api, type Magazine } from '../lib/api'
import { useAsync, useDebounced, useDocumentTitle } from '../lib/hooks'

type MagazinesCms = { eyebrow?: string; headline?: string; body?: string }

const PAGE_SIZE = 12

function Library({
  categories,
  years,
  initialCategory,
  initialYear,
  initialFeatured,
}: {
  categories: { slug: string; name: string }[]
  years: number[]
  initialCategory: string
  initialYear: number | null
  initialFeatured: boolean
}) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [year, setYear] = useState<number | null>(initialYear)
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Magazine[]>([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [state, setState] = useState<{ loading: boolean; error: Error | null }>({ loading: true, error: null })
  const term = useDebounced(q.trim(), 300)

  useEffect(() => {
    setCategory(initialCategory)
    setYear(initialYear)
    setFeaturedOnly(initialFeatured)
  }, [initialCategory, initialYear, initialFeatured])

  useEffect(() => setPage(1), [term, category, year, featuredOnly])

  useEffect(() => {
    const ctrl = new AbortController()
    setState({ loading: true, error: null })
    api
      .magazines(
        {
          page,
          limit: PAGE_SIZE,
          q: term || undefined,
          category: category || undefined,
          year: year ?? undefined,
          featured: featuredOnly || undefined,
        },
        ctrl.signal,
      )
      .then((res) => {
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
        setMeta({ total: res.total, totalPages: res.totalPages })
        setState({ loading: false, error: null })
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setState({ loading: false, error: e })
      })
    return () => ctrl.abort()
  }, [page, term, category, year, featuredOnly])

  return (
    <section id="library" className="mood-charcoal section">
      <div className="container-x">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">The exhibition</p>
            <h2 className="display text-4xl md:text-6xl">
              {featuredOnly ? 'Featured magazines' : year ? `The ${year} Collection` : 'Every magazine, one shelf.'}
            </h2>
            <p className="mt-3 opacity-65">
              {meta.total} {meta.total === 1 ? 'title' : 'titles'}
              {year ? ` · ${year}` : ''}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 opacity-50" aria-hidden />
            <label htmlFor="mag-q" className="sr-only">
              Search magazines
            </label>
            <input
              id="mag-q"
              className="field field-dark !pl-10"
              placeholder="Search magazines"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Featured filter">
          <button type="button" className="chip" aria-pressed={!featuredOnly} onClick={() => setFeaturedOnly(false)}>
            All titles
          </button>
          <button type="button" className="chip" aria-pressed={featuredOnly} onClick={() => setFeaturedOnly(true)}>
            Featured only
          </button>
        </div>

        {years.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by year">
            <button type="button" className="chip" aria-pressed={year === null} onClick={() => setYear(null)}>
              All years
            </button>
            {years.map((y) => (
              <button key={y} type="button" className="chip" aria-pressed={year === y} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <button type="button" className="chip" aria-pressed={category === ''} onClick={() => setCategory('')}>
              All industries
            </button>
            {categories.map((c) => (
              <button key={c.slug} type="button" className="chip" aria-pressed={category === c.slug} onClick={() => setCategory(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {state.error && items.length === 0 ? (
          <ErrorState error={state.error} onRetry={() => setPage(1)} />
        ) : items.length === 0 && !state.loading ? (
          <Empty title="No magazines match">Try clearing the search or choosing a different year or category.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {items.map((m, i) => (
              <Reveal key={m.id} delay={(i % 4) * 0.05}>
                <MagazineCard m={m} />
              </Reveal>
            ))}
          </div>
        )}

        {page < meta.totalPages && (
          <div className="mt-14 text-center">
            <button type="button" className="btn btn-ghost" onClick={() => setPage((p) => p + 1)} disabled={state.loading}>
              {state.loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default function Magazines() {
  useDocumentTitle('Magazines')
  const [params] = useSearchParams()
  const initialYear = (() => {
    const raw = params.get('year')
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  })()
  const initialCategory = params.get('category') ?? ''
  const initialFeatured = params.get('featured') === '1' || params.get('featured') === 'true'

  const { data, error, loading } = useAsync((s) => api.magazines({ limit: 50 }, s), [])
  const collection2025 = useAsync((s) => api.magazines({ year: 2025, limit: 12 }, s), [])
  const cmsPage = useAsync((s) => api.managedPage('magazines', s), [])
  const cms = (cmsPage.data?.content ?? {}) as MagazinesCms

  const items = useMemo(() => data?.items ?? [], [data])
  const years = useMemo(() => data?.facets?.years ?? [], [data])
  const covers = useMemo(() => items.map((m) => m.coverUrl), [items])
  const categories = useMemo(() => {
    if (data?.facets?.categories?.length) return data.facets.categories
    const map = new Map<string, string>()
    items.forEach((m) => m.category && map.set(m.category.slug, m.category.name))
    return [...map].map(([slug, name]) => ({ slug, name }))
  }, [data, items])
  const carouselItems = useMemo(
    () => [...items].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 9),
    [items],
  )
  const featuredSpotlight = useMemo(
    () => items.find((m) => m.isFeatured) ?? items[0] ?? null,
    [items],
  )
  const demos2025 = collection2025.data?.items ?? []

  return (
    <>
      <section className="relative isolate overflow-hidden bg-midnight magazines-hero">
        <MagazineWall covers={covers} dense />
        <div className="container-x relative z-10 flex min-h-[min(82vh,720px)] flex-col justify-center py-20">
          <motion.h1
            className="display text-[clamp(3.25rem,12vw,8.5rem)] leading-[0.88] tracking-[0.04em] uppercase"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <span className="gold-text">{cms.headline ?? 'Magazines'}</span>
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-base leading-relaxed text-ivory/90 md:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.35 }}
          >
            {cms.body ??
              'THE GLOBAL ICON is an international magazine that highlights visionary leaders, innovative thinkers, and impactful changemakers. Through engaging stories, interviews, and features, it delivers fresh insights and diverse global perspectives.'}
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
            <a href="#library" className="btn btn-gold">
              Browse the library
            </a>
            <a href="#collection-2025" className="btn btn-ghost">
              2025 Collection
            </a>
            <Link to="/editions" className="btn btn-ghost">
              Editions archive
            </Link>
          </motion.div>
        </div>
      </section>

      {featuredSpotlight && (
        <section className="mood-navy section">
          <div className="container-x grid items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <Link to={`/magazines/${featuredSpotlight.slug}`} className="card-lift mx-auto block max-w-sm shadow-2xl">
                <CoverImage
                  src={featuredSpotlight.coverUrl}
                  alt={featuredSpotlight.coverAltText}
                  title={featuredSpotlight.title}
                  label={featuredSpotlight.issueLabel}
                />
              </Link>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="eyebrow mb-3">Featured magazine spotlight</p>
              <h2 className="display text-4xl md:text-6xl">{featuredSpotlight.title}</h2>
              {featuredSpotlight.subtitle && <p className="display mt-3 text-2xl text-gold italic">{featuredSpotlight.subtitle}</p>}
              <p className="mt-5 max-w-xl opacity-75">
                {featuredSpotlight.description ?? 'A highlighted edition from THE GLOBAL ICON newsstand.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {featuredSpotlight.hasPdf && (
                  <Link to={`/read/${featuredSpotlight.slug}`} className="btn btn-gold">
                    Read now
                  </Link>
                )}
                <Link to={`/magazines/${featuredSpotlight.slug}`} className="btn btn-ghost">
                  Magazine details
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <section className="mood-charcoal section overflow-hidden border-y border-white/5">
        <div className="container-x">
          <Reveal>
            <p className="eyebrow mb-3 text-center">Cover collection</p>
            <h2 className="display mb-14 text-center text-4xl md:text-6xl">Featured covers</h2>
          </Reveal>
          {loading && !data && <div className="skeleton mx-auto h-[420px] w-64" aria-hidden />}
          {error && <ErrorState error={error} />}
          {!loading && !error && carouselItems.length === 0 && (
            <Empty title="No editions published yet">New magazines will appear here as soon as they are published.</Empty>
          )}
          <CoverCarousel items={carouselItems} />
        </div>
      </section>

      <section id="collection-2025" className="mood-ivory section text-ink">
        <div className="container-x">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-3">Year archive</p>
              <h2 className="display text-4xl md:text-6xl">The 2025 Collection</h2>
              <p className="mt-3 max-w-2xl opacity-70">
                Browse 2025 Magazine Highlights. Sample editions are labelled DEMO SEED so they remain distinct from
                officially published titles.
              </p>
            </div>
            <Link to="/magazines?year=2025" className="btn btn-ink">
              Browse all 2025 editions
            </Link>
          </div>
          {collection2025.error && <ErrorState error={collection2025.error} />}
          {demos2025.length === 0 && !collection2025.loading ? (
            <Empty title="No 2025 editions yet">Publish magazines with a 2025 date to fill this archive.</Empty>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {demos2025.map((m, i) => (
                <Reveal key={m.id} delay={(i % 4) * 0.05}>
                  <MagazineCard m={m} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Library
        categories={categories}
        years={years}
        initialCategory={initialCategory}
        initialYear={initialYear}
        initialFeatured={initialFeatured}
      />
    </>
  )
}
