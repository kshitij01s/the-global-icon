import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE, api, downloadPdf, getAccessToken } from '../lib/api'
import { useAuth } from '../lib/auth'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3.5
const SPREAD_MIN_WIDTH = 900

/** Pages displayed for a given anchor page. Cover (page 1) stands alone in spread mode. */
function viewPages(page: number, total: number, spread: boolean): number[] {
  if (!spread || page <= 1) return [1]
  const left = page % 2 === 0 ? page : page - 1
  return left + 1 <= total ? [left, left + 1] : [left]
}

function PageCanvas({
  doc,
  pageNumber,
  boxW,
  boxH,
  zoom,
  onError,
}: {
  doc: PDFDocumentProxy
  pageNumber: number
  boxW: number
  boxH: number
  zoom: number
  onError: (e: Error) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (boxW <= 0 || boxH <= 0) return
    let cancelled = false
    let task: RenderTask | null = null
    ;(async () => {
      try {
        const page = await doc.getPage(pageNumber)
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        const fit = Math.min(boxW / base.width, boxH / base.height)
        const cssScale = fit * zoom
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: cssScale * dpr })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`
        task = page.render({ canvas, viewport })
        await task.promise
      } catch (e) {
        const err = e as Error & { name?: string }
        if (err.name === 'RenderingCancelledException' || cancelled) return
        onError(err)
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, pageNumber, boxW, boxH, zoom, onError])

  return <canvas ref={canvasRef} className="reader-canvas block max-w-none" aria-label={`Page ${pageNumber}`} />
}

export default function PdfReader({
  slug,
  title,
  allowDownload,
  pageCount,
}: {
  slug: string
  title: string
  allowDownload: boolean
  pageCount: number | null
}) {
  const { user } = useAuth()
  const shellRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [total, setTotal] = useState(pageCount ?? 0)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [loadPct, setLoadPct] = useState(0)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [spreadPref, setSpreadPref] = useState<boolean | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [jump, setJump] = useState('')
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const narrow = size.w > 0 && size.w < SPREAD_MIN_WIDTH
  const spread = !narrow && (spreadPref ?? true)
  const pages = doc ? viewPages(page, total, spread) : []

  // ---- load document (auth header lets MEMBERS editions stream through PDF.js) ----
  useEffect(() => {
    const token = getAccessToken()
    const task = pdfjs.getDocument({
      url: `${API_BASE}/magazines/${encodeURIComponent(slug)}/pdf`,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      withCredentials: false,
    })
    task.onProgress = ({ loaded, total: t }: { loaded: number; total: number }) => {
      if (t) setLoadPct(Math.round((loaded / t) * 100))
    }
    let cancelled = false
    task.promise
      .then((d) => {
        if (cancelled) return
        setDoc(d)
        setTotal(d.numPages)
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return
        const status = e.status
        setError({
          status,
          message:
            status === 401
              ? 'This edition is for members. Please sign in to read it.'
              : status === 404
                ? 'This edition’s PDF is not available.'
                : status === 403
                  ? 'You do not have access to this edition.'
                  : 'The PDF could not be loaded. Please try again.',
        })
      })
    return () => {
      cancelled = true
      void task.destroy()
    }
  }, [slug])

  // ---- resume from saved progress (signed-in readers) ----
  useEffect(() => {
    if (!doc || !user) {
      setProgressLoaded(true)
      return
    }
    let alive = true
    api
      .progress(slug)
      .then((p) => alive && setPage(Math.min(Math.max(1, p.lastPage), doc.numPages)))
      .catch(() => undefined)
      .finally(() => alive && setProgressLoaded(true))
    return () => {
      alive = false
    }
  }, [doc, user, slug])

  useEffect(() => {
    if (!user || !doc || !progressLoaded) return
    const t = setTimeout(() => void api.saveProgress(slug, page).catch(() => undefined), 1500)
    return () => clearTimeout(t)
  }, [page, user, doc, slug, progressLoaded])

  // ---- viewport size ----
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // ---- navigation ----
  const goTo = useCallback(
    (p: number) => {
      if (!total) return
      const clamped = Math.min(Math.max(1, p), total)
      setPage(spread && clamped > 1 ? (clamped % 2 === 0 ? clamped : clamped - 1) : clamped)
      viewportRef.current?.scrollTo({ top: 0, left: 0 })
    },
    [total, spread],
  )
  const step = spread ? (page <= 1 ? 1 : 2) : 1
  const next = useCallback(() => goTo(page + step), [goTo, page, step])
  const prev = useCallback(
    () => goTo(spread ? (page <= 2 ? 1 : page - 2) : page - 1),
    [goTo, page, spread],
  )
  const lastVisible = pages.length ? pages[pages.length - 1]! : page
  const atStart = page <= 1
  const atEnd = total > 0 && lastVisible >= total

  const zoomBy = useCallback((d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + d).toFixed(2)))), [])

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => setFullscreen((f) => !f))
    } else {
      setFullscreen((f) => !f) // iOS Safari: CSS fallback
    }
  }, [])

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
          if (zoom <= 1) (e.preventDefault(), next())
          break
        case 'ArrowLeft':
          if (zoom <= 1) (e.preventDefault(), prev())
          break
        case 'PageDown':
        case ' ':
          e.preventDefault()
          next()
          break
        case 'PageUp':
          e.preventDefault()
          prev()
          break
        case 'Home':
          e.preventDefault()
          goTo(1)
          break
        case 'End':
          e.preventDefault()
          goTo(total)
          break
        case '+':
        case '=':
          e.preventDefault()
          zoomBy(0.25)
          break
        case '-':
        case '_':
          e.preventDefault()
          zoomBy(-0.25)
          break
        case '0':
          setZoom(1)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, goTo, total, zoom, zoomBy, toggleFullscreen])

  const onRenderError = useCallback((e: Error) => setError({ message: `Could not render page: ${e.message}` }), [])

  // swipe (mobile) — only when not zoomed so panning still works
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = zoom <= 1 && t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current
    const t = e.changedTouches[0]
    touchStart.current = null
    if (!s || !t) return
    const dx = t.clientX - s.x
    const dy = t.clientY - s.y
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next() : prev())
  }

  const boxPadding = narrow ? 12 : 32
  const perPageW = size.w > 0 ? (size.w - boxPadding * 2) / Math.max(1, pages.length) : 0
  const boxH = size.h > 0 ? size.h - boxPadding * 2 : 0

  const pageLabel =
    pages.length > 1 ? `${pages[0]}–${pages[1]}` : `${pages[0] ?? page}`

  return (
    <div
      ref={shellRef}
      className={`reader-shell flex flex-col text-ivory ${
        fullscreen && !document.fullscreenElement ? 'fixed inset-0 z-[150]' : 'h-[calc(100dvh-72px)] min-h-[520px]'
      } ${document.fullscreenElement ? 'h-screen' : ''}`}
    >
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2 md:px-5">
        <div className="min-w-0">
          <Link to={`/magazines/${slug}`} className="eyebrow block hover:text-gold-bright">
            ← Back to edition
          </Link>
          <h1 className="display truncate text-xl leading-tight md:text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {!narrow && (
            <button
              type="button"
              className="icon-btn"
              aria-pressed={spread}
              aria-label={spread ? 'Switch to single-page view' : 'Switch to two-page spread'}
              title={spread ? 'Single page' : 'Two-page spread'}
              onClick={() => setSpreadPref(!spread)}
            >
              {spread ? <BookOpen size={18} /> : <Square size={18} />}
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => zoomBy(-0.25)} disabled={zoom <= MIN_ZOOM}>
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            className="icon-btn w-14 text-xs"
            aria-label="Reset zoom"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => zoomBy(0.25)} disabled={zoom >= MAX_ZOOM}>
            <ZoomIn size={18} />
          </button>
          {allowDownload && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Download PDF"
              onClick={() => void downloadPdf(slug).catch((e: Error) => setError({ message: e.message }))}
            >
              <Download size={18} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
            onClick={toggleFullscreen}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* viewport */}
      <div
        ref={viewportRef}
        className="relative flex flex-1 overflow-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        tabIndex={0}
        aria-label="Magazine pages"
      >
        {error ? (
          <div role="alert" className="m-auto max-w-md px-6 text-center">
            <p className="eyebrow mb-3 text-crimson-bright">Reader</p>
            <p className="display mb-5 text-3xl">{error.message}</p>
            {error.status === 401 && (
              <Link to={`/signin?next=${encodeURIComponent(`/read/${slug}`)}`} className="btn btn-gold btn-sm">
                Sign in to read
              </Link>
            )}
          </div>
        ) : !doc ? (
          <div role="status" className="m-auto text-center">
            <p className="eyebrow">Opening edition{loadPct ? ` · ${loadPct}%` : '…'}</p>
            <div className="skeleton mx-auto mt-4 h-px w-48" />
          </div>
        ) : (
          <div className="m-auto flex items-center justify-center" style={{ padding: boxPadding }}>
            {pages.map((p) => (
              <PageCanvas
                key={p}
                doc={doc}
                pageNumber={p}
                boxW={perPageW}
                boxH={boxH}
                zoom={zoom}
                onError={onRenderError}
              />
            ))}
          </div>
        )}

        {doc && !error && (
          <>
            <button
              type="button"
              className="icon-btn !absolute top-1/2 left-2 -translate-y-1/2 !bg-midnight/70 backdrop-blur"
              onClick={prev}
              disabled={atStart}
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="icon-btn !absolute top-1/2 right-2 -translate-y-1/2 !bg-midnight/70 backdrop-blur"
              onClick={next}
              disabled={atEnd}
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* bottom bar */}
      <div className="flex items-center gap-3 border-t border-white/10 px-3 py-2.5 md:px-5">
        <input
          type="range"
          min={1}
          max={Math.max(1, total)}
          value={page}
          onChange={(e) => goTo(Number(e.target.value))}
          disabled={!doc}
          aria-label="Page slider"
          className="h-1 flex-1 cursor-pointer accent-[#c5a572]"
        />
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            const n = parseInt(jump, 10)
            if (!Number.isNaN(n)) goTo(n)
            setJump('')
          }}
        >
          <label htmlFor="page-jump" className="sr-only">
            Go to page
          </label>
          <input
            id="page-jump"
            inputMode="numeric"
            value={jump}
            onChange={(e) => setJump(e.target.value.replace(/\D/g, ''))}
            placeholder={pageLabel}
            className="field field-dark !w-20 !px-2 !py-1.5 text-center"
            disabled={!doc}
          />
          <span className="whitespace-nowrap opacity-60">/ {total || '—'}</span>
        </form>
      </div>
    </div>
  )
}
