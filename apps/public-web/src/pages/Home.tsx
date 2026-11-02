import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'
import MagazineCard from '../components/MagazineCard'
import { CoverImage, ErrorState, Portrait, Reveal, SectionHeading, StoryImage } from '../components/ui'
import { api, assetUrl, type HomeData } from '../lib/api'
import { formatDate, formatMonthYear } from '../lib/format'
import { useAsync, useDocumentTitle } from '../lib/hooks'

type HomeCms = {
  heroEyebrow?: string
  heroTitle?: string
  heroTagline?: string
  turnPagesHeadline?: string
  turnPagesCopy?: string
  ctaMagazines?: string
  ctaStories?: string
}

function Hero({ data, cms }: { data: HomeData | null; cms: HomeCms }) {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['0%', '18%'])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const copy = data?.settings.heroCopy ?? "Discover the people, ideas, and innovations shaping tomorrow's world."
  const tagline = cms.heroTagline ?? data?.settings.tagline ?? 'Stories That Shape Tomorrow.'
  const brand = cms.heroTitle ?? data?.settings.siteName ?? 'THE GLOBAL ICON'

  return (
    <section ref={ref} className="relative isolate flex min-h-[calc(100svh-72px)] items-center overflow-hidden bg-midnight">
      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <div className={`hero-bg ${reduce ? '' : 'animate'}`} />
      </motion.div>
      <div className="hero-vignette -z-10" />

      {/* orbit lines: globe feel, decorative */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 hidden -translate-x-1/2 -translate-y-[56%] md:block">
        <div className="relative h-[min(78vh,760px)] w-[min(78vh,760px)]">
          <div className="orbit-ring inset-0" />
          <div className="orbit-ring crimson inset-[7%]" />
        </div>
      </div>

      <motion.div style={{ opacity: fade }} className="container-x relative py-20 text-center">
        <motion.p
          className="eyebrow mb-6"
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.28em' }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        >
          {cms.heroEyebrow ?? 'An international editorial house'}
        </motion.p>
        <motion.h1
          className="display mx-auto max-w-5xl text-[clamp(3rem,10vw,8.5rem)] leading-[0.92] tracking-tight"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {brand.includes('GLOBAL') ? (
            <>
              <span className="block text-[0.34em] tracking-[0.5em] text-ivory/80">THE</span>
              <span className="gold-text">GLOBAL ICON</span>
            </>
          ) : (
            <span className="gold-text">{brand}</span>
          )}
        </motion.h1>
        <motion.p
          className="display mt-6 text-2xl text-ivory italic md:text-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
        >
          {tagline}
        </motion.p>
        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg text-ivory/75"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.95 }}
        >
          {copy}
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.15 }}
        >
          <Link to="/magazines" className="btn btn-gold">
            {cms.ctaMagazines ?? 'Explore Magazines'}
          </Link>
          <Link to="/stories" className="btn btn-ghost">
            {cms.ctaStories ?? 'Discover Stories'}
          </Link>
        </motion.div>
      </motion.div>

      <a
        href="#turn-the-pages"
        aria-label="Scroll to Turn the pages of the moment"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gold/80 transition-colors hover:text-gold-bright"
      >
        <ChevronDown size={28} className={reduce ? '' : 'animate-bounce'} />
      </a>
    </section>
  )
}

