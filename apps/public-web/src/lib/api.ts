/**
 * Typed client for THE GLOBAL ICON API (NestJS, global prefix `/api`).
 * Shapes mirror apps/api/src (magazine.mapper.ts, articles/leaders services, etc.).
 */

export const API_BASE: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'
).replace(/\/+$/, '')

/** Origin of the API host (API_BASE without the trailing `/api`). */
export const API_ORIGIN: string = API_BASE.replace(/\/api$/, '')

export const RSS_URL = `${API_BASE}/rss/articles.xml`

/** The API returns media/pdf URLs as root-relative (`/api/media/public/...`). */
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

// ---------------------------------------------------------------- types ----
export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface CategoryRef {
  name: string
  slug: string
}

export interface Magazine {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  publisherName: string | null
  issueNumber: string | null
  issueLabel: string | null
  publicationDate: string
  language: string | null
  category: CategoryRef | null
  editionSeries: { name: string; slug: string; region: string | null } | null
  coverUrl: string | null
  coverAltText: string
  pageCount: number | null
  access: 'PUBLIC' | 'MEMBERS'
  allowDownload: boolean
  isFeatured: boolean
  isDemo: boolean
  hasPdf: boolean
  pdfUrl: string | null
  metaDescription: string | null
}

export interface RelatedArticle {
  slug: string
  title: string
  excerpt: string | null
}

export interface MagazineDetail extends Magazine {
  relatedArticles: RelatedArticle[]
  leaders: { slug: string; name: string; designation: string | null; organization: string | null }[]
}

export interface Edition {
  id: string
  slug: string
  title: string
  subtitle: string | null
  issueNumber: string | null
  issueLabel: string | null
  publicationDate: string
  year: number
  month: number
  series: string | null
  seriesSlug: string | null
  region: string | null
  category: CategoryRef | null
  coverUrl: string | null
  coverAltText: string
  pageCount: number | null
  access: 'PUBLIC' | 'MEMBERS'
  isDemo: boolean
  isFeatured: boolean
  detailUrl: string
  pdfUrl: string | null
}

export interface EditionsResponse extends Paginated<Edition> {
  facets: { years: number[]; series: { slug: string; name: string }[] }
}

export interface MagazinesResponse extends Paginated<Magazine> {
  facets?: { years: number[]; categories: { slug: string; name: string }[] }
}

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  excerpt: string | null
  language: string | null
  author: { name: string; slug: string } | null
  category: CategoryRef | null
  featuredImageUrl: string | null
  isFeatured: boolean
  isSponsored: boolean
  memberOnly: boolean
  publishedAt: string | null
}

export interface ArticleDetail extends ArticleSummary {
  metaDescription: string | null
  locked: boolean
  body: string | null
}

export interface Leader {
  id: string
  slug: string
  name: string
  designation: string | null
  organization: string | null
  introduction: string | null
  portraitUrl: string | null
  category: CategoryRef | null
  publicationDate: string
  isFeatured: boolean
  magazine: { slug: string; title: string } | null
  article: { slug: string; title: string } | null
}

export interface SiteSettings {
  siteName: string
  tagline: string
  heroTitle: string
  heroCopy: string
  newsletterHeading: string
  newsletterCopy: string
  contactEmail: string | null
  contactPhone: string | null
  officeAddress: string | null
  contactResponseTime: string | null
  social: {
    linkedin: string | null
    instagram: string | null
    twitter: string | null
    youtube: string | null
  }
}

export interface HomeData {
  settings: SiteSettings
  announcement: {
    title: string
    message: string
    linkLabel: string | null
    linkUrl: string | null
  } | null
  featuredMagazine: Magazine | null
  featuredArticle: {
    slug: string
    title: string
    excerpt: string | null
    featuredImageUrl: string | null
  } | null
  latestMagazines: Magazine[]
  stories: {
    slug: string
    title: string
    excerpt: string | null
    author: { name: string; slug: string } | null
    category: CategoryRef | null
    featuredImageUrl: string | null
    publishedAt: string | null
  }[]
  leaders: {
    slug: string
    name: string
    designation: string | null
    organization: string | null
    portraitUrl: string | null
  }[]
  sections: {
    title: string
    subtitle: string | null
    category: CategoryRef | null
    articles: { slug: string; title: string; excerpt: string | null; featuredImageUrl: string | null }[]
  }[]
  partners: { name: string; logoUrl: string | null; websiteUrl: string | null }[]
}

export interface SearchResults {
  query: string
  magazines: {
    slug: string
    title: string
    issueNumber: string | null
    publicationDate: string
    coverUrl: string | null
  }[]
  articles: {
    slug: string
    title: string
    excerpt?: string | null
    featuredImageUrl?: string | null
  }[]
  leaders: {
    slug: string
    name: string
    designation: string | null
    organization: string | null
    portraitUrl: string | null
  }[]
}

export interface AuthUser {
  id: string
  email: string
  username: string
  firstName: string | null
  lastName: string | null
  roles: string[]
  permissions: string[]
}

export interface Session {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: string | number
  user: AuthUser
}

