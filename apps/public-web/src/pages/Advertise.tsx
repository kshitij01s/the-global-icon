import { Link } from 'react-router-dom'
import { Reveal } from '../components/ui'
import { api } from '../lib/api'
import { useAsync, useDocumentTitle } from '../lib/hooks'

type AdvertiseCms = { eyebrow?: string; headline?: string; body?: string }

const WHY = [
  {
    title: 'Editorial adjacency',
    copy: 'Place your brand beside leadership, innovation, and culture coverage that decision-makers already seek out.',
  },
  {
    title: 'Magazine + digital',
    copy: 'Combine print-adjacent PDF editions with homepage, story, and newsletter placements in one partnership conversation.',
  },
  {
    title: 'Human review',
    copy: 'Every enquiry is reviewed by staff in the admin console — no automated vanity metrics on this page.',
  },
]

const OPPORTUNITIES = [
  { title: 'Magazine advertising', copy: 'Cover adjacency, interior placements, and special edition partnerships.' },
  { title: 'Digital advertising', copy: 'Homepage banners, story rails, and timed campaign windows.' },
  { title: 'Sponsored stories', copy: 'Clearly labelled sponsored editorial developed with our team.' },
  { title: 'Featured brand placements', copy: 'Premium spotlight modules across Magazines and Leaders.' },
  { title: 'Partnership opportunities', copy: 'Multi-issue packages for conferences, awards, and thought leadership.' },
]

/** Clearly labelled demo campaigns — sample brand names only; no real performance figures. */
const DEMO_CAMPAIGNS = [
  {
    name: 'Global Brand Spotlight',
    advertiser: 'DEMO: Meridian Atlas Group',
    status: 'Sample — draft concept',
    placement: 'Homepage banner',
  },
  {
    name: 'Leadership Feature Partnership',
    advertiser: 'DEMO: Northbridge Advisory',
    status: 'Sample — partnership outline',
    placement: 'Sponsored story + Leaders',
  },
  {
    name: 'Technology Innovation Campaign',
    advertiser: 'DEMO: Helix Lattice Labs',
    status: 'Sample — concept only',
    placement: 'Digital + Magazine',
  },
  {
    name: 'Business Excellence Special',
    advertiser: 'DEMO: Summit Circle Capital',
    status: 'Sample — special edition idea',
    placement: 'Magazine special',
  },
  {
    name: 'Women in Leadership Campaign',
    advertiser: 'DEMO: Aurelia Collective',
    status: 'Sample — awareness package',
    placement: 'Stories + Magazines',
  },
  {
    name: 'Premium Magazine Advertisement',
    advertiser: 'DEMO: Cascadia Trade House',
    status: 'Sample — cover adjacency',
    placement: 'Edition interior',
  },
]

export default function Advertise() {
  useDocumentTitle('Advertise')
  const cmsPage = useAsync((s) => api.managedPage('advertise', s), [])
  const cms = (cmsPage.data?.content ?? {}) as AdvertiseCms
  return (
    <div className="mood-midnight text-ivory">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_70%_0%,rgba(197,165,114,0.18),transparent_55%),radial-gradient(50%_50%_at_10%_80%,rgba(163,32,47,0.22),transparent_60%)]" />
        <div className="container-x py-24 md:py-32">
          <p className="eyebrow mb-4">{cms.eyebrow ?? 'Advertising & partnerships'}</p>
          <h1 className="display max-w-4xl text-5xl md:text-7xl">
            {cms.headline ?? 'Advertise with THE GLOBAL ICON'}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ivory/75">
            {cms.body ??
              'Partner with an international digital magazine reaching readers who follow global business, leadership, and innovation. This page describes opportunities — it does not invent audience size or campaign results.'}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/contact" className="btn btn-gold">
              Submit an advertising enquiry
            </Link>
            <Link to="/magazines" className="btn btn-ghost">
              See the magazines
            </Link>
          </div>
        </div>
      </section>

      <section className="section border-t border-white/10">
        <div className="container-x">
          <p className="eyebrow mb-3">Why advertise with us?</p>
          <h2 className="display mb-10 text-4xl md:text-5xl">A professional partnership surface.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {WHY.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05} className="border border-gold/25 bg-navy/40 p-7">
                <h3 className="display text-2xl">{item.title}</h3>
                <p className="mt-3 opacity-75">{item.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mood-navy section">
        <div className="container-x">
          <p className="eyebrow mb-3">Audience &amp; readership</p>
          <h2 className="display mb-4 text-4xl md:text-5xl">Overview without invented metrics.</h2>
          <p className="max-w-3xl text-lg opacity-80">
            Our readership includes founders, executives, policymakers, and professionals exploring global stories. Exact
            circulation, impression totals, and conversion rates are shared privately during proposal discussions —
            never fabricated on the public site.
          </p>
        </div>
      </section>

      <section className="section border-t border-white/10">
        <div className="container-x">
          <p className="eyebrow mb-3">Advertising opportunities</p>
          <h2 className="display mb-10 text-4xl">Where brands can appear.</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {OPPORTUNITIES.map((o, i) => (
              <Reveal key={o.title} delay={i * 0.04} className="border border-white/10 bg-midnight/50 p-6">
                <h3 className="display text-2xl">{o.title}</h3>
                <p className="mt-2 opacity-70">{o.copy}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mood-charcoal section">
        <div className="container-x">
          <p className="eyebrow mb-3">Demo campaigns</p>
          <h2 className="display mb-3 text-4xl md:text-5xl">Sample partnership concepts</h2>
          <p className="mb-10 max-w-2xl opacity-70">
            The following entries are labelled demo content for design and admin workflow demonstration. Advertiser
            names are fictional. No performance figures are claimed.
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {DEMO_CAMPAIGNS.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.04} className="border border-gold/20 bg-navy/35 p-6">
                <p className="eyebrow mb-2">Demo sample</p>
                <h3 className="display text-2xl">{c.name}</h3>
                <dl className="mt-4 space-y-2 text-sm opacity-80">
                  <div>
                    <dt className="opacity-55">Advertiser</dt>
                    <dd>{c.advertiser}</dd>
                  </div>
                  <div>
                    <dt className="opacity-55">Placement</dt>
                    <dd>{c.placement}</dd>
                  </div>
                  <div>
                    <dt className="opacity-55">Status</dt>
                    <dd>{c.status}</dd>
                  </div>
                </dl>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mood-ivory section text-midnight">
        <Reveal className="container-x max-w-3xl text-center">
          <p className="eyebrow mb-3">Next step</p>
          <h2 className="display text-4xl md:text-5xl">Submit an advertising enquiry.</h2>
          <p className="mt-4 opacity-75">
            Use the contact form and choose Advertising. Authorized administrators manage campaigns, placements, and
            enquiry status in the admin dashboard.
          </p>
          <Link to="/contact" className="btn btn-ink mt-8">
            Open contact form
          </Link>
        </Reveal>
      </section>
    </div>
  )
}
