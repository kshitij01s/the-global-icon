import { createElement, Fragment, type ReactNode } from 'react'

const ALLOWED = new Set(['p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'a', 'hr'])
const RENAME: Record<string, string> = { h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3', b: 'strong', i: 'em' }

function safeHref(href: string | null): string | undefined {
  if (!href) return undefined
  return /^(https?:|mailto:|\/)/i.test(href.trim()) ? href.trim() : undefined
}

function convert(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent
  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as Element
  const raw = el.tagName.toLowerCase()
  if (raw === 'script' || raw === 'style' || raw === 'iframe') return null
  const tag = RENAME[raw] ?? raw
  const children = Array.from(el.childNodes).map(convert)
  if (!ALLOWED.has(tag)) return <Fragment key={key}>{children}</Fragment>
  if (tag === 'br' || tag === 'hr') return createElement(tag, { key })
  if (tag === 'a') {
    const href = safeHref(el.getAttribute('href'))
    return href ? (
      <a key={key} href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    ) : (
      <Fragment key={key}>{children}</Fragment>
    )
  }
  return createElement(tag, { key }, ...children)
}

/** Renders article body as sanitised HTML (allow-listed tags only) or as plain paragraphs. */
export default function ArticleBody({ body }: { body: string }) {
  const looksHtml = /<\/?(p|h[1-6]|ul|ol|blockquote|br|div|strong|em)\b/i.test(body)
  if (looksHtml) {
    const doc = new DOMParser().parseFromString(body, 'text/html')
    return <div className="prose-tgi">{Array.from(doc.body.childNodes).map(convert)}</div>
  }
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="prose-tgi">
      {blocks.map((b, i) =>
        /^#{1,3}\s/.test(b) ? (
          <h2 key={i}>{b.replace(/^#{1,3}\s+/, '')}</h2>
        ) : b.startsWith('> ') ? (
          <blockquote key={i}>{b.replace(/^>\s?/gm, '')}</blockquote>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  )
}
