import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useDocumentTitle } from '../lib/hooks'

export default function SignIn() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading, signIn, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  useDocumentTitle(mode === 'login' ? 'Sign in' : 'Create account')

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // only allow same-site relative redirects
  const rawNext = params.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (!loading && user && !busy) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await signIn(identifier, password)
      else
        await register({
          email,
          username,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        })
      navigate(next, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 429
            ? 'Too many attempts. Please wait a minute and try again.'
            : err.message
          : 'Something went wrong. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="mood-midnight relative isolate min-h-[calc(100vh-72px)] overflow-hidden">
      <div className="hero-bg -z-10 opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight via-midnight/85 to-midnight/60" />
      <div className="container-x grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="eyebrow mb-5">Members</p>
          <h1 className="display text-7xl">
            Read further. <span className="gold-text italic">Remember where you left off.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg opacity-75">
            A free account unlocks member editions and stories, and saves your place in every magazine you read.
          </p>
        </div>

        <form onSubmit={submit} className="mx-auto w-full max-w-md border border-gold/30 bg-navy/80 p-8 backdrop-blur md:p-10">
          <div className="mb-8 flex gap-6 border-b border-white/10" role="tablist">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={`-mb-px border-b-2 pb-3 text-sm font-semibold tracking-[0.18em] uppercase ${
                  mode === m ? 'border-gold text-gold' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {mode === 'login' ? (
              <>
                <div>
                  <label className="label" htmlFor="si-id">Email or username</label>
                  <input id="si-id" className="field field-dark" required autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="si-pw">Password</label>
                  <input id="si-pw" type="password" className="field field-dark" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="rg-fn">First name</label>
                    <input id="rg-fn" className="field field-dark" maxLength={80} autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="rg-ln">Last name</label>
                    <input id="rg-ln" className="field field-dark" maxLength={80} autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="rg-em">Email</label>
                  <input id="rg-em" type="email" className="field field-dark" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="rg-un">Username</label>
                  <input id="rg-un" className="field field-dark" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.\-]+" title="Letters, numbers, dot, underscore and hyphen" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="rg-pw">Password</label>
                  <input id="rg-pw" type="password" className="field field-dark" required minLength={10} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <p className="mt-1 text-xs opacity-55">At least 10 characters.</p>
                </div>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-5 border-l-2 border-crimson-bright bg-crimson/15 px-4 py-3 text-sm text-ivory">
              {error}
            </p>
          )}

          <button className="btn btn-gold mt-8 w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <p className="mt-6 text-center text-sm opacity-60">
            <Link to="/" className="hover:text-gold">
              Continue as a guest
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
