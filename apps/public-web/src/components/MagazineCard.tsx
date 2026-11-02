import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Magazine } from '../lib/api'
import { formatMonthYear } from '../lib/format'
import { CoverImage } from './ui'

/** Library card used on the Magazines page (dark mood) and Home. */
export default function MagazineCard({ m, tone = 'dark' }: { m: Magazine; tone?: 'dark' | 'light' }) {
  return (
    <article className="group flex flex-col">
      <Link to={`/magazines/${m.slug}`} className="card-lift relative block shadow-xl" aria-label={`${m.title} — details`}>
        <CoverImage src={m.coverUrl} alt={m.coverAltText} title={m.title} label={m.issueLabel} />
        {m.access === 'MEMBERS' && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-midnight/85 px-2 py-1 text-[0.65rem] tracking-widest text-gold uppercase">
            <Lock size={11} /> Members
          </span>
        )}
      </Link>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="eyebrow mb-1.5" style={{ fontSize: '0.66rem' }}>
          {[m.issueLabel, formatMonthYear(m.publicationDate)].filter(Boolean).join(' · ')}
        </p>
        <h3 className="display text-2xl leading-tight">
          <Link to={`/magazines/${m.slug}`}>{m.title}</Link>
        </h3>
        {m.subtitle && <p className="mt-1 line-clamp-2 text-sm opacity-65">{m.subtitle}</p>}
        <div className="mt-4 flex gap-2">
          {m.hasPdf ? (
            <Link to={`/read/${m.slug}`} className={`btn btn-sm ${tone === 'dark' ? 'btn-gold' : 'btn-ink'}`}>
              Read
            </Link>
          ) : null}
          <Link to={`/magazines/${m.slug}`} className={`btn btn-sm ${tone === 'dark' ? 'btn-ghost' : 'btn-outline-ink'}`}>
            Details
          </Link>
        </div>
      </div>
    </article>
  )
}
