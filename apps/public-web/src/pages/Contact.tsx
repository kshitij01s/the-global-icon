import { motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { ApiError, api, type EnquiryInput, type EnquiryType } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useAsync, useDocumentTitle } from '../lib/hooks'

const TYPES: { value: EnquiryType; label: string }[] = [
  { value: 'GENERAL', label: 'General enquiry' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'FEATURE', label: 'Be featured' },
  { value: 'EDITORIAL', label: 'Editorial / pitch' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'COLLABORATION', label: 'Collaboration' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'TECHNICAL', label: 'Website / technical' },
]

const EMPTY: EnquiryInput = {
  fullName: '',
  company: '',
  email: '',
  phone: '',
  jobTitle: '',
  website: '',
  countryOrRegion: '',
  enquiryType: 'GENERAL',
  subject: '',
  message: '',
}

export default function Contact() {
  useDocumentTitle('Contact')
  const { user } = useAuth()
  const { data: settings } = useAsync((s) => api.settings(s), [])
  const [form, setForm] = useState<EnquiryInput>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null)

  const set = <K extends keyof EnquiryInput>(k: K, v: EnquiryInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Empty optional fields are dropped; the API validates URL/format strictly.
      const payload = Object.fromEntries(
        Object.entries({ ...form, email: form.email || user?.email || '' }).filter(([, v]) => v !== '' && v !== undefined),
      ) as unknown as EnquiryInput
      const res = await api.contact(payload)
      setDone(res)
      setForm(EMPTY)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mood-ivory">
      <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="mood-navy relative overflow-hidden px-6 py-16 md:px-14 md:py-24">
          <img src="/brand/globe.svg" alt="" aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 w-[28rem] opacity-25" />
          <div className="relative">
            <p className="eyebrow mb-5">Contact</p>
            <h1 className="display text-5xl md:text-7xl">
              Let’s start a <span className="gold-text italic">conversation.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg opacity-75">
              Advertising, features, partnerships or a story we should know about — tell us a little and the right editor will
              reply.
            </p>
            <dl className="mt-12 space-y-6 text-lg">
              {settings?.contactEmail && (
                <div>
                  <dt className="eyebrow">Email</dt>
                  <dd>
                    <a href={`mailto:${settings.contactEmail}`} className="hover:text-gold-bright">
                      {settings.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
              {settings?.contactPhone && (
                <div>
                  <dt className="eyebrow">Phone</dt>
                  <dd>
                    <a href={`tel:${settings.contactPhone.replace(/\s/g, '')}`} className="hover:text-gold-bright">
                      {settings.contactPhone}
                    </a>
                  </dd>
                </div>
              )}
              {settings?.officeAddress && (
                <div>
                  <dt className="eyebrow">Office</dt>
                  <dd className="whitespace-pre-line opacity-85">{settings.officeAddress}</dd>
                </div>
              )}
              {settings?.contactResponseTime && (
                <div>
                  <dt className="eyebrow">Response time</dt>
                  <dd className="opacity-85">{settings.contactResponseTime}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>

        <section className="px-6 py-16 md:px-14 md:py-24">
          {done ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} role="status" className="max-w-xl">
              <p className="eyebrow mb-4">Received</p>
              <h2 className="display text-5xl">{done.message}</h2>
              <p className="mt-5 text-lg opacity-75">
                Your reference is <strong className="tracking-wider">{done.reference}</strong>. Keep it handy if you follow up.
              </p>
              <button type="button" className="btn btn-ink mt-8" onClick={() => setDone(null)}>
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6" noValidate={false}>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="c-name">Full name *</label>
                  <input id="c-name" className="field" required maxLength={160} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <label className="label" htmlFor="c-company">Company / organisation *</label>
                  <input id="c-company" className="field" required maxLength={160} value={form.company} onChange={(e) => set('company', e.target.value)} autoComplete="organization" />
                </div>
                <div>
                  <label className="label" htmlFor="c-email">Email *</label>
                  <input id="c-email" type="email" className="field" required maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <label className="label" htmlFor="c-phone">Phone</label>
                  <input id="c-phone" type="tel" className="field" maxLength={32} value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" />
                </div>
                <div>
                  <label className="label" htmlFor="c-title">Job title</label>
                  <input id="c-title" className="field" maxLength={120} value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} autoComplete="organization-title" />
                </div>
                <div>
                  <label className="label" htmlFor="c-country">Country / region</label>
                  <input id="c-country" className="field" maxLength={100} value={form.countryOrRegion} onChange={(e) => set('countryOrRegion', e.target.value)} autoComplete="country-name" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="c-web">Website</label>
                <input id="c-web" type="url" placeholder="https://" className="field" maxLength={300} value={form.website} onChange={(e) => set('website', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="c-type">I’m reaching out about *</label>
                <select id="c-type" className="field" value={form.enquiryType} onChange={(e) => set('enquiryType', e.target.value as EnquiryType)}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="c-subject">Subject *</label>
                <input id="c-subject" className="field" required maxLength={180} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="c-msg">Message *</label>
                <textarea id="c-msg" className="field min-h-44" required maxLength={5000} value={form.message} onChange={(e) => set('message', e.target.value)} />
                <p className="mt-1 text-right text-xs opacity-50">{form.message.length} / 5000</p>
              </div>
              {error && (
                <p role="alert" className="border-l-2 border-crimson bg-crimson/10 px-4 py-3 text-crimson">
                  {error}
                </p>
              )}
              <button className="btn btn-ink" disabled={busy}>
                {busy ? 'Sending…' : 'Send enquiry'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
