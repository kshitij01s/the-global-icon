import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Moon, Rss, Search, Sun, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { RSS_URL, api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync } from '../lib/hooks'
import { useTheme } from '../lib/theme'
import FestivalEffects from './FestivalEffects'
import { SearchResultsView } from './SearchPanel'

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/editions', label: 'Editions' },
  { to: '/magazines', label: 'Magazines' },
  { to: '/stories', label: 'Stories' },
  { to: '/leaders', label: 'Leaders' },
  { to: '/discover', label: 'Discover' },
  { to: '/advertise', label: 'Advertise' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
]

const MAG_MEGA = {
  browse: [
    { to: '/magazines', label: 'All Magazines' },
    { to: '/magazines?featured=1', label: 'Featured Magazines' },
    { to: '/editions', label: 'Magazine Archive' },
    { to: '/magazines?year=2025', label: '2025 Collection' },
    { to: '/magazines?year=2026', label: '2026 Collection' },
  ],
  industries: [
    { to: '/magazines?category=business', label: 'Business & Leadership' },
    { to: '/magazines?category=technology', label: 'Technology & Innovation' },
    { to: '/magazines?category=demo-category-entrepreneurship', label: 'Entrepreneurs & Founders' },
    { to: '/magazines?category=demo-category-leadership', label: 'Women in Leadership' },
  ],
}

