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
  intensity?: 'subtle' | 'medium'
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
  schedule: {
    id: string
    eventKey: string
    name: string
    startsAt: string
    endsAt: string
    priority: number
    timezone: string
  } | null
  priorityRules: string[]
  serverTime: string
}

type ReaderMode = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  active: ActiveTheme | null
  loading: boolean
  readerMode: ReaderMode
  setReaderMode: (mode: ReaderMode) => void
  refresh: () => Promise<void>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'tgi-reader-mode'

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

function applyReaderMode(mode: ReaderMode, allowed: boolean, themeMode: string | undefined) {
  const root = document.documentElement
  if (!allowed) {
    root.dataset.readerMode = 'off'
    return
  }
  let resolved = mode
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  // Reader preference remaps reading surfaces without wiping brand tokens entirely.
  if (resolved === 'light' && themeMode !== 'light') {
    root.style.setProperty('--color-paper', '#fcfaf5')
    root.style.setProperty('--color-ivory', '#1a1d24')
    root.style.setProperty('--color-ink', '#12151c')
  }
  if (resolved === 'dark' && themeMode === 'light') {
    root.style.setProperty('--color-paper', '#0b0f16')
    root.style.setProperty('--color-ivory', '#f5eedf')
    root.style.setProperty('--color-ink', '#f5eedf')
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/themes/active`, { credentials: 'include' })
      if (!res.ok) throw new Error('theme fetch failed')
      const data = (await res.json()) as ActiveTheme
      setActive(data)
      applyTokens(data.tokens)
      document.documentElement.dataset.theme = data.slug
      document.documentElement.dataset.themeSource = data.source
      applyReaderMode(readerMode, data.allowReaderPreference, data.tokens['theme-mode'])
    } catch {
      // Fallback: keep CSS defaults from index.css
      setActive(null)
    } finally {
      setLoading(false)
    }
  }, [readerMode])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setReaderMode = useCallback(
    (mode: ReaderMode) => {
      setReaderModeState(mode)
      localStorage.setItem(STORAGE_KEY, mode)
      if (active) applyReaderMode(mode, active.allowReaderPreference, active.tokens['theme-mode'])
    },
    [active],
  )

  const value = useMemo(
    () => ({ active, loading, readerMode, setReaderMode, refresh }),
    [active, loading, readerMode, setReaderMode, refresh],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
