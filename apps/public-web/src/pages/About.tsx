import { Link } from 'react-router-dom'
import { Reveal, SectionHeading } from '../components/ui'
import { api } from '../lib/api'
import { useAsync, useDocumentTitle } from '../lib/hooks'

type AboutCms = {
  eyebrow?: string
  headline?: string
  body?: string
}

export default function About() {
  useDocumentTitle('About Us')
  const cmsPage = useAsync((s) => api.managedPage('about', s), [])
  const cms = (cmsPage.data?.content ?? {}) as AboutCms
  const eyebrow = cms.eyebrow ?? 'About the house'
  const headline = cms.headline ?? 'An international editorial house for leaders who shape tomorrow.'
  const body =
    cms.body ??
    'THE GLOBAL ICON publishes premium digital magazines, leadership profiles, and long-form stories that connect business, technology, and global impact.'

  return (
    <div className="mood-ivory">
      <section className="relative isolate overflow-hidden bg-midnight text-ivory">
        <div className="hero-vignette absolute inset-0 -z-10 opacity-80" />
        <div className="container-x py-24 md:py-32">
          <p className="eyebrow mb-4">{eyebrow}</p>
          <h1 className="display max-w-4xl text-5xl md:text-7xl">{headline}</h1>
          <p className="mt-6 max-w-2xl text-lg text-ivory/75">{body}</p>
        </div>
      </section>

      <section className="section">
        <div className="container-x grid gap-12 md:grid-cols-2 md:gap-20">
          <Reveal>
            <SectionHeading eyebrow="Purpose" title="Stories That Shape Tomorrow." />
            <p className="mt-4 text-lg opacity-80">
              We spotlight visionary founders, executives, and changemakers through carefully produced editions and
              interviews. Our Editions library and Magazines showcase are intentionally separate experiences — one for
              browsing the publication archive, one for immersive digital reading.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="divide-y divide-black/10 text-lg">
              <li className="py-4">
                <strong className="display text-2xl">Editorial craft</strong>
                <p className="mt-1 opacity-70">Original covers, issue metadata, and a protected PDF reading experience.</p>
              </li>
              <li className="py-4">
                <strong className="display text-2xl">Global perspective</strong>
                <p className="mt-1 opacity-70">Leaders, industries, and ideas across markets — curated, not cloned.</p>
              </li>
              <li className="py-4">
                <strong className="display text-2xl">Responsible publishing</strong>
                <p className="mt-1 opacity-70">Role-based admin workflows, private PDF delivery, and audited actions.</p>
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="mood-charcoal section text-center">
        <Reveal className="container-x">
          <p className="eyebrow mb-3">Work with us</p>
          <h2 className="display text-4xl md:text-5xl">Feature a leader. Sponsor an edition. Reach decision-makers.</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/advertise" className="btn btn-gold">
              Advertise
            </Link>
            <Link to="/contact" className="btn btn-ghost">
              Contact editorial
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