export type EnquiryType =
  | 'ADVERTISING'
  | 'FEATURE'
  | 'SUBSCRIPTION'
  | 'PARTNERSHIP'
  | 'COLLABORATION'
  | 'EDITORIAL'
  | 'TECHNICAL'
  | 'GENERAL'

export interface EnquiryInput {
  fullName: string
  company: string
  email: string
  phone?: string
  jobTitle?: string
  website?: string
  countryOrRegion?: string
  enquiryType: EnquiryType
  subject: string
  message: string
  estimatedBudget?: string
  preferredContact?: string
}

// ---------------------------------------------------------------- core -----
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let accessToken: string | null = null
export function setAccessToken(token: string | null): void {
  accessToken = token
}
export function getAccessToken(): string | null {
  return accessToken
}

type Query = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || `Request failed (${res.status})`
  try {
    const data = (await res.json()) as { message?: string | string[] }
    if (Array.isArray(data.message)) message = data.message.join(' ')
    else if (data.message) message = data.message
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, message)
}

async function request<T>(
  method: string,
  path: string,
  opts: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      credentials: 'include', // refresh-token cookie lives on /api/auth
      signal: opts.signal,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError(0, 'Unable to reach the server. Please try again shortly.')
  }
  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
}

// ------------------------------------------------------------ endpoints ----
export const api = {
  home: (signal?: AbortSignal) => http.get<HomeData>('/site/homepage', undefined, signal),
  settings: (signal?: AbortSignal) => http.get<SiteSettings>('/site/settings', undefined, signal),

  activeTheme: (signal?: AbortSignal) =>
    http.get<{
      slug: string
      name: string
      source: string
      tokens: Record<string, string>
      effects: Record<string, unknown> | null
      allowReaderPreference: boolean
      effectsEnabled: boolean
      priorityRules: string[]
      serverTime: string
    }>('/themes/active', undefined, signal),

  managedPage: (slug: string, signal?: AbortSignal) =>
    http.get<{
      slug: string
      title: string
      description: string | null
      content: Record<string, unknown>
      pageThemeSlug: string | null
    }>(`/pages/${encodeURIComponent(slug)}`, undefined, signal),

  magazines: (
    q: {
      page?: number
      limit?: number
      q?: string
      category?: string
      featured?: boolean
      year?: number
    } = {},
    signal?: AbortSignal,
  ) => http.get<MagazinesResponse>('/magazines', q, signal),
  showcase: (signal?: AbortSignal) => http.get<{ items: Magazine[] }>('/magazines/showcase', undefined, signal),
  magazine: (slug: string, signal?: AbortSignal) =>
    http.get<MagazineDetail>(`/magazines/${encodeURIComponent(slug)}`, undefined, signal),
  progress: (slug: string) =>
    http.get<{ slug: string; lastPage: number; lastViewedAt: string | null }>(
      `/magazines/${encodeURIComponent(slug)}/progress`,
    ),
  saveProgress: (slug: string, page: number) =>
    http.put<{ slug: string; lastPage: number }>(`/magazines/${encodeURIComponent(slug)}/progress`, { page }),

  editions: (
    q: { page?: number; limit?: number; q?: string; series?: string; year?: number } = {},
    signal?: AbortSignal,
  ) => http.get<EditionsResponse>('/editions', q, signal),

  articles: (
    q: { page?: number; limit?: number; q?: string; category?: string } = {},
    signal?: AbortSignal,
  ) => http.get<Paginated<ArticleSummary>>('/articles', q, signal),
  article: (slug: string, signal?: AbortSignal) =>
    http.get<ArticleDetail>(`/articles/${encodeURIComponent(slug)}`, undefined, signal),

  leaders: (
    q: { page?: number; limit?: number; q?: string; category?: string } = {},
    signal?: AbortSignal,
  ) => http.get<Paginated<Leader>>('/leaders', q, signal),
  leader: (slug: string, signal?: AbortSignal) =>
    http.get<Leader>(`/leaders/${encodeURIComponent(slug)}`, undefined, signal),

  search: (q: string, limit = 6, signal?: AbortSignal) =>
    http.get<SearchResults>('/search', { q, limit }, signal),

  contact: (input: EnquiryInput) =>
    http.post<{ reference: string; submittedAt: string; message: string }>('/contact', input),
  subscribe: (email: string, consent: boolean) =>
    http.post<{ subscribed: boolean; message: string }>('/newsletter/subscribe', { email, consent }),

  login: (identifier: string, password: string) =>
    http.post<Session>('/auth/login', { identifier, password }),
  register: (input: {
    email: string
    username: string
    password: string
    firstName?: string
    lastName?: string
  }) => http.post<Session>('/auth/register', input),
  refresh: () => http.post<Session>('/auth/refresh'),
  logout: () => http.post<{ success: boolean }>('/auth/logout'),
}

/** Download a PDF (with auth header when signed in) and hand it to the browser. */
export async function downloadPdf(slug: string): Promise<void> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const res = await fetch(`${API_BASE}/magazines/${encodeURIComponent(slug)}/pdf?download=true`, {
    headers,
    credentials: 'include',
  })
  if (!res.ok) throw await parseError(res)
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = `${slug}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 10_000)
}
