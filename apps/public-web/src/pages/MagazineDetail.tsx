import { Download, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CoverImage, ErrorState, Loading, Reveal } from '../components/ui'
import { ApiError, api, downloadPdf } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatMonthYear } from '../lib/format'
import { useAsync, useDocumentTitle } from '../lib/hooks'

export default function MagazineDetail() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { data: m, error, loading } = useAsync((s) => api.magazine(slug, s), [slug])
  const [dlError, setDlError] = useState<string | null>(null)
  useDocumentTitle(m?.title)

  if (loading && !m) return <Loading />
  if (error?.status === 404) {
    return (
      <div className="container-x py-28 text-center">
        <h1 className="display text-5xl">Edition not found</h1>
        <Link to="/magazines" className="btn btn-gold mt-8">
          Back to magazines
        </Link>
      </div>
    )
  }
  if (error || !m) return <ErrorState error={error ?? new ApiError(0, 'Not found')} />

  const locked = m.access === 'MEMBERS' && !user

  return (
    <>
      <section className="mood-navy">
        <div className="container-x grid items-center gap-12 py-16 md:grid-cols-[minmax(0,360px)_1fr] md:py-24">
          <Reveal>
            <div className="mx-auto w-full max-w-sm shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
              <CoverImage src={m.coverUrl} alt={m.coverAltText} title={m.title} label={m.issueLabel} eager />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <nav aria-label="Breadcrumb" className="eyebrow mb-4">
              <Link to="/magazines" className="hover:text-gold-bright">
                Magazines
              </Link>{' '}
              / {m.issueLabel ?? m.title}
            </nav>
            <h1 className="display text-5xl md:text-7xl">{m.title}</h1>
            {m.subtitle && <p className="display mt-3 text-2xl text-gold italic md:text-3xl">{m.subtitle}</p>}
            {m.description && <p className="mt-6 max-w-2xl text-lg opacity-80">{m.description}</p>}

            <dl className="mt-8 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 text-sm sm:grid-cols-3">
              <div>
                <dt className="eyebrow">Published</dt>
                <dd className="mt-1">{formatMonthYear(m.publicationDate)}</dd>
              </div>
              {m.pageCount && (
                <div>
                  <dt className="eyebrow">Pages</dt>
                  <dd className="mt-1">{m.pageCount}</dd>
                </div>
              )}
              {m.category && (
                <div>
                  <dt className="eyebrow">Category</dt>
                  <dd className="mt-1">{m.category.name}</dd>
                </div>
              )}
              {m.editionSeries && (
                <div>
                  <dt className="eyebrow">Series</dt>
                  <dd className="mt-1">{m.editionSeries.name}</dd>
                </div>
              )}
              {m.language && (
                <div>
                  <dt className="eyebrow">Language</dt>
                  <dd className="mt-1 uppercase">{m.language}</dd>
                </div>
              )}
              <div>
                <dt className="eyebrow">Access</dt>
                <dd className="mt-1">{m.access === 'MEMBERS' ? 'Members' : 'Free to read'}</dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              {m.hasPdf ? (
                locked ? (
                  <Link to={`/signin?next=${encodeURIComponent(`/read/${m.slug}`)}`} className="btn btn-gold">
                    <Lock size={14} /> Sign in to read
                  </Link>
                ) : (
                  <Link to={`/read/${m.slug}`} className="btn btn-gold">
                    Read edition
                  </Link>
                )
              ) : (
                <span className="eyebrow">PDF coming soon</span>
              )}
              {m.hasPdf && m.allowDownload && !locked && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setDlError(null)
                    void downloadPdf(m.slug).catch((e: Error) => setDlError(e.message))
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
              )}
              <Link to="/editions" className="btn btn-ghost">
                All editions
              </Link>
            </div>
            {dlError && (
              <p role="alert" className="mt-4 text-crimson-bright">
                {dlError}
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {(m.relatedArticles.length > 0 || m.leaders.length > 0) && (
        <section className="mood-paper section">
          <div className="container-x grid gap-14 md:grid-cols-2">
            {m.relatedArticles.length > 0 && (
              <div>
                <p className="eyebrow mb-4">In this edition · Stories</p>
                <ul className="divide-y divide-black/10 border-y border-black/10">
                  {m.relatedArticles.map((a) => (
                    <li key={a.slug}>
                      <Link to={`/stories/${a.slug}`} className="group block py-5">
                        <h3 className="display text-2xl group-hover:text-crimson">{a.title}</h3>
                        {a.excerpt && <p className="mt-1 line-clamp-2 opacity-65">{a.excerpt}</p>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.leaders.length > 0 && (
              <div>
                <p className="eyebrow mb-4">In this edition · Leaders</p>
                <ul className="divide-y divide-black/10 border-y border-black/10">
                  {m.leaders.map((l) => (
                    <li key={l.slug}>
                      <Link to={`/leaders/${l.slug}`} className="group block py-5">
                        <h3 className="display text-2xl group-hover:text-crimson">{l.name}</h3>
                        <p className="opacity-65">{[l.designation, l.organization].filter(Boolean).join(' · ')}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