function TurnThePages({
  featured,
  cms,
}: {
  featured: NonNullable<HomeData['latestMagazines']>[number] | HomeData['featuredMagazine'] | null
  cms: HomeCms
}) {
  const reduce = useReducedMotion()
  const headline = cms.turnPagesHeadline ?? 'Turn the pages of the moment'
  const [first, ...rest] = headline.split(' of ')
  return (
    <section id="turn-the-pages" className="relative isolate overflow-hidden mood-navy section">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute -left-24 top-10 h-72 w-48 rotate-[-12deg] border border-gold/20 bg-ivory/5 shadow-2xl" />
        <div className="absolute -right-16 bottom-8 h-80 w-52 rotate-[8deg] border border-crimson/25 bg-ivory/5" />
        <div className="paper-grain absolute inset-0" />
      </div>
      <div className="container-x grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <Reveal>
          <p className="eyebrow mb-5">The moment, in print</p>
          <h2 className="display text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.95] tracking-tight">
            <span className="block text-ivory/90">{first}</span>
            {rest.length > 0 && <span className="gold-text italic">of {rest.join(' of ')}</span>}
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ivory/75 md:text-xl">
            {cms.turnPagesCopy ??
              'Discover global stories, influential people, ideas, and publications shaping international business, leadership, and culture — curated as a living newsstand for THE GLOBAL ICON.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/magazines" className="btn btn-gold">
              {cms.ctaMagazines ?? 'Explore Magazines'}
            </Link>
            <Link to="/stories" className="btn btn-ghost">
              {cms.ctaStories ?? 'Discover Stories'}
            </Link>
            <Link to="/magazines?year=2025" className="btn btn-ghost">
              2025 Collection
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          {featured ? (
            <Link
              to={`/magazines/${featured.slug}`}
              className={`mx-auto block max-w-xs ${reduce ? '' : 'card-lift'} shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)]`}
              aria-label={`Open ${featured.title}`}
            >
              <CoverImage
                src={featured.coverUrl}
                alt={featured.coverAltText}
                title={featured.title}
                label={featured.issueLabel}
                eager
              />
              <p className="mt-4 text-center text-sm tracking-widest text-gold/80 uppercase">Featured cover</p>
            </Link>
          ) : (
            <div className="mx-auto aspect-[2/3] w-full max-w-xs border border-gold/25 bg-midnight/40" aria-hidden />
          )}
        </Reveal>
      </div>
    </section>
  )
}

function Skeletons() {
  return (
    <div className="container-x grid gap-8 py-24 md:grid-cols-[1fr_1.2fr]" aria-hidden>
      <div className="skeleton aspect-[2/3] max-w-sm" />
      <div className="space-y-4 py-8">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-16 w-3/4" />
        <div className="skeleton h-24 w-full" />
      </div>
    </div>
  )
}

export default function Home() {
  useDocumentTitle()
  const { data, error, loading } = useAsync((s) => api.home(s), [])
  const cmsPage = useAsync((s) => api.managedPage('home', s), [])
  const cms = (cmsPage.data?.content ?? {}) as HomeCms
  const featured = data?.featuredMagazine ?? data?.latestMagazines[0] ?? null
  const rest = (data?.latestMagazines ?? []).filter((m) => m.id !== featured?.id)
  const lead = data?.featuredArticle
    ? { ...data.featuredArticle, author: null, category: null, publishedAt: null }
    : data?.stories[0]
  const sideStories = (data?.stories ?? []).filter((s) => s.slug !== lead?.slug).slice(0, 4)

  return (
    <>
      <Hero data={data} cms={cms} />
      <TurnThePages featured={featured} cms={cms} />

      {data?.announcement && (
        <div className="bg-crimson text-white">
          <div className="container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2.5 text-center text-sm">
            <strong className="tracking-widest uppercase">{data.announcement.title}</strong>
            <span className="opacity-90">{data.announcement.message}</span>
            {data.announcement.linkUrl &&
              (data.announcement.linkUrl.startsWith('/') ? (
                <Link to={data.announcement.linkUrl} className="underline">
                  {data.announcement.linkLabel ?? 'Learn more'}
                </Link>
              ) : (
                <a href={data.announcement.linkUrl} target="_blank" rel="noreferrer" className="underline">
                  {data.announcement.linkLabel ?? 'Learn more'}
                </a>
              ))}
          </div>
        </div>
      )}

      {loading && !data && <Skeletons />}
      {error && <ErrorState error={error} title="The homepage content is unavailable" />}

      {featured && (
        <section id="featured" className="mood-ivory section">
          <div className="container-x grid items-center gap-12 md:grid-cols-[minmax(0,0.9fr)_1.1fr] md:gap-20">
            <Reveal>
              <Link to={`/magazines/${featured.slug}`} className="card-lift mx-auto block max-w-sm shadow-2xl" aria-label={`Open ${featured.title}`}>
                <CoverImage src={featured.coverUrl} alt={featured.coverAltText} title={featured.title} label={featured.issueLabel} eager />
              </Link>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="eyebrow mb-4">The current edition</p>
              <h2 className="display text-5xl md:text-7xl">{featured.title}</h2>
              {featured.subtitle && <p className="display mt-3 text-2xl text-crimson italic">{featured.subtitle}</p>}
              <p className="mt-6 max-w-xl text-lg opacity-80">
                {featured.description ?? `${[featured.issueLabel, formatMonthYear(featured.publicationDate)].filter(Boolean).join(' · ')}`}
              </p>
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm">
                <div>
                  <dt className="eyebrow">Published</dt>
                  <dd className="mt-1">{formatMonthYear(featured.publicationDate)}</dd>
                </div>
                {featured.pageCount && (
                  <div>
                    <dt className="eyebrow">Pages</dt>
                    <dd className="mt-1">{featured.pageCount}</dd>
                  </div>
                )}
                {featured.category && (
                  <div>
                    <dt className="eyebrow">Focus</dt>
                    <dd className="mt-1">{featured.category.name}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-10 flex flex-wrap gap-3">
                {featured.hasPdf && (
                  <Link to={`/read/${featured.slug}`} className="btn btn-ink">
                    Read the edition
                  </Link>
                )}
                <Link to={`/magazines/${featured.slug}`} className="btn btn-outline-ink">
                  Edition details
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mood-charcoal section">
          <div className="container-x">
            <SectionHeading eyebrow="Latest editions" title="From the newsstand" action={{ to: '/magazines', label: 'All magazines' }} />
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
              {rest.slice(0, 5).map((m, i) => (
                <Reveal key={m.id} delay={i * 0.06}>
                  <MagazineCard m={m} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {lead && (
        <section className="mood-paper section">
          <div className="container-x">
            <SectionHeading eyebrow="Stories" title="Ideas worth your time" action={{ to: '/stories', label: 'All stories' }} />
            <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr]">
              <Reveal>
                <Link to={`/stories/${lead.slug}`} className="group block">
                  <div className="overflow-hidden">
                    <StoryImage
                      src={lead.featuredImageUrl}
                      alt={lead.title}
                      className="aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  {'category' in lead && lead.category && <p className="eyebrow mt-5">{lead.category.name}</p>}
                  <h3 className="display mt-2 text-4xl group-hover:text-crimson md:text-5xl">{lead.title}</h3>
                  {lead.excerpt && <p className="mt-3 max-w-2xl text-lg opacity-75">{lead.excerpt}</p>}
                </Link>
              </Reveal>
              <div className="divide-y divide-black/10">
                {sideStories.map((s, i) => (
                  <Reveal key={s.slug} delay={i * 0.07}>
                    <Link to={`/stories/${s.slug}`} className="group block py-5 first:pt-0">
                      {s.category && <p className="eyebrow mb-1.5">{s.category.name}</p>}
                      <h3 className="display text-2xl group-hover:text-crimson md:text-3xl">{s.title}</h3>
                      <p className="mt-1.5 text-sm opacity-60">
                        {[s.author?.name, formatDate(s.publishedAt)].filter(Boolean).join(' · ')}
                      </p>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {data && data.leaders.length > 0 && (
        <section className="mood-navy section">
          <div className="container-x">
            <SectionHeading
              eyebrow="Leaders"
              title="The people shaping what comes next"
              action={{ to: '/leaders', label: 'Meet the leaders' }}
            />
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
              {data.leaders.map((l, i) => (
                <Reveal key={l.slug} delay={i * 0.06}>
                  <Link to={`/leaders/${l.slug}`} className="group block text-center">
                    <div className="mx-auto aspect-square w-full overflow-hidden rounded-full border border-gold/40 p-1.5 transition-colors group-hover:border-gold">
                      <Portrait src={l.portraitUrl} name={l.name} className="h-full w-full rounded-full transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <h3 className="display mt-4 text-xl leading-tight">{l.name}</h3>
                    <p className="mt-1 text-xs tracking-wider text-gold uppercase">{l.designation}</p>
                    <p className="text-sm opacity-60">{l.organization}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mood-paper section">
        <div className="container-x grid items-center gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">Global Editorial Spotlight</p>
            <h2 className="display text-4xl md:text-6xl">Advertise beside the leaders who move markets.</h2>
            <p className="mt-4 max-w-xl text-lg opacity-75">
              Timed placements, edition sponsorships, and partnership features — managed through our secure admin
              workflows with aggregate campaign reporting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/advertise" className="btn btn-ink">
                Advertising opportunities
              </Link>
              <Link to="/about" className="btn btn-outline-ink">
                About the house
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="border border-black/10 bg-[#f7f2e8] p-8 md:p-10">
            <p className="eyebrow mb-3">Reader personalization</p>
            <h3 className="display text-3xl">Save what matters. Resume where you left off.</h3>
            <p className="mt-3 opacity-75">
              Signed-in readers can bookmark magazines and stories and continue PDF reading from the last page — privacy
              respectful and permission-aware.
            </p>
            <Link to="/signin" className="link-arrow mt-6 inline-flex">
              Sign in to your library
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-midnight py-24 text-center">
        <img src="/brand/city.svg" alt="" aria-hidden className="absolute inset-x-0 bottom-0 -z-10 w-full opacity-40" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(163,32,47,0.28),transparent_70%)]" />
        <Reveal className="container-x">
          <p className="eyebrow mb-4">Keep exploring</p>
          <h2 className="display mx-auto max-w-3xl text-4xl md:text-6xl">Every edition is a window onto tomorrow.</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link to="/discover" className="btn btn-gold">
              Discover <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Work with us
            </Link>
          </div>
        </Reveal>
      </section>

      {data && data.partners.length > 0 && (
        <section className="mood-paper py-14">
          <div className="container-x">
            <p className="eyebrow mb-8 text-center">In good company</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {data.partners.map((p) => {
                const inner = p.logoUrl ? (
                  <img src={assetUrl(p.logoUrl) ?? ''} alt={p.name} className="h-9 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0" />
                ) : (
                  <span className="display text-xl opacity-60">{p.name}</span>
                )
                return p.websiteUrl ? (
                  <a key={p.name} href={p.websiteUrl} target="_blank" rel="noreferrer" aria-label={p.name}>
                    {inner}
                  </a>
                ) : (
                  <span key={p.name}>{inner}</span>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
