import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, Loading } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync, useDocumentTitle } from '../lib/hooks'

// pdf.js is large — load it only when someone opens a reader.
const PdfReader = lazy(() => import('../components/PdfReader'))

export default function Reader() {
  const { slug = '' } = useParams()
  const { loading: authLoading, user } = useAuth()
  const { data: m, error, loading } = useAsync((s) => api.magazine(slug, s), [slug])
  useDocumentTitle(m ? `Reading ${m.title}` : 'Reader')

  if (loading || authLoading) return <Loading label="Preparing reader…" />
  if (error || !m) return <ErrorState error={error} title="This edition could not be opened" />
  if (!m.hasPdf) {
    return (
      <div className="container-x py-28 text-center">
        <h1 className="display text-4xl">The PDF for this edition isn’t available yet.</h1>
        <Link to={`/magazines/${m.slug}`} className="btn btn-gold mt-8">
          Back to edition
        </Link>
      </div>
    )
  }

  return (
    <Suspense fallback={<Loading label="Opening reader…" />}>
      {/* key on user so a sign-in re-opens the PDF with the bearer token */}
      <PdfReader key={`${m.slug}:${user?.id ?? 'anon'}`} slug={m.slug} title={m.title} allowDownload={m.allowDownload} pageCount={m.pageCount} />
    </Suspense>
  )
}
