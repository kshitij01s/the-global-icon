import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { assetUrl, type ApiError } from '../lib/api'
import { initials } from '../lib/format'

/** Scroll-reveal wrapper. Reduced-motion is handled globally by <MotionConfig reducedMotion="user">. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'li' | 'article' | 'section'
}) {
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </Tag>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  action,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  action?: { to: string; label: string }
}) {
  return (
    <div
      className={`mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-14 ${align === 'center' ? 'justify-center text-center' : ''}`}
    >
      <div className={align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h2 className="display text-4xl md:text-6xl">{title}</h2>
        {lead && <p className="mt-5 text-lg opacity-75">{lead}</p>}
      </div>
      {action && (
        <Link to={action.to} className="link-arrow">
          {action.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

/** Cover with graceful typographic fallback if the API image is missing/unreachable. */
export function CoverImage({
  src,
  alt,
  title,
  label,
  className = '',
  eager,
}: {
  src: string | null | undefined
  alt: string
  title: string
  label?: string | null
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  return (
    <div className={`cover-frame ${className}`}>
      {url && !failed ? (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-fallback" role="img" aria-label={alt}>
          <span className="eyebrow" style={{ fontSize: '0.6rem' }}>
            THE GLOBAL ICON
          </span>
          <span className="display text-2xl leading-tight">{title}</span>
          <span className="text-xs tracking-widest uppercase opacity-60">{label ?? 'Edition'}</span>
        </div>
      )}
    </div>
  )
}

export function Portrait({
  src,
  name,
  className = '',
}: {
  src: string | null | undefined
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={`flex items-center justify-center bg-gradient-to-br from-navy-2 to-midnight ${className}`}
    >
      <span className="display gold-text text-6xl">{initials(name)}</span>
    </div>
  )
}

export function StoryImage({
  src,
  alt,
  className = '',
}: {
  src: string | null | undefined
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden bg-gradient-to-br from-navy-2 via-navy to-midnight ${className}`}
    >
      <img src="/brand/globe.svg" alt="" className="absolute -right-6 -bottom-6 w-2/3 opacity-30" />
    </div>
  )
}

export function Loading({ label = 'Loading…', dark = true }: { label?: string; dark?: boolean }) {
  return (
    <div role="status" className={`container-x py-24 text-center ${dark ? 'opacity-70' : 'opacity-60'}`}>
      <span className="eyebrow">{label}</span>
      <div className="skeleton mx-auto mt-5 h-px w-40" />
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'We could not load this content',
}: {
  error: ApiError | Error | null
  onRetry?: () => void
  title?: string
}) {
  return (
    <div role="alert" className="container-x py-20 text-center">
      <p className="eyebrow mb-3" style={{ color: 'var(--color-crimson-bright)' }}>
        Something went wrong
      </p>
      <h3 className="display mb-3 text-3xl">{title}</h3>
      <p className="mx-auto mb-6 max-w-lg opacity-70">{error?.message ?? 'Please try again shortly.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-gold btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="py-16 text-center">
      <h3 className="display mb-2 text-3xl">{title}</h3>
      {children && <p className="mx-auto max-w-md opacity-70">{children}</p>}
    </div>
  )
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  className = '',
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={`relative overflow-hidden ${className}`}>
      <div className="container-x relative py-16 md:py-24">
        <motion.p
          className="eyebrow mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          className="display max-w-4xl text-5xl md:text-7xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08 }}
        >
          {title}
        </motion.h1>
        {lead && (
          <motion.p
            className="mt-6 max-w-2xl text-lg opacity-75 md:text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
          >
            {lead}
          </motion.p>
        )}
        {children}
      </div>
    </header>
  )
}
