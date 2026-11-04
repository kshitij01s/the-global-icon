import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { API_BASE } from './api'

export type ThemeTokens = Record<string, string>

export type ThemeEffects = {
  snowfall?: boolean
  festiveLights?: boolean
  snowman?: boolean
  christmasTree?: boolean
  diyaGlow?: boolean
  colourBurst?: boolean
  hearts?: boolean
  fireworks?: boolean
  natureLeaves?: boolean
  lanterns?: boolean
  fog?: boolean
  petals?: boolean
  confetti?: boolean
  crescentGlow?: boolean
  pumpkins?: boolean
  intensity?: 'subtle' | 'medium'
  speed?: number
  opacity?: number
  quantity?: number
}

export type ActiveTheme = {
  source: 'manual_override' | 'festival' | 'global'
  slug: string
  name: string
  kind: string
  festivalKey: string | null
  tokens: ThemeTokens
  effects: ThemeEffects | null
  effectsEnabled: boolean
  allowReaderPreference: boolean
  allowAdminGlobalChange: boolean
  allowVisitorRegionSelect?: boolean
  schedule: {
    id: string
    eventKey: string
    name: string
    startsAt: string
    endsAt: string
    priority: number
    timezone: string
    countryCode?: string | null
    regionCode?: string | null
  } | null
  priorityRules: string[]
  serverTime: string
  effectiveTime?: string
  region?: { countryCode?: string; regionCode?: string }
}

type ReaderMode = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  active: ActiveTheme | null
  loading: boolean
  readerMode: ReaderMode
  setReaderMode: (mode: ReaderMode) => void
  preferredCountry: string
  setPreferredCountry: (code: string) => void
  refresh: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'tgi-reader-mode'
const REGION_KEY = 'tgi-preferred-country'

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'theme-mode') {
      root.dataset.themeMode = value
      continue
    }
    root.style.setProperty(`--${key}`, value)
  }
}

/**
 * Reader preference adjusts reading surfaces without wiping brand tokens.
 * Always re-apply active tokens first so Light→Dark does not leave stale overrides.
 */
function applyReaderMode(
  mode: ReaderMode,
  allowed: boolean,
  tokens: ThemeTokens | undefined,
) {
  const root = document.documentElement
  if (tokens) applyTokens(tokens)
  if (!allowed) {
    root.dataset.readerMode = 'off'
    return
  }
  let resolved: 'light' | 'dark' = mode === 'light' || mode === 'dark' ? mode : 'dark'
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  const themeMode = tokens?.['theme-mode']
  if (resolved === 'light') {
    root.style.setProperty('--color-paper', '#fcfaf5')
    root.style.setProperty('--color-ivory', '#1a1d24')
    root.style.setProperty('--color-ink', '#12151c')
    root.style.setProperty('--color-midnight', '#f7f4ec')
    root.style.setProperty('--color-navy', '#efe8d8')
    root.style.setProperty('--color-charcoal', '#f3eee3')
    if (themeMode !== 'light') {
      root.dataset.themeMode = 'light'
    }
  } else if (themeMode === 'light') {
    // Prefer dark reading surfaces when the active brand theme is light
    root.style.setProperty('--color-paper', '#0b0f16')
    root.style.setProperty('--color-ivory', '#f5eedf')
    root.style.setProperty('--color-ink', '#f5eedf')
    root.dataset.themeMode = 'dark'
  }
  root.dataset.readerMode = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTheme | null>(null)
  const [loading, setLoading] = useState(true)
  const [readerMode, setReaderModeState] = useState<ReaderMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ReaderMode | null
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })
  const [preferredCountry, setPreferredCountryState] = useState(() => {
    return localStorage.getItem(REGION_KEY) || ''
  })

  const refresh = useCallback(async () => {
    try {
      const qs = preferredCountry ? `?country=${encodeURIComponent(preferredCountry)}` : ''
      const res = await fetch(`${API_BASE}/themes/active${qs}`, { credentials: 'include' })
      if (!res.ok) throw new Error('theme fetch failed')
      const data = (await res.json()) as ActiveTheme
      setActive(data)
      document.documentElement.dataset.theme = data.slug
      document.documentElement.dataset.themeSource = data.source
      applyReaderMode(readerMode, data.allowReaderPreference, data.tokens)
    } catch {
      setActive(null)
    } finally {
      setLoading(false)
    }
  }, [readerMode, preferredCountry])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 60_000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (readerMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      if (active) applyReaderMode('system', active.allowReaderPreference, active.tokens)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [readerMode, active])

  const setReaderMode = useCallback(
    (mode: ReaderMode) => {
      setReaderModeState(mode)
      localStorage.setItem(STORAGE_KEY, mode)
      if (active) {
        applyReaderMode(mode, active.allowReaderPreference, active.tokens)
      }
    },
    [active],
  )

  const setPreferredCountry = useCallback((code: string) => {
    const next = code.toUpperCase()
    setPreferredCountryState(next)
    if (next) localStorage.setItem(REGION_KEY, next)
    else localStorage.removeItem(REGION_KEY)
  }, [])

  const value = useMemo(
    () => ({
      active,
      loading,
      readerMode,
      setReaderMode,
      preferredCountry,
      setPreferredCountry,
      refresh,
    }),
    [active, loading, readerMode, setReaderMode, preferredCountry, setPreferredCountry, refresh],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