const STORY_MEGA = [
  { to: '/stories', label: 'Latest Stories' },
  { to: '/stories?category=business', label: 'Business' },
  { to: '/stories?category=technology', label: 'Technology' },
  { to: '/stories?category=leadership', label: 'Leadership' },
  { to: '/stories?category=entrepreneurship', label: 'Entrepreneurship' },
  { to: '/stories?category=healthcare', label: 'Healthcare' },
]

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (q.trim().length < 2) return
    onClose()
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-midnight/90 p-4 pt-[8vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            className="w-full max-w-2xl border border-gold/30 bg-navy p-6 shadow-2xl md:p-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <p className="eyebrow">Search THE GLOBAL ICON</p>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Close search">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submit} role="search">
              <label htmlFor="dialog-search" className="sr-only">
                Search
              </label>
              <input
                id="dialog-search"
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="field field-dark display text-2xl"
                placeholder="Editions, stories, leaders…"
                autoComplete="off"
              />
            </form>
            <div className="mt-6 max-h-[55vh] overflow-y-auto pr-1">
              <SearchResultsView query={q} limit={4} onNavigate={onClose} />
            </div>
            {q.trim().length >= 2 && (
              <button
                type="button"
                className="link-arrow mt-6"
                onClick={() => {
                  onClose()
                  navigate(`/search?q=${encodeURIComponent(q.trim())}`)
                }}
              >
                See all results
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Header({ onSearch }: { onSearch: () => void }) {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="site-header">
      <div className="container-x flex min-h-[4.75rem] items-center justify-between gap-4 py-2 md:min-h-[5.25rem]">
        <Link to="/" aria-label="THE GLOBAL ICON — home" className="brand-lockup shrink-0">
          <img src="/brand/logo-light.svg" alt="" className="brand-mark-img" aria-hidden />
          <span className="brand-copy">
            <span className="brand-name">THE GLOBAL ICON</span>
            <span className="brand-tagline">Stories That Shape Tomorrow.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-3 2xl:gap-4 xl:flex" aria-label="Primary">
          {NAV.map((n) => {
            if (n.to === '/magazines') {
              return (
                <div key={n.to} className="nav-mega group/mega">
                  <NavLink to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Magazines
                  </NavLink>
                  <div className="nav-mega-panel invisible opacity-0 transition group-hover/mega:visible group-hover/mega:opacity-100 group-focus-within/mega:visible group-focus-within/mega:opacity-100">
                    <div className="nav-mega-cols">
                      <div>
                        <p className="nav-mega-label">Browse</p>
                        {MAG_MEGA.browse.map((item) => (
                          <Link key={item.to} to={item.to}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div>
                        <p className="nav-mega-label">By industry</p>
                        {MAG_MEGA.industries.map((item) => (
                          <Link key={item.to} to={item.to}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
            if (n.to === '/stories') {
              return (
                <div key={n.to} className="nav-mega group/stories">
                  <NavLink to={n.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    Stories
                  </NavLink>
                  <div className="nav-mega-panel invisible opacity-0 transition group-hover/stories:visible group-hover/stories:opacity-100 group-focus-within/stories:visible group-focus-within/stories:opacity-100">
                    <p className="nav-mega-label">Editorial</p>
                    {STORY_MEGA.map((item) => (
                      <Link key={item.to} to={item.to}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            }
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {n.label}
              </NavLink>
            )
          })}
          <button type="button" className="nav-link inline-flex items-center gap-1.5" onClick={onSearch}>
            <Search size={14} aria-hidden /> Search
          </button>
          <ReaderThemeToggle />
          <a className="nav-link inline-flex items-center gap-1.5" href={RSS_URL} target="_blank" rel="noreferrer" title="RSS 2.0 stories feed">
            <Rss size={14} aria-hidden /> RSS
          </a>
          {user ? (
            <button
              type="button"
              className="nav-link text-gold"
              onClick={() => void signOut()}
              title={`Signed in as ${user.username}`}
            >
              Sign out
            </button>
          ) : (
            <NavLink to="/signin" className={({ isActive }) => `nav-cta ${isActive ? 'active' : ''}`}>
              Sign in
            </NavLink>
          )}
        </nav>

        <button
          type="button"
          className="icon-btn xl:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            className="fixed inset-x-0 top-[var(--header-h,5.25rem)] bottom-0 z-50 overflow-y-auto bg-midnight/97 xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="container-x flex flex-col py-8">
              {NAV.map((n, i) => (
                <motion.div key={n.to} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <NavLink
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `display block border-b border-white/10 py-3.5 text-4xl ${isActive ? 'text-gold' : 'text-ivory'}`
                    }
                  >
                    {n.label}
                  </NavLink>
                </motion.div>
              ))}
              <button
                type="button"
                className="display flex items-center gap-3 border-b border-white/10 py-3.5 text-left text-4xl"
                onClick={() => {
                  setOpen(false)
                  onSearch()
                }}
              >
                Search
              </button>
              <a className="display border-b border-white/10 py-3.5 text-4xl" href={RSS_URL} target="_blank" rel="noreferrer">
                RSS
              </a>
              {user ? (
                <button type="button" className="display py-3.5 text-left text-4xl text-gold" onClick={() => void signOut()}>
                  Sign out
                </button>
              ) : (
                <Link to="/signin" className="display py-3.5 text-4xl text-gold">
                  Sign in
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

function Footer() {
  const { data: settings } = useAsync((s) => api.settings(s), [])
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setState({ kind: 'busy' })
    try {
      const res = await api.subscribe(email, consent)
      setState({ kind: res.subscribed ? 'ok' : 'err', msg: res.message })
      if (res.subscribed) setEmail('')
    } catch (err) {
      setState({ kind: 'err', msg: (err as Error).message })
    }
  }

  return (
    <footer className="mood-midnight border-t border-gold/20">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.2fr_1fr_1.2fr]">
        <div>
          <img src="/brand/logo-light.svg" alt="THE GLOBAL ICON" className="mb-5 h-12 w-auto" />
          <p className="max-w-xs opacity-65">
            {settings?.heroCopy ?? "Discover the people, ideas, and innovations shaping tomorrow's world."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {settings &&
              (
                [
                  ['LinkedIn', settings.social.linkedin],
                  ['Instagram', settings.social.instagram],
                  ['X', settings.social.twitter],
                  ['YouTube', settings.social.youtube],
                ] as const
              )
                .filter(([, url]) => url)
                .map(([label, url]) => (
                  <a key={label} href={url!} target="_blank" rel="noreferrer" className="nav-link">
                    {label}
                  </a>
                ))}
          </div>
        </div>

        <nav aria-label="Footer">
          <p className="eyebrow mb-4">Explore</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {[...NAV.slice(1), { to: '/search', label: 'Search' }, { to: '/signin', label: 'Sign in' }].map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="opacity-75 transition-opacity hover:text-gold hover:opacity-100">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={RSS_URL} target="_blank" rel="noreferrer" className="opacity-75 hover:text-gold hover:opacity-100">
                RSS feed
              </a>
            </li>
          </ul>
        </nav>

        <form onSubmit={submit} aria-labelledby="nl-heading">
          <p id="nl-heading" className="eyebrow mb-3">
            Newsletter
          </p>
          <p className="display mb-1 text-3xl">{settings?.newsletterHeading ?? 'The week, in perspective.'}</p>
          <p className="mb-4 text-sm opacity-65">
            {settings?.newsletterCopy ?? 'Thoughtful reads and new editions, delivered to your inbox.'}
          </p>
          <div className="flex gap-2">
            <label htmlFor="nl-email" className="sr-only">
              Email address
            </label>
            <input
              id="nl-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field field-dark"
              placeholder="you@example.com"
              autoComplete="email"
            />
            <button className="btn btn-gold btn-sm" disabled={state.kind === 'busy' || !consent}>
              Subscribe
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs opacity-70">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 accent-[#c5a572]"
            />
            I agree to receive THE GLOBAL ICON newsletters and can unsubscribe at any time.
          </label>
          {state.msg && (
            <p role="status" className={`mt-3 text-sm ${state.kind === 'ok' ? 'text-gold' : 'text-crimson-bright'}`}>
              {state.msg}
            </p>
          )}
        </form>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs tracking-widest uppercase opacity-50">
        © {new Date().getFullYear()} THE GLOBAL ICON · Stories That Shape Tomorrow.
      </div>
    </footer>
  )
}

function ReaderThemeToggle() {
  const { active, readerMode, setReaderMode, preferredCountry, setPreferredCountry } = useTheme()
  if (!active?.allowReaderPreference && !active?.allowVisitorRegionSelect) return null
  const next = readerMode === 'dark' ? 'light' : readerMode === 'light' ? 'system' : 'dark'
  const label = readerMode === 'dark' ? 'Dark' : readerMode === 'light' ? 'Light' : 'System'
  return (
    <span className="inline-flex items-center gap-2">
      {active?.allowVisitorRegionSelect !== false && (
        <label className="nav-link inline-flex items-center gap-1.5" title="Preferred region for festival themes">
          <span className="sr-only">Region</span>
          <select
            className="bg-transparent border-0 text-inherit text-xs tracking-wide uppercase cursor-pointer outline-none"
            value={preferredCountry}
            onChange={(e) => setPreferredCountry(e.target.value)}
            aria-label="Preferred festival region"
          >
            <option value="">Global</option>
            <option value="IN">India</option>
            <option value="US">USA</option>
            <option value="GB">UK</option>
            <option value="CN">China</option>
            <option value="JP">Japan</option>
            <option value="AE">UAE</option>
            <option value="SA">Saudi</option>
            <option value="DE">Germany</option>
          </select>
        </label>
      )}
      {active?.allowReaderPreference && (
        <button
          type="button"
          className="nav-link inline-flex items-center gap-1.5"
          title={`Reading preference: ${label} (click to cycle)`}
          onClick={() => setReaderMode(next)}
        >
          {readerMode === 'light' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
          {label}
        </button>
      )}
    </span>
  )
}

export default function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const close = useCallback(() => setSearchOpen(false), [])
  const isReader = location.pathname.startsWith('/read/')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  useEffect(() => {
    document.body.dataset.readerActive = isReader ? '1' : '0'
    return () => {
      delete document.body.dataset.readerActive
    }
  }, [isReader])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-gold focus:px-4 focus:py-2 focus:text-midnight"
      >
        Skip to content
      </a>
      <FestivalEffects disable={isReader} />
      <Header onSearch={() => setSearchOpen(true)} />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <SearchDialog open={searchOpen} onClose={close} />
    </>
  )
}
