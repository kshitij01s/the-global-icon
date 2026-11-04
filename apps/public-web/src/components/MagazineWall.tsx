import { useMemo } from 'react'
import { assetUrl } from '../lib/api'
import { fillTo, rotate } from '../lib/format'

/** Brand gradient placeholders when API covers are not yet available. */
const FALLBACK_COVERS = [
  'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1426"/><stop offset="1" stop-color="#a3202f"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><text x="40" y="80" fill="#c5a572" font-family="Georgia,serif" font-size="28">THE GLOBAL ICON</text><text x="40" y="520" fill="#f5eedf" font-family="Georgia,serif" font-size="22">Stories That Shape Tomorrow</text></svg>`,
    ),
  'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#12261c"/><stop offset="1" stop-color="#c5a572"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><text x="40" y="80" fill="#f5eedf" font-family="Georgia,serif" font-size="28">THE GLOBAL ICON</text></svg>`,
    ),
  'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><defs><linearGradient id="g" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#1a0810"/><stop offset="1" stop-color="#9c7c47"/></linearGradient></defs><rect width="400" height="600" fill="url(#g)"/><text x="40" y="80" fill="#e3c997" font-family="Georgia,serif" font-size="28">THE GLOBAL ICON</text></svg>`,
    ),
]

/**
 * Animated, tilted magazine wall. Columns scroll in opposite directions and loop
 * seamlessly. Uses API cover URLs when present; otherwise brand SVG placeholders
 * so the Magazines hero never looks empty.
 */
export default function MagazineWall({
  covers,
  columns = 8,
  dense = false,
}: {
  covers: (string | null | undefined)[]
  columns?: number
  dense?: boolean
}) {
  const urls = useMemo(() => {
    const real = covers.map((c) => assetUrl(c)).filter((u): u is string => Boolean(u))
    return real.length > 0 ? real : FALLBACK_COVERS
  }, [covers])

  const colCount = dense ? Math.max(columns, 10) : columns

  const cols = useMemo(() => {
    return Array.from({ length: colCount }, (_, i) => {
      const set = fillTo(rotate(urls, i * 2 + (i % 3)), dense ? 10 : 8)
      return { set, dur: 55 + ((i * 17) % 45) }
    })
  }, [urls, colCount, dense])

  return (
    <div className={`wall${dense ? ' wall-dense' : ''}`} aria-hidden="true">
      <div className="wall-stage">
        {cols.map((col, i) => (
          <div
            key={i}
            className={`wall-col ${i % 2 === 0 ? 'up' : 'down'}`}
            style={{ ['--dur' as string]: `${col.dur}s`, marginTop: i % 2 ? '-6rem' : 0 }}
          >
            <div className="wall-track">
              {[0, 1].flatMap((copy) =>
                col.set.map((src, j) => (
                  <img
                    key={`${copy}-${j}`}
                    src={src}
                    alt=""
                    className="wall-cover"
                    decoding="async"
                    draggable={false}
                  />
                )),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="wall-overlay" />
    </div>
  )
}
