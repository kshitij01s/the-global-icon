import { useMemo } from 'react'
import { assetUrl } from '../lib/api'
import { fillTo, rotate } from '../lib/format'

/**
 * Animated, tilted magazine wall. Columns scroll in opposite directions and loop
 * seamlessly (each track contains the same set twice and travels exactly one set).
 * It only *displays* cover URLs returned by the API — no records are created.
 * Repeating a cover in the DOM to fill the wall is purely visual.
 */
export default function MagazineWall({ covers, columns = 8 }: { covers: (string | null | undefined)[]; columns?: number }) {
  const urls = useMemo(
    () => covers.map((c) => assetUrl(c)).filter((u): u is string => Boolean(u)),
    [covers],
  )

  const cols = useMemo(() => {
    if (urls.length === 0) return []
    return Array.from({ length: columns }, (_, i) => {
      const set = fillTo(rotate(urls, i * 2 + (i % 3)), 8)
      return { set, dur: 60 + ((i * 17) % 40) }
    })
  }, [urls, columns])

  return (
    <div className="wall" aria-hidden="true">
      {cols.length > 0 && (
        <div className="wall-stage">
          {cols.map((col, i) => (
            <div key={i} className={`wall-col ${i % 2 === 0 ? 'up' : 'down'}`} style={{ ['--dur' as string]: `${col.dur}s`, marginTop: i % 2 ? '-6rem' : 0 }}>
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
      )}
      <div className="wall-overlay" />
    </div>
  )
}
