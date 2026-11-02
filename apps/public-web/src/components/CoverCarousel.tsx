import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Magazine } from '../lib/api'
import { formatMonthYear } from '../lib/format'
import { CoverImage } from './ui'

/** 3D-ish coverflow with hover lift. Click a side cover to bring it forward. */
export default function CoverCarousel({ items }: { items: Magazine[] }) {
  const [active, setActive] = useState(0)
  const n = items.length

  const offsetOf = useCallback(
    (i: number) => {
      let d = i - active
      if (d > n / 2) d -= n
      if (d < -n / 2) d += n
      return d
    },
    [active, n],
  )

  if (n === 0) return null
  const go = (d: number) => setActive((a) => (a + d + n) % n)
  const current = items[active]!

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured editions" onKeyDown={onKey}>
      <div className="carousel-stage">
        {items.map((m, i) => {
          const off = offsetOf(i)
          const abs = Math.abs(off)
          const visible = abs <= 3
          return (
            <div
              key={m.id}
              className="carousel-item"
              style={{
                transform: `translateX(${off * 62}%) translateZ(${-abs * 150}px) rotateY(${-off * 26}deg)`,
                opacity: visible ? 1 - abs * 0.2 : 0,
                filter: abs === 0 ? 'none' : `brightness(${1 - abs * 0.18})`,
                zIndex: 10 - abs,
                pointerEvents: visible ? 'auto' : 'none',
              }}
              aria-hidden={abs !== 0}
            >
              <div className="lift">
                {abs === 0 ? (
                  <Link to={`/magazines/${m.slug}`} aria-label={`Open ${m.title}`} tabIndex={0}>
                    <CoverImage src={m.coverUrl} alt={m.coverAltText} title={m.title} label={m.issueLabel} eager />
                  </Link>
                ) : (
                  <button type="button" className="block w-full" onClick={() => setActive(i)} tabIndex={-1} aria-label={`Show ${m.title}`}>
                    <CoverImage src={m.coverUrl} alt="" title={m.title} label={m.issueLabel} eager />
                  </button>
                )}
              </div>
              {abs === 0 && <div className="carousel-reflection" />}
            </div>
          )
        })}
      </div>

      <div className="mx-auto mt-14 flex max-w-xl flex-col items-center text-center" aria-live="polite">
        <p className="eyebrow mb-2">
          {[current.issueLabel, formatMonthYear(current.publicationDate)].filter(Boolean).join(' · ')}
        </p>
        <h3 className="display text-4xl md:text-5xl">{current.title}</h3>
        {current.subtitle && <p className="mt-2 opacity-70">{current.subtitle}</p>}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous edition">
            <ChevronLeft size={18} />
          </button>
          {current.hasPdf && (
            <Link to={`/read/${current.slug}`} className="btn btn-gold btn-sm">
              Read now
            </Link>
          )}
          <Link to={`/magazines/${current.slug}`} className="btn btn-ghost btn-sm">
            Details
          </Link>
          <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Next edition">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
