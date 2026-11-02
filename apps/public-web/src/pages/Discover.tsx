import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CoverImage, Empty, ErrorState, Loading, PageHero, Portrait, Reveal, SectionHeading, StoryImage } from '../components/ui'
import { api } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAsync, useDocumentTitle } from '../lib/hooks'

/**
 * Discover is composed entirely from live API content:
 *  - Trending  → featured/latest articles
 *  - Topics    → categories gathered from articles, magazines and leaders
 *  - Collections → edition series (facets from /editions)
 *  - Voices    → leaders
 * Sections with no data simply do not render.
 */
export default function Discover() {
  useDocumentTitle('Discover')
  const { data, error, loading } = useAsync(
    async (signal) => {
      const [articles, magazines, editions, leaders] = await Promise.all([
        api.articles({ limit: 24 }, signal),
        api.magazines({ limit: 24 }, signal),
        api.editions({ limit: 50 }, signal),
        api.leaders({ limit: 8 }, signal),
      ])
      return { articles, magazines, editions, leaders }
    },
    [],
  )

  const topics = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { name: string; slug: string; stories: number; editions: number; leaders: number }>()
    const bump = (c: { name: string; slug: string } | null, key: 'stories' | 'editions' | 'leaders') => {
      if (!c) return
      const t = map.get(c.slug) ?? { ...c, stories: 0, editions: 0, leaders: 0 }
      t[key] += 1
      map.set(c.slug, t)
    }
    data.articles.items.forEach((a) => bump(a.category, 'stories'))
    data.magazines.items.forEach((m) => bump(m.category, 'editions'))
    data.leaders.items.forEach((l) => bump(l.category, 'leaders'))
    return [...map.values()].sort((a, b) => b.stories + b.editions + b.leaders - (a.stories + a.editions + a.leaders))
  }, [data])

  const trending = useMemo(() => {
    if (!data) return []
    return [...data.articles.items].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 5)
  }, [data])

  const collections = useMemo(() => {
    if (!data) return []
    return data.editions.facets.series.map((s) => ({
      ...s,
      items: data.editions.items.filter((e) => e.seriesSlug === s.slug),
    }))
  }, [data])

  if (loading && !data) return <Loading />
  if (error || !data) return <ErrorState error={error} />

  const nothing = trending.length + topics.length + collections.length + data.leaders.items.length === 0

  return (
    <div className="mood-charcoal">
      <PageHero eyebrow="Discover" title="Follow your curiosity." lead="Trending reads, the topics that connect our editions, and the collections worth getting lost in." />

      {nothing && <Empty title="Nothing to discover yet">Content will appear here as soon as it is published.</Empty>}

      {trending.length > 0 && (
        <section className="pb-20">
          <div className="container-x">
            <SectionHeading eyebrow="Trending now" title="What readers are opening" />
            <ol className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <Reveal as="li" className="list-none">
                <Link to={`/stories/${trending[0]!.slug}`} className="group relative block overflow-hidden">
                  <StoryImage src={trending[0]!.featuredImageUrl} alt={trending[0]!.title} className="aspect-[4/3] w-full transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <span className="display gold-text text-6xl">01</span>
                    <p className="eyebrow mt-1">{trending[0]!.category?.name}</p>
                    <h3 className="display text-3xl md:text-5xl">{trending[0]!.title}</h3>
                  </div>
                </Link>
              </Reveal>
              <div className="flex flex-col divide-y divide-white/10">
                {trending.slice(1).map((a, i) => (
                  <Reveal as="li" key={a.id} delay={i * 0.07} className="list-none">
                    <Link to={`/stories/${a.slug}`} className="group flex items-baseline gap-5 py-5">
                      <span className="display gold-text text-5xl">{String(i + 2).padStart(2, '0')}</span>
                      <span>
                        <span className="eyebrow block">{a.category?.name ?? 'Story'}</span>
                        <span className="display block text-2xl leading-tight group-hover:text-gold-bright md:text-3xl">{a.title}</span>
                        <span className="text-sm opacity-55">{formatDate(a.publishedAt)}</span>
                      </span>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </ol>
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section className="mood-navy section">
          <div className="container-x">
            <SectionHeading eyebrow="Topics" title="Browse by theme" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((t, i) => (
                <Reveal key={t.slug} delay={(i % 3) * 0.06}>
                  <Link
                    to={t.stories > 0 ? `/stories?category=${t.slug}` : t.editions > 0 ? `/magazines?category=${t.slug}#library` : '/leaders'}
                    className="group block border border-gold/25 p-7 transition-colors hover:border-gold hover:bg-white/5"
                  >
                    <h3 className="display text-3xl group-hover:text-gold-bright">{t.name}</h3>
                    <p className="mt-3 text-sm tracking-wider text-ivory/60 uppercase">
                      {[
                        t.stories ? `${t.stories} ${t.stories === 1 ? 'story' : 'stories'}` : null,
                        t.editions ? `${t.editions} ${t.editions === 1 ? 'edition' : 'editions'}` : null,
                        t.leaders ? `${t.leaders} ${t.leaders === 1 ? 'leader' : 'leaders'}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {collections.some((c) => c.items.length > 0) && (
        <section className="mood-ivory section">
          <div className="container-x">
            <SectionHeading eyebrow="Collections" title="Editions, grouped" action={{ to: '/editions', label: 'Open the archive' }} />
            <div className="space-y-12">
              {collections
                .filter((c) => c.items.length > 0)
                .map((c) => (
                  <Reveal key={c.slug}>
                    <h3 className="display mb-4 text-3xl text-crimson">{c.name}</h3>
                    <div className="shelf">
                      {c.items.map((e) => (
                        <Link key={e.id} to={`/magazines/${e.slug}`} className="card-lift block w-40 shadow-lg" aria-label={e.title}>
                          <CoverImage src={e.coverUrl} alt={e.coverAltText} title={e.title} label={e.issueLabel} />
                        </Link>
                      ))}
                    </div>
                  </Reveal>
                ))}
            </div>
          </div>
        </section>
      )}

      {data.leaders.items.length > 0 && (
        <section className="mood-midnight section">
          <div className="container-x">
            <SectionHeading eyebrow="Voices" title="Leaders to know" action={{ to: '/leaders', label: 'All leaders' }} />
            <div className="shelf">
              {data.leaders.items.map((l) => (
                <Link key={l.id} to={`/leaders/${l.slug}`} className="group block w-44 text-center">
                  <div className="aspect-square overflow-hidden rounded-full border border-gold/40 p-1">
                    <Portrait src={l.portraitUrl} name={l.name} className="h-full w-full rounded-full" />
                  </div>
                  <h3 className="display mt-3 text-xl group-hover:text-gold-bright">{l.name}</h3>
                  <p className="text-sm opacity-60">{l.organization}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
