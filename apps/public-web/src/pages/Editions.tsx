import { Lock, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, ErrorState, Reveal, CoverImage } from '../components/ui'
import { api, type Edition } from '../lib/api'
import { formatMonthYear } from '../lib/format'
import { useAsync, useDebounced, useDocumentTitle } from '../lib/hooks'

function LedgerRow({ e }: { e: Edition }) {
  return (
    <Link to={`/magazines/${e.slug}`} className="ledger-row">
      <div className="display text-5xl leading-none text-gold-deep/70 md:text-6xl">
        {e.issueNumber && /^\d+$/.test(e.issueNumber) ? e.issueNumber.padStart(2, '0') : '—'}
      </div>
      <div className="flex min-w-0 items-center gap-5">
        <div className="hidden w-14 shrink-0 shadow-md sm:block">
          <CoverImage src={e.coverUrl} alt="" title={e.title} />
        </div>
        <div className="min-w-0">
          <h3 className="display truncate text-2xl leading-tight md:text-3xl">{e.title}</h3>
          <p className="mt-1 text-sm opacity-65">
            {[formatMonthYear(e.publicationDate), e.series, e.region, e.pageCount ? `${e.pageCount} pp.` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      <div className="ledger-action flex items-center gap-3 text-xs font-semibold tracking-widest uppercase">
        {e.access === 'MEMBERS' && (
          <span className="inline-flex items-center gap-1 text-crimson">
            <Lock size={12} /> Members
          </span>
        )}
        <span className="text-crimson">Open →</span>
      </div>
    </Link>
  )
}

export default function Editions() {
  useDocumentTitle('Editions')
  const [q, setQ] = useState('')
  const [series, setSeries] = useState('')
  const [year, setYear] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [archive, setArchive] = useState<Edition[]>([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 })
  const [arch, setArch] = useState<{ loading: boolean; error: Error | null }>({ loading: true, error: null })
  const term = useDebounced(q.trim(), 300)
  const filtered = Boolean(term || series || year)

  // Unfiltered snapshot: current issue, featured shelf and filter facets.
  const base = useAsync((s) => api.editions({ limit: 50 }, s), [])
  const current = base.data?.items[0] ?? null
  const featured = useMemo(
    () => (base.data?.items ?? []).filter((e) => e.isFeatured && e.id !== current?.id).slice(0, 8),
    [base.data, current],
  )

  useEffect(() => setPage(1), [term, series, year])
  useEffect(() => {
    const ctrl = new AbortController()
    setArch((a) => ({ ...a, loading: true, error: null }))
    api
      .editions({ page, limit: 24, q: term || undefined, series: series || undefined, year: year || undefined }, ctrl.signal)
      .then((res) => {
        setArchive((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
        setMeta({ total: res.total, totalPages: res.totalPages })
        setArch({ loading: false, error: null })
      })
      .catch((e: Error) => e.name !== 'AbortError' && setArch({ loading: false, error: e }))
    return () => ctrl.abort()
  }, [page, term, series, year])

  const previous = useMemo(
    () => (filtered ? archive : archive.filter((e) => e.id !== current?.id)),
    [archive, filtered, current],
  )
  const byYear = useMemo(() => {
    const groups = new Map<number, Edition[]>()
    previous.forEach((e) => groups.set(e.year, [...(groups.get(e.year) ?? []), e]))
    return [...groups].sort((a, b) => b[0] - a[0])
  }, [previous])

  const facets = base.data?.facets

  return (
    <div className="mood-ivory">
      {/* masthead */}
      <header className="border-b border-ink/15">
        <div className="container-x grid items-center gap-12 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-24">
          <div>
            <p className="eyebrow mb-5">The archive · Editions library</p>
            <h1 className="display text-6xl leading-[0.95] md:text-8xl">
              Every issue,
              <br />
              <span className="text-crimson italic">kept.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg opacity-75">
              A chronological library of THE GLOBAL ICON editions — filter by series or year, then open any issue to read
              it in full.
            </p>
          </div>

          {current ? (
            <Reveal className="relative mx-auto w-full max-w-xs">
              <span className="absolute -top-4 -left-4 z-10 rotate-[-6deg] bg-crimson px-3 py-1.5 text-xs font-bold tracking-[0.22em] text-white uppercase">
                Current issue
              </span>
              <Link to={`/magazines/${current.slug}`} className="card-lift block shadow-2xl" aria-label={`Open ${current.title}`}>
                <CoverImage src={current.coverUrl} alt={current.coverAltText} title={current.title} label={current.issueLabel} eager />
              </Link>
              <p className="eyebrow mt-4">{[current.issueLabel, formatMonthYear(current.publicationDate)].filter(Boolean).join(' · ')}</p>
              <Link to={`/magazines/${current.slug}`} className="display text-2xl hover:text-crimson">
                {current.title}
              </Link>
            </Reveal>
          ) : (
            base.loading && <div className="skeleton mx-auto aspect-[2/3] w-full max-w-xs" aria-hidden />
          )}
        </div>
      </header>

      {/* featured shelf */}
      {featured.length > 0 && (
        <section className="border-b border-ink/15 bg-ivory-2 py-14">
          <div className="container-x">
            <p className="eyebrow mb-6">Featured on the shelf</p>
            <div className="shelf">
              {featured.map((e) => (
                <Link key={e.id} to={`/magazines/${e.slug}`} className="card-lift block w-44 shadow-lg" aria-label={e.title}>
                  <CoverImage src={e.coverUrl} alt={e.coverAltText} title={e.title} label={e.issueLabel} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* filters + ledger */}
      <section className="section">
        <div className="container-x">
          <div className="mb-10 flex flex-wrap items-end gap-4 border-b-2 border-ink pb-6">
            <h2 className="display mr-auto text-4xl md:text-5xl">{filtered ? 'Results' : 'Previous issues'}</h2>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 opacity-50" aria-hidden />
              <label htmlFor="ed-q" className="sr-only">
                Search editions
              </label>
              <input id="ed-q" className="field !pl-9" placeholder="Search editions" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ed-series" className="sr-only">
                Series
              </label>
              <select id="ed-series" className="field" value={series} onChange={(e) => setSeries(e.target.value)}>
                <option value="">All series</option>
                {facets?.series.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ed-year" className="sr-only">
                Year
              </label>
              <select id="ed-year" className="field" value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All years</option>
                {facets?.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {filtered && (
              <button
                type="button"
                className="btn btn-outline-ink btn-sm"
                onClick={() => {
                  setQ('')
                  setSeries('')
                  setYear('')
                }}
              >
                Clear
              </button>
            )}
          </div>

          {arch.error && archive.length === 0 ? (
            <ErrorState error={arch.error} onRetry={() => setPage(1)} />
          ) : previous.length === 0 && !arch.loading ? (
            <Empty title={filtered ? 'No editions match these filters' : 'No earlier editions yet'}>
              {filtered ? 'Adjust or clear the filters to see more of the archive.' : 'Older issues will be listed here as they are published.'}
            </Empty>
          ) : (
            byYear.map(([y, list]) => (
              <div key={y} className="mb-12 grid gap-4 md:grid-cols-[8rem_1fr]">
                <h3 className="display text-4xl text-crimson md:sticky md:top-24 md:self-start md:text-5xl">{y}</h3>
                <div className="border-b border-ink/16">
                  {list.map((e) => (
                    <LedgerRow key={e.id} e={e} />
                  ))}
                </div>
              </div>
            ))
          )}

          {page < meta.totalPages && (
            <div className="mt-6 text-center">
              <button type="button" className="btn btn-ink" disabled={arch.loading} onClick={() => setPage((p) => p + 1)}>
                {arch.loading ? 'Loading…' : 'Load more issues'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
